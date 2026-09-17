-- ============================================================================
-- True Self Me — booking engine migration 0001
-- Run in Supabase → SQL Editor. Idempotent-ish: safe to re-run sections.
-- ============================================================================

-- 0. Extensions ------------------------------------------------------------
-- btree_gist lets us build an EXCLUDE constraint that also constrains the
-- status column; the range type itself uses the native GiST range ops.
create extension if not exists btree_gist;

-- 1. Booking lifecycle ------------------------------------------------------
-- held      : slot reserved (10-minute hold) while the visitor enters details
-- confirmed : details submitted, hold converted — slot is booked
-- cancelled : visitor or practitioner cancelled, or hold expired/abandoned
-- completed : session took place
-- no_show   : confirmed but client did not attend
create type booking_status as enum ('held', 'confirmed', 'cancelled', 'completed', 'no_show');

-- 2. customers ---------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  first_name  text not null,
  last_name   text not null,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. bookings ----------------------------------------------------------------
-- One row per slot reservation attempt. Holds and confirmed bookings live
-- here; status drives the lifecycle. All timestamps are UTC (timestamptz).
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  status       booking_status not null default 'held',
  slot_start   timestamptz not null,
  slot_end     timestamptz not null,
  timezone     text not null default 'America/Chicago',
  expires_at   timestamptz,           -- only for status = 'held'
  first_name   text,
  last_name    text,
  email        text,
  phone        text,
  customer_id  uuid references customers(id),
  gclid        text,
  attribution  jsonb,                 -- first/last-touch attribution snapshot
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (slot_end > slot_start)
);

-- ★ THE DATABASE-LEVEL DOUBLE-BOOKING LOCK ★
-- No two ACTIVE bookings (held or confirmed) may overlap in time. This is an
-- exclusion constraint enforced by Postgres itself: two simultaneous INSERTs
-- for the same slot cannot both commit — the second gets error 23P01
-- (exclusion_violation). Cancelled/completed/no_show rows do not block.
alter table bookings drop constraint if exists bookings_no_active_overlap;
alter table bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    tstzrange(slot_start, slot_end, '[)') with &&
  )
  where (status in ('held', 'confirmed'));

create index if not exists bookings_status_slot_start_idx on bookings (status, slot_start);
create index if not exists bookings_email_idx on bookings (email);

-- 4. availability_rules -------------------------------------------------------
-- Recurring weekly template, defined in the PRACTICE timezone
-- (America/Chicago — never as UTC). Session length and start interval are
-- independent and configurable per rule.
create table if not exists availability_rules (
  id                      uuid primary key default gen_random_uuid(),
  weekday                 smallint not null check (weekday between 0 and 6), -- 0=Sunday
  start_time              time not null,      -- local wall time, e.g. 09:00
  end_time                time not null,      -- local wall time, e.g. 17:00
  session_length_minutes  int  not null default 50,
  start_interval_minutes  int  not null default 60,
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);

-- Default availability: Mon–Fri in two windows — 9:00 AM–12:00 PM and
-- 1:00–5:00 PM (America/Chicago) — producing 50-minute sessions starting
-- at 9, 10, 11, 1, 2, 3, 4 (no noon slot), per the booking spec.
delete from availability_rules where active = true;
insert into availability_rules (weekday, start_time, end_time, session_length_minutes, start_interval_minutes)
values (1, '09:00', '12:00', 50, 60),
       (1, '13:00', '17:00', 50, 60),
       (2, '09:00', '12:00', 50, 60),
       (2, '13:00', '17:00', 50, 60),
       (3, '09:00', '12:00', 50, 60),
       (3, '13:00', '17:00', 50, 60),
       (4, '09:00', '12:00', 50, 60),
       (4, '13:00', '17:00', 50, 60),
       (5, '09:00', '12:00', 50, 60),
       (5, '13:00', '17:00', 50, 60);

-- 5. availability_exceptions ---------------------------------------------------
-- is_available = false : block time (vacation, manual blocked ranges)
-- is_available = true  : special extra availability (e.g. a Saturday clinic)
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

