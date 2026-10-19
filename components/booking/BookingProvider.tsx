"use client";

import { trackEvent } from "@/lib/analytics";
import type { BookingPackage } from "@/lib/pricing";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import BookingDrawer from "./BookingDrawer";

type BookingContextValue = {
  /** Opens the shared booking drawer. `pkg` preselects a tier. */
  openBooking: (source?: string, pkg?: BookingPackage) => void;
  closeBooking: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBookingDrawer(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBookingDrawer must be used within BookingProvider");
  }
  return ctx;
}

/**
 * Mounts once in the root layout: provides open/close to every CTA on
 * the site and hosts the shared slide-over booking drawer. Promotional
 * surfaces (offer banner, welcome modal) pass a package so the drawer
 * opens with that tier already selected.
 */
export default function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [presetPackage, setPresetPackage] =
    useState<BookingPackage>("single");
  const openBooking = useCallback((source = "unknown", pkg?: BookingPackage) => {
    if (pkg) setPresetPackage(pkg);
    setOpen(true);
    trackEvent({ action: "booking_drawer_opened", category: "booking", source });
  }, []);
  const closeBooking = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ openBooking, closeBooking }),
    [openBooking, closeBooking],
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingDrawer open={open} onClose={closeBooking} presetPackage={presetPackage} />
    </BookingContext.Provider>
  );
}
