"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";

/**
 * Mounted once in the root layout. On every page load and client-side
 * navigation it records first-touch / last-touch marketing attribution
 * (gclid, gbraid, wbraid, UTMs, landing page, referrer) into
 * first-party cookies via lib/attribution.ts.
 *
 * Renders nothing.
 */
export default function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  return null;
}
