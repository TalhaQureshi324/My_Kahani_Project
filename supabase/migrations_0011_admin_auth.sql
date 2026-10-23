-- ============================================================
-- MIGRATION 0011 — Admin authorization for the CMS
--
-- Identity lives in Supabase Auth (auth.users, managed by the
-- dashboard/CLI). This table maps an auth user to an admin role:
--   admin  — full blog management, publish, settings
--   editor — create, edit, submit for review
--
-- RLS: an authenticated user may read only their own row (needed by
-- the UI); all other access is service-role only. No anon access.
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_role_valid CHECK (role IN ('admin', 'editor'))
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_users_read_own ON admin_users;
CREATE POLICY admin_users_read_own ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: role assignment happens through
-- the SQL editor / service role only, never from the client.
