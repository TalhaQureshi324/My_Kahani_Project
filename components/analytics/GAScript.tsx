"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Conditional Google Analytics loader.
 *
 * Renders nothing — no external requests, no console output — unless
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is set. This keeps preview subdomains
 * and development clean until the production GA4 property exists.
 * Event dispatching (lib/analytics) is safe either way: with no script
 * loaded, gtag/dataLayer are absent and trackEvent no-ops.
 */
export default function GAScript() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!gaId) return;
    try {
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      }
      gtag("js", new Date());
      gtag("config", gaId, { send_page_view: true });
    } catch {
      /* never block the page on analytics */
    }
  }, [gaId]);

  if (!gaId) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      strategy="afterInteractive"
    />
  );
}

