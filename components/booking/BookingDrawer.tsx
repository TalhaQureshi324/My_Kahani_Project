"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import BookingFlow from "./BookingFlow";

/**
 * Slide-over booking sheet: fixed right-hand panel over a darkened
 * backdrop. Closes on Esc, backdrop click, or the top-right ✕; the
 * flow state resets after the exit transition so the next open starts
 * fresh at step 1.
 */
export default function BookingDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [flowKey, setFlowKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Lazy-mount the flow on first open so closed pages don't carry a
  // hidden calendar; it stays mounted afterwards for the exit animation.
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Reset the booking flow once the slide-out transition has finished.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setFlowKey((k) => k + 1), 350);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close booking panel"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book your session"
        className={`fixed inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-y-auto bg-[#F5EFE6] shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
              True Self Me
            </p>
            <h2 className="mt-2 font-display text-3xl text-[#5D1F13]">
              Book your session
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking panel"
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#1A1A1A] transition-colors hover:bg-[#F3EDE5]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 px-6 pb-10 pt-6 sm:px-8">
          {mounted ? <BookingFlow key={flowKey} /> : null}
        </div>
      </div>
    </div>
  );
}
