import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bearerToken,
  compactContent,
  errorResponse,
  mapAutomationPayload,
  okResponse,
  stripDangerousMarkdown,
  verifyApiKey,
  AUTOMATION_ALLOWED_STATUSES,
  PUBLISHABLE_STATUSES,
} from "../lib/marketing-shared.mjs";

/**
 * Internal marketing API contract tests (commit #3).
 */

test("verifyApiKey accepts the correct key", () => {
  assert.equal(verifyApiKey("secret-key-123", "secret-key-123"), true);
});

test("verifyApiKey rejects wrong and missing keys", () => {
  assert.equal(verifyApiKey("wrong", "secret-key-123"), false);
  assert.equal(verifyApiKey("", "secret-key-123"), false);
  assert.equal(verifyApiKey(null, "secret-key-123"), false);
  assert.equal(verifyApiKey("secret-key-123", ""), false);
  assert.equal(verifyApiKey("secret-key-123", undefined), false);
});

test("verifyApiKey is constant-time safe with unequal lengths", () => {
  assert.equal(verifyApiKey("a", "a-very-much-longer-key"), false);
});

test("bearerToken parses the Authorization header", () => {
  assert.equal(bearerToken("Bearer abc123"), "abc123");
  assert.equal(bearerToken("bearer abc123"), "abc123");
  assert.equal(bearerToken("Basic abc"), null);
  assert.equal(bearerToken(null), null);
});

test("mapAutomationPayload maps camelCase to columns and drops unknown keys", () => {
  const { mapped, dropped } = mapAutomationPayload({
    title: "T",
    primaryKeyword: "focus",
    secondaryKeywords: ["a"],
    featuredImageAlt: "alt",
    status: "published",     // ignored on purpose
    automationJobId: "J-1",  // handled separately
    evilKey: "<script>",
  });
  assert.equal(mapped.title, "T");
  assert.equal(mapped.primary_keyword, "focus");
  assert.deepEqual(mapped.secondary_keywords, ["a"]);
  assert.equal(mapped.featured_image_alt, "alt");
  assert.equal(mapped.status, undefined);
  assert.deepEqual(dropped, ["evilKey"]);
});

test("stripDangerousMarkdown removes scripts, iframes, handlers, js URLs", () => {
  const dirty = [
    "intro text",
    "<script>alert(1)</script>",
    '<iframe src="https://evil.example"></iframe>',
    '<img src="x" onerror="alert(1)">',
    '[click](javascript:alert(1))',
  ].join("\n");
  const clean = stripDangerousMarkdown(dirty);
  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("iframe"), false);
  assert.equal(clean.includes("onerror"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.equal(clean.includes("intro text"), true);
});

test("automation can never target publish-level statuses", () => {
  for (const s of ["approved", "scheduled", "published", "archived"]) {
    assert.equal(AUTOMATION_ALLOWED_STATUSES.includes(s), false);
  }
  assert.deepEqual(PUBLISHABLE_STATUSES, ["approved", "scheduled"]);
});

test("response envelopes match the documented contract", () => {
  const okBody = okResponse({ a: 1 }, "req-1");
  assert.equal(okBody.success, true);
  assert.equal(okBody.requestId, "req-1");
  assert.deepEqual(okBody.data, { a: 1 });

  const errBody = errorResponse("SLUG_CONFLICT", "exists", "req-2");
  assert.equal(errBody.success, false);
  assert.equal(errBody.error.code, "SLUG_CONFLICT");
  assert.equal(errBody.error.message, "exists");
  assert.equal(errBody.requestId, "req-2");
});

test("compactContent projects the planner registry shape (no article body)", () => {
  const row = {
    id: "id-1", title: "T", slug: "t", excerpt: "e", status: "published",
    primary_keyword: "k", secondary_keywords: ["s"], search_intent: "info",
    content_pillar: "p", content_cluster: "c", category: "cat", tags: [],
    created_at: "now", published_at: "now", scheduled_at: null,
    canonical_url: null, automation_job_id: null, instagram_status: null,
    quality_score: null, content: "HUGE BODY SHOULD NOT APPEAR",
  };
  const compact = compactContent(row);
  assert.equal(compact.primaryKeyword, "k");
  assert.equal("content" in compact, false);
  assert.equal("content" in row, true); // original untouched
});
