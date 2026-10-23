-- ============================================================
-- VERIFICATION for migration 0010 (+0011) — run in the Supabase
-- SQL Editor AFTER the migrations. Every query prints PASS/FAIL.
-- ============================================================

with checks as (
  select
    -- tables exist
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='blogs') as blogs_table,
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='blog_revisions') as revisions_table,
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='content_calendar') as calendar_table,
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='marketing_settings') as settings_table,
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='admin_users') as admin_table,
    -- key columns exist
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='blogs' and column_name='instagram_media_id') as blogs_columns,
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='blogs' and column_name='status') as blogs_status_col,
    -- unique slug index
    exists (select 1 from pg_indexes where schemaname='public' and tablename='blogs' and indexname='blogs_slug_uniq') as slug_uniq,
    -- status check constraint
    exists (select 1 from pg_constraint where conrelid='public.blogs'::regclass and conname='blogs_status_valid') as status_check,
    -- transition trigger
    exists (select 1 from pg_trigger where tgrelid='public.blogs'::regclass and tgname='blogs_status_transition_trg' and not tgisinternal) as transition_trigger,
    -- RLS enabled
    exists (select 1 from pg_class where relname='blogs' and relrowsecurity) as blogs_rls,
    exists (select 1 from pg_class where relname='admin_users' and relrowsecurity) as admin_rls,
    -- defaults work (settings seeded)
    exists (select 1 from marketing_settings where key='auto_approve') as settings_seeded
)
select
  blogs_table        and text 'PASS tables: blogs'        or text 'FAIL blogs table missing' as check_1,
  revisions_table    and text 'PASS tables: revisions'    or text 'FAIL revisions table missing' as check_2,
  calendar_table     and text 'PASS tables: calendar'     or text 'FAIL calendar table missing' as check_3,
  settings_table     and text 'PASS tables: settings'     or text 'FAIL settings table missing' as check_4,
  admin_table        and text 'PASS table: admin_users'   or text 'WARN admin_users missing (run 0011)' as check_5,
  blogs_columns      and text 'PASS blogs columns'        or text 'FAIL blogs columns incomplete' as check_6,
  blogs_status_col   and text 'PASS status column'        or text 'FAIL status column missing' as check_7,
  slug_uniq          and text 'PASS unique slug index'    or text 'FAIL unique slug index missing' as check_8,
  status_check       and text 'PASS status constraint'    or text 'FAIL status constraint missing' as check_9,
  transition_trigger and text 'PASS transition trigger'  or text 'FAIL transition trigger missing' as check_10,
  blogs_rls          and text 'PASS blogs RLS enabled'    or text 'FAIL blogs RLS not enabled' as check_11,
  admin_rls          and text 'PASS admin_users RLS'      or text 'WARN admin_users RLS (run 0011)' as check_12,
  settings_seeded    and text 'PASS settings seeded'      or text 'FAIL settings not seeded' as check_13
from checks;

-- Interactive tests (run manually, one at a time):
-- 1. Illegal transition must ERROR:
--    insert into blogs (title, slug, status) values ('t','verify-test-1','draft');
--    update blogs set status='published' where slug='verify-test-1';  -- should FAIL
-- 2. Legal transition must work, then clean up:
--    update blogs set status='review' where slug='verify-test-1';     -- should WORK
--    delete from blogs where slug='verify-test-1';
