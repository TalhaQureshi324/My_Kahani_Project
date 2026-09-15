"use client";

import type { ReactNode } from "react";
import { useBookingDrawer } from "./BookingProvider";

/**
 * A CTA that opens the slide-over booking drawer. Drop-in replacement
 * for the site's existing booking CTAs — pass the same className the
 * old link/button carried so the visual stays identical.
 */
export default function BookingTrigger({
  children,
  className = "",
  ariaLabel,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  /** Runs after opening — e.g. closing a nav drawer. */
  onClick?: () => void;
}) {
  const { openBooking } = useBookingDrawer();
  return (
    <button
      type="button"
      onClick={() => {
        openBooking();
        onClick?.();
      }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
