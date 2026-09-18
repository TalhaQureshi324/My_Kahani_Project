import type { OutgoingEmail } from "./provider";

/**
 * Email templates for the booking lifecycle. Safe fields only — never
 * card numbers, payment provider ids, gclid or clinical information.
 */

export type BookingEmailData = {
  firstName: string;
  bookingReference: string;
  slotStartISO: string; // UTC
  clientTimezone: string;
  durationMinutes: number;
  manageUrl: string;
  icsUrl: string;
};

function longDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function localTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function bookingConfirmationEmail(
  d: BookingEmailData,
): OutgoingEmail {
  const date = longDate(d.slotStartISO, d.clientTimezone);
  const time = `${localTime(d.slotStartISO, d.clientTimezone)} (${d.clientTimezone})`;

  const text = `Hi ${d.firstName},

Your coaching consultation is confirmed.

  Booking reference: ${d.bookingReference}
  Date: ${date}
  Time: ${time}
  Duration: ${d.durationMinutes} minutes
  Format: Virtual video consultation

Add it to your calendar: ${d.icsUrl}
Manage or reschedule: ${d.manageUrl}

Cancellation policy: free cancellation up to 24 hours before your session. Later cancellations may incur the late-cancellation fee.

— True Self Me, Coaching & Mentorship`;

  const html = `<p>Hi ${d.firstName},</p>
<p>Your coaching consultation is <strong>confirmed</strong>.</p>
<table cellpadding="6" style="font-size:14px">
  <tr><td>Reference</td><td><strong>${d.bookingReference}</strong></td></tr>
  <tr><td>Date</td><td>${date}</td></tr>
  <tr><td>Time</td><td>${time}</td></tr>
  <tr><td>Duration</td><td>${d.durationMinutes} minutes</td></tr>
  <tr><td>Format</td><td>Virtual video consultation</td></tr>
</table>
<p><a href="${d.icsUrl}">Add to Calendar (.ics)</a> · <a href="${d.manageUrl}">Manage booking</a></p>
<p style="color:#666;font-size:12px">Free cancellation up to 24 hours before your session.</p>`;

  return {
    to: "",
    subject: `Consultation confirmed — ${date}, ${time}`,
    html,
    text,
  };
}

export function reminderEmail(
  d: BookingEmailData & { hoursUntil: number },
): OutgoingEmail {
  const date = longDate(d.slotStartISO, d.clientTimezone);
  const time = `${localTime(d.slotStartISO, d.clientTimezone)} (${d.clientTimezone})`;
  const text = `Hi ${d.firstName},

Your coaching session is in ${d.hoursUntil} hours.

  Booking reference: ${d.bookingReference}
  Date: ${date}
  Time: ${time}

Manage or reschedule: ${d.manageUrl}`;
  const html = `<p>Hi ${d.firstName},</p><p>A friendly reminder — your coaching session is in <strong>${d.hoursUntil} hours</strong>.</p><p>${date} · ${time}</p><p><a href="${d.manageUrl}">Manage booking</a></p>`;
  return { to: "", subject: `Reminder — coaching session in ${d.hoursUntil} hours`, html, text };
}

export function rescheduleEmail(d: BookingEmailData): OutgoingEmail {
  const date = longDate(d.slotStartISO, d.clientTimezone);
  const time = `${localTime(d.slotStartISO, d.clientTimezone)} (${d.clientTimezone})`;
  const text = `Hi ${d.firstName},

Your coaching session has been rescheduled.

  New date: ${date}
  New time: ${time}
  Booking reference: ${d.bookingReference}

Add it to your calendar: ${d.icsUrl}`;
  const html = `<p>Hi ${d.firstName},</p><p>Your coaching session has been <strong>rescheduled</strong>.</p><p><strong>${date}</strong> · ${time}</p><p><a href="${d.icsUrl}">Add to Calendar (.ics)</a></p>`;
  return { to: "", subject: "Your session has been rescheduled", html, text };
}

export function cancellationEmail(d: {
  firstName: string;
  bookingReference: string;
  slotStartISO: string;
  clientTimezone: string;
  feeEligible: boolean;
}): OutgoingEmail {
  const date = longDate(d.slotStartISO, d.clientTimezone);
  const fee = d.feeEligible
    ? "Because the cancellation was inside the 24-hour window, it may be subject to the late-cancellation fee."
    : "No cancellation fee applies.";
  const text = `Hi ${d.firstName},

Your booking ${d.bookingReference} for ${date} has been cancelled. ${fee}`;
  const html = `<p>Hi ${d.firstName},</p><p>Your booking <strong>${d.bookingReference}</strong> (${date}) has been cancelled. ${fee}</p><p>We hope to work with you another time.</p>`;
  return {
    to: "",
    subject: "Booking cancelled — True Self Me",
    html,
    text,
  };
}

/** Fills the recipient on a prebuilt template. */
export function addressed(email: OutgoingEmail, to: string): OutgoingEmail {
  return { ...email, to };
}
