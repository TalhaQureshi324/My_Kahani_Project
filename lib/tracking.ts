/**
 * Paid-traffic attribution. The Google Ads click identifier (gclid)
 * arrives on the landing URL; persisting it lets us attach offline
 * conversions back to the ad click without any third-party script.
 */

const COOKIE_NAME = "tsm_gclid";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

function setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    value,
  )}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

function readCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Reads `gclid` from the active query string. When present, persists it
 * to sessionStorage and a 30-day first-party cookie; otherwise returns
 * whatever was stored previously.
 */
export function captureGclid(): string | null {
  if (typeof window === "undefined") return null;

  const fromQuery = new URLSearchParams(window.location.search).get("gclid");
  if (fromQuery) {
    try {
      sessionStorage.setItem(COOKIE_NAME, fromQuery);
    } catch {
      // sessionStorage unavailable (privacy mode) — the cookie still holds it.
    }
    setCookie(fromQuery);
    return fromQuery;
  }
  return getStoredGclid();
}

/** Stored gclid: cookie first (30-day window), then session storage. */
export function getStoredGclid(): string | null {
  if (typeof window === "undefined") return null;
  const fromCookie = readCookie();
  if (fromCookie) return fromCookie;
  try {
    return sessionStorage.getItem(COOKIE_NAME);
  } catch {
    return null;
  }
}
