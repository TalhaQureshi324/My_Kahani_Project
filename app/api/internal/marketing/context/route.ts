import { authenticate, fail, ok } from "@/lib/marketing-api";
import { listBlogs } from "@/lib/blog";
import { BRAND_CONTEXT } from "@/lib/brand-context";

/**
 * GET /api/internal/marketing/context — compact brand + content
 * context for LLM workflows so n8n never hardcodes brand rules.
 * Non-sensitive only: no client, booking, or customer data.
 */
export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  try {
    const recent = await listBlogs({ status: "published", limit: 20 });
    return ok(
      {
        brand: BRAND_CONTEXT,
        recentArticles: recent.map((b) => ({
          title: b.title,
          slug: b.slug,
          url: `https://trueselfme.com/blog/${b.slug}`,
          primaryKeyword: b.primary_keyword,
          contentPillar: b.content_pillar,
          contentCluster: b.content_cluster,
          publishedAt: b.published_at,
        })),
      },
      requestId,
    );
  } catch {
    return fail("DATABASE_ERROR", "Could not assemble context.", 500, requestId);
  }
}
