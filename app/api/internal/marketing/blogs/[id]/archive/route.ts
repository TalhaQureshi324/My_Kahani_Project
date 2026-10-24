import { revalidatePath } from "next/cache";
import { authenticate, fail, logEvent, ok, testModeBlock } from "@/lib/marketing-api";
import { getBlogById, updateBlog } from "@/lib/blog";

/**
 * POST /api/internal/marketing/blogs/:id/archive
 * PUBLISHED → ARCHIVED: removed from the public listing and sitemap,
 * database history preserved (never hard-deleted).
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

  let body: { workflowName?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const current = await getBlogById(id).catch(() => null);
  if (!current) return fail("NOT_FOUND", "Article not found.", 404, requestId);
  if (current.status !== "published") {
    return fail("INVALID_STATUS", `Only published articles can be archived (current status: ${current.status}).`, 422, requestId);
  }

  try {
    const updated = await updateBlog(id, { status: "archived" }, body.workflowName ?? "automation");
    revalidatePath("/blog");
    revalidatePath(`/blog/${current.slug}`);
    revalidatePath("/sitemap.xml");

    await logEvent({
      eventType: "BLOG_ARCHIVED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      status: "archived",
      message: "Archived via API.",
    });

    return ok({ id, status: updated.status }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "archive failed";
    if (/illegal status transition/i.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not archive the article.", 500, requestId);
  }
}
