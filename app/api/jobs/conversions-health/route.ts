import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/jobs/conversions-health   (CRON_SECRET protected)
 *
 * Queue observability for the Google conversion outbox: counts by
 * status, oldest pending age, and a stuck flag. Point an uptime check
 * or manual review here; `stuck: true` means events are aging out
 * without being uploaded.
 *
 * GET with `?received=1` also returns recent dead_letter/skipped rows
 * for debugging without touching the database console.
 */

const STUCK_THRESHOLD_HOURS = 24;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Disabled." }, { status: 503 });
  }
  const url = new URL(request.url);
  const bearer = request.headers.get("authorization") ?? "";
  const authorized =
    bearer === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "Database not connected." }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();

  const { count: pending } = await supabase
    .from("conversion_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: sent } = await supabase
    .from("conversion_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");
  const { count: deadLetter } = await supabase
    .from("conversion_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "dead_letter");
  const { count: skipped } = await supabase
    .from("conversion_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "skipped");

  const { data: oldest } = await supabase
    .from("conversion_outbox")
    .select("created_at")
    .eq("status", "pending")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const oldestPendingAt = oldest?.created_at ?? null;
  const oldestPendingHours = oldestPendingAt
    ? (Date.now() - new Date(oldestPendingAt).getTime()) / 3_600_000
    : 0;

  const payload: Record<string, unknown> = {
    counts: {
      pending: pending ?? 0,
      sent: sent ?? 0,
      dead_letter: deadLetter ?? 0,
      skipped: skipped ?? 0,
    },
    oldest_pending_at: oldestPendingAt,
    oldest_pending_hours: Math.round(oldestPendingHours * 10) / 10,
    stuck: (pending ?? 0) > 0 && oldestPendingHours >= STUCK_THRESHOLD_HOURS,
    stuck_threshold_hours: STUCK_THRESHOLD_HOURS,
  };

  if (url.searchParams.get("received") === "1") {
    const { data: recent } = await supabase
      .from("conversion_outbox")
      .select(
        "transaction_id, event_type, status, error_code, error_message, attempt_count, created_at",
      )
      .in("status", ["dead_letter", "skipped", "pending"])
      .order("created_at", { ascending: false })
      .limit(20);
    payload.recent_problem_rows = recent ?? [];
  }

  return NextResponse.json(payload);
}
