import { revalidatePath } from "next/cache";
import { authenticate, fail, logEvent, ok, testModeBlock } from "@/lib/marketing-api";
import { getBlogById, updateBlog } from "@/lib/blog";
import { site } from "@/lib/site";

/**
 * POST /api/internal/marketing/blogs/:id/unpublish
 * Body: { "reason"?: string }
 *
 * PUBLISHED → DRAFT only (explicit endpoint; generic PATCH cannot do
 * this). The public URL 404s afterwards because drafts are never
 * rendered; listing and sitemap drop it on revalidation.
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

  let body: { reason?: string; workflowName?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const current = await getBlogById(id).catch(() => null);
  if (!current) return fail("NOT_FOUND", "Article not found.", 404, requestId);
  if (current.status !== "published") {
    return fail("INVALID_STATUS", `Only published articles can be unpublished (current status: ${current.status}).`, 422, requestId);
  }

  try {
    const updated = await updateBlog(id, { status: "draft" }, body.workflowName ?? "automation");
    revalidatePath("/blog");
    revalidatePath(`/blog/${current.slug}`);
    revalidatePath("/sitemap.xml");

    await logEvent({
      eventType: "BLOG_UNPUBLISHED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      status: "draft",
      message: body.reason ? `Unpublished: ${body.reason.slice(0, 200)}` : "Unpublished via API.",
    });

    return ok({ id, status: updated.status, formerUrl: `${site.url}/blog/${current.slug}`, note: "Public URL now returns 404." }, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unpublish failed";
    if (/illegal status transition/i.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not unpublish the article.", 500, requestId);
  }
}
