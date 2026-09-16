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
