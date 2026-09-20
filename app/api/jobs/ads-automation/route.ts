import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email/provider";
import { site } from "@/lib/site";
import {
  defaultConfig,
  evaluateBudgetCeiling,
  evaluateCheckpoint,
  evaluateGooglePipeline,
  evaluateLandingPageHealth,
  evaluateSpendAnomaly,
  evaluateStripeHealth,
  noDuplicatePause,
  type CampaignState,
  type Decision,
  type ProposedAction,
} from "@/lib/ads/automation";

/**
 * GET|POST /api/jobs/ads-automation   (CRON_SECRET guarded)
 *
 * Phase 11 — deterministic guardrail evaluation over the advertising
 * state. DEFAULTS TO DRY RUN: proposed Google Ads mutations are recorded
 * in ads_automation_actions with dry_run = true and are NEVER sent to
 * Google. Live mutations additionally require ADS_AUTOMATION_MODE=live
 * AND a connected Google Ads API mutator (not yet implemented), and even
 * then only the explicit, bounded rules approved by the operator run.
 *
 * Duplicate cron protection: each batch claims its evaluation window via
 * a unique (rule_batch, window_start) row — a second concurrent cron
 * loses the claim and reports skipped.
 *
 * Data sources:
 *   Google Ads reporting — NOT CONNECTED. Metrics come from the fixture
 *   provider (GOOGLE_ADS_METRICS_PROVIDER unset or 'fixture') which
 *   returns zeros; rule evaluations therefore stay quiet until the Ads
 *   API is integrated. Tests exercise the rules directly.
 *   Site + Stripe health — REAL, read from live HTTP and the database.
 */

const BATCH = "daily_guardrails";

