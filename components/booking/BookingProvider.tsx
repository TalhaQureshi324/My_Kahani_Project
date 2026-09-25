"use client";

import { trackEvent } from "@/lib/analytics";
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
  openBooking: (source?: string) => void;
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
 * the site and hosts the shared slide-over booking drawer.
 */
export default function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBooking = useCallback((source = "unknown") => {
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
      <BookingDrawer open={open} onClose={closeBooking} />
    </BookingContext.Provider>
  );
}
