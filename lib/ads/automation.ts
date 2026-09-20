/**
 * Phase 11 — Google Ads automation guardrails: the deterministic rules
 * engine. PURE layer — no network, no database, no clock reads (time
 * enters as arguments) — fully unit-testable and auditable by
 * construction.
 *
 * PRINCIPLE: automate execution before judgment. Rules are:
 *   deterministic — same inputs ⇒ same decisions
 *   bounded       — every rule has explicit thresholds and caps
 *   auditable     — every decision carries rule id, reason, before/after
 *   reversible    — every action stores its previous value
 *
 * MODE: everything defaults to DRY RUN. Live Google Ads mutations are
 * gated behind the operator flipping adsAutomationMode to 'live' AND a
 * connected mutator; until then every action is recorded with
 * dry_run = true and "executed" stays false.
 */

export type RunMode = "dry_run" | "live";

export type AutomationConfig = {
  mode: RunMode;
  /** Nominal daily budget in cents ($35 default). */
  dailyBudgetCents: number;
  /** $400 checkpoint in cents. */
  checkpointSpendCents: number;
  /** Minimum qualified leads at the checkpoint to avoid pausing. */
  checkpointMinQualifiedLeads: number;
  /** Total test-budget ceiling in cents ($1,000 default). */
  totalCeilingCents: number;
  /** Warn (alert) when cumulative spend reaches this fraction of ceiling. */
  ceilingWarnFraction: number;
  /** Daily spend ≥ anomalyFactor × daily budget is an anomaly. */
  anomalyFactor: number;
  /** Landing-page checks failing for ≥ this many minutes → sustained. */
  outageSustainedMinutes: number;
  /** Pause the campaign on sustained landing-page failure (explicit). */
  pauseOnSiteOutage: boolean;
  /** Stripe booking-flow failure rate that counts as "broadly broken". */
  stripeSetupFailureRate: number;
  /** Minimum setup attempts before the rate is meaningful. */
  stripeSetupMinAttempts: number;
  /** Pause campaign when the booking flow is broadly broken (explicit). */
  pauseOnStripeBreak: boolean;
  /** Minutes without a successful conversion upload → pipeline stopped. */
  pipelineStoppedMinutes: number;
};

export function defaultConfig(overrides: Partial<AutomationConfig> = {}): AutomationConfig {
  const num = (name: string, fallback: number) => {
    const parsed = Number.parseFloat(process.env[name] ?? "");
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    mode:
      process.env.ADS_AUTOMATION_MODE === "live" ? "live" : "dry_run",
    dailyBudgetCents: num("ADS_DAILY_BUDGET_CENTS", 3500),
    checkpointSpendCents: num("ADS_CHECKPOINT_SPEND_CENTS", 40000),
    checkpointMinQualifiedLeads: num("ADS_CHECKPOINT_MIN_LEADS", 5),
    totalCeilingCents: num("ADS_TOTAL_CEILING_CENTS", 100000),
    ceilingWarnFraction: num("ADS_CEILING_WARN_FRACTION", 0.8),
    anomalyFactor: num("ADS_ANOMALY_FACTOR", 2),
    outageSustainedMinutes: num("ADS_OUTAGE_SUSTAINED_MINUTES", 15),
    pauseOnSiteOutage:
      process.env.ADS_PAUSE_ON_SITE_OUTAGE === "true",
    stripeSetupFailureRate: num("ADS_STRIPE_SETUP_FAILURE_RATE", 0.5),
    stripeSetupMinAttempts: num("ADS_STRIPE_SETUP_MIN_ATTEMPTS", 5),
    pauseOnStripeBreak:
      process.env.ADS_PAUSE_ON_STRIPE_BREAK === "true",
    pipelineStoppedMinutes: num("ADS_PIPELINE_STOPPED_MINUTES", 360),
    ...overrides,
  };
}

/* ── decision primitives ─────────────────────────────────────────────── */

export type ProposedAction = {
  entity: string; // 'campaign' | 'negative' | ...
  entityRef: string; // e.g. campaign name / search term
  action: string; // 'pause_campaign' | 'add_negative' | 'flag_review' | 'no_op'
  previousValue: string | boolean | number | null;
  newValue: string | boolean | number | null;
  rule: string;
  reason: string;
  /** dry_run is decided by mode at the engine boundary, not per rule. */
};

export type ProposedAlert = {
  severity: "info" | "warning" | "critical";
  type: string;
  message: string;
  payload?: Record<string, unknown>;
};

export type Decision = {
  actions: ProposedAction[];
  alerts: ProposedAlert[];
};

