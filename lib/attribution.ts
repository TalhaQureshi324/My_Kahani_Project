/**
 * First-party marketing attribution.
 *
 * Captures paid/organic landing parameters (gclid, gbraid, wbraid, UTMs)
 * plus landing page, referrer and first_seen_at into two first-party
 * cookies:
 *   tsm_attribution       — FIRST touch (written once, never overwritten)
 *   tsm_attribution_last  — LAST campaign touch (optional, refreshed)
 *
 * Cookies: 30-day expiry, SameSite=Lax, Secure in production, path=/.
 * Only URL parameters are ever stored — never card, health, clinical or
 * other sensitive personal information.
 *
 * The pure helpers in this module are covered by tests/attribution.test.mjs.
 */

export const ATTRIBUTION_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type AttributionParamKey = (typeof ATTRIBUTION_PARAMS)[number];

export type AttributionRecord = {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string;
  referrer: string;
  first_seen_at: string;
  last_seen_at?: string;
};

export const ATTRIBUTION_COOKIE = "tsm_attribution";
export const ATTRIBUTION_LAST_COOKIE = "tsm_attribution_last";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_VALUE_LENGTH = 256;

const isSecure = () =>
  typeof location !== "undefined" && location.protocol === "https:";

/* ── pure helpers (node-testable) ─────────────────────────────── */

/** Normalises one parameter value: trimmed, capped, empty → null. */
export function sanitizeParamValue(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const clean = String(raw).trim().slice(0, MAX_VALUE_LENGTH);
  return clean === "" ? null : clean;
}

/** Builds an attribution record from a landing URL's query string. */
export function buildAttribution(
  search: string,
  landingPage: string,
  referrer: string,
  now: Date = new Date(),
): AttributionRecord | null {
  const sp = new URLSearchParams(search);
  const record = {} as AttributionRecord;

  for (const key of ATTRIBUTION_PARAMS) {
    record[key] = sanitizeParamValue(sp.get(key));
  }

  record.landing_page = sanitizeParamValue(landingPage) ?? "/";
  record.referrer = sanitizeParamValue(referrer) ?? "";
  record.first_seen_at = now.toISOString();
  record.last_seen_at = now.toISOString();

  return record;
}

/** Whether a record carries at least one paid/campaign parameter. */
export function hasCampaignParams(a: AttributionRecord | null): boolean {
  if (!a) return false;
  return ATTRIBUTION_PARAMS.some((k) => a[k] !== null);
}

/** First-touch wins: keep the existing record unless there is none. */
export function mergeFirstTouch(
  existing: AttributionRecord | null,
  incoming: AttributionRecord | null,
): AttributionRecord | null {
  return existing ?? incoming;
}

/** Last-touch: any new campaign landing replaces the previous one. */
export function mergeLastTouch(
  existing: AttributionRecord | null,
  incoming: AttributionRecord | null,
): AttributionRecord | null {
  return incoming ?? existing;
}

export function isExpired(
  record: AttributionRecord | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!record?.first_seen_at) return true;
  const t = new Date(record.first_seen_at).getTime();
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t > COOKIE_MAX_AGE_SECONDS * 1000;
}

export function serializeAttribution(record: AttributionRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

export function parseAttribution(
  raw: string | null | undefined,
  now: Date = new Date(),
): AttributionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("first_seen_at" in parsed) ||
      typeof (parsed as AttributionRecord).landing_page !== "string"
    ) {
      return null;
    }
    if (isExpired(parsed as AttributionRecord, now)) return null;
    return parsed as AttributionRecord;
  } catch {
    return null;
  }
}

/** Builds the Set-Cookie attributes for an attribution cookie. */
export function attributionCookieOptions(secure = true): string {
  return [
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/**
 * Server helper — reads first/last touch from a request's Cookie header.
 * Returns null records when absent, tampered, or expired.
 */
export function readAttributionFromCookieHeader(
  cookieHeader: string | null | undefined,
  now: Date = new Date(),
): { firstTouch: AttributionRecord | null; lastTouch: AttributionRecord | null } {
  if (!cookieHeader) return { firstTouch: null, lastTouch: null };
  const jars = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
  const read = (name: string) => {
    const pair = jars.find((c) => c.startsWith(`${name}=`));
    return pair ? pair.slice(name.length + 1) : null;
  };
  return {
    firstTouch: parseAttribution(read(ATTRIBUTION_COOKIE), now),
    lastTouch: parseAttribution(read(ATTRIBUTION_LAST_COOKIE), now),
  };
}

/* ── client-side capture (browser only) ───────────────────────── */

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; ${attributionCookieOptions(
    isSecure(),
  )}`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Called on every page load/navigation. Records the first touch once
 * (never overwritten by later internal navigation), refreshes the
 * optional last touch on campaign landings, and keeps the legacy
 * tsm_gclid cookie in sync for older code paths.
 */
export function captureAttribution(): {
  firstTouch: AttributionRecord | null;
  lastTouch: AttributionRecord | null;
} {
  if (typeof window === "undefined") {
    return { firstTouch: null, lastTouch: null };
  }

  const now = new Date();
  const landingPage =
    window.location.pathname + window.location.search;
  const incoming = buildAttribution(
    window.location.search,
    landingPage,
    document.referrer,
    now,
  );

  const existing = parseAttribution(readCookie(ATTRIBUTION_COOKIE), now);
  const firstTouch = mergeFirstTouch(existing, incoming);
  if (firstTouch) {
    // Sliding 30-day window; the first_seen_at content never changes.
    writeCookie(ATTRIBUTION_COOKIE, serializeAttribution(firstTouch));
  }

  // Last touch only moves on a NEW campaign landing — parameterless
  // navigations (internal links, direct /book) must not clear it.
  let lastTouch = parseAttribution(readCookie(ATTRIBUTION_LAST_COOKIE), now);
  if (incoming && hasCampaignParams(incoming)) {
    lastTouch = mergeLastTouch(lastTouch, incoming);
    if (lastTouch) {
      writeCookie(ATTRIBUTION_LAST_COOKIE, serializeAttribution(lastTouch));
    }
  }

  // Legacy single-value cookie kept in sync for older code paths.
  const gclid = firstTouch?.gclid ?? lastTouch?.gclid;
  if (gclid) {
    document.cookie = `tsm_gclid=${encodeURIComponent(
      gclid,
    )}; ${attributionCookieOptions(isSecure())}`;
  }

  return { firstTouch, lastTouch };
}
