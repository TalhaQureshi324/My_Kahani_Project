#!/usr/bin/env node
// One-off: discover the Supabase pooler region that accepts this tenant.
import pg from "pg";
import { readFileSync } from "node:fs";

const ref = "jskmwhvuyuntrkdieuli";
const line = readFileSync(".env.supabase.local", "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));
const raw = line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
// Extract the password (between : and last @) from the direct URL
const pwd = decodeURIComponent(raw.split("//")[1].split("@").slice(0, -1).join("@").split(":").slice(1).join(":"));

const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-northeast-2", "sa-east-1",
];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host,
    port: 5432,
    user: `postgres.${ref}`,
    password: pwd,
    database: "postgres",
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const { rows } = await client.query("select 1 as ok");
    console.log(`FOUND_REGION=${region}`);
    await client.end();
    process.exit(0);
  } catch (err) {
    const msg = err.message || "";
    // Wrong region fails fast with tenant/auth error; right one connects.
    console.error(`.. ${region}: ${msg.split("\n")[0].slice(0, 80)}`);
    try { await client.end(); } catch {}
  }
}
console.log("NO_REGION_FOUND");
process.exit(1);