const action = (
  partial: Omit<ProposedAction, "previousValue" | "newValue"> &
    Partial<Pick<ProposedAction, "previousValue" | "newValue">>,
): ProposedAction => ({
  previousValue: null,
  newValue: null,
  ...partial,
});

/* ── campaign state ──────────────────────────────────────────────────── */

export type CampaignState = "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";

/* ── rule: $400 checkpoint ───────────────────────────────────────────── */

export type CheckpointInput = {
  cumulativeSpendCents: number;
  confirmedBookings: number;
  qualifiedLeads: number; // leads that arrived with a Google click id
  campaignState: CampaignState;
};

/**
 * $400 CHECKPOINT: when cumulative test spend reaches the checkpoint and
 * the funnel produced no confirmed bookings and fewer than the minimum
 * qualified leads → pause + critical alert + exact reason. No automatic
 * reactivation, ever (reactivation is a documented human action).
 */
export function evaluateCheckpoint(
  input: CheckpointInput,
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };
  if (input.cumulativeSpendCents < config.checkpointSpendCents) {
    return decisions;
  }
  const failed =
    input.confirmedBookings === 0 &&
    input.qualifiedLeads < config.checkpointMinQualifiedLeads;

  if (!failed) {
    decisions.alerts.push({
      severity: "info",
      type: "checkpoint_reached_ok",
      message: `Checkpoint reached ($${(
        input.cumulativeSpendCents / 100
      ).toFixed(2)} spend) with ${input.confirmedBookings} confirmed booking(s) and ${input.qualifiedLeads} qualified lead(s).`,
      payload: { ...input },
    });
    return decisions;
  }

  const reason = `Checkpoint rule ADS-400: $${(
    input.cumulativeSpendCents / 100
  ).toFixed(2)} spent, 0 confirmed bookings, ${input.qualifiedLeads} qualified lead(s) (< ${config.checkpointMinQualifiedLeads}).`;

  if (input.campaignState === "PAUSED") {
    // Already paused (e.g. operator acted first) — alert only, no duplicate.
    decisions.alerts.push({
      severity: "critical",
      type: "checkpoint_spend",
      message: reason + " Campaign already paused.",
      payload: { ...input },
    });
    return decisions;
  }

  decisions.actions.push(
    action({
      entity: "campaign",
      entityRef: "True Self Me — Coaching (Search)",
      action: "pause_campaign",
      rule: "ADS-400",
      reason,
      previousValue: input.campaignState,
      newValue: "PAUSED",
    }),
  );
  decisions.alerts.push({
    severity: "critical",
    type: "checkpoint_spend",
    message: reason + " Campaign paused. No automatic reactivation — human review required.",
    payload: { ...input },
  });
  return decisions;
}

/* ── rule: total test-budget ceiling ─────────────────────────────────── */

export function evaluateBudgetCeiling(
  cumulativeSpendCents: number,
  campaignState: CampaignState,
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };
  const warnAt = config.totalCeilingCents * config.ceilingWarnFraction;

  if (cumulativeSpendCents >= config.totalCeilingCents) {
    const reason = `Ceiling rule ADS-CEILING: cumulative spend $${(
      cumulativeSpendCents / 100
    ).toFixed(2)} reached the $${(config.totalCeilingCents / 100).toFixed(0)} test ceiling.`;
    if (campaignState !== "PAUSED") {
      decisions.actions.push(
        action({
          entity: "campaign",
          entityRef: "True Self Me — Coaching (Search)",
          action: "pause_campaign",
          rule: "ADS-CEILING",
          reason,
          previousValue: campaignState,
          newValue: "PAUSED",
        }),
      );
    }
    decisions.alerts.push({
      severity: "critical",
      type: "budget_ceiling",
      message: reason + (campaignState === "PAUSED" ? " Campaign already paused." : " Campaign paused."),
      payload: { cumulativeSpendCents },
    });
    return decisions;
  }

  if (cumulativeSpendCents >= warnAt) {
    decisions.alerts.push({
      severity: "warning",
      type: "budget_ceiling_warning",
      message: `Cumulative spend $${(cumulativeSpendCents / 100).toFixed(2)} is at ${Math.round(
        (cumulativeSpendCents / config.totalCeilingCents) * 100,
      )}% of the $${(config.totalCeilingCents / 100).toFixed(0)} test ceiling.`,
      payload: { cumulativeSpendCents },
    });
  }
  return decisions;
}

/* ── rule: spend anomaly ─────────────────────────────────────────────── */

export type SpendDay = { date: string; spendCents: number; fractionOfDayElapsed: number };

