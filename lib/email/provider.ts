/**
 * Transactional email provider abstraction.
 *
 * Booking success NEVER depends on the provider being online: jobs are
 * queued in notification_jobs first, and processed separately by
 * /api/jobs/process-emails. Switching providers means editing this file
 * only — booking logic never changes.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult = {
  status: "sent" | "failed";
  providerMessageId: string | null;
  error: string | null;
};

const FROM =
  process.env.EMAIL_FROM ?? "True Self Me <bookings@trueselfme.com>";

export function emailProviderName(): string {
  return process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY
    ? "resend"
    : "console";
}

async function sendViaResend(email: OutgoingEmail): Promise<SendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: "failed",
        providerMessageId: null,
        error: data.message ?? `HTTP ${res.status}`,
      };
    }
    return {
      status: "sent",
      providerMessageId: data.id ?? null,
      error: null,
    };
  } catch (err) {
    return {
      status: "failed",
      providerMessageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function sendViaConsole(email: OutgoingEmail): Promise<SendResult> {
  const id = `console-${Date.now().toString(36)}`;
  console.log(
    `[email:${id}] → ${email.to}\n  subject: ${email.subject}\n  (console provider — no real delivery)`,
  );
  return { status: "sent", providerMessageId: id, error: null };
}

/** Sends via the configured provider. Never throws. */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  try {
    if (emailProviderName() === "resend") return await sendViaResend(email);
    return await sendViaConsole(email);
  } catch (err) {
    return {
      status: "failed",
      providerMessageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
