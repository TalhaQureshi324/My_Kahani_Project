import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";
import { createCalendarItem, listCalendar } from "@/lib/blog";

/**
 * GET  /api/internal/marketing/calendar — planned slots (from/to dates).
 * POST /api/internal/marketing/calendar — create a planned item;
 * duplicate day/platform/type is rejected (409) by the table's unique
 * constraint so daily replans stay idempotent.
 */

const PLATFORMS = ["blog", "instagram", "facebook", "linkedin", "tiktok", "youtube", "pinterest"];
const TYPES = ["carousel", "checklist", "reflection", "question", "educational", "recap", "quote", "blog", "teaser"];
const STATUSES = ["planned", "in_progress", "ready", "approved", "published", "cancelled", "skipped"];

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 60) || 60));
  try {
    const items = await listCalendar({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      limit,
    });
    return ok({ count: items.length, items }, requestId);
  } catch {
    return fail("DATABASE_ERROR", "Could not read the calendar.", 500, requestId);
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

  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  const platform = typeof body.platform === "string" ? body.platform.toLowerCase() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
  const status = typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : "planned";

  const errors: string[] = [];
  if (!date) errors.push("date must be YYYY-MM-DD.");
  if (!PLATFORMS.includes(platform)) errors.push(`platform must be one of: ${PLATFORMS.join(", ")}.`);
  if (!TYPES.includes(contentType)) errors.push(`contentType must be one of: ${TYPES.join(", ")}.`);
  if (body.blogId !== undefined && body.blogId !== null && !/^[0-9a-f-]{36}$/i.test(String(body.blogId))) {
    errors.push("blogId must be a UUID.");
  }
  if (errors.length) return fail("VALIDATION_ERROR", errors.join(" "), 400, requestId);

  const result = await createCalendarItem({
    scheduled_date: date,
    platform,
    content_type: contentType,
    topic: typeof body.topic === "string" ? body.topic.slice(0, 300) : null,
    pillar: typeof body.pillar === "string" ? body.pillar.slice(0, 80) : null,
    status,
    blog_id: body.blogId ?? null,
    automation_job_id: typeof body.automationJobId === "string" ? body.automationJobId.slice(0, 80) : null,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  });

  if (!result.ok) {
    if ("conflict" in result && result.conflict) {
      return fail("CALENDAR_CONFLICT", "A slot already exists for that date, platform, and content type.", 409, requestId);
    }
    return fail("DATABASE_ERROR", "Could not create the calendar item.", 500, requestId);
  }

  await logEvent({
    eventType: "CALENDAR_UPDATED",
    automationJobId: (body.automationJobId as string) ?? null,
    workflowName: typeof body.workflowName === "string" ? body.workflowName : null,
    message: `Calendar slot created: ${date} ${platform}/${contentType}`,
    metadata: { calendarId: result.item.id },
  });

  return ok({ item: result.item }, requestId, 201);
}