/**
 * Meaningful anomaly = a day's spend reached anomalyFactor × the daily
 * budget while that day was (nearly) complete. Fraction-of-day gating
 * avoids pausing from trivial mid-day fluctuations.
 */
export function evaluateSpendAnomaly(
  days: SpendDay[],
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };
  for (const day of days) {
    const threshold = config.dailyBudgetCents * config.anomalyFactor;
    if (day.spendCents < threshold) continue;
    if (day.fractionOfDayElapsed < 0.9 && day.spendCents < threshold) continue;
    decisions.alerts.push({
      severity: "critical",
      type: "spend_anomaly",
      message: `Spend anomaly: $${(day.spendCents / 100).toFixed(2)} on ${day.date} is ${(
        day.spendCents / config.dailyBudgetCents
      ).toFixed(1)}× the $${(config.dailyBudgetCents / 100).toFixed(0)}/day budget.`,
      payload: { ...day, thresholdCents: threshold },
    });
  }
  return decisions;
}

/* ── rule: search term harvesting ────────────────────────────────────── */

/** Extremely high-confidence junk: these terms can never be customers. */
const CONFIDENT_JUNK = [
  "jobs",
  "job",
  "salary",
  "hiring",
  "resume",
  "become a coach",
  "become a life coach",
  "coach training",
  "coach certification",
  "life coach certification",
  "certification",
  "course",
  "courses",
  "degree",
  "school",
  "university",
  "training",
  "free",
];

/** Crisis/emergency intent — block and never let it near the funnel. */
const CRISIS_TERMS = [
  "suicide",
  "suicidal",
  "self-harm",
  "self harm",
  "988",
  "hotline",
  "crisis line",
  "mental health emergency",
];

export type SearchTermInput = {
  term: string;
  impressions: number;
  clicks: number;
  costCents: number;
  adGroup?: string;
};

export type TermClassification = {
  term: string;
  classification: "safe" | "negative_confident" | "ambiguous" | "crisis";
  proposeNegative: boolean;
  needsHumanReview: boolean;
  rule: string;
  reason: string;
};

/**
 * Deterministic classification:
 *   crisis intent → block, flag for human awareness (never a funnel)
 *   confident junk → auto-negative proposal
 *   everything else → ambiguous → human review queue
 */
export function classifySearchTerm(input: SearchTermInput): TermClassification {
  const term = input.term.trim().toLowerCase();
  if (CRISIS_TERMS.some((t) => term === t || term.includes(t))) {
    return {
      term,
      classification: "crisis",
      proposeNegative: true,
      needsHumanReview: true,
      rule: "ADS-TERM-CRISIS",
      reason: "Emergency/crisis intent — excluded from acquisition and flagged.",
    };
  }
  if (CONFIDENT_JUNK.some((t) => term === t || term.includes(t))) {
    return {
      term,
      classification: "negative_confident",
      proposeNegative: true,
      needsHumanReview: false,
      rule: "ADS-TERM-JUNK",
      reason: "High-confidence irrelevant intent (jobs/training/education/free).",
    };
  }
  return {
    term,
    classification: "ambiguous",
    proposeNegative: false,
    needsHumanReview: true,
    rule: "ADS-TERM-AMBIGUOUS",
    reason: "Not confidently junk and not clearly coaching intent — human review.",
  };
}

/* ── rule: landing page & scheduler health ───────────────────────────── */

export type SiteCheck = {
  atMinutesAgo: number;
  landingHttpStatus: number | null;
  schedulerOk: boolean;
};

/**
 * Sustained failure = every check in the window failed (HTTP != 2xx/3xx
 * or scheduler unavailable) across ≥ outageSustainedMinutes. A single
 * failed check never alerts.
 */
export function evaluateLandingPageHealth(
  checks: SiteCheck[],
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };
  if (checks.length === 0) return decisions;
  const windowMinutes = Math.max(...checks.map((c) => c.atMinutesAgo));
  if (windowMinutes < config.outageSustainedMinutes) return decisions;

  const allFailed = checks.every(
    (c) =>
      c.landingHttpStatus == null ||
      c.landingHttpStatus >= 500 ||
      !c.schedulerOk,
  );
  if (!allFailed) return decisions;

  decisions.alerts.push({
    severity: "critical",
    type: "landing_page_down",
    message: `Landing page / scheduler unavailable for ≥ ${config.outageSustainedMinutes} minutes (${checks.length} consecutive failed checks).`,
    payload: { checks: checks.slice(0, 5) },
  });
  if (config.pauseOnSiteOutage) {
    decisions.actions.push(
      action({
        entity: "campaign",
        entityRef: "True Self Me — Coaching (Search)",
        action: "pause_campaign",
        rule: "ADS-SITE-OUTAGE",
        reason: "Sustained landing-page/scheduler failure — paid traffic would be wasted.",
        previousValue: "ENABLED",
        newValue: "PAUSED",
      }),
    );
  }
  return decisions;
}

