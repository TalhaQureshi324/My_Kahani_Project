import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import {
  isServerConfigured,
  getCustomerPaymentProfiles,
  newestPaymentProfile,
} from "@/lib/authorizenet";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/booking/payment-profile/verify
 * Body: { booking_id, manage_token }
 *
 * Verifies server-side that a payment profile exists on Authorize.net
 * for this booking's customer profile (newest payment profile wins),
 * stores only safe masked card metadata, and atomically converts the
 * hold into a confirmed booking. Idempotent per booking via
 * booking_operations. Returns the raw manage token so the client can
 * build the manage-booking link (the database stores only its hash).
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const rl = rateLimit(`payment-verify:${clientIp(request)}`, 20, 60_000);
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
  if (!isServerConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Card-on-file is not configured yet. Please contact us directly to complete your booking.",
      },
      { status: 503 },
    );
  }

  let body: { booking_id?: string; manage_token?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }
  const bookingId = body.booking_id ?? "";
  const manageToken = body.manage_token ?? "";
  if (!bookingId || !manageToken) {
    return fail("Missing booking reference or manage token.");
  }

  const supabase = getSupabaseAdmin();

  // Idempotency: once verified + stored, repeats return the stored result.
  const { data: priorOp } = await supabase
    .from("booking_operations")
    .select("provider_reference")
    .eq("booking_id", bookingId)
    .eq("operation", "payment_profile_verified")
    .maybeSingle();
  if (priorOp) {
    const { data: b } = await supabase
      .from("bookings")
      .select("status, card_brand, card_last4, booking_reference")
      .eq("id", bookingId)
      .single();
    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      already_verified: true,
      status: b?.status ?? "confirmed",
      booking_reference: b?.booking_reference ?? null,
      card: { brand: b?.card_brand ?? null, last4: b?.card_last4 ?? null },
    });
  }

  // The hold must still be valid (unexpired, unconverted).
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, status, expires_at, email, first_name, last_name, customer_id, authorize_net_customer_profile_id, booking_reference, client_timezone",
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

  const customerProfileId = booking.authorize_net_customer_profile_id;
  if (!customerProfileId) {
    return fail("No payment profile was started for this booking.", 409);
  }

  // Verify server-side on Authorize.net (newest payment profile wins).
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let paymentProfileId: string | null = null;
  try {
    const profiles = await getCustomerPaymentProfiles(customerProfileId);
    const newest = newestPaymentProfile(profiles);
    if (!newest) {
      return fail("No saved payment method was found on the payment form.", 409);
    }
    paymentProfileId = newest.id;
    cardBrand = newest.cardBrand;
    cardLast4 = newest.cardLast4;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payment-verify] profile fetch failed", message);
    return NextResponse.json(
      {
        success: false,
        error:
          "We could not verify the saved card with the payment processor. Please try again.",
      },
      { status: 502 },
    );
  }

  const savedAt = new Date().toISOString();
  const confirmedAt = new Date().toISOString();

  // Persist safe card metadata + atomically convert hold → confirmed.
  // The WHERE clause re-checks status and expiry inside the update.
  const { data: confirmedBooking, error: confirmError } = await supabase
    .from("bookings")
    .update({
      authorize_net_customer_profile_id: customerProfileId,
      authorize_net_payment_profile_id: paymentProfileId,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_saved_at: savedAt,
      status: "confirmed",
      confirmed_at: confirmedAt,
      expires_at: null,
      updated_at: confirmedAt,
    })
    .eq("id", bookingId)
    .eq("status", "held")
    .select("id, slot_start, slot_end, client_timezone")
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
      operation: "payment_profile_verified",
      provider_reference: paymentProfileId,
      status: "done",
    },
    { onConflict: "booking_id,operation" },
  );

  const clientTz = confirmedBooking.client_timezone ?? "America/Chicago";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const manageUrl = `${siteUrl}/booking/manage/${manageToken}`;
  const icsUrl = `${siteUrl}/api/bookings/${booking.booking_reference}/calendar`;

  // Notification jobs: confirmation email now + reminders at −24h/−2h.
  // Reminders in the past (short-notice bookings) are created cancelled.
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

  const { error: jobsError } = await supabase
    .from("notification_jobs")
    .upsert(
      [
        confirmationJob,
        reminderJob("reminder_24h", 24),
        reminderJob("reminder_2h", 2),
      ],
      { onConflict: "booking_id,type" },
    );

  if (jobsError) {
    console.error("[payment-verify] notification jobs failed", jobsError.message);
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
