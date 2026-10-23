-- ============================================================
-- MIGRATION 0010 — Blog CMS foundation
-- (True Self Me marketing automation system, spec sections 2-4,
--  11, 34, 35, 57, 81)
--
-- Tables:
--   blogs               — canonical content registry / CMS records
--   blog_revisions      — meaningful article revision history
--   content_calendar    — planned marketing slots (blog/social days)
--   marketing_settings  — admin-configurable marketing flags
--
-- All timestamps UTC. Writes happen only through the service role
-- from server code; the public can read PUBLISHED rows only (RLS).
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- blogs ----------
CREATE TABLE IF NOT EXISTS blogs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  slug                text NOT NULL,
  excerpt             text,
  content             text,                       -- markdown source
  featured_image      text,
  featured_image_alt  text,
  author              text NOT NULL DEFAULT 'Fahd Alam',
  category            text,
  tags                text[] NOT NULL DEFAULT '{}',
  content_pillar      text,
  primary_keyword     text,
  secondary_keywords  text[] NOT NULL DEFAULT '{}',
  search_intent       text,
  content_cluster     text,
  parent_pillar_id    uuid REFERENCES blogs(id) ON DELETE SET NULL,
  meta_title          text,
  meta_description    text,
  canonical_url       text,
  og_title            text,
  og_description      text,
  og_image            text,
  schema_type         text NOT NULL DEFAULT 'Article',
  status              text NOT NULL DEFAULT 'draft',
  needs_human_review  boolean NOT NULL DEFAULT false,
  revision            integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  generated_at        timestamptz,
  reviewed_at         timestamptz,
  approved_at         timestamptz,
  scheduled_at        timestamptz,
  published_at        timestamptz,
  archived_at         timestamptz,
  created_by          text,                       -- 'n8n' | admin identity
  reviewed_by         text,
  approved_by         text,
  generation_model    text,
  prompt_version      text,
  source_references   jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_links      jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_score       integer CHECK (quality_score BETWEEN 0 AND 100),
  seo_review          jsonb,
  social_post_id      text,
  instagram_media_id  text,
  instagram_status    text,
  CONSTRAINT blogs_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blogs_status_valid CHECK (status IN (
    'draft','generated','review','approved','scheduled',
    'published','archived','rejected','failed'
  ))
);

-- Slug is globally unique across all statuses so a rejected draft can
-- never later collide with a published article at the same URL.
CREATE UNIQUE INDEX IF NOT EXISTS blogs_slug_uniq ON blogs (slug);

CREATE INDEX IF NOT EXISTS blogs_status_published_idx
  ON blogs (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blogs_cluster_idx ON blogs (content_cluster)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blogs_status_idx ON blogs (status);
CREATE INDEX IF NOT EXISTS blogs_scheduled_idx ON blogs (scheduled_at)
  WHERE status IN ('approved', 'scheduled');

-- ---------- blog_revisions ----------
CREATE TABLE IF NOT EXISTS blog_revisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     uuid NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  title       text,
  excerpt     text,
  content     text,
  meta_title  text,
  meta_description text,
  edited_by   text,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blog_id, version)
);

-- ---------- content_calendar ----------
CREATE TABLE IF NOT EXISTS content_calendar (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date date NOT NULL,
  platform       text NOT NULL DEFAULT 'instagram',   -- blog|instagram|facebook|linkedin|...
  content_type   text NOT NULL,                       -- carousel|checklist|reflection|question|educational|recap|blog
  pillar         text,
  topic          text,
  status         text NOT NULL DEFAULT 'planned',
  blog_id        uuid REFERENCES blogs(id) ON DELETE SET NULL,
  approved_at    timestamptz,
  published_at   timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_status_valid CHECK (status IN (
    'planned','in_progress','ready','approved','published','cancelled','skipped'
  )),
  -- One blog-linked slot per platform per day: idempotent replanning.
  CONSTRAINT calendar_slot_uniq UNIQUE (scheduled_date, platform, content_type)
);

CREATE INDEX IF NOT EXISTS calendar_date_idx ON content_calendar (scheduled_date);

-- ---------- marketing_settings ----------
CREATE TABLE IF NOT EXISTS marketing_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO marketing_settings (key, value) VALUES
  ('marketing_enabled', '"true"'::jsonb),
  ('blog_days', '[1,3,5]'::jsonb),            -- Mon/Wed/Fri (0=Sunday)
  ('instagram_days', '[0,1,2,3,4,5,6]'::jsonb),
  ('generation_hour', '7'::jsonb),
  ('default_publish_hour', '9'::jsonb),
  ('timezone', '"America/Chicago"'::jsonb),
  ('auto_approve', '"false"'::jsonb),
  ('social_publishing_enabled', '"false"'::jsonb),
  ('image_generation_enabled', '"true"'::jsonb),
  ('email_notifications_enabled', '"true"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------- Status transition enforcement (spec: no illegal transitions) --
CREATE OR REPLACE FUNCTION blogs_validate_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM (VALUES
      ('draft','generated'),('draft','review'),
      ('generated','review'),('generated','rejected'),('generated','failed'),
      ('review','approved'),('review','rejected'),('review','draft'),('review','failed'),
      ('approved','scheduled'),('approved','published'),('approved','rejected'),
      ('scheduled','published'),('scheduled','approved'),
      ('published','archived'),('published','draft'),
      ('archived','draft'),
      ('rejected','draft'),
      ('failed','draft'),('failed','review')
    ) AS allowed(from_status, to_status)
    WHERE allowed.from_status = OLD.status AND allowed.to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'illegal blog status transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blogs_status_transition_trg ON blogs;
CREATE TRIGGER blogs_status_transition_trg
  BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION blogs_validate_status_transition();

-- ---------- Row Level Security ----------
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_settings ENABLE ROW LEVEL SECURITY;

-- Public/anon: read published articles only (listing + article pages
-- may also use the service role; this policy allows anon reads safely).
DROP POLICY IF EXISTS blogs_public_read ON blogs;
CREATE POLICY blogs_public_read ON blogs
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS revisions_public_read ON blog_revisions;
CREATE POLICY revisions_public_read ON blog_revisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM blogs b WHERE b.id = blog_id AND b.status = 'published')
  );

DROP POLICY IF EXISTS calendar_public_read ON content_calendar;
CREATE POLICY calendar_public_read ON content_calendar
  FOR SELECT USING (true);

DROP POLICY IF EXISTS settings_public_read ON marketing_settings;
CREATE POLICY settings_public_read ON marketing_settings
  FOR SELECT USING (true);

-- Writes: service role only (bypasses RLS); no anon/admin-write policies
-- are created on purpose. Admin writes go through the Next.js server
-- using the service key, after cookie authentication.