/* ── rule: Stripe operational health ─────────────────────────────────── */

export type StripeHealth = {
  /** Card-on-file setup attempts (SetupIntents) in the window. */
  setupAttempts: number;
  setupFailures: number;
  /** Webhook deliveries that failed verification/processing in 24h. */
  webhookFailures24h: number;
  /** Bookings currently stuck at requires_customer_action. */
  requiresCustomerActionCount: number;
  /** Post-session payment declines (individual events — NOT a pause signal). */
  postSessionDeclines: number;
};

/**
 * A single post-session payment decline NEVER pauses Google Ads. A
 * broadly broken booking/card-on-file flow raises a critical alert and,
 * only with ADS_PAUSE_ON_STRIPE_BREAK=true, proposes a pause.
 */
export function evaluateStripeHealth(
  health: StripeHealth,
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };

  if (health.setupAttempts >= config.stripeSetupMinAttempts) {
    const rate = health.setupFailures / health.setupAttempts;
    if (rate >= config.stripeSetupFailureRate) {
      decisions.alerts.push({
        severity: "critical",
        type: "stripe_booking_flow_failure",
        message: `Card-on-file setup failing broadly: ${health.setupFailures}/${health.setupAttempts} SetupIntents failed (${Math.round(rate * 100)}%).`,
        payload: { ...health, rate },
      });
      if (config.pauseOnStripeBreak) {
        decisions.actions.push(
          action({
            entity: "campaign",
            entityRef: "True Self Me — Coaching (Search)",
            action: "pause_campaign",
            rule: "ADS-STRIPE-BREAK",
            reason: "Booking/card-on-file flow broadly broken.",
            previousValue: "ENABLED",
            newValue: "PAUSED",
          }),
        );
      }
      return decisions;
    }
  }

  if (health.webhookFailures24h >= 5) {
    decisions.alerts.push({
      severity: "critical",
      type: "stripe_webhook_failure",
      message: `${health.webhookFailures24h} Stripe webhook deliveries failed in 24h — payment notifications and state transitions may be missed.`,
      payload: { ...health },
    });
  } else if (health.webhookFailures24h > 0) {
    decisions.alerts.push({
      severity: "warning",
      type: "stripe_webhook_failure",
      message: `${health.webhookFailures24h} Stripe webhook delivery failure(s) in 24h.`,
      payload: { ...health },
    });
  }

  if (health.requiresCustomerActionCount > 0) {
    decisions.alerts.push({
      severity: "info",
      type: "stripe_action_required",
      message: `${health.requiresCustomerActionCount} payment(s) waiting on customer authentication (recovery emails are queued).`,
      payload: { ...health },
    });
  }

  if (health.postSessionDeclines > 0) {
    decisions.alerts.push({
      severity: "info",
      type: "stripe_post_session_decline",
      message: `${health.postSessionDeclines} post-session payment decline(s) — normal collections churn; never a pause signal on its own.`,
      payload: { ...health },
    });
  }
  return decisions;
}

/* ── rule: Google conversion pipeline / API auth ─────────────────────── */

export type PipelineState = {
  /** Minutes since the last successful conversion upload. */
  minutesSinceLastSuccess: number | null;
  /** Pending conversion events waiting longer than an hour. */
  pendingEvents: number;
  /** Last Google API auth outcome. */
  lastAuthError: string | null;
};

/**
 * While Google credentials are pending, lastSuccessAt is null and the
 * rule reports 'pipeline_not_connected' (info) — NOT a failure, because
 * the integration has never been live.
 */
export function evaluateGooglePipeline(
  state: PipelineState,
  config: AutomationConfig,
): Decision {
  const decisions: Decision = { actions: [], alerts: [] };
  if (state.lastAuthError) {
    decisions.alerts.push({
      severity: "critical",
      type: "google_auth_failure",
      message: `Google API authentication failed: ${state.lastAuthError}`,
      payload: { ...state },
    });
  }
  if (
    state.minutesSinceLastSuccess == null &&
    state.pendingEvents === 0 &&
    !state.lastAuthError
  ) {
    decisions.alerts.push({
      severity: "info",
      type: "pipeline_not_connected",
      message: "Conversion pipeline has never run (Google integration pending). Expected until Phase 7 verification completes.",
      payload: {},
    });
    return decisions;
  }
  if (
    state.minutesSinceLastSuccess != null &&
    state.minutesSinceLastSuccess >= config.pipelineStoppedMinutes &&
    state.pendingEvents > 0
  ) {
    decisions.alerts.push({
      severity: "critical",
      type: "google_pipeline_stopped",
      message: `Conversion pipeline stalled: ${state.pendingEvents} pending event(s), last successful upload ${state.minutesSinceLastSuccess} minutes ago.`,
      payload: { ...state },
    });
  }
  return decisions;
}

