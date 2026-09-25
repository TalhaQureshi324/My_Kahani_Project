"use client";

import type { ReactNode } from "react";
import { useBookingDrawer } from "./BookingProvider";
import { trackEvent } from "@/lib/analytics";

/**
 * A CTA that opens the slide-over booking drawer. Drop-in replacement
 * for the site's existing booking CTAs — pass the same className the
 * old link/button carried so the visual stays identical.
 *
 * `location` tags the analytics cta_clicked event with where the CTA
 * lives (navbar, hero, pricing, footer…). Fire-and-forget only.
 */
export default function BookingTrigger({
  children,
  className = "",
  ariaLabel,
  onClick,
  location = "unlabeled",
  label,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  /** Runs after opening — e.g. closing a nav drawer. */
  onClick?: () => void;
  /** Analytics: where this CTA lives. */
  location?: string;
  /** Analytics: CTA text (defaults to aria-label or children text). */
  label?: string;
}) {
  const { openBooking } = useBookingDrawer();
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent({
          action: "cta_clicked",
          category: "navigation",
          label:
            label ??
            ariaLabel ??
            (typeof children === "string" ? children : "booking_cta"),
          location,
        });
        openBooking(location);
        onClick?.();
      }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
