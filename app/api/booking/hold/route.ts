import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { generateSlots, HOLD_MINUTES, addDaysISO, todayChicago } from "@/lib/scheduling";
import type { AvailabilityRule, AvailabilityException } from "@/lib/scheduling";
import { SESSION_PRICE_CENTS, SESSION_CURRENCY, PRICING_SOURCE } from "@/lib/pricing";
import {
  generateBookingReference,
  generateManageToken,
  hashManageToken,
} from "@/lib/bookingTokens";

/**
 * POST /api/booking/hold
 * Body: { slot_start: UTC ISO, slot_end: UTC ISO }
 *
 * Creates a ~10-minute hold on the slot (bookings.status = 'held').
 * The database exclusion constraint `bookings_no_active_overlap`
 * guarantees two users can never hold/confirm the same slot, even for
 * simultaneous requests — the losing insert commits with error 23P01
 * and we return 409.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Online scheduling is not connected yet. Please contact us to book.",
      },
      { status: 503 },
    );
  }

  let body: { slot_start?: string; slot_end?: string; timezone?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request body.");
  }

  const slotStart = body.slot_start ?? "";
  const slotEnd = body.slot_end ?? "";
  const startDate = new Date(slotStart);
  const endDate = new Date(slotEnd);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return bad("Invalid slot times.");
  }

  const supabase = getSupabaseAdmin();

  // Release stale holds first so an expired slot can be taken again.
  await supabase.rpc("release_expired_holds");

  // Validate the requested slot server-side: it must be one of the
  // currently generated bookable slots (never trust the client).
  const chicagoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startDate);
  const from = addDaysISO(todayChicago(), 0);
  const to = addDaysISO(todayChicago(), 60);

  const [rulesRes, exceptionsRes, bookingsRes] = await Promise.all([
    supabase.from("availability_rules").select("*").eq("active", true),
    supabase
      .from("availability_exceptions")
      .select("*")
      .lte("starts_at", `${to}T23:59:59Z`)
      .gte("ends_at", `${from}T00:00:00Z`),
    supabase
      .from("bookings")
      .select("slot_start, slot_end")
      .in("status", ["held", "confirmed"])
      .gte("slot_start", `${from}T00:00:00Z`),
  ]);

  if (rulesRes.error || exceptionsRes.error || bookingsRes.error) {
    return bad("Could not verify availability. Please try again.", 500);
  }

  const bookable = generateSlots({
    fromISO: from,
    toISO: to,
    rules: (rulesRes.data ?? []) as unknown as AvailabilityRule[],
    exceptions: (exceptionsRes.data ?? []) as unknown as AvailabilityException[],
    busy: (bookingsRes.data ?? [])
      .filter((b: { slot_start: string }) => b.slot_start !== slotStart)
      .map((b: { slot_start: string; slot_end: string }) => ({
        start: new Date(b.slot_start).toISOString(),
        end: new Date(b.slot_end).toISOString(),
      })),
    now: new Date(),
  });

  const isBookable = bookable.some(
    (s) => s.start === startDate.toISOString() && s.end === endDate.toISOString(),
  );
  if (!isBookable) {
    return NextResponse.json(
      { success: false, error: "That time is no longer available." },
      { status: 409 },
    );
  }

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60000).toISOString();

  // Human-friendly public reference + price snapshot (agreed at booking
  // time; historical bookings never re-read current pricing).
  const bookingReference = generateBookingReference();
  const manageToken = generateManageToken();
  const manageTokenHash = hashManageToken(manageToken);
  const clientTz = body.timezone ?? "America/Chicago";

  let booking: { id: string; booking_reference: string } | null = null;
  let insertError: { message: string } | null = null;
  // Retry on the (astronomically unlikely) reference collision.
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        status: "held",
        booking_reference: attempt === 0 ? bookingReference : generateBookingReference(),
        slot_start: startDate.toISOString(),
        slot_end: endDate.toISOString(),
        expires_at: expiresAt,
        session_price_cents: SESSION_PRICE_CENTS,
        session_currency: SESSION_CURRENCY,
        pricing_source: PRICING_SOURCE,
        client_timezone: clientTz,
        manage_token_hash: manageTokenHash,
      })
      .select("id, booking_reference")
      .single();
    booking = data ?? null;
    insertError = error ?? null;
  }

  if (insertError || !booking) {
    const conflict = /23P01|exclusion/.test(insertError?.message ?? "");
    return NextResponse.json(
      {
        success: false,
        error: conflict
          ? "That time was just taken. Please choose another slot."
          : "Could not reserve the slot. Please try again.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  await supabase
    .from("slot_holds")
    .insert({ booking_id: booking.id, expires_at: expiresAt });

  return NextResponse.json({
    success: true,
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    manage_token: manageToken,
    pricing: {
      cents: SESSION_PRICE_CENTS,
      currency: SESSION_CURRENCY,
      source: PRICING_SOURCE,
    },
    hold: {
      slot_start: startDate.toISOString(),
      slot_end: endDate.toISOString(),
      expires_at: expiresAt,
      minutes: HOLD_MINUTES,
    },
  });
}
