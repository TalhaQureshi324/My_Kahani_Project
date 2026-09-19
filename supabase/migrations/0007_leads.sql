-- ============================================================================
-- True Self Me — booking engine migration 0007
-- Phase 8: lead capture, email nurture & communication automation.
--
-- Leads are visitors who are not ready to book. Nurture is marketing:
-- it is gated by its own consent and STOPPED the moment the same email
-- books (booking confirmation is the business event). Card-on-file setup
-- alone never triggers marketing email.
-- ============================================================================

do $$ begin
  create type lead_status as enum (
    'new',
    'nurturing',
    'booked',
    'unsubscribed',
    'invalid',
    'archived'
  );
exception when duplicate_object then null; end $$;

create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  email              text not null unique,   -- normalized (lowercase, trimmed)
  phone              text,                   -- only used for SMS with consent
  email_consent      boolean not null default true,
  sms_consent        boolean not null default false,
  status             lead_status not null default 'new',
  booked_at          timestamptz,
  unsubscribed_at    timestamptz,
  gclid              text,
  attribution        jsonb,                  -- same shape as bookings.attribution
  unsubscribe_token  text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists leads_status_idx on leads (status, created_at);

-- Lead nurture jobs carry no booking — link them to the lead instead.
alter table notification_jobs
  add column if not exists lead_id uuid references leads(id) on delete cascade;
create index if not exists notification_jobs_lead_idx
  on notification_jobs (lead_id) where lead_id is not null;

alter table leads enable row level security;
