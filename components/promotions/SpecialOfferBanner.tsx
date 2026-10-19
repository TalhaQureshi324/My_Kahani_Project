"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useBookingDrawer } from "@/components/booking/BookingProvider";

const DISMISS_KEY = "tsm_offer_banner_dismissed";

/**
 * Header announcement bar for the 4-session special offer. Sits above
 * the sticky navbar on every page, dismissible for the rest of the
 * browser session (sessionStorage). "Claim Offer" opens the booking
 * drawer with the bundle tier preselected.
 */
export default function SpecialOfferBanner() {
  const { openBooking } = useBookingDrawer();
  const [visible, setVisible] = useState(false);

  // Hidden until mounted so a session-dismissed bar never flashes.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — banner returns next load, harmless */
    }
  };

  return (
    <div
      role="region"
      aria-label="Special offer announcement"
      className="relative w-full bg-[#5D1F13] px-4 py-2 text-[#F5EFE6]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <Sparkles className="hidden h-3.5 w-3.5 shrink-0 text-[#E8C9A0] sm:block" aria-hidden="true" />
        <p className="text-xs font-medium tracking-wide sm:text-sm">
          <span className="font-bold text-[#E8C9A0]">Special Offer:</span>{" "}
          4 Virtual Therapy Sessions for $200 USD ($50/session)
        </p>
        <button
          type="button"
          onClick={() => openBooking("offer-banner", "bundle4")}
          className="rounded-full bg-[#A8532B] px-3.5 py-1 text-xs font-bold text-white transition-colors hover:bg-[#8F4423]"
        >
          Claim Offer
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss offer announcement"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#F5EFE6]/60 transition-colors hover:bg-white/10 hover:text-[#F5EFE6]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
