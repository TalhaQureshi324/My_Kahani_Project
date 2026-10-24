import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";
import {
  getBlogByAutomationJobId,
  insertBlog,
  listBlogs,
  slugify,
  type BlogStatus,
} from "@/lib/blog";
import {
  compactContent,
  mapAutomationPayload,
  stripDangerousMarkdown,
} from "@/lib/marketing-shared.mjs";
import { BLOG_STATUSES } from "@/lib/blog-shared.mjs";

/**
 * GET  /api/internal/marketing/blogs — compact list (limit/status).
 * POST /api/internal/marketing/blogs — create a GENERATED draft
 * (idempotent on automationJobId; never published directly).
 */

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  try {
    const items = await listBlogs({
      status: BLOG_STATUSES.includes(statusParam ?? "") ? (statusParam as BlogStatus) : undefined,
      limit,
    });
    return ok({ count: items.length, items: items.map(compactContent) }, requestId);
  } catch {
    return fail("DATABASE_ERROR", "Could not list blogs.", 500, requestId);
  }
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be JSON.", 400, requestId);
  }

  const automationJobId =
    typeof body.automationJobId === "string" && body.automationJobId.trim()
      ? body.automationJobId.trim()
      : null;
  const workflowName =
    typeof body.workflowName === "string" ? body.workflowName.slice(0, 80) : null;

  // Idempotency: same automationJobId → return the existing article.
  if (automationJobId) {
    const existing = await getBlogByAutomationJobId(automationJobId);
    if (existing) {
      await logEvent({
        eventType: "BLOG_CREATED",
        automationJobId,
        workflowName,
        contentId: existing.id,
        status: existing.status,
        message: "Idempotent replay — existing article returned.",
      });
      return ok(
        { article: compactContent(existing) },
        requestId,
        200,
        { idempotent: true },
      );
    }
  }

  // camelCase contract → DB columns; unknown keys are reported, not stored.
  const { mapped, dropped } = mapAutomationPayload(body);

  const check = validateAutomationPayload(mapped);
  if (!check.ok) {
    return fail("VALIDATION_ERROR", check.errors.join(" "), 400, requestId);
  }
  const values = check.value;

  if (values.content !== undefined && values.content !== null) {
    values.content = stripDangerousMarkdown(values.content as string);
  }

  // Status is ALWAYS forced to generated — automation cannot publish
  // or approve through creation (approval requires an administrator).
  values.status = "generated";
  values.created_by = "automation";
  values.generated_at = new Date().toISOString();
  if (automationJobId) values.automation_job_id = automationJobId;
  if (!values.slug && typeof values.title === "string") {
    values.slug = slugify(values.title);
  }
  if (!values.slug) {
    return fail("VALIDATION_ERROR", "A slug is required (or provide a title to derive one).", 400, requestId);
  }

  const result = await insertBlog(values);
  if (!result.ok) {
    if ("conflict" in result && result.conflict === "SLUG_CONFLICT") {
      return fail("SLUG_CONFLICT", "A blog with this slug already exists.", 409, requestId);
    }
    if ("conflict" in result && result.conflict === "JOB_CONFLICT") {
      // Race with a concurrent retry — serve the winner idempotently.
      const existing = await getBlogByAutomationJobId(automationJobId as string);
      if (existing) {
        return ok({ article: compactContent(existing) }, requestId, 200, { idempotent: true });
      }
    }
    return fail("DATABASE_ERROR", "Could not create the article.", 500, requestId);
  }

  await logEvent({
    eventType: "BLOG_CREATED",
    automationJobId,
    workflowName,
    contentId: result.blog.id,
    status: result.blog.status,
    message: "Generated article stored.",
    metadata: dropped.length ? { droppedKeys: dropped } : {},
  });

  return ok(
    { article: compactContent(result.blog), reviewUrl: `/admin/blogs/${result.blog.id}` },
    requestId,
    201,
  );
}

/** Focused validation for the automation payload (server-side). */
function validateAutomationPayload(values: Record<string, unknown>): {
  ok: boolean;
  errors: string[];
  value: Record<string, unknown>;
} {
  const errors: string[] = [];
  const out: Record<string, unknown> = {};

  const title = typeof values.title === "string" ? values.title.trim() : "";
  if (!title || title.length > 200) errors.push("title is required (1-200 chars).");
  else out.title = title;

  const slug = typeof values.slug === "string" ? values.slug.trim() : "";
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ) {
    errors.push("slug must be lowercase, URL-safe, hyphen-separated.");
  } else if (slug) out.slug = slug;

  for (const key of ["excerpt", "category", "content_pillar", "primary_keyword", "search_intent", "content_cluster", "meta_title", "meta_description", "og_title", "og_description", "author", "featured_image_alt"]) {
    const v = values[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") {
      errors.push(`${key} must be a string.`);
      continue;
    }
    out[key] = v.slice(0, 500);
  }

  if (values.content !== undefined) {
    if (typeof values.content !== "string" || values.content.length < 1) {
      errors.push("content must be a non-empty string.");
    } else out.content = values.content.slice(0, 200_000);
  }

  for (const key of ["featured_image", "og_image", "canonical_url"]) {
    const v = values[key];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v !== "string" || !/^https?:\/\//.test(v)) {
      errors.push(`${key} must be an http(s) URL.`);
      continue;
    }
    out[key] = v.slice(0, 500);
  }

  for (const key of ["tags", "secondary_keywords"]) {
    const v = values[key];
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string") || v.length > 20) {
      errors.push(`${key} must be an array of strings (max 20).`);
      continue;
    }
    out[key] = v;
  }

  for (const key of ["source_references", "internal_links"]) {
    const v = values[key];
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) {
      errors.push(`${key} must be an array.`);
      continue;
    }
    out[key] = v;
  }

  for (const key of ["generation_model", "prompt_version"]) {
    const v = values[key];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v !== "string") {
      errors.push(`${key} must be a string.`);
      continue;
    }
    out[key] = v.slice(0, 80);
  }

  return { ok: errors.length === 0, errors, value: out };
}
