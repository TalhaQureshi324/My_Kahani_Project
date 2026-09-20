/**
 * Phase 11 tests — ads automation guardrails (pure rules engine).
 *
 * Provider-independent by design: Google Ads reporting data arrives as
 * fixture inputs. These tests are NOT live Google verification.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultConfig,
  evaluateCheckpoint,
  evaluateBudgetCeiling,
  evaluateSpendAnomaly,
  classifySearchTerm,
  evaluateLandingPageHealth,
  evaluateStripeHealth,
  evaluateGooglePipeline,
  noDuplicatePause,
  buildWeeklyDigest,
} from "../lib/ads/automation.ts";

const baseConfig = () => defaultConfig({ pauseOnSiteOutage: true, pauseOnStripeBreak: true });

/* ── mode defaults ───────────────────────────────────────────────────── */

test("automation mode defaults to dry_run; live requires explicit opt-in", () => {
  delete process.env.ADS_AUTOMATION_MODE;
  assert.equal(defaultConfig().mode, "dry_run");
  process.env.ADS_AUTOMATION_MODE = "live";
  assert.equal(defaultConfig().mode, "live");
  process.env.ADS_AUTOMATION_MODE = "garbage";
  assert.equal(defaultConfig().mode, "dry_run", "anything but 'live' stays dry");
  delete process.env.ADS_AUTOMATION_MODE;
});

/* ── $400 checkpoint ─────────────────────────────────────────────────── */

test("$400 checkpoint: 0 bookings + <5 qualified leads → pause + critical", () => {
  const d = evaluateCheckpoint(
    { cumulativeSpendCents: 40000, confirmedBookings: 0, qualifiedLeads: 4, campaignState: "ENABLED" },
    baseConfig(),
  );
  assert.equal(d.actions.length, 1);
  assert.equal(d.actions[0].action, "pause_campaign");
  assert.equal(d.actions[0].previousValue, "ENABLED");
  assert.equal(d.actions[0].newValue, "PAUSED");
  assert.match(d.actions[0].reason, /ADS-400/);
  assert.equal(d.alerts[0].severity, "critical");
});

test("$400 checkpoint: qualified leads ≥ 5 → info only, no pause", () => {
  const d = evaluateCheckpoint(
    { cumulativeSpendCents: 45000, confirmedBookings: 0, qualifiedLeads: 5, campaignState: "ENABLED" },
    baseConfig(),
  );
  assert.equal(d.actions.length, 0);
  assert.equal(d.alerts[0].severity, "info");
  // One confirmed booking also satisfies the checkpoint.
  const d2 = evaluateCheckpoint(
    { cumulativeSpendCents: 45000, confirmedBookings: 1, qualifiedLeads: 0, campaignState: "ENABLED" },
    baseConfig(),
  );
  assert.equal(d2.actions.length, 0);
});

test("$400 checkpoint: below threshold → nothing", () => {
  const d = evaluateCheckpoint(
    { cumulativeSpendCents: 39999, confirmedBookings: 0, qualifiedLeads: 0, campaignState: "ENABLED" },
    baseConfig(),
  );
  assert.equal(d.actions.length, 0);
  assert.equal(d.alerts.length, 0);
});

test("$400 checkpoint: already-paused campaign → alert only, no duplicate mutation", () => {
  const d = evaluateCheckpoint(
    { cumulativeSpendCents: 40000, confirmedBookings: 0, qualifiedLeads: 0, campaignState: "PAUSED" },
    baseConfig(),
  );
  assert.equal(d.actions.length, 0);
  assert.equal(d.alerts[0].severity, "critical");
  assert.match(d.alerts[0].message, /already paused/);
});

/* ── total test-budget ceiling ───────────────────────────────────────── */

test("budget ceiling: $1,000 → pause + critical; $800 → warning; below → silent", () => {
  const cfg = baseConfig();
  const atCeiling = evaluateBudgetCeiling(100000, "ENABLED", cfg);
  assert.equal(atCeiling.actions[0].action, "pause_campaign");
  assert.equal(atCeiling.alerts[0].severity, "critical");

  const atWarn = evaluateBudgetCeiling(80000, "ENABLED", cfg);
  assert.equal(atWarn.actions.length, 0);
  assert.equal(atWarn.alerts[0].severity, "warning");

  const below = evaluateBudgetCeiling(79999, "ENABLED", cfg);
  assert.equal(below.actions.length + below.alerts.length, 0);
});

/* ── spend anomaly ───────────────────────────────────────────────────── */

test("spend anomaly: 2× daily budget alerts; 1.2× does not", () => {
  const cfg = baseConfig();
  const anomaly = evaluateSpendAnomaly(
    [{ date: "2026-09-20", spendCents: 7000, fractionOfDayElapsed: 1 }],
    cfg,
  );
  assert.equal(anomaly.alerts[0].severity, "critical");
  const normal = evaluateSpendAnomaly(
    [{ date: "2026-09-20", spendCents: 4200, fractionOfDayElapsed: 1 }],
    cfg,
  );
  assert.equal(normal.alerts.length, 0);
});

