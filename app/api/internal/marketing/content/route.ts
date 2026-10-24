import { authenticate, fail, ok } from "@/lib/marketing-api";
import { listBlogs, type BlogStatus } from "@/lib/blog";
import { BLOG_STATUSES } from "@/lib/blog-shared.mjs";
import { compactContent } from "@/lib/marketing-shared.mjs";

/**
 * GET /api/internal/marketing/content — compact content-registry feed
 * for the planner (never article bodies). Filters: status, pillar,
 * publishedSince, search, limit.
 */
export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));

  try {
    const items = await listBlogs({
      status: BLOG_STATUSES.includes(statusParam ?? "")
        ? (statusParam as BlogStatus)
        : undefined,
      pillar: url.searchParams.get("pillar") || undefined,
      search: url.searchParams.get("search") || undefined,
      limit,
    });

    const publishedSince = url.searchParams.get("publishedSince");
    const filtered = publishedSince
      ? items.filter((b) => b.published_at && new Date(b.published_at) >= new Date(publishedSince))
      : items;

    return ok(
      { count: filtered.length, items: filtered.map(compactContent) },
      requestId,
    );
  } catch {
    return fail("DATABASE_ERROR", "Could not read the content registry.", 500, requestId);
  }
}
