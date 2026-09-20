import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildBookingConfirmedOutbox,
  buildSessionPaidOutbox,
  buildLeadOutbox,
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
  await supabase.from("conversion_outbox").insert(row);
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

/**
 * lead — queued at capture time, ONLY for leads that arrived with a
 * Google click id (organic leads have nothing to attribute and are not
 * enqueued; they live in the leads table and nurture stream regardless).
 * Stable transaction id: lead:{leadId}.
 */
export async function enqueueLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  const { data } = await supabase
    .from("leads")
    .select("id, first_name, email, phone, status, gclid, attribution")
    .eq("id", leadId)
    .single();
  if (!data) return;

  const configuredValueCents = (() => {
    const raw = process.env.GOOGLE_ADS_LEAD_CONVERSION_VALUE_CENTS ?? "";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  const row = buildLeadOutbox(data, configuredValueCents);
  if (!row) return; // no click id → not attributable via Data Manager API

  await supabase.from("conversion_outbox").insert(row);
}
