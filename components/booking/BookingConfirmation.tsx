"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, CalendarDays, CheckCircle2, Clock, MonitorPlay, UserRound } from "lucide-react";
import { formatDateLong, formatTimeIn, formatTimeInTZ, slotInstant } from "./CustomScheduler";

/**
 * Stage 4 — confirmation view: checkmark badge, booking details box,
 * the .ics calendar download, and the card-on-file reassurance note.
 */
export default function BookingConfirmation({
  bookingReference,
  slot,
}: {
  bookingReference: string;
  slot: { dateISO: string; slotCSTHour: number };
}) {
  const instant = slotInstant(slot.dateISO, slot.slotCSTHour);
  const [localTz, setLocalTz] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      /* keep null */
    }
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5D1F13]">
        <CheckCircle2 className="h-9 w-9 text-[#F5EFE6]" aria-hidden="true" />
      </span>

      <h3 className="font-display text-3xl text-[#5D1F13]">
        Your Consultation is Reserved
      </h3>

      <div className="w-full max-w-md space-y-2.5 rounded-xl border border-black/[0.08] bg-[#F3EDE5] px-5 py-4 text-sm">
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <CalendarDays className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Date
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            {formatDateLong(slot.dateISO)} · {formatTimeIn(instant)} CT
          </span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Time
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            {localTz
              ? new Intl.DateTimeFormat("en-US", {
                  timeZone: localTz,
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }).format(instant)
              : formatTimeInTZ("America/Chicago", instant)}
            {localTz ? <span className="ml-1 font-normal text-[#1A1A1A]/55">({localTz})</span> : null}
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
            Practitioner
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            Fahd Alam — Coach &amp; Mentor
          </span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
            <MonitorPlay className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
            Format
          </span>
          <span className="font-semibold text-[#1A1A1A]">
            Virtual Video Consultation
          </span>
        </p>
      </div>

      <a
        href={`/api/bookings/${encodeURIComponent(bookingReference)}/calendar`}
        className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811]"
      >
        <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
        Add to Calendar (.ics)
      </a>

      <p className="max-w-md text-xs leading-relaxed text-[#1A1A1A]/55">
        A card has been placed on file. No charges will be processed until
        after your consultation.
      </p>
    </div>
  );
}
