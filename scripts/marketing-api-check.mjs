#!/usr/bin/env node
/**
 * End-to-end check suite for the internal marketing API.
 * Reads MARKETING_API_KEY (and BASE_URL, default http://localhost:3000)
 * from the environment — never hardcoded, never printed.
 *
 * Safe subset runs by default (no publication). Re-run with
 * --with-publish after an administrator approves the fixture article
 * in /admin/blogs/<id> to rehearse the full publish flow.
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3000/api/internal/marketing").replace(/\/$/, "");
const KEY = process.env.MARKETING_API_KEY;
const WITH_PUBLISH = process.argv.includes("--with-publish");
const RUN_TAG = `CHECK-${Date.now()}`;

if (!KEY) {
  console.error("Set MARKETING_API_KEY in the environment first.");
  process.exit(1);
}

const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "X-TSM-Workflow": "api-check" };
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}
async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (process.env.CHECK_DEBUG) console.error(`[debug] ${method} ${path} -> ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// 1-2. authentication
{
  const r = await fetch(`${BASE}/health`);
  check("missing auth -> 401", r.status === 401);
}
{
  const r = await fetch(`${BASE}/health`, { headers: { Authorization: "Bearer wrong-key" } });
  check("wrong auth -> 401", r.status === 401);
}

// 3. health with valid auth
{
  const { status, json } = await call("GET", "/health");
  check("health 200 + ok", status === 200 && json.success && json.data.database === true);
}

// 4. content registry (compact — no bodies)
{
  const { status, json } = await call("GET", "/content?limit=5");
  const compactOk = !json?.data?.items?.length || ("primaryKeyword" in json.data.items[0] && !("content" in json.data.items[0]));
  check("content registry compact", status === 200 && compactOk);
}

// 5-6. create generated draft
const title = `API Check Fixture — ${RUN_TAG}`;
const slug = `api-check-fixture-${RUN_TAG.toLowerCase()}`;
let articleId = null;
{
  const { status, json } = await call("POST", "/blogs", {
    automationJobId: `${RUN_TAG}-001`,
    workflowName: "api-check",
    title,
    slug,
    excerpt: "Fixture article for the API check suite — safe to delete.",
    content: "## Fixture\n\nThis article exists only to exercise the marketing API.",
    contentPillar: "Coaching Education",
    primaryKeyword: "api check fixture",
    secondaryKeywords: ["test"],
    generationModel: "api-check-script",
    promptVersion: "check-v1",
    sourceReferences: [{ title: "internal test", url: "https://trueselfme.com" }],
  });
  articleId = json?.data?.article?.id ?? null;
  check("create draft 201", status === 201 && json.success);
  check("initial status = generated", json?.data?.article?.status === "generated");
  articleId && console.log(`   fixture id: ${articleId}`);
}

// 7. idempotent retry (same automationJobId)
{
  const { status, json } = await call("POST", "/blogs", {
    automationJobId: `${RUN_TAG}-001`, title: "Different Title Same Job", slug: `dup-${RUN_TAG.toLowerCase()}`,
  });
  check("job retry idempotent (200, same article)",
    status === 200 && json.idempotent === true && json.data.article.id === articleId);
}

// 8. duplicate slug from a different job
{
  const { status, json } = await call("POST", "/blogs", {
    automationJobId: `${RUN_TAG}-002`, title: "Slug clash", slug,
  });
  check("duplicate slug 409 SLUG_CONFLICT", status === 409 && json?.error?.code === "SLUG_CONFLICT");
}

// 9. invalid payload
{
  const { status } = await call("POST", "/blogs", { title: "", content: 5 });
  check("invalid payload 400", status === 400);
}

// 10. unsafe markdown sanitized at ingest
{
  const { status, json } = await call("POST", "/blogs", {
    automationJobId: `${RUN_TAG}-003`, title: `Sanitize fixture ${RUN_TAG}`,
    slug: `sanitize-fixture-${RUN_TAG.toLowerCase()}`,
    content: "## ok\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>",
  });
  const stored = json?.data?.article;
  if (stored) {
    const full = await call("GET", `/blogs/${stored.id}`);
    const body = full.json?.data?.article?.content ?? "";
    check("ingest strips script/onerror", status === 201 && !body.includes("<script") && !body.includes("onerror"));
  } else check("ingest strips script/onerror", false, "create failed");
}

// 11. generated blog appears in admin data layer (registry by status)
{
  const { status, json } = await call("GET", `/content?status=generated&search=${encodeURIComponent(title)}`);
  check("fixture visible in generated registry", status === 200 && json?.data?.items?.some(i => i.id === articleId));
}

// 13. illegal status transition (generated -> published is not an allowed automation call anyway; do status hop instead)
{
  const { status } = await call("POST", `/blogs/${articleId}/status`, { status: "published" });
  check("automation cannot set published (403)", status === 403);
}

// 14/15. scheduling + publishing refuse non-approved content
{
  const sched = await call("POST", `/blogs/${articleId}/schedule`, { scheduledAt: "2027-01-01T15:00:00Z" });
  check("schedule non-approved -> 422", sched.status === 422);
  const pub = await call("POST", `/blogs/${articleId}/publish`);
  check("publish non-approved -> 422", pub.status === 422);
}

// generated -> review via automation (legal)
{
  const { status } = await call("POST", `/blogs/${articleId}/status`, { status: "review" });
  check("generated -> review 200", status === 200);
}

// 25. no stack traces in errors
{
  const { json } = await call("PATCH", `/blogs/not-a-uuid`, { title: "x" });
  check("404 has no stack/secret fields", json?.success === false && !JSON.stringify(json).includes("at ") && !JSON.stringify(json).includes("postgres"));
}

// 12. unauthenticated publish rejected
{
  const r = await fetch(`${BASE}/blogs/${articleId}/publish`, { method: "POST" });
  check("unauthenticated publish -> 401", r.status === 401);
}

// 21. settings contain no secrets
{
  const { status, json } = await call("GET", "/settings");
  const s = JSON.stringify(json?.data?.settings ?? {});
  check("settings whitelisted only", status === 200 && !/key|token|secret|password|service/i.test(s));
}

// 22. context has no private data
{
  const { status, json } = await call("GET", "/context");
  const body = JSON.stringify(json?.data ?? {});
  check("context has brand + pillars, no PII", status === 200 && body.includes("True Self Me") && !body.includes("booking") && !body.toLowerCase().includes("email"));
}

// Full publish rehearsal (optional, after admin approves the fixture)
if (WITH_PUBLISH && articleId) {
  const pub = await call("POST", `/blogs/${articleId}/publish`);
  check("publish approved fixture 201", pub.status === 201 && pub.json?.data?.url?.includes("/blog/"));
  if (pub.json?.data?.url) {
    const live = await fetch(pub.json.data.url);
    check("published URL returns 200", live.status === 200);
  }
  const repub = await call("POST", `/blogs/${articleId}/publish`);
  check("re-publish idempotent 200", repub.status === 200 && repub.json.idempotent === true);
  const unpub = await call("POST", `/blogs/${articleId}/unpublish`, { reason: "api check cleanup" });
  check("unpublish 200", unpub.status === 200);
  const gone = await fetch(pub.json?.data?.url ?? `${BASE}/blog/${slug}`);
  check("unpublished URL 404s", gone.status === 404);
  // calendar smoke
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const c1 = await call("POST", "/calendar", { date, platform: "instagram", contentType: "carousel", topic: "check fixture", automationJobId: `${RUN_TAG}-CAL` });
  check("calendar create 201", c1.status === 201);
  const c2 = await call("POST", "/calendar", { date, platform: "instagram", contentType: "carousel", topic: "dup" });
  check("calendar duplicate 409", c2.status === 409);
  const re = await call("POST", "/revalidate", { slug });
  check("revalidate 200", re.status === 200);
}

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
