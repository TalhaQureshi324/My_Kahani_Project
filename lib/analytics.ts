/**
 * Client-side analytics — type-safe event catalog and dual dispatcher.
 *
 * PRINCIPLES:
 *   - Fire-and-forget: every dispatch is defensive; if gtag is blocked,
 *     dataLayer missing, or anything throws, the UI flow continues
 *     untouched. Never call this on a critical path that can fail.
 *   - Inert by default: with no GA measurement ID configured, gtag and
 *     dataLayer simply don't exist — trackEvent becomes a no-op (plus a
 *     development-only console log) with zero errors or warnings.
 *
 * This layer is purely behavioral analytics. Conversion attribution for
 * Google Ads lives server-side in lib/ads/* (conversion outbox via the
 * Data Manager API) and is never gated on these client events.
 */

export type AnalyticsEvent =
  | { action: "cta_clicked"; category: "navigation"; label: string; location: string }
  | { action: "booking_drawer_opened"; category: "booking"; source: string }
  | { action: "slot_selected"; category: "booking"; date: string; time: string }
  | { action: "details_submitted"; category: "booking"; has_gclid: boolean }
  | { action: "card_saved"; category: "conversion"; booking_id?: string }
  | { action: "booking_confirmed_client"; category: "conversion"; booking_id?: string }
  | { action: "ics_downloaded"; category: "engagement"; booking_id?: string }
  | { action: "scroll_depth"; category: "engagement"; depth: 25 | 50 | 75 | 90 | 100 }
  | { action: "section_viewed"; category: "engagement"; section_id: string; time_spent_ms: number };

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  try {
    if (typeof window === "undefined") return;

    const { action, ...params } = event;

    // 1. Google Analytics gtag event
    if (typeof window.gtag === "function") {
      window.gtag("event", action, params);
    }

    // 2. Google Tag Manager dataLayer push
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: action, ...params });
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[Analytics Event: ${action}]`, params);
    }
  } catch (err) {
    // Fail silently to protect the user flow.
    console.debug("[Analytics Dispatch Error]", err);
  }
}
