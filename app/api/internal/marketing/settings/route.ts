import { authenticate, fail, ok } from "@/lib/marketing-api";
import { getAllMarketingSettings } from "@/lib/blog";

/**
 * GET /api/internal/marketing/settings — read-only, whitelisted,
 * non-secret operational settings for n8n planning. Secrets and
 * credential material never appear here; settings changes remain
 * admin-only (no write endpoint exists).
 */

const SAFE_KEYS = [
  "marketing_enabled",
  "blog_days",
  "instagram_days",
  "generation_hour",
  "default_publish_hour",
  "timezone",
  "auto_approve",
  "social_publishing_enabled",
  "image_generation_enabled",
  "email_notifications_enabled",
] as const;

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (!auth.ok) return auth.response;
  const { requestId } = auth;

  try {
    const all = await getAllMarketingSettings();
    // Whitelist projection — unknown future keys stay private until
    // they are explicitly reviewed and added here.
    const settings = Object.fromEntries(
      SAFE_KEYS.filter((k) => k in all).map((k) => [k, all[k]]),
    );
    return ok({ settings }, requestId);
  } catch {
    return fail("DATABASE_ERROR", "Could not read settings.", 500, requestId);
  }
}