/* ── search term harvesting ──────────────────────────────────────────── */

test("search negative: confident junk terms auto-propose a negative", () => {
  for (const term of ["life coach certification", "coaching jobs near me", "coach training course", "free coaching"]) {
    const c = classifySearchTerm({ term, impressions: 100, clicks: 3, costCents: 200 });
    assert.equal(c.classification, "negative_confident", term);
    assert.equal(c.proposeNegative, true);
    assert.equal(c.needsHumanReview, false);
  }
});

test("ambiguous search terms go to the human review queue, not auto-negatived", () => {
  const c = classifySearchTerm({ term: "should i change careers quiz", impressions: 50, clicks: 1, costCents: 90 });
  assert.equal(c.classification, "ambiguous");
  assert.equal(c.proposeNegative, false);
  assert.equal(c.needsHumanReview, true);
});

test("crisis search terms: blocked, flagged, never a funnel", () => {
  const c = classifySearchTerm({ term: "suicide hotline", impressions: 10, clicks: 0, costCents: 0 });
  assert.equal(c.classification, "crisis");
  assert.equal(c.proposeNegative, true);
  assert.equal(c.needsHumanReview, true);
  assert.match(c.reason, /Emergency/);
});

/* ── landing page / scheduler health ─────────────────────────────────── */

const failedCheck = (min) => ({
  atMinutesAgo: min,
  landingHttpStatus: 503,
  schedulerOk: false,
});

test("landing page outage: sustained ≥15min failures → critical + configured pause", () => {
  const d = evaluateLandingPageHealth(
    [failedCheck(20), failedCheck(15), failedCheck(10), failedCheck(5), { ...failedCheck(0), landingHttpStatus: 200 }],
    baseConfig(),
  );
  assert.equal(d.alerts[0].severity, "critical");
  assert.equal(d.actions[0].action, "pause_campaign");
  // With the explicit pause flag off: alert only.
  const cfgNoPause = { ...baseConfig(), pauseOnSiteOutage: false };
  const d2 = evaluateLandingPageHealth(
    [failedCheck(20), failedCheck(15), failedCheck(10), failedCheck(5), failedCheck(0)],
    cfgNoPause,
  );
  assert.equal(d2.actions.length, 0);
  assert.equal(d2.alerts[0].severity, "critical");
});

test("landing page: recovered or brief failures never trigger", () => {
  const cfg = baseConfig();
  // Window < 15 minutes of failure.
  const brief = evaluateLandingPageHealth(
    [failedCheck(5), failedCheck(0), { atMinutesAgo: 20, landingHttpStatus: 200, schedulerOk: true }],
    cfg,
  );
  assert.equal(brief.alerts.length, 0);
  // Sustained failure that has since recovered.
  const recovered = evaluateLandingPageHealth([
    { atMinutesAgo: 20, landingHttpStatus: 503, schedulerOk: false },
    { atMinutesAgo: 15, landingHttpStatus: 503, schedulerOk: false },
    { atMinutesAgo: 5, landingHttpStatus: 200, schedulerOk: true },
    { atMinutesAgo: 0, landingHttpStatus: 200, schedulerOk: true },
  ], cfg);
  assert.equal(recovered.alerts.length, 0);
});

/* ── Stripe operational health ───────────────────────────────────────── */

test("Stripe: broadly broken booking flow → critical + configured pause", () => {
  const d = evaluateStripeHealth(
    { setupAttempts: 6, setupFailures: 4, webhookFailures24h: 0, requiresCustomerActionCount: 0, postSessionDeclines: 0 },
    baseConfig(),
  );
  assert.equal(d.alerts[0].severity, "critical");
  assert.equal(d.actions[0].action, "pause_campaign");
  // Without the explicit flag: alert only.
  const d2 = evaluateStripeHealth(
    { setupAttempts: 6, setupFailures: 4, webhookFailures24h: 0, requiresCustomerActionCount: 0, postSessionDeclines: 0 },
    { ...baseConfig(), pauseOnStripeBreak: false },
  );
  assert.equal(d2.actions.length, 0);
});

test("Stripe: single post-session decline is info-only and never pauses", () => {
  const d = evaluateStripeHealth(
    { setupAttempts: 10, setupFailures: 0, webhookFailures24h: 0, requiresCustomerActionCount: 0, postSessionDeclines: 1 },
    baseConfig(),
  );
  assert.equal(d.actions.length, 0);
  assert.ok(d.alerts.every((a) => a.severity === "info"));
});

