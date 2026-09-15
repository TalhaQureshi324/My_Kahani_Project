"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureGclid } from "@/lib/tracking";

/**
 * Mounted once in the root layout so every route — however the visitor
 * arrives — records paid-traffic attribution immediately. Re-runs on
 * client-side navigations in case a gclid lands on a deep link.
 */
export default function GclidTracker() {
  const pathname = usePathname();

  useEffect(() => {
    captureGclid();
  }, [pathname]);

  return null;
}
