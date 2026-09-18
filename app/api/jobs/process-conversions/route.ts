import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import {
  getDataManagerConfig,
  ingestEvents,
  MAX_ATTEMPTS,
  nextAttemptAtFor,
} from "@/lib/ads/dataManager";
import {
  buildIngestRequest,
  type GoogleAdsConversionConfig,
  type OutboxRow,
} from "@/lib/ads/convert";

/**
 * POST|GET /api/jobs/process-conversions   (cron-compatible)
 *
 * Asynchronous uploader from conversion_outbox to the Google Data Manager
 * API. Business success (booking / payment) never depends on this worker:
 * it only moves already-committed outbox rows.
 *
 * Auth: identical to the email worker — Vercel Cron's
 * `Authorization: Bearer $CRON_SECRET` or an external scheduler's
 * `x-cron-secret` header. Unconfigured secret ⇒ worker disabled (503).
 *
 * Per row:
 *   claim (pending→processing, atomic) → build request → ingest →
 *   sent | skipped (nothing matchable / action unconfigured) |
 *   retryable (exponential backoff, max MAX_ATTEMPTS) |
 *   dead_letter (permanent failure or retries exhausted).
 */

const BATCH = 25;

export async function GET(request: Request) {
  return processConversions(request);
}

export async function POST(request: Request) {
  return processConversions(request);
}

function conversionConfig(): GoogleAdsConversionConfig | null {
  const accountId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "")
    .replace(/\D/g, "");
  const confirmedActionId =
    process.env.GOOGLE_ADS_BOOKING_CONFIRMED_ACTION_ID ?? "";
  const paidActionId =
    process.env.GOOGLE_ADS_SESSION_PAID_ACTION_ID ?? "";
  if (!accountId || (!confirmedActionId && !paidActionId)) return null;
  return {
    accountId,
    confirmedActionId: confirmedActionId || null,
    paidActionId: paidActionId || null,
  };
}

async function processConversions(request: Request) {
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
  const rl = rateLimit(`process-conversions:${clientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  }

  const config = conversionConfig();
  if (!config) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      note: "Google conversions not configured (GOOGLE_ADS_CUSTOMER_ID / action ids).",
    });
  }

  const supabase = getSupabaseAdmin();

  // Due batch, oldest first.
  const { data: due, error: dueError } = await supabase
    .from("conversion_outbox")
    .select(
      "id, booking_id, event_type, transaction_id, event_timestamp, conversion_value, currency, gclid, gbraid, wbraid, hashed_identifiers, ads_user_data_consent, ads_personalization_consent, status, attempt_count",
    )
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("event_timestamp")
    .limit(BATCH);

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }

  let sent = 0;
  let retried = 0;
  let deadLettered = 0;
  let skipped = 0;
  const results: Array<{ id: string; outcome: string }> = [];

  for (const row of due ?? []) {
    // Atomic claim: pending → processing (loses to concurrent workers).
    const claimed = await supabase
      .from("conversion_outbox")
      .update({ status: "processing", last_attempt_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;

    const attempt = (row.attempt_count ?? 0) + 1;
    const { body, uploadable, skipped: unmatchable } = buildIngestRequest(
      [row as OutboxRow],
      config,
    );

    // Nothing matchable (no click id, user data withheld) or its
    // conversion action isn't configured — terminal, not an error.
    if (!body) {
      const reason = unmatchable.length > 0 && !isUploadableRow(row)
        ? "no_matchable_identifier"
        : "conversion_action_not_configured";
      await supabase
        .from("conversion_outbox")
        .update({
          status: "skipped",
          error_code: reason,
          error_message: reason,
          attempt_count: attempt,
        })
        .eq("id", row.id);
      skipped += 1;
      results.push({ id: row.id, outcome: reason });
      continue;
    }

    const outcome = await ingestEvents({ body });
    const attemptCount = attempt;

    if (outcome.kind === "sent") {
      await supabase
        .from("conversion_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          google_request_id: outcome.requestId,
          error_code: null,
          error_message: null,
          attempt_count: attemptCount,
          next_attempt_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      sent += 1;
      results.push({ id: row.id, outcome: "sent" });
      continue;
    }

    if (outcome.kind === "permanent" || attemptCount >= MAX_ATTEMPTS) {
      await supabase
        .from("conversion_outbox")
        .update({
          status: "dead_letter",
          error_code: outcome.errorCode,
          error_message: outcome.errorMessage,
          attempt_count: attemptCount,
        })
        .eq("id", row.id);
      deadLettered += 1;
      results.push({ id: row.id, outcome: `dead_letter:${outcome.errorCode}` });
      continue;
    }

    // Retryable — exponential backoff; the row stays 'pending' and the
    // next_attempt_at guard keeps it out of the claim set until due.
    const backoff = nextAttemptAtFor(attemptCount);
    await supabase
      .from("conversion_outbox")
      .update({
        status: "pending",
        error_code: outcome.errorCode,
        error_message: outcome.errorMessage,
        attempt_count: attemptCount,
        next_attempt_at: backoff.toISOString(),
      })
      .eq("id", row.id);
    retried += 1;
    results.push({ id: row.id, outcome: `retry:${outcome.errorCode}` });
  }

  return NextResponse.json({
    processed: (due ?? []).length,
    sent,
    retried,
    dead_lettered: deadLettered,
    skipped,
    results,
  });
}

function isUploadableRow(row: OutboxRow): boolean {
  return Boolean(
    row.gclid ||
      row.gbraid ||
      row.wbraid ||
      (row.ads_user_data_consent === "granted" && row.hashed_identifiers &&
        (Object.values(row.hashed_identifiers).some((v) => Boolean(v)))),
  );
}