-- 6. slot_holds ----------------------------------------------------------------
-- Lifecycle log for holds. The authoritative "this slot is taken" state lives
-- on bookings (status = 'held' + the exclusion constraint); slot_holds is the
-- audit trail with expiry tracking.
create table if not exists slot_holds (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  expires_at      timestamptz not null,
  released_reason text check (released_reason in ('converted', 'expired', 'cancelled')),
  created_at      timestamptz not null default now()
);
create index if not exists slot_holds_booking_idx on slot_holds (booking_id);
create index if not exists slot_holds_expires_idx on slot_holds (expires_at);

-- 7. conversion_events ----------------------------------------------------------
-- Google Ads offline conversions (gclid-attributed bookings).
create type conversion_status as enum ('pending', 'uploaded', 'failed', 'skipped');

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

-- 8. notification_jobs ------------------------------------------------------------
create type notification_job_status as enum ('pending', 'sent', 'failed');

create table if not exists notification_jobs (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id),
  type        text not null,          -- 'booking_confirmation' | 'reminder' | ...
  payload     jsonb,
  status      notification_job_status not null default 'pending',
  run_at      timestamptz not null default now(),
  attempts    int not null default 0,
  last_error  text,
  created_at  timestamptz not null default now()
);
create index if not exists notification_jobs_status_run_idx on notification_jobs (status, run_at);

-- 9. Automatic expiry of stale holds ------------------------------------------
-- release_expired_holds(): flips stale holds to 'cancelled' and marks their
-- slot_holds rows expired. Called opportunistically by the availability/hold
-- endpoints; can also be scheduled with pg_cron every minute:
--   select cron.schedule('release-expired-holds', '* * * * *', 'select release_expired_holds()');

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

-- 10. Row Level Security -------------------------------------------------------
-- The app uses the service-role key (server-side only), which bypasses RLS.
-- Enable RLS with NO public policies so anon/authenticated web users cannot
-- read or write booking data directly.
alter table customers             enable row level security;
alter table bookings              enable row level security;
alter table availability_rules    enable row level security;
alter table availability_exceptions enable row level security;
alter table slot_holds            enable row level security;
alter table conversion_events     enable row level security;
alter table notification_jobs     enable row level security;
-- ============================================================================
-- True Self Me — booking engine migration 0002
-- Authorize.net card-on-file: profile ids, safe card metadata, consent
-- audit fields, webhook event dedup, operation idempotency.
-- ============================================================================

-- 1. Customer profile linkage (deterministic per internal customer id) ------
alter table customers
  add column if not exists authorize_net_customer_profile_id text;

-- One Authorize.net profile per customer, ever (idempotency guard).
create unique index if not exists customers_anet_profile_uniq
  on customers (authorize_net_customer_profile_id)
  where authorize_net_customer_profile_id is not null;

-- 2. Booking card-on-file fields (safe metadata ONLY — never PAN/CVV) -------
alter table bookings
  add column if not exists authorize_net_customer_profile_id  text,
  add column if not exists authorize_net_payment_profile_id   text,
  add column if not exists card_brand                         text,
  add column if not exists card_last4                         text,
  add column if not exists card_saved_at                      timestamptz,
  add column if not exists card_authorization_accepted_at     timestamptz,
  add column if not exists cancellation_policy_version        text;

-- 3. Webhook event log — unique event id makes processing idempotent --------
create table if not exists authorize_net_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null unique,
  event_type   text not null,
  payload      jsonb,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- 4. Booking operations — application-level idempotency for mutations ------
-- A booking can perform each operation exactly once; concurrent claims are
-- resolved by the unique constraint.
create table if not exists booking_operations (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  operation   text not null,
  provider_reference text,
  status      text not null default 'done',
  created_at  timestamptz not null default now(),
  unique (booking_id, operation)
);
-- ============================================================================
-- True Self Me — booking engine migration 0003
-- Lifecycle completion: references, price snapshots, confirmed/cancelled
-- audit fields, self-service manage tokens, reminder jobs, idempotency.
-- ============================================================================

-- 1. Bookings: lifecycle + commercial snapshot columns -----------------------
alter table bookings
  add column if not exists booking_reference        text,
  add column if not exists confirmed_at             timestamptz,
  add column if not exists session_price_cents      integer,
  add column if not exists session_currency         text not null default 'USD',
  add column if not exists pricing_source           text,
  add column if not exists client_timezone          text,
  add column if not exists manage_token_hash        text,
  add column if not exists cancelled_at             timestamptz,
  add column if not exists cancelled_by             text,
  add column if not exists cancellation_reason      text,
  add column if not exists hours_before_session     numeric(8, 2),
  add column if not exists cancellation_fee_eligible boolean,
  add column if not exists rescheduled_from         timestamptz,
  add column if not exists rescheduled_count        integer not null default 0;

