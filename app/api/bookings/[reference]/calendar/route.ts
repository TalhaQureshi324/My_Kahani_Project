import { buildConsultationIcs } from "@/lib/calendar";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/bookings/[reference]/calendar
 *
 * Serves the RFC 5545 calendar invitation for a booking, addressed by
 * its public reference. Confirmed/rescheduled/completed bookings are
 * downloadable; cancelled bookings return 410 Gone.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!isDatabaseConfigured) {
    return new Response("Scheduling is not connected yet.", { status: 503 });
  }

  const { reference } = await params;
  if (!/^[A-Z0-9-]{4,40}$/i.test(reference)) {
    return new Response("Invalid booking reference.", { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("booking_reference, status, slot_start, slot_end")
    .eq("booking_reference", reference.toUpperCase())
    .single();

  if (error || !booking) {
    return new Response("Booking not found.", { status: 404 });
  }
  if (booking.status === "cancelled") {
    return new Response("This booking was cancelled.", { status: 410 });
  }

  const ics = buildConsultationIcs({
    reference: booking.booking_reference,
    slotStartUTC: booking.slot_start,
    slotEndUTC: booking.slot_end,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="true-self-me-coaching-session.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
