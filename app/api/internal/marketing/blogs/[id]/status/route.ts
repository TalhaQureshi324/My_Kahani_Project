import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";
import { getBlogById, updateBlog, type BlogStatus } from "@/lib/blog";
import { AUTOMATION_ALLOWED_STATUSES } from "@/lib/marketing-shared.mjs";

/**
 * POST /api/internal/marketing/blogs/:id/status
 * Body: { "status": "review" | "draft" | "failed" }
 *
 * Automation may NEVER set approved/published/scheduled/archived —
 * approval is an administrator action (AUTO_APPROVE stays off).
 * The DB trigger remains the hard backstop for transition legality.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;
  const { id } = await params;

  let body: { status?: string; workflowName?: string };
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be JSON.", 400, requestId);
  }

  const to = body.status;
  if (!to || !AUTOMATION_ALLOWED_STATUSES.includes(to)) {
    return fail(
      "STATUS_NOT_ALLOWED",
      `Automation may only set status to: ${AUTOMATION_ALLOWED_STATUSES.join(", ")}. Approval and publication require an administrator.`,
      403,
      requestId,
    );
  }

  const current = await getBlogById(id).catch(() => null);
  if (!current) return fail("NOT_FOUND", "Article not found.", 404, requestId);

  try {
    const updated = await updateBlog(id, { status: to as BlogStatus }, body.workflowName ?? "automation");
    await logEvent({
      eventType: "STATUS_CHANGED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      status: to,
      message: `${current.status} → ${to}`,
    });
    return ok({ id, status: updated.status, previousStatus: current.status }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "transition failed";
    if (/illegal status transition/i.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not change status.", 500, requestId);
  }
}
