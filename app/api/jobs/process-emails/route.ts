import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail, type OutgoingEmail } from "@/lib/email/provider";
import {
  bookingConfirmationEmail,
  reminderEmail,
} from "@/lib/email/templates";

/**
 * POST /api/jobs/process-emails   (cron-compatible)
 *
 * Auth: Vercel Cron natively sends `Authorization: Bearer $CRON_SECRET`;
 * external schedulers can send `x-cron-secret: <CRON_SECRET>` instead.
 * Both are accepted; the secret must be configured or the worker 503s.
 *
 * Outbox worker: claims up to 10 pending notification_jobs whose run_at
 * has passed, renders the template, sends via the provider abstraction,
 * and records the outcome (status, attempt_count, sent_at,
 * provider_message_id, last_error). Idempotent per job via status
 * transitions; a failed send keeps the job pending for retry with
 * attempt_count incremented (max 5 attempts).
 */

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
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
    };
    const to = payload.to_email ?? "";
    const isReminder = job.type.startsWith("reminder");

    const hoursUntil = payload.slot_start
      ? Math.max(
          0,
          Math.round(
            (new Date(payload.slot_start).getTime() - Date.now()) / 3600000,
          ),
        )
      : 0;

    let email: OutgoingEmail;
    if (job.type === "booking_confirmation") {
      email = bookingConfirmationEmail({
        firstName: payload.first_name ?? "",
        bookingReference: payload.booking_reference ?? "",
        slotStartISO: payload.slot_start ?? "",
        clientTimezone: payload.client_timezone ?? "America/Chicago",
        durationMinutes: 50,
        manageUrl: payload.manage_url ?? "",
        icsUrl: payload.ics_url ?? "",
      });
    } else if (isReminder) {
      email = reminderEmail({
        firstName: payload.first_name ?? "",
        bookingReference: payload.booking_reference ?? "",
        slotStartISO: payload.slot_start ?? "",
        clientTimezone: payload.client_timezone ?? "America/Chicago",
        hoursUntil: hoursUntil,
        manageUrl: payload.manage_url ?? "",
        icsUrl: payload.ics_url ?? "",
        durationMinutes: 50,
      });
    } else {
      email = {
        to,
        subject: "True Self Me",
        html: "<p>Notification</p>",
        text: "Notification",
      };
    }

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

  return NextResponse.json({ processed: results.length, sent, failed });
}
