"use client";

import { useEffect, useMemo, useState } from "react";
import { chicagoWallTimeToUtc } from "@/lib/scheduling";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";

/**
 * Stage 1 — month calendar (current + next month) fed by the live
 * availability API. Slots are UTC instants from the server; dates are
 * grouped in the visitor's own timezone and rendered converted.
 * The practitioner's availability is defined in America/Chicago on
 * the server — never hardcoded CST.
 */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type SlotOption = { start: string; end: string }; // UTC ISO pair

type ApiSlot = { start: string; end: string; chicago_date: string };

/** Long Chicago date label for a booked slot (booking reference flows in). */
export function formatDateLong(bookingIdOrDate: string): string {
  const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(bookingIdOrDate)
    ? bookingIdOrDate
    : null;
  if (!dateISO) return bookingIdOrDate;
  const noon = chicagoWallTimeToUtc(dateISO, "12:00");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(noon);
}

/** Chicago wall-time label for a UTC instant. */
export function formatTimeIn(instant: Date | string): string {
  return formatTimeInTZ("America/Chicago", instant);
}

/** Time label in an arbitrary timezone. */
export function formatTimeInTZ(timeZone: string, instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** UTC instant of a Chicago wall hour on a calendar date. */
export function slotInstant(dateISO: string, hourCST: number): Date {
  return chicagoWallTimeToUtc(
    dateISO,
    `${String(hourCST).padStart(2, "0")}:00`,
  );
}

export default function CustomScheduler({
  selected,
  onSelect,
  onContinue,
  continuing = false,
  error = null,
}: {
  selected: SlotOption | null;
  onSelect: (slot: SlotOption) => void;
  onContinue: () => void;
  continuing?: boolean;
  error?: string | null;
}) {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current, 1 = next
  const [slots, setSlots] = useState<ApiSlot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [visitorTz, setVisitorTz] = useState<string | null>(null);
  const [displayTz, setDisplayTz] = useState<string | null>(null);
  const [tzChanging, setTzChanging] = useState(false);

  // Visitor timezone (auto-detected; overridable).
  useEffect(() => {
    try {
      const detected =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
      setVisitorTz(detected);
      setDisplayTz(detected);
    } catch {
      setVisitorTz("America/Chicago");
      setDisplayTz("America/Chicago");
    }
  }, []);

  // Load window: from today to the end of the viewed month.
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewYear = base.getFullYear();
  const viewMonth = base.getMonth();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(base);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayLocalISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const fromISO = monthOffset === 0 ? todayLocalISO : `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const toISO = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setLoadError(null);
    fetch(`/api/availability?from=${fromISO}&to=${toISO}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.configured) {
          setConfigured(false);
          setLoadError(data.error ?? "Scheduling is not connected yet.");
          return;
        }
        setConfigured(true);
        setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load availability. Please refresh.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset, fromISO, toISO]);

  // Group slots by the visitor's local calendar date.
  const byLocalDate = useMemo(() => {
    const map = new Map<string, SlotOption[]>();
    if (displayTz === null) return map;
    for (const s of slots ?? []) {
      const start = new Date(s.start);
      const localDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: displayTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(start);
      const list = map.get(localDate) ?? [];
      list.push({ start: s.start, end: s.end });
      map.set(localDate, list);
    }
    return map;
  }, [slots, displayTz]);

  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  const selectedLocalDate = selected
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: displayTz ?? "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(selected.start))
    : null;

  const daySlots = selectedLocalDate ? (byLocalDate.get(selectedLocalDate) ?? []) : [];
  const timeFmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: displayTz ?? "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  void timeFmt;

  const selectedLocalLabel = selected
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: displayTz ?? "America/Chicago",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date(selected.start))
    : null;

  const tzOptions = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];

  return (
    <div>
      {/* Month header — current or next month only */}
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-[#5D1F13]">
          {monthLabel}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={monthOffset === 0}
            onClick={() => setMonthOffset(0)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={monthOffset === 1}
            onClick={() => setMonthOffset(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Day grid */}
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/45"
          >
            {d}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (iso === null) return <div key={`b${i}`} />;
          const hasSlots = (byLocalDate.get(iso) ?? []).length > 0;
          const isPast = iso < todayLocalISO;
          const enabled = hasSlots && !isPast && iso >= todayLocalISO;
          const isSelected = selectedLocalDate === iso && selected !== null;
          const dayNumber = Number(iso.slice(8));
          return (
            <button
              key={iso}
              type="button"
              disabled={!enabled}
              aria-pressed={isSelected}
              aria-label={iso}
              onClick={() => {
                const first = (byLocalDate.get(iso) ?? [])[0];
                if (first) onSelect(first);
              }}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                isSelected
                  ? "bg-[#A8532B] font-medium text-white"
                  : enabled
                    ? "bg-[#F5EFE6] text-[#1A1A1A] hover:bg-[#EAE2D7]"
                    : "cursor-default text-[#1A1A1A]/25"
              }`}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>

      {/* Timezone line */}
      <div className="mt-5 flex items-center gap-2 text-sm text-[#1A1A1A]/70">
        <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
        {tzChanging ? (
          <select
            aria-label="Select timezone"
            value={displayTz ?? ""}
            onChange={(e) => {
              setDisplayTz(e.target.value);
              setTzChanging(false);
            }}
            onBlur={() => setTzChanging(false)}
            className="h-10 rounded-none border border-black/[0.08] bg-[#F3EDE5] px-3 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
          >
            {(visitorTz && !tzOptions.includes(visitorTz)
              ? [visitorTz, ...tzOptions]
              : tzOptions
            ).map((id) => (
              <option key={id} value={id}>
                {id.split("/").pop()?.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : (
          <p>
            Times shown in{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {displayTz ?? "your timezone"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setTzChanging(true)}
              className="font-semibold text-[#A8532B] underline-offset-2 hover:underline"
            >
              (Change)
            </button>
          </p>
        )}
      </div>

      {/* Slots for the selected day */}
      {loadError ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-black/[0.12] px-4 py-5 text-sm text-[#1A1A1A]/60">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#A8532B]" aria-hidden="true" />
          {loadError}
        </div>
      ) : slots === null ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-black/[0.12] px-4 py-5 text-sm text-[#1A1A1A]/55">
          <Loader2 className="h-4 w-4 animate-spin text-[#A8532B]" aria-hidden="true" />
          Loading availability…
        </div>
      ) : !configured ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-black/[0.12] px-4 py-5 text-sm text-[#1A1A1A]/60">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#A8532B]" aria-hidden="true" />
          {loadError ?? "Online scheduling is not connected yet. Please contact us to book."}
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/55">
            Open times — {selectedLocalDate ? new Intl.DateTimeFormat("en-US", { timeZone: displayTz ?? "America/Chicago", weekday: "long", month: "short", day: "numeric" }).format(new Date(selected!.start)) : "select a date"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {daySlots.map((slot) => {
              const isSelected =
                selected !== null && selected.start === slot.start;
              return (
                <button
                  key={slot.start}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(slot)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? "border-[#A8532B] bg-[#A8532B]/10 font-semibold text-[#5D1F13]"
                      : "border-black/10 bg-[#F5EFE6] text-[#1A1A1A] hover:border-[#A8532B]/40 hover:bg-[#EAE2D7]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                  {timeFmt(slot.start)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-[#1A1A1A]/45">
            All 50-minute sessions start on the hour, scheduled in Central Time.
          </p>
        </>
      )}

      {/* Action bar */}
      {selected !== null && (
        <div className="mt-6 flex flex-col gap-3 border-t border-black/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#1A1A1A]/80">
            Selected:{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {selectedLocalLabel} at {timeFmt(selected.start)}
            </span>
          </p>
          <button
            type="button"
            onClick={onContinue}
            disabled={continuing}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-50 sm:self-auto"
          >
            {continuing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reserving…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Hold / flow errors (e.g. slot taken, hold expired) */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
