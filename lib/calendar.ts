/**
 * Zero-dependency RFC 5545 calendar generation for booked coaching
 * sessions. Slot times are stored in UTC (timestamptz) and exported as
 * RFC 5545 UTC timestamps so every calendar client renders them
 * correctly regardless of DST.
 */

const DURATION_MINUTES = 50;

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
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export type ConsultationIcsInput = {
  reference: string; // public booking reference (also the event UID)
  slotStartUTC: string | Date;
  slotEndUTC: string | Date;
};

/** Builds the RFC 5545 payload for a booked coaching session. */
export function buildConsultationIcs({
  reference,
  slotStartUTC,
  slotEndUTC,
}: ConsultationIcsInput): string {
  const start = new Date(slotStartUTC);
  const end = new Date(slotEndUTC);
  const stamp = icsUtc(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//True Self Me//Consultation Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(`${reference}@trueselfme.com`)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape("True Self Me Coaching Session")}`,
    `DESCRIPTION:${icsEscape(
      "50-minute virtual coaching session with Fahd Alam. Video link will be dispatched prior to appointment.",
    )}`,
    `LOCATION:${icsEscape("Virtual — video link to follow")}`,
    `STATUS:CONFIRMED`,
    `BEGIN:VALARM`,
    `TRIGGER:-PT1H`,
    `ACTION:DISPLAY`,
    `DESCRIPTION:${icsEscape("True Self Me coaching session in 1 hour")}`,
    `END:VALARM`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
