-- ============================================================================
-- True Self Me — booking engine migration 0008
-- Phase 10: lead conversions in the conversion outbox.
--
-- conversion_outbox previously required a booking_id (FK to bookings).
-- Paid lead conversions have no booking: booking_id becomes nullable and
-- a lead_id column carries the source row. The dedupe unique index now
-- spans both kinds via a coalesced key.
-- ============================================================================

alter table conversion_outbox
  alter column booking_id drop not null;

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
