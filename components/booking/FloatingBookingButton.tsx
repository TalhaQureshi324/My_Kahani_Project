"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useBookingDrawer } from "./BookingProvider";
import { trackEvent } from "@/lib/analytics";

/**
 * Global floating "Book My Appointment" CTA — fixed bottom-right on
 * every route. Opens the shared slide-over booking drawer (never
 * navigates away), fires cta_clicked + booking_drawer_opened tagged
 * `floating_cta`, and hides while the drawer is open.
 *
 * Footer docking: when the site footer scrolls into view, the button
 * shifts up so it rides just above the footer's top edge instead of
 * covering the legal bar / contact links.
 */
export default function FloatingBookingButton() {
  const { openBooking } = useBookingDrawer();
  const [footerVisible, setFooterVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Track drawer open state by observing the dialog element's class —
  // BookingProvider intentionally doesn't expose `open` on its context,
  // and the drawer's translate-x-full ↔ translate-x-0 transition is the
  // single source of truth for visibility.
  useEffect(() => {
    const check = () => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Book your session"]');
      setDrawerOpen(!!dialog && !dialog.className.includes("translate-x-full"));
    };
    check();
    const mo = new MutationObserver(check);
    const dialog = document.querySelector('[role="dialog"][aria-label="Book your session"]');
    if (dialog) mo.observe(dialog, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  // Footer docking: shift up when the footer's top edge crosses the
  // bottom of the viewport.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -12px 0px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (drawerOpen) return null;

  return (
    <button
      type="button"
      aria-label="Book my appointment"
      onClick={() => {
        trackEvent({
          action: "cta_clicked",
          category: "navigation",
          label: "Book My Appointment",
          location: "floating_cta",
        });
        openBooking("floating_cta");
      }}
      className={`fixed right-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5D1F13] px-5 py-3 font-sans text-sm font-semibold tracking-wide text-[#F5EFE6] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8C4320] hover:shadow-xl md:right-8 md:px-6 md:py-3.5 md:text-base ${
        footerVisible
          ? "bottom-[var(--footer-dock,140px)] md:bottom-[var(--footer-dock-md,160px)]"
          : "bottom-6 md:bottom-8"
      }`}
      style={
        footerVisible
          ? { "--footer-dock": "140px", "--footer-dock-md": "150px" } as React.CSSProperties
          : undefined
      }
    >
      <CalendarCheck className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
      Book My Appointment
    </button>
  );
}
