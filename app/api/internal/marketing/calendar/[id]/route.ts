import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";
import { getCalendarItem, updateCalendarItem } from "@/lib/blog";

const STATUSES = ["planned", "in_progress", "ready", "approved", "published", "cancelled", "skipped"];

/** PATCH /api/internal/marketing/calendar/:id — reschedule/edit a slot. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("NOT_FOUND", "Calendar item not found.", 404, requestId);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Request body must be JSON.", 400, requestId);
  }

  const existing = await getCalendarItem(id).catch(() => null);
  if (!existing) return fail("NOT_FOUND", "Calendar item not found.", 404, requestId);

  const patch: Record<string, unknown> = {};
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) patch.scheduled_date = body.date;
  if (typeof body.topic === "string") patch.topic = body.topic.slice(0, 300);
  if (typeof body.pillar === "string") patch.pillar = body.pillar.slice(0, 80);
  if (typeof body.blogId === "string" && /^[0-9a-f-]{36}$/i.test(body.blogId)) patch.blog_id = body.blogId;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return fail("VALIDATION_ERROR", `status must be one of: ${STATUSES.join(", ")}.`, 400, requestId);
    }
    patch.status = body.status;
    patch.approved_at = body.status === "approved" ? new Date().toISOString() : existing.approved_at;
    patch.published_at = body.status === "published" ? new Date().toISOString() : existing.published_at;
  }

  if (Object.keys(patch).length === 0) {
    return fail("VALIDATION_ERROR", "No editable fields supplied.", 400, requestId);
  }

  try {
    const item = await updateCalendarItem(id, patch);
    await logEvent({
      eventType: "CALENDAR_UPDATED",
      automationJobId: existing.automation_job_id,
      workflowName: typeof body.workflowName === "string" ? body.workflowName : null,
      message: `Calendar item updated (${Object.keys(patch).join(", ")})`,
      metadata: { calendarId: id },
    });
    return ok({ item }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    if (/duplicate key/i.test(message)) {
      return fail("CALENDAR_CONFLICT", "A slot already exists for that date, platform, and content type.", 409, requestId);
    }
    return fail("DATABASE_ERROR", "Could not update the calendar item.", 500, requestId);
  }
}
