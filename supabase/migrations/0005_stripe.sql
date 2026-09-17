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
