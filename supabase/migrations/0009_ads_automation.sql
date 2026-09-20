-- ============================================================================
-- True Self Me — booking engine migration 0009
-- Phase 11: Google Ads automation guardrails, audit trail & alerts.
--
-- PRINCIPLE: automate execution before judgment — deterministic, bounded,
-- auditable, reversible. Every mutation is recorded with rule, reason,
-- before/after values and a dry-run flag. Google Ads mutations default to
-- dry-run and never run unless the operator flips to live mode.
-- ============================================================================

do $$ begin
  create type ads_run_mode as enum ('dry_run', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ads_run_status as enum ('running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ads_alert_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type search_term_class as enum (
    'safe',               -- irrelevant to the funnel but harmless
    'negative_confident', -- extremely high-confidence junk → auto-negative
    'ambiguous',          -- not clearly junk → human review queue
    'crisis'              -- emergency intent → block, never touch funnel
  );
exception when duplicate_object then null; end $$;

-- One row per worker/rule evaluation batch. Duplicate cron protection:
-- a unique (rule_batch, window_start) claim; losers skip.
create table if not exists ads_automation_runs (
  id            uuid primary key default gen_random_uuid(),
  rule_batch    text not null,          -- e.g. 'daily_guardrails'
  window_start  timestamptz not null,   -- evaluation window identity
  mode          ads_run_mode not null default 'dry_run',
  status        ads_run_status not null default 'running',
  summary       jsonb,                  -- metrics snapshot + decisions count
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create unique index if not exists ads_runs_batch_window_uniq
  on ads_automation_runs (rule_batch, window_start);

-- Every proposed or executed mutation, fully audited.
create table if not exists ads_automation_actions (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid references ads_automation_runs(id) on delete cascade,
  entity            text not null,        -- 'campaign' | 'ad_group' | 'keyword' | 'negative' | ...
  entity_ref        text,                 -- Google resource id / name
  action            text not null,        -- 'pause_campaign' | 'add_negative' | ...
  previous_value    jsonb,
  new_value         jsonb,
  rule              text not null,        -- deterministic rule id
  reason            text not null,
  dry_run           boolean not null default true,
  executed          boolean not null default false,
  provider_response jsonb,
  rollback_info     jsonb,                -- how to undo (usually: previous_value)
  created_at        timestamptz not null default now()
);
create index if not exists ads_actions_run_idx on ads_automation_actions (run_id);

-- Alerts raised by rules; acknowledged by a human.
create table if not exists ads_alerts (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references ads_automation_runs(id) on delete set null,
  severity     ads_alert_severity not null,
  type         text not null,            -- 'checkpoint_spend' | 'spend_anomaly' | ...
  message      text not null,
  payload      jsonb,                    -- metrics behind the alert (no PII)
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ads_alerts_open_idx
  on ads_alerts (acknowledged, severity, created_at);

-- Search terms harvested from Google (fixture data until the Ads API is
-- connected), classified by deterministic rules; ambiguous terms wait
-- for human review.
create table if not exists search_term_reviews (
  id            uuid primary key default gen_random_uuid(),
  term          text not null,
  matched_ad_group text,
  metrics       jsonb,                  -- impressions/clicks/cost snapshot
  classification text not null,         -- 'safe' | 'negative_confident' | 'ambiguous' | 'crisis'
  status        text not null default 'pending', -- 'pending'|'auto_added'|'dismissed'|'added_manual'
  rule          text,
  reason        text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create unique index if not exists search_term_reviews_term_uniq
  on search_term_reviews (term);
create index if not exists search_term_reviews_status_idx
  on search_term_reviews (status, created_at);

alter table ads_automation_runs    enable row level security;
alter table ads_automation_actions enable row level security;
alter table ads_alerts             enable row level security;
alter table search_term_reviews    enable row level security;

-- Site health samples: the ads-automation worker records its live probe
-- each run so "sustained outage" windows can be reconstructed.
create table if not exists ads_site_health (
  id           uuid primary key default gen_random_uuid(),
  landing_ok   boolean not null,
  scheduler_ok boolean not null,
  checked_at   timestamptz not null default now()
);
create index if not exists ads_site_health_checked_idx
  on ads_site_health (checked_at desc);
alter table ads_site_health enable row level security;