-- Human-friendly public reference: unique, never a sequential db id.
create unique index if not exists bookings_reference_uniq
  on bookings (booking_reference) where booking_reference is not null;

-- Self-service capability token: only the SHA-256 hash is stored, so the
-- raw token in the manage URL cannot be reversed from the database.
create unique index if not exists bookings_manage_hash_uniq
  on bookings (manage_token_hash) where manage_token_hash is not null;

create index if not exists bookings_status_slot_start_idx
  on bookings (status, slot_start);

-- 2. notification_jobs: reminder/outbox lifecycle ----------------------------
alter type notification_job_status add value if not exists 'processing';
alter type notification_job_status add value if not exists 'cancelled';

alter table notification_jobs
  add column if not exists attempt_count       integer not null default 0,
  add column if not exists sent_at             timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists last_error          text;

-- One live job per (booking, type): blocks duplicate confirmation emails
-- and duplicate reminders, while cancelled/sent rows no longer constrain.
create unique index if not exists notification_jobs_live_uniq
  on notification_jobs (booking_id, type)
  where status in ('pending', 'processing');

-- 3. Booking lifecycle SQL functions ------------------------------------------
-- release_expired_holds() already exists from 0001.

-- cancel_booking_by_hash: customer self-service cancellation. Atomic,
-- idempotent (returns current state if already cancelled), and records
-- whether the cancellation falls inside the 24-hour late window.
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
    -- Idempotent: already cancelled, return the recorded outcome.
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

  -- Pending reminders/emails for this booking are cancelled.
  update notification_jobs
     set status = 'cancelled', last_error = 'booking cancelled'
   where booking_id = b.id and status in ('pending', 'processing');

  return query select b.booking_reference, 'cancelled'::booking_status,
    b.slot_start,
    round(extract(epoch from (b.slot_start - now())) / 3600.0, 2),
    case when b.slot_start - now() < interval '24 hours' then true else false end;
end;
$$;

-- reschedule_booking_by_hash: atomically moves a confirmed booking to a
-- new slot. The exclusion constraint validates the new range inside the
-- same statement — if the new slot clashes, the whole update fails
-- (23P01) and the original appointment is left untouched. Old
-- reminders are cancelled and fresh reminder jobs are created.
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

  -- The exclusion constraint validates the new range atomically here.
  update bookings
     set slot_start   = p_new_start,
         slot_end     = p_new_end,
         rescheduled_from      = old_start,
         rescheduled_count     = coalesce(b.rescheduled_count, 0) + 1,
         client_timezone       = p_client_timezone,
         updated_at            = now()
   where id = b.id;

  -- Old reminder jobs out; new ones in (unique index dedupes).
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
-- ============================================================================
-- True Self Me — migration 0004 (CATCH-UP)
-- Consolidates everything that may be missing from partial 0001–0003 runs.
-- Fully idempotent: safe to run top-to-bottom regardless of current state.
-- ============================================================================

-- 0. Extensions --------------------------------------------------------------
create extension if not exists btree_gist;

-- 1. Enum types (guarded) ----------------------------------------------------
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

-- 2. customers ----------------------------------------------------------------
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
  add column if not exists authorize_net_customer_profile_id text;
create unique index if not exists customers_anet_profile_uniq
  on customers (authorize_net_customer_profile_id)
  where authorize_net_customer_profile_id is not null;

