-- ============================================================
-- MIGRATION 0012 — Internal marketing API support
--
-- Adds:
--   workflow_events        — audit log for automation actions
--   blogs.automation_job_id — idempotency key for n8n content creation
--   content_calendar.automation_job_id
--
-- Never store credentials in workflow_events. Idempotent.
-- ============================================================

ALTER TABLE blogs ADD COLUMN IF NOT EXISTS automation_job_id text;

DROP INDEX IF EXISTS blogs_automation_job_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS blogs_automation_job_uniq
  ON blogs (automation_job_id)
  WHERE automation_job_id IS NOT NULL;

ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS automation_job_id text;

CREATE TABLE IF NOT EXISTS workflow_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_job_id text,
  workflow_name     text,
  event_type        text NOT NULL,
  content_id        uuid,
  status            text,
  message           text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_events_content_idx
  ON workflow_events (content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_events_job_idx
  ON workflow_events (automation_job_id) WHERE automation_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workflow_events_type_idx
  ON workflow_events (event_type, created_at DESC);

ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- Service-role only: no anon/authenticated policies are created on
-- purpose. The audit trail is never client-readable.
