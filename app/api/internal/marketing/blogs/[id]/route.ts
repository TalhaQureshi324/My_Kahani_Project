import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";
import {
  getBlogById,
  recordRevision,
  updateBlog,
} from "@/lib/blog";
import {
  AUTOMATION_EDITABLE_STATUSES,
  compactContent,
  mapAutomationPayload,
  stripDangerousMarkdown,
} from "@/lib/marketing-shared.mjs";

/**
 * GET   /api/internal/marketing/blogs/:id — full article (any status).
 * PATCH /api/internal/marketing/blogs/:id — edit GENERATED/REVIEW drafts
 * only; published content is never rewritten by automation.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("NOT_FOUND", "Article not found.", 404, requestId);

  try {
    const blog = await getBlogById(id);
    if (!blog) return fail("NOT_FOUND", "Article not found.", 404, requestId);
    return ok({ article: blog }, requestId);
  } catch {
    return fail("DATABASE_ERROR", "Could not read the article.", 500, requestId);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("NOT_FOUND", "Article not found.", 404, requestId);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be JSON.", 400, requestId);
  }

  const current = await getBlogById(id).catch(() => null);
  if (!current) return fail("NOT_FOUND", "Article not found.", 404, requestId);
  if (!AUTOMATION_EDITABLE_STATUSES.includes(current.status)) {
    return fail(
      "EDIT_NOT_ALLOWED",
      `Automation may only edit generated/review drafts (status is ${current.status}). Use the refresh workflow for published content.`,
      409,
      requestId,
    );
  }

  const { mapped } = mapAutomationPayload(body);
  const patch: Record<string, unknown> = {};
  if (typeof mapped.title === "string" && mapped.title.trim()) patch.title = mapped.title.trim().slice(0, 200);
  if (typeof mapped.excerpt === "string") patch.excerpt = mapped.excerpt.slice(0, 500);
  if (typeof mapped.content === "string") patch.content = stripDangerousMarkdown(mapped.content.slice(0, 200_000));
  for (const key of ["category", "content_pillar", "primary_keyword", "search_intent", "content_cluster", "meta_title", "meta_description", "og_title", "og_description"]) {
    if (typeof mapped[key] === "string") patch[key] = (mapped[key] as string).slice(0, 500);
  }
  for (const key of ["featured_image", "og_image", "canonical_url"]) {
    if (typeof mapped[key] === "string" && /^https?:\/\//.test(mapped[key] as string)) patch[key] = mapped[key];
  }
  for (const key of ["tags", "secondary_keywords", "source_references", "internal_links"]) {
    if (Array.isArray(mapped[key])) patch[key] = mapped[key];
  }

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No editable fields supplied.", 400, requestId);
  }

  const contentChanged = patch.content !== undefined && patch.content !== current.content;
  const workflowName = typeof body.workflowName === "string" ? body.workflowName.slice(0, 80) : "automation";
  if (contentChanged) {
    await recordRevision(
      id,
      { title: current.title, excerpt: current.excerpt, content: current.content, meta_title: current.meta_title, meta_description: current.meta_description },
      workflowName,
      "automation update",
    );
  }

  try {
    const updated = await updateBlog(id, { ...patch, updated_at: new Date().toISOString() }, workflowName);
    await logEvent({
      eventType: "BLOG_UPDATED",
      automationJobId: current.automation_job_id,
      workflowName,
      contentId: id,
      status: updated.status,
      message: "Automation draft update.",
      metadata: { fields: Object.keys(patch) },
    });
    return ok({ article: compactContent(updated) }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    if (/illegal status transition/.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not update the article.", 500, requestId);
  }
}