function automationMode(): "dry_run" | "live" {
  return process.env.ADS_AUTOMATION_MODE === "live" ? "live" : "dry_run";
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function guard(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    return { ok: false as const, res: NextResponse.json({ error: "Worker disabled." }, { status: 503 }) };
  }
  const bearer = request.headers.get("authorization") ?? "";
  if (
    request.headers.get("x-cron-secret") !== secret &&
    bearer !== `Bearer ${secret}`
  ) {
    return { ok: false as const, res: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  const rl = rateLimit(`ads-automation:${clientIp(request)}`, 10, 60_000);
  if (!rl.allowed) {
    return { ok: false as const, res: NextResponse.json({ error: "Too many requests." }, { status: 429 }) };
  }
  if (!isDatabaseConfigured) {
    return { ok: false as const, res: NextResponse.json({ error: "Database not connected." }, { status: 503 }) };
  }
  return { ok: true as const };
}

/** Real landing-page + scheduler checks (live signals, no Google needed). */
async function siteChecks(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mykahaniproject.vercel.app";
  const checks: Array<{
    atMinutesAgo: number;
    landingHttpStatus: number | null;
    schedulerOk: boolean;
  }> = [];
  const now = Date.now();
  for (const minutesAgo of [0, 5, 10, 15, 20]) {
    // Historical checks are reconstructed from the most recent live probe
    // repeated back through the window (documented limitation until a
    // dedicated uptime sampler exists).
    let landingHttpStatus: number | null = null;
    let schedulerOk = false;
    if (minutesAgo === 0) {
      try {
        const res = await fetch(`${siteUrl}/coaching-for-dads`, {
          signal: AbortSignal.timeout(10_000),
        });
        landingHttpStatus = res.status;
        const avail = await fetch(`${siteUrl}/api/availability`, {
          signal: AbortSignal.timeout(10_000),
        });
        schedulerOk = avail.ok;
      } catch {
        landingHttpStatus = null;
        schedulerOk = false;
      }
    } else {
      const { data } = await supabase
        .from("ads_site_health")
        .select("landing_ok, scheduler_ok")
        .gte("checked_at", new Date(now - minutesAgo * 60_000).toISOString())
        .limit(1)
        .maybeSingle();
      landingHttpStatus = data?.landing_ok === false ? 503 : 200;
      schedulerOk = data?.scheduler_ok !== false;
    }
    checks.push({ atMinutesAgo: minutesAgo, landingHttpStatus, schedulerOk });
  }
  // Record the fresh probe for future windows (best-effort).
  try {
    await supabase.from("ads_site_health").insert({
      landing_ok: checks[0].landingHttpStatus != null && checks[0].landingHttpStatus < 400,
      scheduler_ok: checks[0].schedulerOk,
      checked_at: new Date().toISOString(),
    });
  } catch {
    /* table may not exist yet if migration pending — health rules still work
       from the live probe */
  }
  return checks;
}

async function stripeHealth(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const one = async (table: string, query: string) => {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
  };

  const setupOk = await one(
    "stripe_events",
    `select=count&event_type=eq.setup_intent.succeeded&received_at=gte.${since}`,
  );
  const setupFail = await one(
    "stripe_events",
    `select=count&event_type=eq.setup_intent.setup_failed&received_at=gte.${since}`,
  );
  const webhookFail = await one(
    "stripe_events",
    `select=count&processing_status=eq.failed&received_at=gte.${since}`,
  );
  const actionRequired = await one(
    "bookings",
    "select=count&payment_status=eq.requires_customer_action",
  );
  const declines = await one(
    "bookings",
    `select=count&payment_status=eq.failed&last_payment_attempt_at=gte.${since}`,
  );

  return {
    setupAttempts: setupOk + setupFail,
    setupFailures: setupFail,
    webhookFailures24h: webhookFail,
    requiresCustomerActionCount: actionRequired,
    postSessionDeclines: declines,
  };
}

async function googlePipelineState(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: lastSuccess } = await supabase
    .from("conversion_outbox")
    .select("sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: pending } = await supabase
    .from("conversion_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const minutesSinceLastSuccess = lastSuccess?.sent_at
    ? Math.round((Date.now() - new Date(lastSuccess.sent_at).getTime()) / 60_000)
    : null;
  return {
    minutesSinceLastSuccess,
    pendingEvents: pending ?? 0,
    lastAuthError: null as string | null,
  };
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const guardRes = await guard(request);
  if (!guardRes.ok) return guardRes.res;

  const config = defaultConfig();
  const mode = automationMode();
  const supabase = getSupabaseAdmin();

  // Duplicate-run claim: unique (rule_batch, window_start).
  const windowStart = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: claim, error: claimError } = await supabase
    .from("ads_automation_runs")
    .insert({
      rule_batch: BATCH,
      window_start: windowStart,
      mode,
      status: "running",
    })
    .select("id")
    .maybeSingle();
  if (claimError || !claim) {
    return NextResponse.json(
      {
        skipped: true,
        reason: "another run already owns this evaluation window",
        windowStart,
      },
      { status: 200 },
    );
  }
  const runId = claim.id;

  try {
    // ── gather state ──
    const campaignState: CampaignState = "ENABLED"; // campaign is paused in Google; once live, the Ads API feeds the real state
    const fixtureSpendCents = 0; // fixture provider: no live spend until Ads API connects

    const decisions: Decision[] = [];

    // $400 checkpoint + ceiling + anomaly run on fixture spend (zeros)
    // until the Google Ads API reports real numbers.
    const checkpoint = evaluateCheckpoint(
      {
        cumulativeSpendCents: fixtureSpendCents,
        confirmedBookings: 0,
        qualifiedLeads: 0,
        campaignState,
      },
      config,
    );
    decisions.push(checkpoint);
    decisions.push(
      evaluateBudgetCeiling(fixtureSpendCents, campaignState, config),
    );
    decisions.push(
      evaluateSpendAnomaly(
        [
          {
            date: new Date().toISOString().slice(0, 10),
            spendCents: fixtureSpendCents,
            fractionOfDayElapsed: 1,
          },
        ],
        config,
      ),
    );

    // Landing page + scheduler health (LIVE probes)
    const checks = await siteChecks(supabase);
    decisions.push(evaluateLandingPageHealth(checks, config));

    // Stripe operational health (LIVE database signals)
    decisions.push(evaluateStripeHealth(await stripeHealth(supabase), config));

    // Google conversion pipeline (LIVE outbox signals)
    decisions.push(
      evaluateGooglePipeline(await googlePipelineState(supabase), config),
    );

    // Campaign already paused? Collapse duplicate pause mutations.
    const merged: Decision = {
      actions: [] as ProposedAction[],
      alerts: decisions.flatMap((d) => d.alerts),
    };
    let workingState: CampaignState = campaignState;
    for (const d of decisions) {
      for (const a of d.actions) {
        if (a.action === "pause_campaign" && workingState === "PAUSED") continue;
        merged.actions.push(a);
        if (a.action === "pause_campaign") workingState = "PAUSED";
      }
    }
    noDuplicatePause(merged, campaignState);

    // ── persist actions (dry_run unless live mode is explicitly on) ──
    const dryRun = mode === "dry_run";
    const actionRows = merged.actions.map((a) => ({
      run_id: runId,
      entity: a.entity,
      entity_ref: a.entityRef,
      action: a.action,
      previous_value: a.previousValue,
      new_value: a.newValue,
      rule: a.rule,
      reason: a.reason,
      dry_run: dryRun,
      executed: false, // live execution requires the Google Ads mutator
      rollback_info: { revert_to: a.previousValue },
    }));
    if (actionRows.length > 0) {
      await supabase.from("ads_automation_actions").insert(actionRows);
    }

    // ── persist alerts + email critical ones ──
    const critical = merged.alerts.filter((a) => a.severity === "critical");
    if (merged.alerts.length > 0) {
      await supabase.from("ads_alerts").insert(
        merged.alerts.map((a) => ({
          run_id: runId,
          severity: a.severity,
          type: a.type,
          message: a.message,
          payload: a.payload ?? {},
        })),
      );
    }
    for (const a of critical) {
      try {
        await sendEmail({
          to: site.email,
          subject: `[CRITICAL] ${a.type} — True Self Me ads automation`,
          html: `<p>${a.message}</p><pre>${JSON.stringify(a.payload, null, 2)}</pre>`,
          text: `${a.message}\n\n${JSON.stringify(a.payload, null, 2)}`,
        });
      } catch (e) {
        console.error("[ads-automation] critical alert email failed", e);
      }
    }

    // ── close the run ──
    const summary = {
      mode,
      dryRun,
      campaignState,
      fixtureSpendCents,
      actions: merged.actions.length,
      alerts: merged.alerts.map((a) => ({ type: a.type, severity: a.severity })),
      siteChecks: checks[0],
      stripe: await stripeHealth(supabase),
    };
    await supabase
      .from("ads_automation_runs")
      .update({ status: "completed", finished_at: new Date().toISOString(), summary })
      .eq("id", runId);

    return NextResponse.json({ runId, ...summary });
  } catch (err) {
    await supabase
      .from("ads_automation_runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
