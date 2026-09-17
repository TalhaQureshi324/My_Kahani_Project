import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/booking/setup-intent
 * Body: { booking_id, consent_accepted: true }
 *
 * Validates the hold + consent + details, persists the consent audit
 * fields, creates/reuses the Stripe Customer, creates a SetupIntent
 * (usage: off_session) bound to that customer, and returns the
 * client_secret for the Payment Element. No charge is created.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const CANCELLATION_POLICY_VERSION = "2026-09-v1";

export async function POST(request: Request) {
  const rl = rateLimit(`setup-intent:${clientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { success: false, error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }

  let body: { booking_id?: string; consent_accepted?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }

  const bookingId = body.booking_id ?? "";
  if (!bookingId || body.consent_accepted !== true) {
    return fail("Missing booking reference or consent.");
  }

  const supabase = getSupabaseAdmin();

  // Hold must still be valid.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, status, expires_at, email, first_name, last_name, customer_id, stripe_customer_id, payment_authorization_accepted_at",
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return fail("Booking not found.", 404);
  }
  if (booking.status !== "held") {
    return NextResponse.json(
      {
        success: false,
        error: "This booking is no longer on hold. Please start again.",
      },
      { status: 409 },
    );
  }
  if (
    booking.expires_at &&
    new Date(booking.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Your slot hold has expired. Please choose a new time to continue.",
      },
      { status: 410 },
    );
  }

  // Consent is mandatory and audited.
  if (!booking.payment_authorization_accepted_at) {
    const { error: consentError } = await supabase
      .from("bookings")
      .update({
        payment_authorization_accepted_at: new Date().toISOString(),
        cancellation_policy_version: CANCELLATION_POLICY_VERSION,
      })
      .eq("id", bookingId);
    if (consentError) {
      console.error("[setup-intent] consent persist failed", consentError.message);
    }
  }

  // Server-side validation of the details captured on stage 2.
  if (!booking.first_name || !booking.last_name || !booking.email) {
    return fail("Booking details are incomplete. Please go back and resubmit them.");
  }

  // Resolve/create the internal customer record.
  let customerId: string = booking.customer_id ?? "";
  if (!customerId) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", booking.email)
      .maybeSingle();
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("customers")
        .insert({
          email: booking.email,
          first_name: booking.first_name,
          last_name: booking.last_name,
        })
        .select("id")
        .single();
      if (createError || !created) {
        console.error("[setup-intent] customer create failed", createError?.message);
        return fail("Could not save your details. Please try again.", 500);
      }
      customerId = created.id;
    }
    await supabase.from("bookings").update({ customer_id: customerId }).eq("id", bookingId);
  }

  // Reuse or create the Stripe Customer (idempotent per internal customer).
  let stripeCustomerId = booking.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const stripe = getStripe();
    const customer = await stripe.customers.create(
      {
        email: booking.email,
        name: `${booking.first_name} ${booking.last_name}`.trim(),
        metadata: { internal_customer_id: customerId },
      },
      { idempotencyKey: `customer:${customerId}` },
    );
    stripeCustomerId = customer.id;
    await supabase.from("customers").update({ stripe_customer_id: stripeCustomerId }).eq("id", customerId);
    await supabase.from("bookings").update({ stripe_customer_id: stripeCustomerId }).eq("id", bookingId);
  }

  // SetupIntent: no charge — prepares the payment method for off-session use.
  const setupIntent = await getStripe().setupIntents.create(
    {
      customer: stripeCustomerId,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
      metadata: { booking_id: bookingId, internal_customer_id: customerId },
    },
    { idempotencyKey: `setup-intent:${bookingId}` },
  );

  await supabase
    .from("bookings")
    .update({
      stripe_setup_intent_id: setupIntent.id,
      stripe_customer_id: stripeCustomerId,
    })
    .eq("id", bookingId);

  return NextResponse.json({
    success: true,
    client_secret: setupIntent.client_secret,
    stripe_customer_id: stripeCustomerId,
  });
}
