import { authenticate, ok, fail } from "@/lib/marketing-api";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/supabase";
import { API_VERSION } from "@/lib/marketing-shared.mjs";

/** GET /api/internal/marketing/health — authenticated, non-sensitive. */
export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  let database = false;
  let blogCms = false;
  if (isDatabaseConfigured) {
    try {
      const { error } = await getSupabaseAdmin()
        .from("blogs")
        .select("id", { count: "exact", head: true });
      database = !error;
      blogCms = !error;
    } catch {
      database = false;
    }
  }

  return ok(
    {
      status: database ? "ok" : "degraded",
      database,
      blogCms,
      apiVersion: API_VERSION,
      timestamp: new Date().toISOString(),
    },
    requestId,
  );
}