-- 3. bookings -------------------------------------------------------------------
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
  add column if not exists first_name                        text,
  add column if not exists last_name                         text,
  add column if not exists email                             text,
  add column if not exists phone                             text,
  add column if not exists customer_id                       uuid references customers(id),
  add column if not exists gclid                             text,
  add column if not exists attribution                       jsonb,
  add column if not exists booking_reference                 text,
  add column if not exists confirmed_at                      timestamptz,
  add column if not exists session_price_cents               integer,
  add column if not exists session_currency                  text not null default 'USD',
  add column if not exists pricing_source                    text,
  add column if not exists client_timezone                   text,
  add column if not exists manage_token_hash                 text,
  add column if not exists cancelled_at                      timestamptz,
  add column if not exists cancelled_by                      text,
  add column if not exists cancellation_reason               text,
  add column if not exists hours_before_session              numeric(8, 2),
  add column if not exists cancellation_fee_eligible         boolean,
  add column if not exists rescheduled_from                  timestamptz,
  add column if not exists rescheduled_count                 integer not null default 0,
  add column if not exists authorize_net_customer_profile_id text,
  add column if not exists authorize_net_payment_profile_id  text,
  add column if not exists card_brand                        text,
  add column if not exists card_last4                        text,
  add column if not exists card_saved_at                     timestamptz,
  add column if not exists card_authorization_accepted_at    timestamptz,
  add column if not exists cancellation_policy_version       text;

-- ★ The database-level double-booking lock ★
-- No two ACTIVE bookings (held or confirmed) may overlap in time. Enforced
-- by Postgres itself: the losing concurrent insert fails with 23P01.
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

-- 4. availability rules + exceptions (safe re-seed guard is manual) ----------
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

-- 6. conversion_events + notification_jobs -----------------------------------
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

-- 7. booking_operations (idempotency ledger) ---------------------------------
create table if not exists booking_operations (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  operation   text not null,
  provider_reference text,
  status      text not null default 'done',
  created_at  timestamptz not null default now(),
  unique (booking_id, operation)
);

-- 8. authorize_net_events (webhook idempotency) --------------------------------
create table if not exists authorize_net_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null unique,
  event_type   text not null,
  payload      jsonb,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
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

-- 10. Row Level Security -------------------------------------------------------
-- The app uses the service-role key (server-side only), which bypasses RLS.
-- Enable RLS with NO public policies so anon/authenticated web users cannot
-- read or write booking data directly.
alter table customers             enable row level security;
alter table bookings              enable row level security;
alter table availability_rules    enable row level security;
alter table availability_exceptions enable row level security;
alter table slot_holds            enable row level security;
alter table conversion_events     enable row level security;
alter table notification_jobs     enable row level security;
alter table authorize_net_events  enable row level security;
alter table booking_operations    enable row level security;
-- ============================================================================
-- True Self Me — booking engine migration 0005
-- Stripe card-on-file: payment state model, Stripe ids, attempts,
-- refunds, audit log, domain events, webhook event dedup.
-- Appointment status and payment status remain SEPARATE concepts.
-- ============================================================================

-- 1. Payment status enum -------------------------------------------------------
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

-- 2. Bookings: payment state + Stripe references (nullable; additive) --------
alter table bookings
  add column if not exists payment_status                payment_status not null default 'not_due',
  add column if not exists amount_due_cents              integer,
  add column if not exists currency                      text not null default 'USD',
  add column if not exists payment_attempt_count         integer not null default 0,
  add column if not exists paid_at                       timestamptz,
  add column if not exists payment_failure_code          text,
  add column if not exists payment_failure_reason        text,
  add column if not exists last_payment_attempt_at       timestamptz,
  add column if not exists refunded_at                   timestamptz,
  add column if not exists completed_at                  timestamptz,
  add column if not exists payment_authorization_accepted_at timestamptz,
  add column if not exists stripe_customer_id            text,
  add column if not exists stripe_payment_method_id      text,
  add column if not exists stripe_setup_intent_id        text,
  add column if not exists stripe_payment_intent_id      text;

alter table bookings
  add constraint bookings_payment_status_check
  check (payment_status in (
    'not_due','ready_to_charge','processing','requires_customer_action',
    'paid','failed','refunded','partially_refunded','reconciliation_required'
  ));

create index if not exists bookings_payment_status_idx
  on bookings (payment_status, slot_start);
create index if not exists bookings_stripe_customer_idx
  on bookings (stripe_customer_id);

-- 3. Customers: Stripe linkage -------------------------------------------------
alter table customers
  add column if not exists stripe_customer_id text;
create unique index if not exists customers_stripe_customer_uniq
  on customers (stripe_customer_id) where stripe_customer_id is not null;

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

-- 9. Row Level Security -----------------------------------------------------------
alter table payment_attempts      enable row level security;
alter table payment_refunds       enable row level security;
alter table payment_audit_log     enable row level security;
alter table domain_events         enable row level security;
alter table stripe_events         enable row level security;
