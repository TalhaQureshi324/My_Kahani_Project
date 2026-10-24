import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import {
  API_VERSION,
  bearerToken,
  errorResponse,
  okResponse,
  verifyApiKey,
} from "./marketing-shared.mjs";

/**
 * Server-side plumbing for the internal marketing API
 * (/api/internal/marketing/*): bearer-key authentication, rate
 * limiting, the standard response envelope, request IDs, audit events,
 * and test-mode gating.
 *
 * Fail-closed rules:
 *  - MARKETING_API_KEY unset  → every request 503 API_DISABLED
 *  - wrong/missing bearer     → 401 AUTH_REQUIRED
 *  - MARKETING_AUTOMATION_TEST_MODE=true → publish/unpublish/schedule
 *    are refused (TEST_MODE_BLOCKED) so integration tests can never
 *    publish real content.
 */

export type AuthResult =
  | { ok: true; requestId: string }
  | { ok: false; response: NextResponse };

export function marketingApiEnabled(): boolean {
  return Boolean(process.env.MARKETING_API_KEY);
}

export function automationTestMode(): boolean {
  return process.env.MARKETING_AUTOMATION_TEST_MODE === "true";
}

/** Authenticates the request and applies the automation rate limit. */
export function authenticate(request: Request): AuthResult {
  const requestId = randomUUID();

  if (!marketingApiEnabled()) {
    return { ok: false, response: respond(errorResponse("API_DISABLED", "Marketing API is not configured.", requestId), 503, requestId) };
  }

  const ip = clientIp(request);
  const rl = rateLimit(`marketing:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return { ok: false, response: respond(errorResponse("RATE_LIMITED", "Too many requests. Slow down.", requestId), 429, requestId) };
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!verifyApiKey(token, process.env.MARKETING_API_KEY)) {
    // Audit authentication failures (key material never logged).
    logEvent({
      eventType: "API_AUTH_FAILED",
      message: "Rejected marketing API request",
      metadata: { ip, userAgent: request.headers.get("user-agent") ?? null },
    }).catch(() => undefined);
    return { ok: false, response: respond(errorResponse("AUTH_REQUIRED", "Authentication required.", requestId), 401, requestId) };
  }

  return { ok: true, requestId };
}

export function respond(body: unknown, status: number, requestId: string): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
  });
}

export function ok<T>(data: T, requestId: string, status = 200, extra: Record<string, unknown> = {}) {
  return respond(okResponse(data, requestId, status, extra), status, requestId);
}

export function fail(code: string, message: string, status: number, requestId: string) {
  return respond(errorResponse(code, message, requestId), status, requestId);
}

/** appends a workflow_events audit row; failures never break the API. */
export async function logEvent(event: {
  eventType: string;
  automationJobId?: string | null;
  workflowName?: string | null;
  contentId?: string | null;
  status?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("workflow_events").insert({
      event_type: event.eventType,
      automation_job_id: event.automationJobId ?? null,
      workflow_name: event.workflowName ?? null,
      content_id: event.contentId ?? null,
      status: event.status ?? null,
      message: event.message ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (err) {
    console.error("[marketing-api] audit write failed", err instanceof Error ? err.message : err);
  }
}

/** Guard for state-changing publication endpoints in test mode. */
export function testModeBlock(requestId: string): NextResponse | null {
  if (!automationTestMode()) return null;
  return fail(
    "TEST_MODE_BLOCKED",
    "MARKETING_AUTOMATION_TEST_MODE is enabled — publication state changes are refused. Unset it to allow publishing.",
    403,
    requestId,
  );
}

export { API_VERSION };
