import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

const CANCELLATION_POLICY_VERSION = "2026-09-v1";

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

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

  let body: {
    booking_id?: string;
    consent_accepted?: boolean;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }

  const bookingId = body.booking_id ?? "";
  const firstName = (body.first_name ?? "").trim();
  const lastName = (body.last_name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  if (!bookingId || body.consent_accepted !== true) {
    return fail("Missing booking reference or consent.");
  }
  if (!firstName || !lastName || !/.+@.+\..+/.test(email) || !phone) {
    return fail("Missing or invalid booking details (name, email, phone).");
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

  // Persist the streamlined intake details + upsert the internal customer
  // (the Stripe Customer and emails need them).
  const { error: detailError } = await supabase
    .from("bookings")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (detailError) {
    console.error("[setup-intent] detail persist failed", detailError.message);
  }

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("customers")
      .insert({ email, first_name: firstName, last_name: lastName, phone })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("[setup-intent] customer create failed", createError?.message);
      return fail("Could not save your details. Please try again.", 500);
    }
    customerId = created.id;
  }
  await supabase.from("bookings").update({ customer_id: customerId }).eq("id", bookingId);

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
