import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildBookingConfirmedOutbox,
  buildSessionPaidOutbox,
  type BookingSnapshot,
} from "./convert";

/**
 * Outbox enqueue points. Enqueue happens AFTER the business commit and
 * must never break it: callers wrap these in try/catch — a Google outage
 * or an insert failure leaves the booking/payment fully successful.
 */

const SNAPSHOT_COLUMNS =
  "id, booking_reference, status, payment_status, email, phone, confirmed_at, paid_at, gclid, attribution";

function bookingValueCents(): number | null {
  const raw = process.env.GOOGLE_ADS_BOOKING_CONVERSION_VALUE_CENTS ?? "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** booking_confirmed — called right after the hold converts to confirmed. */
export async function enqueueBookingConfirmed(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  const { data } = await supabase
    .from("bookings")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", bookingId)
    .single();
  if (!data) return;
  const row = buildBookingConfirmedOutbox(
    data as BookingSnapshot,
    bookingValueCents(),
  );
  if (!row) return;
  await supabase
    .from("conversion_outbox")
    .upsert(row, {
      onConflict: "booking_id,event_type",
      ignoreDuplicates: true,
    });
}

/** session_paid — called right after payment_status flips to 'paid'. */
export async function enqueueSessionPaid(
  supabase: SupabaseClient,
  bookingId: string,
  collectedCents: number | null,
): Promise<void> {
  const { data } = await supabase
    .from("bookings")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", bookingId)
    .single();
  if (!data) return;
  const row = buildSessionPaidOutbox(
    data as BookingSnapshot,
    collectedCents,
  );
  if (!row) return;
  await supabase
    .from("conversion_outbox")
    .upsert(row, {
      onConflict: "booking_id,event_type",
      ignoreDuplicates: true,
    });
}
