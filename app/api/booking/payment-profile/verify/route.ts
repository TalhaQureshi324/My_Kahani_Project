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
 * Body: { booking_id }
 *
 * Verifies server-side that a payment profile exists on Authorize.net
 * for this booking's customer profile, pulls only safe masked card
 * metadata, stores it, and atomically converts the hold into a
 * confirmed booking. Idempotent per booking via booking_operations.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const CANCELLATION_POLICY_VERSION = "2026-09-v1";

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

  let body: { booking_id?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }
  const bookingId = body.booking_id ?? "";
  if (!bookingId) return fail("Missing booking reference.");

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
      .select("status, card_brand, card_last4")
      .eq("id", bookingId)
      .single();
    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      already_verified: true,
      status: b?.status ?? "confirmed",
      card: { brand: b?.card_brand ?? null, last4: b?.card_last4 ?? null },
    });
  }

  // The hold must still be valid.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, status, expires_at, email, first_name, customer_id, authorize_net_customer_profile_id",
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

  // Verify server-side on Authorize.net.
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
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "held")
    .select("id, slot_start, slot_end")
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

  // Notification job (confirmation email) — processed separately.
  await supabase.from("notification_jobs").insert({
    booking_id: bookingId,
    type: "booking_confirmation",
    payload: {
      to_email: booking.email,
      first_name: booking.first_name,
      slot_start: confirmedBooking.slot_start,
      slot_end: confirmedBooking.slot_end,
    },
  });

  return NextResponse.json({
    success: true,
    booking_id: bookingId,
    status: "confirmed",
    slot: {
      start: confirmedBooking.slot_start,
      end: confirmedBooking.slot_end,
    },
    card: { brand: cardBrand, last4: cardLast4 },
  });
}
