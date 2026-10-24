import { authenticate, fail, logEvent, ok, testModeBlock } from "@/lib/marketing-api";
import { getBlogById, updateBlog } from "@/lib/blog";
import { site } from "@/lib/site";

/**
 * POST /api/internal/marketing/blogs/:id/schedule
 * Body: { "scheduledAt": "ISO-8601" } — requires APPROVED status.
 * Timestamps are stored as absolute UTC instants; automation sends ISO
 * strings so timezone is explicit by construction.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;
  const blocked = testModeBlock(requestId);
  if (blocked) return blocked;
  const { id } = await params;

  let body: { scheduledAt?: string; workflowName?: string };
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be JSON.", 400, requestId);
  }

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return fail("VALIDATION_ERROR", "scheduledAt must be a valid ISO-8601 timestamp.", 400, requestId);
  }

  const current = await getBlogById(id).catch(() => null);
  if (!current) return fail("NOT_FOUND", "Article not found.", 404, requestId);
  if (current.status !== "approved") {
    return fail(
      "INVALID_STATUS",
      `Only approved articles can be scheduled (current status: ${current.status}). Approval is an administrator action.`,
      422,
      requestId,
    );
  }

  try {
    const updated = await updateBlog(
      id,
      { status: "scheduled", scheduled_at: scheduledAt.toISOString() },
      body.workflowName ?? "automation",
    );
    await logEvent({
      eventType: "BLOG_SCHEDULED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      status: "scheduled",
      message: `Scheduled for ${updated.scheduled_at}`,
    });
    return ok(
      {
        id,
        status: updated.status,
        scheduledAt: updated.scheduled_at,
        plannedUrl: `${site.url}/blog/${updated.slug}`,
      },
      requestId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "schedule failed";
    if (/illegal status transition/i.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not schedule the article.", 500, requestId);
  }
}
