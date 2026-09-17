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
