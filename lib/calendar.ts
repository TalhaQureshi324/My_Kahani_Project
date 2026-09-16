/**
 * Zero-dependency RFC 5545 calendar generator for booked consultations.
 * Slot times are defined in the practice's timezone (America/Chicago)
 * and exported as UTC (DTSTART/DTEND …Z) so every calendar client —
 * Apple Calendar, Outlook, Google Calendar — renders them correctly.
 */

const PRACTICE_TZ = "America/Chicago";
const DURATION_MINUTES = 50;

function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return (asUTC - utcMs) / 60000;
}

/** UTC instant of a wall-clock hour on dateISO in the practice timezone. */
export function slotUtc(dateISO: string, hourCST: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, hourCST);
  const off1 = tzOffsetMinutes(PRACTICE_TZ, naive);
  const off2 = tzOffsetMinutes(PRACTICE_TZ, naive - off1 * 60000);
  return new Date(naive - off2 * 60000);
}

/** RFC 5545 UTC timestamp: YYYYMMDDTHHMMSSZ */
function icsUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

/** Escape text values per RFC 5545 §3.3.11. */
function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export type ConsultationIcsInput = {
  bookingId: string;
  dateISO: string;
  hourCST: number;
};

/** Builds the RFC 5545 payload for a booked consultation. */
export function buildConsultationIcs({
  bookingId,
  dateISO,
  hourCST,
}: ConsultationIcsInput): string {
  const start = slotUtc(dateISO, hourCST);
  const end = new Date(start.getTime() + DURATION_MINUTES * 60000);
  const stamp = icsUtc(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//True Self Me//Consultation Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(`${bookingId}@trueselfme.com`)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape("Consultation — True Self Me")}`,
    `DESCRIPTION:${icsEscape(
      "50-minute virtual consultation with Fahd Alam. Video link will be dispatched prior to appointment.",
    )}`,
    `LOCATION:${icsEscape("Virtual — video link to follow")}`,
    `STATUS:CONFIRMED`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("True Self Me consultation in 1 hour")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
