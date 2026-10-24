import { revalidatePath } from "next/cache";
import { authenticate, fail, logEvent, ok, testModeBlock } from "@/lib/marketing-api";
import { getBlogById, updateBlog } from "@/lib/blog";
import { PUBLISHABLE_STATUSES } from "@/lib/marketing-shared.mjs";
import { site } from "@/lib/site";

/**
 * POST /api/internal/marketing/blogs/:id/publish
 *
 * Publishes an APPROVED or SCHEDULED article: validates required
 * fields, stores the publication timestamp, revalidates /blog,
 * /blog/[slug] and /sitemap.xml (no rebuild), records audit events,
 * and returns the final public URL. Idempotent — an already-published
 * article returns its URL again without duplicate events.
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

  // Idempotent republication guard.
  if (current.status === "published") {
    return ok(
      {
        id,
        status: "published",
        url: `${site.url}/blog/${current.slug}`,
        publishedAt: current.published_at,
      },
      requestId,
      200,
      { idempotent: true },
    );
  }

  if (!PUBLISHABLE_STATUSES.includes(current.status)) {
    return fail(
      "INVALID_STATUS",
      `Only approved or scheduled articles can be published (current status: ${current.status}).`,
      422,
      requestId,
    );
  }

  // Publication readiness: required fields + metadata sanity.
  const problems: string[] = [];
  if (!current.title?.trim()) problems.push("title missing");
  if (!current.slug?.trim()) problems.push("slug missing");
  if (!current.content?.trim()) problems.push("content empty");
  if (!current.meta_title && !current.title) problems.push("meta title missing");
  if (problems.length) {
    return fail("PUBLISH_VALIDATION", `Article is not publishable: ${problems.join("; ")}.`, 422, requestId);
  }

  try {
    const published = await updateBlog(id, { status: "published" }, body.workflowName ?? "automation");
    const url = `${site.url}/blog/${published.slug}`;

    revalidatePath("/blog");
    revalidatePath(`/blog/${published.slug}`);
    revalidatePath("/sitemap.xml");

    await logEvent({
      eventType: "BLOG_PUBLISHED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      status: "published",
      message: `Published at ${url}`,
      metadata: { url, publishedAt: published.published_at },
    });
    await logEvent({
      eventType: "REVALIDATION_COMPLETED",
      automationJobId: current.automation_job_id,
      workflowName: body.workflowName ?? null,
      contentId: id,
      message: "blog, article, sitemap revalidated",
    });

    return ok(
      {
        id,
        status: "published",
        url,
        slug: published.slug,
        publishedAt: published.published_at,
      },
      requestId,
      201,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "publish failed";
    if (/illegal status transition/i.test(message)) {
      return fail("INVALID_TRANSITION", message, 422, requestId);
    }
    return fail("DATABASE_ERROR", "Could not publish the article.", 500, requestId);
  }
}
