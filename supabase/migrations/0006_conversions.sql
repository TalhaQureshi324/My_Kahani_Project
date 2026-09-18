-- ============================================================================
-- True Self Me — booking engine migration 0006
-- Phase 7: Google Ads server-side conversions via the Data Manager API.
--
-- conversion_outbox is the durable queue between booking/payment success
-- and the asynchronous Google uploader. Business success NEVER depends on
-- Google: enqueue happens after commit, uploads happen in the worker.
--
-- Raw emails/phones never enter this table — identifiers are hashed at
-- enqueue time and stored only as hex SHA-256 (when ad-user-data consent
-- allows). Stripe ids never enter this table at all.
-- ============================================================================

do $$ begin
  create type conversion_delivery_status as enum (
    'pending',        -- waiting for the worker; next_attempt_at governs
                      -- (also the state after a scheduled retry failure)
    'processing',     -- claimed by a worker run (atomic row claim)
    'sent',           -- accepted by Google (google_request_id stored)
    'skipped',        -- nothing Google could match (e.g. no identifiers
                      -- and consent denied) — terminal, not an error
    'dead_letter'     -- permanent failure, or retries exhausted
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

  -- Ad click identifiers (at most one of these usually set).
  gclid             text,
  gbraid            text,
  wbraid            text,

  -- Enhanced-conversion identifiers — hex SHA-256, hashed at enqueue.
  -- Only populated when ads_user_data_consent = 'granted'.
  hashed_identifiers jsonb,

  -- Advertising consent is independent of the card-on-file consent.
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

-- One outbox row per (booking, event type): retries reuse the same row,
-- therefore the same transaction_id, forever.
create unique index if not exists conversion_outbox_booking_event_uniq
  on conversion_outbox (booking_id, event_type);

-- Worker claim path: pending rows whose next attempt is due.
create index if not exists conversion_outbox_claim_idx
  on conversion_outbox (status, next_attempt_at);

-- Stuck-queue monitoring.
create index if not exists conversion_outbox_status_created_idx
  on conversion_outbox (status, created_at);

alter table conversion_outbox enable row level security;
