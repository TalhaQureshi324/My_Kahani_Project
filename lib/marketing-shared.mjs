/**
 * Internal marketing API contract shared by routes, docs, and tests.
 * Plain ESM (importable by node --test). No secrets here — only the
 * comparison logic, response shapes, and payload mapping rules.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const API_VERSION = "v1";

export const WORKFLOW_EVENT_TYPES = [
  "BLOG_CREATED", "BLOG_UPDATED", "STATUS_CHANGED", "BLOG_SCHEDULED",
  "BLOG_PUBLISHED", "BLOG_UNPUBLISHED", "BLOG_ARCHIVED",
  "REVALIDATION_COMPLETED", "API_AUTH_FAILED", "CALENDAR_UPDATED",
];

/** Statuses automation may set directly (never approved/published/scheduled/archived). */
export const AUTOMATION_ALLOWED_STATUSES = ["review", "draft", "failed"];
/** Statuses whose content automation may edit. */
export const AUTOMATION_EDITABLE_STATUSES = ["generated", "review"];
/** Statuses that may be published through the API. */
export const PUBLISHABLE_STATUSES = ["approved", "scheduled"];

/**
 * Constant-time API key comparison: both sides are hashed to a fixed
 * 32-byte digest before timingSafeEqual, so length differences never
 * leak. Empty/missing expected key always fails (fail closed).
 */
export function verifyApiKey(presented, expected) {
  if (!presented || !expected) return false;
  const a = createHash("sha256").update(String(presented)).digest();
  const b = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

/** Extracts the bearer token from an Authorization header. */
export function bearerToken(header) {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1].trim() : null;
}

/** Standard success envelope. */
export function okResponse(data, requestId, status = 200, extra = {}) {
  return { success: true, data, requestId, ...extra };
}

/** Standard error envelope: { success:false, error:{code,message}, requestId }. */
export function errorResponse(code, message, requestId) {
  return { success: false, error: { code, message }, requestId };
}

const CAMEL_TO_SNAKE = {
  title: "title", slug: "slug", excerpt: "excerpt", content: "content",
  featuredImage: "featured_image", featuredImageAlt: "featured_image_alt",
  author: "author", category: "category", tags: "tags",
  contentPillar: "content_pillar", primaryKeyword: "primary_keyword",
  secondaryKeywords: "secondary_keywords", searchIntent: "search_intent",
  contentCluster: "content_cluster", metaTitle: "meta_title",
  metaDescription: "meta_description", canonicalUrl: "canonical_url",
  ogTitle: "og_title", ogDescription: "og_description", ogImage: "og_image",
  sourceReferences: "source_references", internalLinks: "internal_links",
  generationModel: "generation_model", promptVersion: "prompt_version",
};

/**
 * Maps the camelCase automation payload to DB columns. Unknown keys are
 * dropped (reject unknown/unsafe values). Returns { mapped, dropped }.
 */
export function mapAutomationPayload(body) {
  const mapped = {};
  const dropped = [];
  for (const [key, value] of Object.entries(body ?? {})) {
    const column = CAMEL_TO_SNAKE[key];
    if (column) mapped[column] = value;
    else if (!["automationJobId", "workflowName", "status"].includes(key)) dropped.push(key);
  }
  return { mapped, dropped };
}

/**
 * Defense-in-depth strip of dangerous raw HTML inside Markdown source.
 * (The render-time DOMPurify allowlist remains the primary boundary;
 * this keeps obviously hostile markup out of stored content entirely.)
 */
export function stripDangerousMarkdown(raw) {
  return String(raw ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/?(?:iframe|script|object|embed|form)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|src)\s*=\s*(?:"|')?\s*javascript:[^"'>\s]*/gi, "")
    // Markdown links/images with javascript: targets collapse to "#".
    .replace(/\]\(\s*javascript:[^)]*\)/gi, "](#)")
    .replace(/javascript:/gi, "");
}

/**
 * Compact content-registry projection (planner feed — never article
 * bodies). Input is a DB row; output uses the API's camelCase contract.
 */
export function compactContent(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    status: row.status,
    primaryKeyword: row.primary_keyword ?? null,
    secondaryKeywords: row.secondary_keywords ?? [],
    searchIntent: row.search_intent ?? null,
    contentPillar: row.content_pillar ?? null,
    contentCluster: row.content_cluster ?? null,
    category: row.category ?? null,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    publishedAt: row.published_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    canonicalUrl: row.canonical_url ?? null,
    automationJobId: row.automation_job_id ?? null,
    instagramStatus: row.instagram_status ?? null,
    qualityScore: row.quality_score ?? null,
  };
}
