import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail, type OutgoingEmail } from "@/lib/email/provider";
import {
  bookingConfirmationEmail,
  reminderEmail,
  rescheduleEmail,
  cancellationEmail,
  leadWelcomeEmail,
  leadNurtureEmail2,
  leadNurtureEmail3,
  paymentSucceededEmail,
  paymentFailedEmail,
  paymentActionRequiredEmail,
  refundCompletedEmail,
} from "@/lib/email/templates";
import { canSendNurture, type LeadRecord } from "@/lib/leads";

/**
 * POST|GET /api/jobs/process-emails   (cron-compatible)
 *
 * Auth: Vercel Cron natively sends `Authorization: Bearer $CRON_SECRET`;
 * external schedulers can send `x-cron-secret: <CRON_SECRET>` instead.
 * Both are accepted; the secret must be configured or the worker 503s.
 * Vercel Cron invokes the path with GET, so both methods are served.
 *
 * Outbox worker: claims up to 10 pending notification_jobs whose run_at
 * has passed, renders the template, sends via the provider abstraction,
 * and records the outcome (status, attempt_count, sent_at,
 * provider_message_id, last_error). Idempotent per job via status
 * transitions; a failed send keeps the job pending for retry with
 * attempt_count incremented (max 5 attempts).
 */

const MAX_ATTEMPTS = 5;

export async function GET(request: Request) {
  return processEmails(request);
}

export async function POST(request: Request) {
  return processEmails(request);
}

async function processEmails(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Worker disabled." }, { status: 503 });
  }
  const bearer = request.headers.get("authorization") ?? "";
  const headerOk = request.headers.get("x-cron-secret") === secret;
  const bearerOk = bearer === `Bearer ${secret}`;
  if (!headerOk && !bearerOk) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: jobs, error } = await supabase
    .from("notification_jobs")
    .select("id, booking_id, type, payload, run_at, attempt_count")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at")
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  const results: Array<{ id: string; type: string; status: string }> = [];

  for (const job of jobs ?? []) {
    // Claim: pending → processing (atomic per row).
    const claimed = await supabase
      .from("notification_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;

    const payload = (job.payload ?? {}) as {
      to_email?: string;
      first_name?: string;
      booking_reference?: string;
      manage_url?: string;
      ics_url?: string;
      client_timezone?: string;
      slot_start?: string;
      lead_id?: string;
      book_url?: string;
      unsubscribe_url?: string;
      amount?: string;
    };
    const to = payload.to_email ?? "";
    const isReminder = job.type.startsWith("reminder");
    const isLeadNurture = job.type.startsWith("lead_email_");

    const hoursUntil = payload.slot_start
      ? Math.max(
          0,
          Math.round(
            (new Date(payload.slot_start).getTime() - Date.now()) / 3600000,
          ),
        )
      : 0;

    // Marketing nurture re-checks the lead at SEND time: a booking or an
    // unsubscribe since the job was queued cancels it here. Transactional
    // types never consult the lead record — marketing opt-out does not
    // affect them.
    if (isLeadNurture) {
      const leadId = payload.lead_id;
      let sendable = false;
      if (leadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id, status, email_consent, unsubscribed_at")
          .eq("id", leadId)
          .maybeSingle();
        if (lead && canSendNurture(lead as LeadRecord)) sendable = true;
      }
      if (!sendable) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "cancelled",
            last_error: "nurture_cancelled_lead_state",
          })
          .eq("id", job.id);
        cancelled += 1;
        results.push({ id: job.id, type: job.type, status: "cancelled" });
        continue;
      }
    }

    const email = renderEmail(job.type, payload, to);

    const result = await sendEmail({ ...email, to });

    const patch: Record<string, string | null | number> = {
      status: result.status,
      attempt_count: (job.attempt_count ?? 0) + 1,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
      provider_message_id: result.providerMessageId,
      last_error: result.error,
    };
    // Failed sends go back to pending (unless out of attempts).
    if (result.status !== "sent" && (job.attempt_count ?? 0) + 1 < MAX_ATTEMPTS) {
      patch.status = "pending";
    }
    await supabase.from("notification_jobs").update(patch).eq("id", job.id);

    results.push({ id: job.id, type: job.type, status: String(patch.status) });
    if (result.status === "sent") sent++;
    else failed++;
  }

  return NextResponse.json({ processed: results.length, sent, failed, cancelled });
}

/**
 * Template selection for every job type the queue carries. Transactional
 * types (booking lifecycle + payment notices) are rendered regardless of
 * marketing state; only lead_email_* jobs are gated upstream.
 */
function renderEmail(
  type: string,
  payload: Record<string, string | undefined>,
  to: string,
): OutgoingEmail {
  void to;
  const firstName = payload.first_name ?? "";
  const bookingReference = payload.booking_reference ?? "";
  const manageUrl = payload.manage_url ?? "";
  const clientTimezone = payload.client_timezone ?? "America/Chicago";

  switch (type) {
    case "booking_confirmation":
      return bookingConfirmationEmail({
        firstName,
        bookingReference,
        slotStartISO: payload.slot_start ?? "",
        clientTimezone,
        durationMinutes: 50,
        manageUrl,
        icsUrl: payload.ics_url ?? "",
      });
    case "reminder_24h":
      return reminderEmail({
        firstName,
        bookingReference,
        slotStartISO: payload.slot_start ?? "",
        clientTimezone,
        hoursUntil: 24,
        manageUrl,
        icsUrl: payload.ics_url ?? "",
        durationMinutes: 50,
      });
    case "reminder_2h":
      return reminderEmail({
        firstName,
        bookingReference,
        slotStartISO: payload.slot_start ?? "",
        clientTimezone,
        hoursUntil: 2,
        manageUrl,
        icsUrl: payload.ics_url ?? "",
        durationMinutes: 50,
      });
    case "reschedule":
    case "booking_rescheduled":
      return rescheduleEmail({
        firstName,
        bookingReference,
        slotStartISO: payload.new_slot_start ?? payload.slot_start ?? "",
        clientTimezone,
        durationMinutes: 50,
        manageUrl,
        icsUrl: payload.ics_url ?? "",
      });
    case "booking_cancelled":
      return cancellationEmail({
        firstName,
        bookingReference,
        slotStartISO: payload.slot_start ?? "",
        clientTimezone,
        feeEligible: payload.fee_eligible === "true",
      });
    case "payment_succeeded":
      return paymentSucceededEmail({ firstName, amount: payload.amount ?? "", bookingReference });
    case "payment_failed":
      return paymentFailedEmail({ firstName, bookingReference, manageUrl });
    case "payment_action_required":
      return paymentActionRequiredEmail({ firstName, bookingReference, manageUrl });
    case "refund_completed":
      return refundCompletedEmail({ firstName, amount: payload.amount ?? "", bookingReference });
    case "lead_email_1":
      return leadWelcomeEmail({
        firstName,
        bookUrl: payload.book_url ?? "",
        unsubscribeUrl: payload.unsubscribe_url ?? "",
      });
    case "lead_email_2":
      return leadNurtureEmail2({
        firstName,
        bookUrl: payload.book_url ?? "",
        unsubscribeUrl: payload.unsubscribe_url ?? "",
      });
    case "lead_email_3":
      return leadNurtureEmail3({
        firstName,
        bookUrl: payload.book_url ?? "",
        unsubscribeUrl: payload.unsubscribe_url ?? "",
      });
    default:
      return {
        to: "",
        subject: "True Self Me",
        html: "<p>Notification</p>",
        text: "Notification",
      };
  }
}