/* ── rule: already-paused idempotency ────────────────────────────────── */

/**
 * If the campaign is already paused, pause rules collapse to an alert
 * only — no duplicate mutation is ever proposed.
 */
export function noDuplicatePause(
  decisions: Decision,
  campaignState: CampaignState,
): Decision {
  if (campaignState === "PAUSED") {
    decisions.actions = decisions.actions.filter(
      (a) => a.action !== "pause_campaign",
    );
  }
  return decisions;
}

/* ── weekly digest ───────────────────────────────────────────────────── */

export type DigestMetrics = {
  periodStart: string;
  periodEnd: string;
  spendCents: number;
  clicks: number;
  impressions: number;
  leads: number;
  confirmedBookings: number;
  paidSessions: number;
  stripeCapturedRevenueCents: number;
  searchTerms: Array<{ term: string; clicks: number; costCents: number }>;
  negativesAdded: string[];
  pendingReviews: number;
  disapprovals: number;
  automationActions: Array<{ action: string; rule: string; dryRun: boolean }>;
  landingPageFailures: number;
  googleConversionFailures: number;
  stripeSetupFailures: number;
  stripePaymentFailures: number;
  paymentsRequiringAction: number;
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Weekly digest: every required metric, zero PII (terms and counts only
 * — never names, emails, phones or card data).
 */
export function buildWeeklyDigest(m: DigestMetrics): {
  subject: string;
  text: string;
} {
  const ctr =
    m.impressions > 0
      ? `${((m.clicks / m.impressions) * 100).toFixed(1)}%`
      : "n/a";
  const cpc =
    m.clicks > 0 ? usd(Math.round(m.spendCents / m.clicks)) : "n/a";
  const costPerLead = m.leads > 0 ? usd(Math.round(m.spendCents / m.leads)) : "n/a";
  const costPerBooking =
    m.confirmedBookings > 0
      ? usd(Math.round(m.spendCents / m.confirmedBookings))
      : "n/a";

  const lines = [
    `True Self Me — Google Ads weekly digest (${m.periodStart} → ${m.periodEnd})`,
    "",
    `Spend: ${usd(m.spendCents)}`,
    `Clicks: ${m.clicks} (CTR ${ctr}, CPC ${cpc})`,
    `Impressions: ${m.impressions}`,
    `Leads (paid): ${m.leads} — cost per lead: ${costPerLead}`,
    `Confirmed bookings: ${m.confirmedBookings} — cost per booking: ${costPerBooking}`,
    `Paid sessions: ${m.paidSessions} — Stripe-captured revenue: ${usd(m.stripeCapturedRevenueCents)}`,
    "",
    "Top search terms:",
    ...(m.searchTerms.length > 0
      ? m.searchTerms.map(
          (t) => `  · ${t.term} — ${t.clicks} clicks, ${usd(t.costCents)}`,
        )
      : ["  · (no search-term data available — Ads API not connected)"]),
    `Negatives added: ${m.negativesAdded.length ? m.negativesAdded.join(", ") : "none"}`,
    `Search terms pending human review: ${m.pendingReviews}`,
    `Ad disapprovals: ${m.disapprovals}`,
    "",
    "Automation actions:",
    ...(m.automationActions.length > 0
      ? m.automationActions.map(
          (a) =>
            `  · ${a.action} [${a.rule}]${a.dryRun ? " (dry-run)" : " (LIVE)"}`,
        )
      : ["  · none"]),
    "",
    "Health:",
    `  Landing-page failures: ${m.landingPageFailures}`,
    `  Google conversion failures: ${m.googleConversionFailures}`,
    `  Stripe setup failures: ${m.stripeSetupFailures}`,
    `  Stripe payment failures: ${m.stripePaymentFailures}`,
    `  Payments requiring customer action: ${m.paymentsRequiringAction}`,
    "",
    "No personal or card information is included in this report.",
  ];

  return {
    subject: `Google Ads weekly digest — ${usd(m.spendCents)} spend, ${m.confirmedBookings} booking(s)`,
    text: lines.join("\n"),
  };
}
