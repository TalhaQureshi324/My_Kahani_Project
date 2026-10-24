#!/usr/bin/env node
// One-off admin bootstrap: creates the Supabase Auth admin user
// (service-role API), maps it in admin_users, disables public signups,
// and runs the live status-transition test. Prints sanitized results.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const env = (f) =>
  Object.fromEntries(
    readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
  );
const local = env(".env.local");
const URL = local.SUPABASE_URL;
const SERVICE = local.SUPABASE_SERVICE_ROLE_KEY;
const ANON = local.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ADMIN_EMAIL = "fahd.faiyaz@gmail.com";
const TEMP_PASSWORD = `Tsm-${randomBytes(9).toString("base64url")}!2`;

// 1. Create or reuse the auth admin user
let created = false;
let userId = null;
const createRes = await fetch(`${URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: TEMP_PASSWORD, email_confirm: true }),
});
if (createRes.status === 201 || createRes.status === 200) {
  created = true;
  userId = (await createRes.json()).id;
} else {
  const body = await createRes.json().catch(() => ({}));
  if (body.code === 422 || /already/i.test(body.msg ?? "")) {
    // User exists — look them up instead.
    const list = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    }).then((r) => r.json());
    userId = list.users?.[0]?.id ?? null;
  } else {
    console.log(`AUTH_CREATE_FAIL: ${createRes.status} ${body.msg ?? "unknown"}`);
  }
}
console.log(`auth user: ${created ? "CREATED" : userId ? "ALREADY EXISTS (reused)" : "FAILED"}${userId ? ` id=${userId}` : ""}`);

// 2. Map to admin role (upsert-safe)
if (userId) {
  const up = await fetch(`${URL}/rest/v1/admin_users`, {
    method: "POST",
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ user_id: userId, role: "admin" }),
  });
  console.log(`admin_users row: ${up.status === 201 ? "OK" : `HTTP ${up.status}`}`);
}

// 3. Disable public signups (fail-open note if unsupported)
const cfg = await fetch(`${URL}/auth/v1/config`, {
  method: "PATCH",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
  body: JSON.stringify({ disable_signup: true }),
});
console.log(`signup disabled: ${cfg.ok ? "OK" : `NOT APPLIED (HTTP ${cfg.status}) — flip in dashboard`}`);

// 4. Live transition-trigger test: draft -> published must FAIL
const KEY = ANON;
const ins = await fetch(`${URL}/rest/v1/blogs`, {
  method: "POST",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ title: "Bootstrap verification", slug: "bootstrap-verify-test", status: "draft" }),
});
const blog = await ins.json();
if (!ins.ok) {
  console.log(`blog insert FAIL: ${ins.status}`);
} else {
  const bad = await fetch(`${URL}/rest/v1/blogs?id=eq.${blog[0].id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "published" }),
  });
  console.log(`illegal transition draft->published: ${bad.ok ? "FAIL (allowed!)" : "CORRECTLY REJECTED"}`);
  const good = await fetch(`${URL}/rest/v1/blogs?id=eq.${blog[0].id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "review" }),
  });
  console.log(`legal transition draft->review: ${good.ok ? "OK" : "FAIL"}`);
  // RLS test: anon must NOT see the review-status article
  const anon = await fetch(`${URL}/rest/v1/blogs?select=id&slug=eq.bootstrap-verify-test`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  }).then((r) => r.json());
  console.log(`anon sees unpublished draft: ${anon.length === 0 ? "NO (correct)" : "YES (FAIL)"}`);
  const del = await fetch(`${URL}/rest/v1/blogs?id=eq.${blog[0].id}`, {
    method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  console.log(`cleanup: ${del.ok ? "OK" : "FAIL"}`);
}

// 5. Public credentials for the admin temp password (printed once)
console.log(`ADMIN_EMAIL=${ADMIN_EMAIL}`);
console.log(`ADMIN_TEMP_PASSWORD=${TEMP_PASSWORD}`);
