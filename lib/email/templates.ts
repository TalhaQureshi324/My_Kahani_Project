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

/* ════════════════════════════════════════════════════════════════════
   Phase 8 — lead nurture (MARKETING) + transactional payment mail.

   Nurture copy rules: non-clinical coaching voice, a booking CTA, no
   diagnostic claims, no health promises. Marketing unsubscribe never
   affects transactional booking mail (separate job types + gating).
   ════════════════════════════════════════════════════════════════════ */

export type LeadEmailData = {
  firstName: string;
  bookUrl: string;
  unsubscribeUrl: string;
};

function nurtureFooter(unsubscribeUrl: string): string {
  return `<p style="color:#8a8178;font-size:12px">You received this because you asked us to stay in touch. <a href="${unsubscribeUrl}" style="color:#8a8178">Unsubscribe</a> anytime — booking confirmations and reminders are separate and always continue.</p>`;
}

export function leadWelcomeEmail(d: LeadEmailData): OutgoingEmail {
  const text = `Hi ${d.firstName},

Thanks for reaching out to True Self Me. Whatever brought you here, taking a first look is worth something — most people wait far longer.

No pressure and no homework. When it feels right, you can pick a time for a relaxed 50-minute introductory conversation:

${d.bookUrl}

Unsubscribe: ${d.unsubscribeUrl}

Talk soon,
Fahd — True Self Me, Coaching & Mentorship`;
  const html = `<p>Hi ${d.firstName},</p>
<p>Thanks for reaching out to True Self Me. Whatever brought you here, taking a first look is worth something — most people wait far longer.</p>
<p>No pressure and no homework. When it feels right, you can pick a time for a relaxed 50-minute introductory conversation.</p>
<p><a href="${d.bookUrl}" style="display:inline-block;background:#5D1F13;color:#F5EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Choose a time that works</a></p>
${nurtureFooter(d.unsubscribeUrl)}`;
  return {
    to: "",
    subject: "Glad you stopped by — when you're ready",
    html,
    text,
  };
}

export function leadNurtureEmail2(d: LeadEmailData): OutgoingEmail {
  const text = `Hi ${d.firstName},

A quick thought from your friends at True Self Me: clarity rarely arrives on a schedule. Most people who book a first conversation say the hardest part was simply deciding to look at what they wanted.

If that resonates, the next step is small — a 50-minute conversation about where you are and what you'd like to move toward:

${d.bookUrl}

Unsubscribe: ${d.unsubscribeUrl}

Talk soon,
Fahd — True Self Me, Coaching & Mentorship`;
  const html = `<p>Hi ${d.firstName},</p>
<p>A quick thought: clarity rarely arrives on a schedule. Most people who book a first conversation say the hardest part was simply deciding to look at what they wanted.</p>
<p>If that resonates, the next step is small — a 50-minute conversation about where you are and what you'd like to move toward.</p>
<p><a href="${d.bookUrl}" style="display:inline-block;background:#5D1F13;color:#F5EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Book your intro conversation</a></p>
${nurtureFooter(d.unsubscribeUrl)}`;
  return {
    to: "",
    subject: "A small next step, whenever you're ready",
    html,
    text,
  };
}

export function leadNurtureEmail3(d: LeadEmailData): OutgoingEmail {
  const text = `Hi ${d.firstName},

Last note from me for now — I know inboxes get busy.

If a 50-minute conversation about your next chapter sounds useful, my calendar is open:

${d.bookUrl}

Unsubscribe: ${d.unsubscribeUrl}

If now isn't the time, that's completely fine. You can always book later at trueselfme.com.

Talk soon,
Fahd — True Self Me, Coaching & Mentorship`;
  const html = `<p>Hi ${d.firstName},</p>
<p>Last note from me for now — I know inboxes get busy.</p>
<p>If a 50-minute conversation about your next chapter sounds useful, my calendar is open.</p>
<p><a href="${d.bookUrl}" style="display:inline-block;background:#5D1F13;color:#F5EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Pick your time</a></p>
<p style="color:#666;font-size:13px">If now isn't the time, that's completely fine — you can always book later.</p>
${nurtureFooter(d.unsubscribeUrl)}`;
  return {
    to: "",
    subject: "Opening the door one more time",
    html,
    text,
  };
}

/* ── transactional payment notifications (NOT marketing) ─────────────── */

