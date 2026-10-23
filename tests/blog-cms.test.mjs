import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  slugify,
  validateBlogPatch,
  seoWarnings,
  actionsForStatus,
} from "../lib/blog-shared.mjs";
import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Blog CMS domain-rule tests (Phase 3): status transitions, slugs,
 * validation, SEO warnings, role filtering, and sanitizer allowlist.
 */

// --- Status transitions (mirrors the DB trigger) ---

test("legal status transitions are allowed", () => {
  assert.equal(canTransition("draft", "review"), true);
  assert.equal(canTransition("review", "approved"), true);
  assert.equal(canTransition("approved", "scheduled"), true);
  assert.equal(canTransition("approved", "published"), true);
  assert.equal(canTransition("scheduled", "published"), true);
  assert.equal(canTransition("published", "archived"), true);
  assert.equal(canTransition("published", "draft"), true);
  assert.equal(canTransition("rejected", "draft"), true);
});

test("illegal status transitions are rejected", () => {
  assert.equal(canTransition("draft", "published"), false);
  assert.equal(canTransition("draft", "approved"), false);
  assert.equal(canTransition("generated", "published"), false);
  assert.equal(canTransition("review", "published"), false);
  assert.equal(canTransition("published", "review"), false);
  assert.equal(canTransition("archived", "published"), false);
  assert.equal(canTransition("scheduled", "draft"), false);
});

test("same-status no-op transitions are allowed", () => {
  assert.equal(canTransition("draft", "draft"), true);
  assert.equal(canTransition("published", "published"), true);
});

// --- Slug rules ---

test("slugify produces lowercase hyphenated slugs", () => {
  assert.equal(
    slugify("How to Communicate Without Becoming Defensive"),
    "how-to-communicate-without-becoming-defensive",
  );
  assert.equal(slugify("  Hello, World! -- Élan  "), "hello-world-elan");
  assert.equal(slugify("!!!"), "");
});

// --- Payload validation ---

test("valid blog payload passes", () => {
  const res = validateBlogPatch({
    title: "A good title",
    slug: "a-good-title",
    tags: ["growth", "habits"],
    featured_image: "https://example.com/x.jpg",
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.title, "A good title");
    assert.deepEqual(res.value.tags, ["growth", "habits"]);
  }
});

test("missing title fails validation", () => {
  const res = validateBlogPatch({ title: "" });
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.some((e) => /title/i.test(e)));
});

test("bad slug format fails validation", () => {
  const res = validateBlogPatch({ title: "T", slug: "Not A Slug!" });
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.some((e) => /slug/i.test(e)));
});

test("non-http image URL fails validation", () => {
  const res = validateBlogPatch({ title: "T", featured_image: "javascript:alert(1)" });
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.some((e) => /featured image/i.test(e)));
});

test("over-length title fails validation", () => {
  const res = validateBlogPatch({ title: "x".repeat(201) });
  assert.equal(res.ok, false);
});

// --- SEO warnings are advisory, not blocking ---

test("long meta title produces a warning but still validates", () => {
  const patch = { title: "T", meta_title: "x".repeat(70) };
  assert.equal(validateBlogPatch(patch).ok, true);
  assert.ok(seoWarnings(patch).some((w) => /meta title/i.test(w)));
});

test("short meta produces no warnings", () => {
  assert.deepEqual(seoWarnings({ title: "T", meta_title: "Short", meta_description: "Fine." }), []);
});

// --- Role-filtered workflow actions ---

test("publish-level actions are admin-only", () => {
  const editorActions = actionsForStatus("review", "editor");
  assert.ok(editorActions.every((a) => !["approved", "published"].includes(a.to)));
  const adminActions = actionsForStatus("approved", "admin");
  assert.ok(adminActions.some((a) => a.to === "published"));
  assert.ok(actionsForStatus("published", "editor").every((a) => !["archived", "draft"].includes(a.to)));
});

// --- Sanitizer allowlist (same config class as lib/blog-render) ---

test("sanitizer strips scripts, handlers, and javascript URLs", () => {
  const marked = new Marked({ gfm: true });
  const raw = marked.parse(
    [
      "safe **bold** text",
      '<script>window.evil=1</script>',
      '<img src="x" onerror="alert(1)">',
      '<a href="javascript:alert(1)">bad</a>',
      '<iframe src="https://evil.example"></iframe>',
    ].join("\n"),
    { async: false },
  );
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "p", "br", "hr", "ul", "ol", "li", "blockquote",
      "strong", "em", "s", "code", "pre", "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "loading"],
  });
  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("onerror"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.equal(clean.includes("<iframe"), false);
  assert.equal(clean.includes("<strong>bold</strong>"), true);
});
