#!/usr/bin/env node
/**
 * Applies supabase/migrations_*.sql in filename order, tracking applied
 * files in a schema_migrations table. One-off ops tool — run with
 * DATABASE_URL set (see .env.supabase.local). Never prints credentials.
 *
 * Usage: node scripts/supabase-migrate.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const envFile = ".env.supabase.local";
let url = process.env.DATABASE_URL;
if (!url) {
  try {
    const line = readFileSync(envFile, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    url = line?.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
  } catch {
    /* missing file handled below */
  }
}
if (!url) {
  console.error("DATABASE_URL not set and .env.supabase.local not found.");
  process.exit(1);
}

const dir = "supabase";
const files = readdirSync(dir)
  .filter((f) => /^migrations_\d{4}_.*\.sql$/.test(f))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );
`);

const { rows: applied } = await client.query("select name from schema_migrations");
const appliedSet = new Set(applied.map((r) => r.name));

let ran = 0;
for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`= ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`✔ ${file} applied`);
    ran++;
  } catch (err) {
    await client.query("rollback");
    console.error(`✖ ${file} FAILED: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}

console.log(ran === 0 ? "Nothing to apply." : `Applied ${ran} migration(s).`);

// Post-apply verification
const checks = [
  ["blogs", "select count(*) from information_schema.tables where table_schema='public' and table_name in ('blogs','blog_revisions','content_calendar','marketing_settings')", "4"],
  ["admin_users", "select count(*) from information_schema.tables where table_schema='public' and table_name='admin_users'", "1"],
  ["blogs_rls", "select count(*) from pg_class where relname='blogs' and relrowsecurity", "1"],
  ["transition_trigger", "select count(*) from pg_trigger where tgrelid='public.blogs'::regclass and tgname='blogs_status_transition_trg' and not tgisinternal", "1"],
  ["slug_unique", "select count(*) from pg_indexes where schemaname='public' and tablename='blogs' and indexname='blogs_slug_uniq'", "1"],
  ["settings_seeded", "select count(*) from marketing_settings", "10"],
];
for (const [name, sql, expected] of checks) {
  try {
    const { rows } = await client.query(sql);
    const got = String(rows[0].count);
    console.log(`${got === expected ? "PASS" : "FAIL"} ${name} (${got}/${expected})`);
  } catch (err) {
    console.log(`FAIL ${name}: ${err.message}`);
  }
}

await client.end();
