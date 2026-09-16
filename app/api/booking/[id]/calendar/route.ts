import { buildConsultationIcs, slotUtc } from "@/lib/calendar";

/**
 * Serves the RFC 5545 calendar invitation for a booked consultation as
 * a downloadable .ics file. Stateless: the booking reference rides in
 * the path and the slot travels as query params, so no server-side
 * storage is required.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const hour = Number(url.searchParams.get("hour") ?? NaN);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return new Response("Invalid booking reference or slot.", { status: 400 });
  }

  // sanity: the referenced slot must still be a real upcoming instant
  const start = slotUtc(date, hour);
  if (Number.isNaN(start.getTime())) {
    return new Response("Invalid booking reference or slot.", { status: 400 });
  }

  const ics = buildConsultationIcs({ bookingId: id, dateISO: date, hourCST: hour });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="true-self-me-consultation.ics"',
      "Cache-Control": "no-store",
    },
  });
}