export function paymentSucceededEmail(d: {
  firstName: string;
  amount: string;
  bookingReference: string;
}): OutgoingEmail {
  const text = `Hi ${d.firstName},

Your payment of ${d.amount} for session ${d.bookingReference} was received successfully. Thank you.

A receipt accompanies this message from our payment processor.`;
  const html = `<p>Hi ${d.firstName},</p><p>Your payment of <strong>${d.amount}</strong> for session <strong>${d.bookingReference}</strong> was received successfully. Thank you.</p><p style="color:#666;font-size:12px">A receipt accompanies this message from our payment processor.</p>`;
  return {
    to: "",
    subject: `Payment received — ${d.amount}`,
    html,
    text,
  };
}

export function paymentFailedEmail(d: {
  firstName: string;
  bookingReference: string;
  manageUrl: string;
}): OutgoingEmail {
  const text = `Hi ${d.firstName},

We could not complete the payment for session ${d.bookingReference}. No charge was made.

You can review your session and payment details any time on your secure booking page:

${d.manageUrl}

— True Self Me, Coaching & Mentorship`;
  const html = `<p>Hi ${d.firstName},</p><p>We could not complete the payment for session <strong>${d.bookingReference}</strong>. <strong>No charge was made.</strong></p><p>You can review your session and payment details on your secure booking page.</p><p><a href="${d.manageUrl}" style="display:inline-block;background:#5D1F13;color:#F5EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Open my booking</a></p>`;
  return {
    to: "",
    subject: "Payment could not be completed",
    html,
    text,
  };
}

export function paymentActionRequiredEmail(d: {
  firstName: string;
  bookingReference: string;
  manageUrl: string;
}): OutgoingEmail {
  const text = `Hi ${d.firstName},

Your bank needs one more verification step to finish the payment for session ${d.bookingReference}.

Complete it on your secure booking page (a few seconds, no new details needed):

${d.manageUrl}

If the step isn't completed, the payment simply doesn't go through — you can also retry there later.`;
  const html = `<p>Hi ${d.firstName},</p><p>Your bank needs one more verification step to finish the payment for session <strong>${d.bookingReference}</strong>.</p><p>Complete it on your secure booking page — it takes a few seconds and no new details are needed.</p><p><a href="${d.manageUrl}" style="display:inline-block;background:#5D1F13;color:#F5EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Verify with my bank</a></p><p style="color:#666;font-size:12px">If the step isn't completed the payment simply doesn't go through — you can retry there later.</p>`;
  return {
    to: "",
    subject: "One quick step to finish your payment",
    html,
    text,
  };
}

export function refundCompletedEmail(d: {
  firstName: string;
  amount: string;
  bookingReference: string;
}): OutgoingEmail {
  const text = `Hi ${d.firstName},

Your refund of ${d.amount} for booking ${d.bookingReference} has been completed. Depending on your bank, it can take a few business days to appear on your statement.

We hope to work with you again.`;
  const html = `<p>Hi ${d.firstName},</p><p>Your refund of <strong>${d.amount}</strong> for booking <strong>${d.bookingReference}</strong> has been completed.</p><p style="color:#666;font-size:12px">Depending on your bank it can take a few business days to appear on your statement.</p><p>We hope to work with you again.</p>`;
  return {
    to: "",
    subject: `Refund completed — ${d.amount}`,
    html,
    text,
  };
}

/* ── crisis emergency-information response ───────────────────────────── */

export function emergencyInfoEmail(firstName: string): OutgoingEmail {
  const text = `Hi ${firstName},

Thank you for reaching out. If you are in immediate danger or experiencing an emergency, please contact emergency services (911 in the US) or call/text the 988 Suicide & Crisis Lifeline (call or text 988 in the US) right now — they can help immediately.

True Self Me offers non-clinical coaching and is not an emergency service. Your message has been flagged for personal review and a real person will follow up as soon as possible.

You matter. Please reach out to the resources above right now if you are in crisis.`;
  const html = `<p>Hi ${firstName},</p>
<p>Thank you for reaching out. If you are in immediate danger or experiencing an emergency, please contact <strong>emergency services (911 in the US)</strong> or the <strong>988 Suicide &amp; Crisis Lifeline (call or text 988 in the US)</strong> right now — they can help immediately.</p>
<p>True Self Me offers non-clinical coaching and is <strong>not an emergency service</strong>. Your message has been flagged for personal review and a real person will follow up as soon as possible.</p>
<p>You matter. Please reach out to the resources above right now if you are in crisis.</p>`;
  return {
    to: "",
    subject: "Important — immediate support resources",
    html,
    text,
  };
}
