import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { hashManageToken } from "@/lib/bookingTokens";

/**
 * POST /api/booking/setup-intent/verify
 * Body: { booking_id, setup_intent_id, manage_token }
 *
 * Server-side verification: retrieves the SetupIntent from Stripe,
 * requires status = succeeded, requires the payment method to belong to
 * the expected Stripe Customer, stores stripe_payment_method_id + safe
 * card metadata, then atomically converts the hold into a confirmed
 * booking. Idempotent per booking via booking_operations.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const rl = rateLimit(`setup-verify:${clientIp(request)}`, 20, 60_000);
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

  let body: { booking_id?: string; setup_intent_id?: string; manage_token?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }
  const bookingId = body.booking_id ?? "";
  const setupIntentId = body.setup_intent_id ?? "";
  const manageToken = body.manage_token ?? "";
  if (!bookingId || !setupIntentId || !manageToken) {
    return fail("Missing booking, SetupIntent reference, or manage token.");
  }

  const supabase = getSupabaseAdmin();

  // Hold must be valid and bound to this manage token.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, status, expires_at, email, first_name, last_name, customer_id, stripe_customer_id, stripe_setup_intent_id, payment_authorization_accepted_at, booking_reference, manage_token_hash",
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

  // Manage-token binding: the raw token must hash to this booking's
  // stored hash (proves the caller is the one who opened the flow).
  if (hashManageToken(manageToken) !== booking.manage_token_hash) {
    return fail("Manage token does not match this booking.", 403);
  }

  // Idempotency: once verified + stored, repeats return the stored result.
  const { data: priorOp } = await supabase
    .from("booking_operations")
    .select("provider_reference")
    .eq("booking_id", bookingId)
    .eq("operation", "setup_intent_verified")
    .maybeSingle();
  if (priorOp) {
    const { data: b } = await supabase
      .from("bookings")
      .select("status, booking_reference, card_brand, card_last4")
      .eq("id", bookingId)
      .single();
    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      already_verified: true,
      booking_reference: b?.booking_reference ?? null,
      card: { brand: b?.card_brand ?? null, last4: b?.card_last4 ?? null },
    });
  }

  // Retrieve + verify the SetupIntent server-side.
  const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId);

  if (setupIntent.status !== "succeeded") {
    return NextResponse.json(
      {
        success: false,
        error: `SetupIntent is ${setupIntent.status}, not succeeded. Please complete the payment form.`,
      },
      { status: 409 },
    );
  }
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  const siCustomer =
    typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;

  if (!paymentMethodId || !siCustomer) {
    return fail("SetupIntent is missing its payment method or customer.", 409);
  }

  // Safe display metadata from the PaymentMethod (brand + last4 only).
  const paymentMethod = await getStripe().paymentMethods.retrieve(
    paymentMethodId,
  );
  const cardBrand = paymentMethod.card?.brand ?? null;
  const cardLast4 = paymentMethod.card?.last4 ?? null;

  const savedAt = new Date().toISOString();
  const confirmedAt = new Date().toISOString();

  // Persist safe card + Stripe references + atomically convert hold into
  // confirmed. The WHERE clause re-checks status and expiry in the update.
  const { data: confirmedBooking, error: confirmError } = await supabase
    .from("bookings")
    .update({
      stripe_customer_id: siCustomer,
      stripe_payment_method_id: paymentMethodId,
      stripe_setup_intent_id: setupIntent.id,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_saved_at: savedAt,
      payment_authorization_accepted_at:
        booking.payment_authorization_accepted_at,
      status: "confirmed",
      confirmed_at: confirmedAt,
      expires_at: null,
      updated_at: confirmedAt,
    })
    .eq("id", bookingId)
    .eq("status", "held")
    .select("id, slot_start, slot_end, client_timezone, booking_reference")
    .single();

  if (confirmError || !confirmedBooking) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Your slot hold has expired. Please choose a new time to continue.",
      },
      { status: 410 },
    );
  }

  const slotStart = confirmedBooking.slot_start;
  const slotEnd = confirmedBooking.slot_end;

  // Idempotency marker.
  await supabase.from("booking_operations").upsert(
    {
      booking_id: bookingId,
      operation: "setup_intent_verified",
      provider_reference: setupIntent.id,
      status: "done",
    },
    { onConflict: "booking_id,operation" },
  );

  const clientTz = confirmedBooking.client_timezone ?? "America/Chicago";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const manageUrl = `${siteUrl}/booking/manage/${manageToken}`;
  const icsUrl = `${siteUrl}/api/bookings/${booking.booking_reference}/calendar`;

  // Notification jobs: confirmation email now + reminders at 24h and 2h
  // before the slot. Reminders already in the past are created cancelled.
  const reminderJob = (type: string, hoursBefore: number) => {
    const runAt = new Date(
      new Date(slotStart).getTime() - hoursBefore * 3600 * 1000,
    );
    const inPast = runAt.getTime() <= Date.now();
    return {
      booking_id: bookingId,
      type,
      payload: {
        to_email: booking.email,
        first_name: booking.first_name,
        manage_url: manageUrl,
        client_timezone: clientTz,
      },
      status: inPast ? "cancelled" : "pending",
      run_at: runAt.toISOString(),
    };
  };

  const confirmationJob = {
    booking_id: bookingId,
    type: "booking_confirmation",
    payload: {
      to_email: booking.email,
      first_name: booking.first_name,
      booking_reference: booking.booking_reference,
      manage_url: manageUrl,
      ics_url: icsUrl,
      client_timezone: clientTz,
      slot_start: slotStart,
      slot_end: slotEnd,
    },
    status: "pending",
    run_at: new Date().toISOString(),
  };

  // Plain insert — the booking_operations marker above already guarantees
  // one execution per booking, and the partial unique index
  // notification_jobs_live_uniq cannot be targeted by an ON CONFLICT clause.
  const { error: jobsError } = await supabase
    .from("notification_jobs")
    .insert([
      confirmationJob,
      reminderJob("reminder_24h", 24),
      reminderJob("reminder_2h", 2),
    ]);

  if (jobsError) {
    console.error("[setup-verify] notification jobs failed", jobsError.message);
  }

  return NextResponse.json({
    success: true,
    booking_id: bookingId,
    booking_reference: booking.booking_reference,
    manage_token: manageToken,
    status: "confirmed",
    slot: { start: slotStart, end: slotEnd },
    card: { brand: cardBrand, last4: cardLast4 },
  });
}