test("Stripe webhook: outage alerts critical, single failure warns", () => {
  const outage = evaluateStripeHealth(
    { setupAttempts: 0, setupFailures: 0, webhookFailures24h: 6, requiresCustomerActionCount: 0, postSessionDeclines: 0 },
    baseConfig(),
  );
  assert.equal(outage.alerts[0].severity, "critical");
  const one = evaluateStripeHealth(
    { setupAttempts: 0, setupFailures: 0, webhookFailures24h: 1, requiresCustomerActionCount: 0, postSessionDeclines: 0 },
    baseConfig(),
  );
  assert.equal(one.alerts[0].severity, "warning");
  assert.equal(one.actions.length, 0);
});

test("Stripe: requires_customer_action surfaces as info (recovery emails queued)", () => {
  const d = evaluateStripeHealth(
    { setupAttempts: 0, setupFailures: 0, webhookFailures24h: 0, requiresCustomerActionCount: 2, postSessionDeclines: 0 },
    baseConfig(),
  );
  assert.equal(d.alerts[0].type, "stripe_action_required");
  assert.equal(d.alerts[0].severity, "info");
});

/* ── Google conversion pipeline ──────────────────────────────────────── */

test("Google pipeline: never-connected (Phase 7 pending) is info, not failure", () => {
  const d = evaluateGooglePipeline(
    { minutesSinceLastSuccess: null, pendingEvents: 0, lastAuthError: null },
    defaultConfig(),
  );
  assert.equal(d.alerts[0].severity, "info");
  assert.equal(d.alerts[0].type, "pipeline_not_connected");
});

test("Google pipeline: stalled with pending events → critical", () => {
  const d = evaluateGooglePipeline(
    { minutesSinceLastSuccess: 720, pendingEvents: 3, lastAuthError: null },
    defaultConfig(),
  );
  assert.equal(d.alerts[0].type, "google_pipeline_stopped");
  assert.equal(d.alerts[0].severity, "critical");
});

test("Google auth failure → critical google_auth_failure", () => {
  const d = evaluateGooglePipeline(
    { minutesSinceLastSuccess: null, pendingEvents: 0, lastAuthError: "invalid_grant" },
    defaultConfig(),
  );
  assert.equal(d.alerts[0].type, "google_auth_failure");
  assert.equal(d.alerts[0].severity, "critical");
});

/* ── duplicate-run / idempotency ─────────────────────────────────────── */

test("duplicate pause mutations collapse (already-paused idempotency)", () => {
  const pause = (rule) => ({
    actions: [
      {
        entity: "campaign",
        entityRef: "campaign",
        action: "pause_campaign",
        previousValue: "ENABLED",
        newValue: "PAUSED",
        rule,
        reason: "rule fired",
      },
    ],
    alerts: [],
  });
  const freshDecisions = () => ({
    actions: [...pause("ADS-400").actions, ...pause("ADS-CEILING").actions],
    alerts: [],
  });
  const cleaned = noDuplicatePause(freshDecisions(), "PAUSED");
  assert.equal(cleaned.actions.length, 0, "no duplicate pause when already paused");
  const kept = noDuplicatePause(freshDecisions(), "ENABLED");
  assert.equal(kept.actions.length, 2, "both rules keep their actions when enabled");
});

/* ── weekly digest ───────────────────────────────────────────────────── */

test("weekly digest: all required sections, zero PII", () => {
  const digest = buildWeeklyDigest({
    periodStart: "2026-09-14",
    periodEnd: "2026-09-20",
    spendCents: 24500,
    clicks: 88,
    impressions: 5210,
    leads: 3,
    confirmedBookings: 1,
    paidSessions: 0,
    stripeCapturedRevenueCents: 0,
    searchTerms: [
      { term: "career coach", clicks: 4, costCents: 1100 },
      { term: "coaching for dads", clicks: 2, costCents: 500 },
    ],
    negativesAdded: ["certification"],
    pendingReviews: 2,
    disapprovals: 0,
    automationActions: [
      { action: "pause_campaign", rule: "ADS-400", dryRun: true },
    ],
    landingPageFailures: 0,
    googleConversionFailures: 1,
    stripeSetupFailures: 0,
    stripePaymentFailures: 1,
    paymentsRequiringAction: 0,
  });
  const text = digest.text;
  for (const section of [
    "Spend:",
    "Clicks:",
    "CTR",
    "CPC",
    "Leads (paid):",
    "Confirmed bookings:",
    "Paid sessions:",
    "cost per lead",
    "cost per booking",
    "Stripe-captured revenue",
    "Top search terms:",
    "Negatives added:",
    "pending human review",
    "disapprovals",
    "Automation actions:",
    "(dry-run)",
    "Landing-page failures:",
    "Google conversion failures:",
    "Stripe setup failures:",
    "Stripe payment failures:",
    "requiring customer action:",
  ]) {
    assert.ok(text.includes(section), `missing digest section: ${section}`);
  }
  // PII guarantees: the digest format carries no email/phone/name fields.
  assert.equal(digest.text.includes("@example.com"), false);
  assert.equal(/555-\d{4}/.test(digest.text), false);
});
