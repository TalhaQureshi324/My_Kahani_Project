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
