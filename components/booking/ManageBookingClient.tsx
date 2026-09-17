"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  UserRound,
} from "lucide-react";
import CustomScheduler, { type SlotOption } from "./CustomScheduler";

/**
 * Self-service booking management: view / cancel / reschedule. The
 * manage token rides in the path; all mutations go through the
 * token-authenticated manage routes and are enforced at the database.
 */

type BookingView = {
  reference: string;
  status: string;
  slotStartISO: string;
  slotEndISO: string;
  firstName: string;
  lastName: string;
  clientTimezone: string;
  cardBrand: string | null;
  cardLast4: string | null;
};

const CANCEL_REASONS = [
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "plans_changed", label: "Plans changed" },
  { value: "other", label: "Other" },
];

export default function ManageBookingClient({
  token,
  booking,
}: {
  token: string;
  booking: BookingView;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "cancel" | "reschedule">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const slotLabel = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: booking.clientTimezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));

  async function cancelBooking() {
    if (busy) return;
    setBusy("cancel");
    setSlotError(null);
    try {
      const res = await fetch(`/api/booking/manage/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "plans_changed" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSlotError(data.error ?? "Could not cancel. Please try again.");
        return;
      }
      setMessage("Your booking has been cancelled.");
      router.refresh();
    } catch {
      setSlotError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function rescheduleTo(slot: SlotOption) {
    if (busy) return;
    setBusy("reschedule");
    setSlotError(null);
    try {
      const res = await fetch(`/api/booking/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_start: slot.start, slot_end: slot.end }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSlotError(data.error ?? "Could not reschedule. Please try again.");
        return;
      }
      setMode("view");
      setMessage("Your booking has been rescheduled.");
      router.refresh();
    } catch {
      setSlotError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A8532B]">
        True Self Me — Manage booking
      </p>
      <h1 className="mt-2 font-display text-4xl text-[#5D1F13]">
        {booking.reference}
      </h1>

      <div className="mt-8 space-y-2.5 rounded-xl border border-black/[0.08] bg-[#F3EDE5] px-5 py-4 text-sm">
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <CalendarDays className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Date
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            {slotLabel(booking.slotStartISO)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Duration
          </span>
          <span className="font-semibold text-[#1A1A1A]">50 minutes</span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <UserRound className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Format
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            Virtual video consultation
          </span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            Status
          </span>
          <span className="font-semibold uppercase text-[#1A1A1A]">
            {booking.status}
          </span>
        </p>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/api/bookings/${encodeURIComponent(booking.reference)}/calendar`}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7]"
        >
          <ArrowDownToLine className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
          Add to Calendar (.ics)
        </a>
        {!isCancelled && booking.status === "confirmed" && (
          <button
            type="button"
            onClick={() => setMode(mode === "reschedule" ? "view" : "reschedule")}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7]"
          >
            Reschedule
          </button>
        )}
        {!isCancelled && booking.status === "confirmed" && (
          <button
            type="button"
            onClick={cancelBooking}
            disabled={busy === "cancel"}
            className="inline-flex items-center gap-2 rounded-full border border-[#A8532B]/40 px-5 py-2.5 text-sm font-bold text-[#A8532B] transition-colors hover:bg-[#A8532B]/10 disabled:opacity-50"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel booking"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded-lg border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#1A1A1A]">
          {message}
        </p>
      )}

      {/* Reschedule: embedded scheduler */}
      {mode === "reschedule" && (
        <div className="mt-8 rounded-xl border border-black/[0.08] bg-white p-6">
          <h2 className="font-display text-xl text-[#5D1F13]">
            Choose a new time
          </h2>
          <p className="mt-2 text-sm text-[#1A1A1A]/60">
            All times shown in your local timezone. Pick an open slot and
            confirm — your original appointment stays booked until the move
            succeeds.
          </p>
          <div className="mt-4">
            <CustomScheduler
              selected={selected}
              onSelect={setSelected}
              onContinue={() => {
                if (selected) void rescheduleTo(selected);
              }}
              continuing={busy === "reschedule"}
              error={slotError}
            />
          </div>
        </div>
      )}

      <p className="mt-10 border-t border-black/[0.08] pt-6 text-xs leading-relaxed text-[#1A1A1A]/45">
        True Self Me provides non-clinical coaching and personal development
        services. Free cancellation up to 24 hours before your session. This
        is not an emergency service — if you are in crisis, dial 988.
      </p>
    </div>
  );
}
