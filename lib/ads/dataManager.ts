import { createSign } from "node:crypto";
import {
  DATA_MANAGER_ENDPOINT,
  DATA_MANAGER_SCOPE,
} from "./convert.ts";

/**
 * Data Manager API client (server-side only).
 *
 * Auth: Google service account → signed JWT → OAuth2 access token,
 * cached in module memory until just before expiry. This is the standard
 * service-account key flow; Google's docs prefer keyless impersonation,
 * which is not available on Vercel's runtime.
 *
 * API: POST https://datamanager.googleapis.com/v1/events:ingest — the
 * current Data Manager API (NOT the legacy UploadClickConversions
 * endpoint, which this project never calls).
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type DataManagerConfig = {
  clientEmail: string;
  privateKey: string;
};

export function getDataManagerConfig(): DataManagerConfig | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

/* ── token ────────────────────────────────────────────────────────────── */

type CachedToken = { token: string; expiresAtMs: number };
let cachedToken: CachedToken | null = null;

function buildJwt(config: DataManagerConfig, nowSeconds: number): string {
  const b64url = (input: object | string) =>
    Buffer.from(typeof input === "string" ? input : JSON.stringify(input))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const claims = b64url({
    iss: config.clientEmail,
    sub: config.clientEmail,
    scope: DATA_MANAGER_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer
    .sign(config.privateKey)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${claims}.${signature}`;
}

/** Permanent (non-retryable) OAuth failures — bad key/email/unaligned grant. */
const PERMANENT_OAUTH_ERRORS = new Set([
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
]);

export type AuthOutcome =
  | { ok: true; token: string }
  | { ok: false; permanent: boolean; message: string };

async function fetchToken(
  config: DataManagerConfig,
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<AuthOutcome> {
  const assertion = buildJwt(config, Math.floor(nowMs / 1000));
  try {
    const res = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!res.ok || !data.access_token) {
      const error = data.error ?? `HTTP ${res.status}`;
      return {
        ok: false,
        permanent: PERMANENT_OAUTH_ERRORS.has(error),
        message: `Data Manager auth failed: ${error}`,
      };
    }
    cachedToken = {
      token: data.access_token,
      expiresAtMs: nowMs + Math.min(data.expires_in ?? 3600, 3600) * 1000,
    };
    return { ok: true, token: data.access_token };
  } catch (err) {
    // Network trouble reaching the token endpoint — treat as retryable.
    return {
      ok: false,
      permanent: false,
      message: `Data Manager auth unreachable: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

async function getAccessToken(
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<AuthOutcome> {
  if (cachedToken && nowMs < cachedToken.expiresAtMs - 60_000) {
    return { ok: true, token: cachedToken.token };
  }
  cachedToken = null;
  const config = getDataManagerConfig();
  if (!config) {
    return {
      ok: false,
      permanent: true,
      message:
        "Data Manager not configured: set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    };
  }
  return fetchToken(config, fetchImpl, nowMs);
}

/* ── ingest ───────────────────────────────────────────────────────────── */

/** gRPC-ish status codes Google returns for retriable conditions. */
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

export type IngestOutcome =
  | { kind: "sent"; requestId: string | null }
  | { kind: "retryable"; errorCode: string; errorMessage: string }
  | { kind: "permanent"; errorCode: string; errorMessage: string };

export type IngestArgs = {
  body: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

/**
 * Sends one events:ingest request. Never throws — every failure mode is
 * classified as retryable or permanent and returned to the worker.
 */
export async function ingestEvents(
  args: IngestArgs,
): Promise<IngestOutcome> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const nowMs = Date.now();

  const auth = await getAccessToken(fetchImpl, nowMs);
  if (!auth.ok) {
    return {
      kind: auth.permanent ? "permanent" : "retryable",
      errorCode: auth.permanent ? "auth_config" : "auth_transient",
      errorMessage: auth.message,
    };
  }

  try {
    const res = await fetchImpl(DATA_MANAGER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let data: {
      requestId?: string;
      error?: { code?: number; message?: string; status?: string };
    } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      /* non-JSON body — fall through with the HTTP status */
    }

    if (res.ok) {
      return { kind: "sent", requestId: data.requestId ?? null };
    }

    const errorCode = String(
      data.error?.status ?? data.error?.code ?? res.status,
    );
    const errorMessage = data.error?.message ?? `HTTP ${res.status}`;
    if (RETRYABLE_HTTP.has(res.status)) {
      return { kind: "retryable", errorCode, errorMessage };
    }
    return { kind: "permanent", errorCode, errorMessage };
  } catch (err) {
    // Timeouts and network failures are the definition of retryable.
    return {
      kind: "retryable",
      errorCode: "network",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ── backoff ──────────────────────────────────────────────────────────── */

/** Exponential-ish backoff (minutes) by attempt number (1-based). */
const BACKOFF_MINUTES = [1, 5, 30, 120, 720]; // 1h → 5m → 30m → 2h → 12h
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length;

export function backoffMinutesForAttempt(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1), BACKOFF_MINUTES.length) - 1;
  return BACKOFF_MINUTES[index];
}

export function nextAttemptAtFor(attempt: number, now = new Date()): Date {
  return new Date(
    now.getTime() + backoffMinutesForAttempt(attempt) * 60_000,
  );
}
