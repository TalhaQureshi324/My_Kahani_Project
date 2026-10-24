-- ============================================================
-- VERIFICATION for migration 0012 — run in Supabase SQL Editor.
-- Every row prints PASS/FAIL.
-- ============================================================

with checks as (
  select
    exists (select 1 from information_schema.tables where table_schema='public' and table_name='workflow_events') as events_table,
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='blogs' and column_name='automation_job_id') as blogs_job_col,
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='content_calendar' and column_name='automation_job_id') as calendar_job_col,
    exists (select 1 from pg_indexes where schemaname='public' and tablename='blogs' and indexname='blogs_automation_job_uniq') as job_uniq,
    exists (select 1 from pg_class where relname='workflow_events' and relrowsecurity) as events_rls
)
select
  events_table   and text 'PASS workflow_events table'      or text 'FAIL workflow_events missing' as check_1,
  blogs_job_col  and text 'PASS blogs.automation_job_id'    or text 'FAIL blogs.automation_job_id missing' as check_2,
  calendar_job_col and text 'PASS calendar.automation_job_id' or text 'FAIL calendar.automation_job_id missing' as check_3,
  job_uniq       and text 'PASS unique automation_job_id'   or text 'FAIL unique index missing' as check_4,
  events_rls     and text 'PASS workflow_events RLS'        or text 'FAIL workflow_events RLS not enabled' as check_5
from checks;
