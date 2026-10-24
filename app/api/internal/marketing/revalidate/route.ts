import { revalidatePath } from "next/cache";
import { authenticate, fail, logEvent, ok } from "@/lib/marketing-api";

/**
 * POST /api/internal/marketing/revalidate
 * Body: { "slug"?: string }
 *
 * Manual cache-revalidation hook (normally publishing calls this
 * itself): revalidates /blog, /sitemap.xml and optionally /blog/[slug].
 */
export async function POST(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  let body: { slug?: string; workflowName?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const slug = typeof body.slug === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.slug) ? body.slug : null;

  try {
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    if (slug) revalidatePath(`/blog/${slug}`);

    await logEvent({
      eventType: "REVALIDATION_COMPLETED",
      workflowName: body.workflowName ?? null,
      message: slug ? `Revalidated blog, article (${slug}), sitemap.` : "Revalidated blog + sitemap.",
      metadata: { slug },
    });

    return ok({ revalidated: slug ? ["/blog", `/blog/${slug}`, "/sitemap.xml"] : ["/blog", "/sitemap.xml"] }, requestId);
  } catch {
    return fail("REVALIDATION_FAILED", "Cache revalidation failed.", 500, requestId);
  }
}
