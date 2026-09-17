/**
 * Centralized booking state machine. Every status change goes through
 * assertTransition — arbitrary status strings never appear in code.
 */

export const BOOKING_STATUSES = [
  "held",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Allowed transitions. Notes:
 * - held → cancelled covers expired/abandoned holds (release_expired_holds).
 * - confirmed → rescheduled models a slot move; the row keeps its identity
 *   (same booking_reference) and returns to confirmed immediately after the
 *   atomic slot update, audited via booking_operations + rescheduled_from.
 * - cancelled/completed/no_show are terminal. Correcting one requires an
 *   explicit administrative update, never a normal code path.
 */
const ALLOWED: Record<BookingStatus, readonly BookingStatus[]> = {
  held: ["confirmed", "cancelled"],
  confirmed: ["rescheduled", "cancelled", "completed", "no_show"],
  rescheduled: ["cancelled", "completed", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal booking transition: ${from} → ${to}`);
  }
}
