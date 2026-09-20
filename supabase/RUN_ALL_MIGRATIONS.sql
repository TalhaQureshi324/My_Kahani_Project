-- ============================================================================
-- True Self Me — RUN ALL MIGRATIONS (fully idempotent)
-- Safe to run multiple times: existing objects are skipped, missing ones
-- are created. Covers migrations 0001–0005 in one file.
-- ============================================================================

-- 0. Extensions ---------------------------------------------------------------
create extension if not exists btree_gist;

-- 1. Enum types (guarded — skipped if they already exist) ----------------------
do $$ begin
  create type booking_status as enum ('held', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversion_status as enum ('pending', 'uploaded', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_job_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  alter type notification_job_status add value if not exists 'processing';
  alter type notification_job_status add value if not exists 'cancelled';
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'not_due',
    'ready_to_charge',
    'processing',
    'requires_customer_action',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'reconciliation_required'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_attempt_status as enum (
    'processing',
    'succeeded',
    'declined',
    'failed',
    'unknown',
    'requires_customer_action'
  );
exception when duplicate_object then null; end $$;

-- 2. customers -----------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  first_name  text not null,
  last_name   text not null,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table customers
  add column if not exists stripe_customer_id                text;
create unique index if not exists customers_stripe_customer_uniq
  on customers (stripe_customer_id) where stripe_customer_id is not null;

-- 3. bookings --------------------------------------------------------------------
create table if not exists bookings (
  id          uuid primary key default gen_random_uuid(),
  status      booking_status not null default 'held',
  slot_start  timestamptz not null,
  slot_end    timestamptz not null,
  timezone    text not null default 'America/Chicago',
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (slot_end > slot_start)
);

alter table bookings
  add column if not exists first_name                               text,
  add column if not exists last_name                                text,
  add column if not exists email                                    text,
  add column if not exists phone                                    text,
  add column if not exists customer_id                              uuid references customers(id),
  add column if not exists gclid                                    text,
  add column if not exists attribution                              jsonb,
  add column if not exists booking_reference                        text,
  add column if not exists confirmed_at                             timestamptz,
  add column if not exists session_price_cents                      integer,
  add column if not exists session_currency                         text not null default 'USD',
  add column if not exists pricing_source                           text,
  add column if not exists client_timezone                          text,
  add column if not exists manage_token_hash                        text,
  add column if not exists cancelled_at                             timestamptz,
  add column if not exists cancelled_by                             text,
  add column if not exists cancellation_reason                      text,
  add column if not exists hours_before_session                     numeric(8, 2),
  add column if not exists cancellation_fee_eligible                boolean,
  add column if not exists rescheduled_from                         timestamptz,
  add column if not exists rescheduled_count                        integer not null default 0,
  add column if not exists card_brand                               text,
  add column if not exists card_last4                               text,
  add column if not exists card_saved_at                            timestamptz,
  add column if not exists card_authorization_accepted_at           timestamptz,
  add column if not exists cancellation_policy_version              text,
  add column if not exists payment_status                           payment_status not null default 'not_due',
  add column if not exists amount_due_cents                         integer,
  add column if not exists currency                                 text not null default 'USD',
  add column if not exists payment_attempt_count                    integer not null default 0,
  add column if not exists paid_at                                  timestamptz,
  add column if not exists payment_failure_code                     text,
  add column if not exists payment_failure_reason                   text,
  add column if not exists last_payment_attempt_at                  timestamptz,
  add column if not exists refunded_at                              timestamptz,
  add column if not exists completed_at                             timestamptz,
  add column if not exists payment_authorization_accepted_at        timestamptz,
  add column if not exists stripe_customer_id                       text,
  add column if not exists stripe_payment_method_id                 text,
  add column if not exists stripe_setup_intent_id                   text,
  add column if not exists stripe_payment_intent_id                 text;

-- ★ The database-level double-booking lock ★
alter table bookings drop constraint if exists bookings_no_active_overlap;
alter table bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    tstzrange(slot_start, slot_end, '[)') with &&
  )
  where (status in ('held', 'confirmed'));

create unique index if not exists bookings_reference_uniq
  on bookings (booking_reference) where booking_reference is not null;
create unique index if not exists bookings_manage_hash_uniq
  on bookings (manage_token_hash) where manage_token_hash is not null;
create index if not exists bookings_status_slot_start_idx
  on bookings (status, slot_start);
create index if not exists bookings_email_idx on bookings (email);
create index if not exists bookings_stripe_customer_idx
  on bookings (stripe_customer_id);

-- 4. availability rules + exceptions ------------------------------------------
create table if not exists availability_rules (
  id                      uuid primary key default gen_random_uuid(),
  weekday                 smallint not null check (weekday between 0 and 6),
  start_time              time not null,
  end_time                time not null,
  session_length_minutes  int  not null default 50,
  start_interval_minutes  int  not null default 60,
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);

create table if not exists availability_exceptions (
  id           uuid primary key default gen_random_uuid(),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  is_available boolean not null default false,
  reason       text,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists availability_exceptions_range_idx
  on availability_exceptions using gist (tstzrange(starts_at, ends_at, '[)'));

-- 5. slot_holds -----------------------------------------------------------------
create table if not exists slot_holds (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  expires_at      timestamptz not null,
  released_reason text check (released_reason in ('converted', 'expired', 'cancelled')),
  created_at      timestamptz not null default now()
);
create index if not exists slot_holds_booking_idx on slot_holds (booking_id);
create index if not exists slot_holds_expires_idx on slot_holds (expires_at);

-- 6. conversion_events + notification_jobs --------------------------------------
create table if not exists conversion_events (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid references bookings(id),
  gclid                text not null,
  conversion_action_id text,
  conversion_date_time timestamptz not null,
  conversion_value     numeric(10, 2) not null default 75.00,
  currency_code        text not null default 'USD',
  status               conversion_status not null default 'pending',
  error                text,
  created_at           timestamptz not null default now()
);
create index if not exists conversion_events_booking_idx on conversion_events (booking_id);

create table if not exists notification_jobs (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id),
  type        text not null,
  payload     jsonb,
  status      notification_job_status not null default 'pending',
  run_at      timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table notification_jobs
  add column if not exists attempt_count       integer not null default 0,
  add column if not exists sent_at             timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists last_error          text;

create unique index if not exists notification_jobs_live_uniq
  on notification_jobs (booking_id, type)
  where status in ('pending', 'processing');
create index if not exists notification_jobs_status_run_idx
  on notification_jobs (status, run_at);

-- 7. booking_operations (idempotency ledger) -----------------------------------
create table if not exists booking_operations (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  operation   text not null,
  provider_reference text,
  status      text not null default 'done',
  created_at  timestamptz not null default now(),
  unique (booking_id, operation)
);

-- 9. Lifecycle SQL functions ----------------------------------------------------
create or replace function release_expired_holds() returns void language plpgsql as $$
begin
  update slot_holds sh
     set released_reason = 'expired'
    from bookings b
   where sh.booking_id = b.id
     and b.status = 'held'
     and b.expires_at is not null
     and b.expires_at <= now()
     and sh.released_reason is null;

  update bookings
     set status = 'cancelled',
         updated_at = now()
   where status = 'held'
     and expires_at is not null
     and expires_at <= now();
end;
$$;

create or replace function cancel_booking_by_hash(
  p_manage_token_hash text,
  p_cancelled_by      text,
  p_reason            text
) returns table (
  booking_reference   text,
  status              booking_status,
  slot_start          timestamptz,
  hours_before        numeric,
  fee_eligible        boolean
) language plpgsql as $$
declare
  b bookings;
begin
  select * into b from bookings where manage_token_hash = p_manage_token_hash;
  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if b.status = 'cancelled' then
    return query select b.booking_reference, b.status::booking_status,
      b.slot_start, b.hours_before_session, b.cancellation_fee_eligible;
    return;
  end if;

  if b.status <> 'confirmed' then
    raise exception 'ONLY_CONFIRMED_CAN_CANCEL';
  end if;

  update bookings
     set status                  = 'cancelled',
         cancelled_at            = now(),
         cancelled_by            = p_cancelled_by,
         cancellation_reason     = p_reason,
         hours_before_session    = round(
           extract(epoch from (b.slot_start - now())) / 3600.0, 2),
         cancellation_fee_eligible = case
           when b.slot_start is null then false
           when b.slot_start - now() < interval '24 hours' then true
           else false
         end,
         updated_at              = now()
   where id = b.id;

  update notification_jobs
     set status = 'cancelled', last_error = 'booking cancelled'
   where booking_id = b.id and status in ('pending', 'processing');

  return query select b.booking_reference, 'cancelled'::booking_status,
    b.slot_start,
    round(extract(epoch from (b.slot_start - now())) / 3600.0, 2),
    case when b.slot_start - now() < interval '24 hours' then true else false end;
end;
$$;

create or replace function reschedule_booking_by_hash(
  p_manage_token_hash text,
  p_new_start         timestamptz,
  p_new_end           timestamptz,
  p_manage_url        text default null,
  p_client_timezone   text default 'America/Chicago'
) returns table (
  booking_reference text,
  status            booking_status,
  slot_start        timestamptz,
  previous_start    timestamptz
) language plpgsql as $$
declare
  b         bookings;
  old_start timestamptz;
begin
  select * into b from bookings where manage_token_hash = p_manage_token_hash;
  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if b.status <> 'confirmed' then
    raise exception 'ONLY_CONFIRMED_CAN_RESCHEDULE';
  end if;

  old_start := b.slot_start;

  update bookings
     set slot_start   = p_new_start,
         slot_end     = p_new_end,
         rescheduled_from      = old_start,
         rescheduled_count     = coalesce(b.rescheduled_count, 0) + 1,
         client_timezone       = p_client_timezone,
         updated_at            = now()
   where id = b.id;

  update notification_jobs
     set status = 'cancelled', last_error = 'booking rescheduled'
   where booking_id = b.id and status in ('pending', 'processing');

  insert into notification_jobs (booking_id, type, payload, status, run_at)
  values (b.id, 'reminder_24h',
    jsonb_build_object(
      'slot_start', p_new_start, 'slot_end', p_new_end,
      'manage_url', p_manage_url, 'client_timezone', p_client_timezone),
    case when p_new_start - interval '24 hours' <= now()
         then 'cancelled' else 'pending' end,
    p_new_start - interval '24 hours'),
  (b.id, 'reminder_2h',
    jsonb_build_object(
      'slot_start', p_new_start, 'slot_end', p_new_end,
      'manage_url', p_manage_url, 'client_timezone', p_client_timezone),
    case when p_new_start - interval '2 hours' <= now()
         then 'cancelled' else 'pending' end,
    p_new_start - interval '2 hours');

  return query select b.booking_reference, 'confirmed'::booking_status,
    p_new_start, old_start;
end;
$$;

-- 10. Row Level Security ---------------------------------------------------------
alter table customers             enable row level security;
alter table bookings              enable row level security;
alter table availability_rules    enable row level security;
alter table availability_exceptions enable row level security;
alter table slot_holds            enable row level security;
alter table conversion_events     enable row level security;
alter table notification_jobs     enable row level security;
alter table booking_operations    enable row level security;

-- ============================================================================
-- 11. Stripe payment tables (migration 0005 sections 4–9) ----------------------
-- These were previously missing from this runner: 0005's enum + bookings
-- columns applied, but the tables below never reached the database, which
-- broke webhook event dedup (stripe_events) and post-session billing state.
-- All idempotent — safe on databases that already have them.
-- ============================================================================

-- 4. payment_attempts ----------------------------------------------------------
-- One row per gateway contact. A booking must never have more than one
-- successful attempt: enforced by the partial unique index below.
create table if not exists payment_attempts (
  id                           uuid primary key default gen_random_uuid(),
  booking_id                   uuid not null references bookings(id) on delete cascade,
  provider                     text not null default 'stripe',
  attempt_number               integer not null,
  amount_cents                 integer not null,
  currency                     text not null default 'usd',
  status                       payment_attempt_status not null default 'processing',
  idempotency_key              text not null unique,
  stripe_payment_intent_id     text,
  provider_response_code       text,
  safe_error_code              text,
  created_at                   timestamptz not null default now(),
  completed_at                 timestamptz
);
create index if not exists payment_attempts_booking_idx
  on payment_attempts (booking_id, created_at desc);

-- Exactly one successful charge per booking, ever.
create unique index if not exists payment_attempts_success_uniq
  on payment_attempts (booking_id)
  where status = 'succeeded';

-- 5. payment_refunds -------------------------------------------------------------
create table if not exists payment_refunds (
  id                        uuid primary key default gen_random_uuid(),
  booking_id                uuid not null references bookings(id) on delete cascade,
  payment_attempt_id        uuid references payment_attempts(id),
  amount_cents              integer not null,
  currency                  text not null default 'usd',
  stripe_refund_id          text,
  reason_category           text,
  status                    text not null default 'pending',
  created_by                text,
  created_at                timestamptz not null default now(),
  completed_at              timestamptz
);
create index if not exists payment_refunds_booking_idx on payment_refunds (booking_id);

-- 6. payment_audit_log -------------------------------------------------------------
create table if not exists payment_audit_log (
  id                     uuid primary key default gen_random_uuid(),
  booking_id             uuid not null references bookings(id) on delete cascade,
  operation              text not null,
  previous_status        text,
  new_status             text,
  amount_cents           integer,
  actor_type             text not null default 'system',
  stripe_transaction_id  text,
  reason                 text,
  created_at             timestamptz not null default now()
);
create index if not exists payment_audit_log_booking_idx on payment_audit_log (booking_id, created_at desc);

-- 7. domain_events (session_paid and friends) -----------------------------------
create table if not exists domain_events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  booking_id  uuid references bookings(id),
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists domain_events_name_idx on domain_events (name, created_at desc);

-- 8. stripe_events (webhook idempotency) -----------------------------------------
create table if not exists stripe_events (
  id                uuid primary key default gen_random_uuid(),
  stripe_event_id   text not null unique,
  event_type        text not null,
  processing_status text not null default 'received',
  payload           jsonb,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);
create index if not exists stripe_events_status_idx on stripe_events (processing_status, received_at);

-- 12. Row Level Security for the Stripe tables ------------------------------------
alter table payment_attempts      enable row level security;
alter table payment_refunds       enable row level security;
alter table payment_audit_log     enable row level security;
alter table domain_events         enable row level security;
alter table stripe_events         enable row level security;

-- 13. Authorize.Net cleanup -------------------------------------------------------
-- The Stripe migration replaced Authorize.Net entirely; the only surviving
-- ANET-era table is unused by any current code. Drop it (idempotent).
drop table if exists authorize_net_events;

-- ============================================================================
-- 14. conversion_outbox (migration 0006 — Phase 7) ----------------------------
-- Durable queue for Google Ads Data Manager API conversion uploads.
-- ============================================================================
do $$ begin
  create type conversion_delivery_status as enum (
    'pending', 'processing', 'sent', 'skipped', 'dead_letter'
  );
exception when duplicate_object then null; end $$;

create table if not exists conversion_outbox (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references bookings(id) on delete cascade,
  event_type        text not null,
  transaction_id    text not null,
  event_timestamp   timestamptz not null,
  conversion_value  numeric(10, 2),
  currency          text not null default 'USD',
  gclid             text,
  gbraid            text,
  wbraid            text,
  hashed_identifiers jsonb,
  ads_user_data_consent       text not null default 'denied',
  ads_personalization_consent text not null default 'denied',
  status            conversion_delivery_status not null default 'pending',
  attempt_count     integer not null default 0,
  next_attempt_at   timestamptz not null default now(),
  last_attempt_at   timestamptz,
  google_request_id text,
  error_code        text,
  error_message     text,
  created_at        timestamptz not null default now(),
  sent_at           timestamptz
);
create unique index if not exists conversion_outbox_booking_event_uniq
  on conversion_outbox (booking_id, event_type);
create index if not exists conversion_outbox_claim_idx
  on conversion_outbox (status, next_attempt_at);
create index if not exists conversion_outbox_status_created_idx
  on conversion_outbox (status, created_at);
alter table conversion_outbox enable row level security;

-- ============================================================================
-- 15. leads (migration 0007 — Phase 8) ----------------------------------------
-- Non-booking visitors; marketing nurture with separate consent, stopped
-- by booking confirmation, cancellable by unsubscribe at any time.
-- ============================================================================
do $$ begin
  create type lead_status as enum (
    'new', 'nurturing', 'booked', 'unsubscribed', 'invalid', 'archived'
  );
exception when duplicate_object then null; end $$;

create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  email              text not null unique,
  phone              text,
  email_consent      boolean not null default true,
  sms_consent        boolean not null default false,
  status             lead_status not null default 'new',
  booked_at          timestamptz,
  unsubscribed_at    timestamptz,
  gclid              text,
  attribution        jsonb,
  unsubscribe_token  text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists leads_status_idx on leads (status, created_at);

alter table notification_jobs
  add column if not exists lead_id uuid references leads(id) on delete cascade;
create index if not exists notification_jobs_lead_idx
  on notification_jobs (lead_id) where lead_id is not null;

alter table leads enable row level security;

-- ============================================================================
-- 16. conversion_outbox lead support (migration 0008 — Phase 10) --------------
-- Paid lead conversions have no booking: booking_id nullable + lead_id.
-- ============================================================================
alter table conversion_outbox alter column booking_id drop not null;
alter table conversion_outbox
  add column if not exists lead_id uuid references leads(id) on delete cascade;
drop index if exists conversion_outbox_booking_event_uniq;
create unique index if not exists conversion_outbox_dedupe_uniq
  on conversion_outbox (
    event_type,
    coalesce(booking_id::text, ''),
    coalesce(lead_id::text, '')
  );
create index if not exists conversion_outbox_lead_idx
  on conversion_outbox (lead_id) where lead_id is not null;

-- ============================================================================
-- 17. Google Ads automation guardrails (migration 0009 — Phase 11) -----------
-- Deterministic, bounded, auditable, reversible. Dry-run by default.
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
    'safe', 'negative_confident', 'ambiguous', 'crisis'
  );
exception when duplicate_object then null; end $$;

create table if not exists ads_automation_runs (
  id            uuid primary key default gen_random_uuid(),
  rule_batch    text not null,
  window_start  timestamptz not null,
  mode          ads_run_mode not null default 'dry_run',
  status        ads_run_status not null default 'running',
  summary       jsonb,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create unique index if not exists ads_runs_batch_window_uniq
  on ads_automation_runs (rule_batch, window_start);

create table if not exists ads_automation_actions (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid references ads_automation_runs(id) on delete cascade,
  entity            text not null,
  entity_ref        text,
  action            text not null,
  previous_value    jsonb,
  new_value         jsonb,
  rule              text not null,
  reason            text not null,
  dry_run           boolean not null default true,
  executed          boolean not null default false,
  provider_response jsonb,
  rollback_info     jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists ads_actions_run_idx on ads_automation_actions (run_id);

create table if not exists ads_alerts (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references ads_automation_runs(id) on delete set null,
  severity     ads_alert_severity not null,
  type         text not null,
  message      text not null,
  payload      jsonb,
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ads_alerts_open_idx
  on ads_alerts (acknowledged, severity, created_at);

create table if not exists search_term_reviews (
  id            uuid primary key default gen_random_uuid(),
  term          text not null,
  matched_ad_group text,
  metrics       jsonb,
  classification text not null,
  status        text not null default 'pending',
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

-- Site health samples (worker probe history for outage windows)
create table if not exists ads_site_health (
  id           uuid primary key default gen_random_uuid(),
  landing_ok   boolean not null,
  scheduler_ok boolean not null,
  checked_at   timestamptz not null default now()
);
create index if not exists ads_site_health_checked_idx
  on ads_site_health (checked_at desc);
alter table ads_site_health enable row level security;
