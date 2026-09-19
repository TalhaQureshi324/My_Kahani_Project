/**
 * SMS provider abstraction — scaffolded, not yet wired to any flow.
 *
 * Rules when SMS goes live (Phase 8 spec):
 *   - SMS is sent ONLY to leads with sms_consent = true, captured via an
 *     explicit opt-in checkbox at signup.
 *   - Every message includes STOP/unsubscribe instructions; a STOP reply
 *     must flip the lead to unsubscribed the same way email unsubscribe
 *     does (unsubscribed status + cancelled nurture jobs).
 *   - Message copy never includes clinical/private details — the same
 *     redaction rules as email.
 *
 * Adding a provider: implement sendSms below (Twilio, etc.) and select it
 * via SMS_PROVIDER. The console provider logs and reports success so the
 * plumbing can be exercised end-to-end without an account.
 */

export type OutgoingSms = {
  to: string; // E.164
  body: string;
};

export type SmsSendResult = {
  status: "sent" | "failed";
  providerMessageId: string | null;
  error: string | null;
};

export function smsProviderName(): string {
  return process.env.SMS_PROVIDER ?? "console";
}

export async function sendSms(sms: OutgoingSms): Promise<SmsSendResult> {
  const provider = smsProviderName();
  if (provider === "console") {
    console.log(
      `[sms:console] → ${sms.to}: ${sms.body.slice(0, 120)}${
        sms.body.length > 120 ? "…" : ""
      }`,
    );
    return { status: "sent", providerMessageId: null, error: null };
  }
  // Future providers plug in here.
  return {
    status: "failed",
    providerMessageId: null,
    error: `Unknown SMS provider: ${provider}`,
  };
}
