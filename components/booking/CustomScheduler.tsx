"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";

/**
 * In-house scheduler: month calendar + timezone-aware slot picker.
 * All date math is plain Date/Intl — no scheduling libraries. Slot
 * availability is defined in the practice's timezone (America/Chicago)
 * and rendered converted into the client's (or manually overridden)
 * timezone.
 */

const PRACTICE_TZ = "America/Chicago";
export const SLOT_HOURS_CST = [9, 10, 11, 13, 14, 15, 16]; // 50-min blocks on the hour
const MAX_DAYS_AHEAD = 60;

const TIMEZONES = [
  { id: "America/New_York", label: "Eastern Time" },
  { id: "America/Chicago", label: "Central Time" },
  { id: "America/Denver", label: "Mountain Time" },
  { id: "America/Los_Angeles", label: "Pacific Time" },
  { id: "America/Phoenix", label: "Arizona" },
  { id: "Europe/London", label: "London" },
  { id: "Europe/Berlin", label: "Berlin" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Asia/Kolkata", label: "India" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Tokyo", label: "Tokyo" },
  { id: "Australia/Sydney", label: "Sydney" },
];

export type SlotSelection = { dateISO: string; slotCSTHour: number | null };

/* ── timezone math (no libraries) ─────────────────────────────── */

function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return (asUTC - utcMs) / 60000;
}

/** The UTC instant of a wall-clock hour on dateISO in the practice tz. */
export function slotInstant(dateISO: string, hourCST: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, hourCST);
  const off1 = tzOffsetMinutes(PRACTICE_TZ, naive);
  const off2 = tzOffsetMinutes(PRACTICE_TZ, naive - off1 * 60000);
  return new Date(naive - off2 * 60000);
}

export function formatTimeIn(timeZone: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);
}

export function formatDateLong(dateISO: string): string {
  const inst = slotInstant(dateISO, 12);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRACTICE_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(inst);
}

function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── component ────────────────────────────────────────────────── */

export default function CustomScheduler({
  value,
  onChange,
  onContinue,
}: {
  value: SlotSelection;
  onChange: (s: SlotSelection) => void;
  onContinue: () => void;
}) {
  const todayISO = localISO(new Date());
  const maxISO = localISO(new Date(Date.now() + MAX_DAYS_AHEAD * 86400000));

  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [tz, setTz] = useState<string>("America/Chicago");
  const [tzChanging, setTzChanging] = useState(false);

  // Once mounted, adopt the visitor's real timezone (SSR defaults to the
  // practice's Central Time so server and client markup agree on first paint).
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago");
    } catch {
      /* keep Central */
    }
  }, []);

  const tzOptions = useMemo(() => {
    return TIMEZONES.some((t) => t.id === tz)
      ? TIMEZONES
      : [{ id: tz, label: tz.split("/").pop()?.replace(/_/g, " ") ?? tz }, ...TIMEZONES];
  }, [tz]);
  const tzLabel = tzOptions.find((t) => t.id === tz)?.label ?? tz;

  // calendar cells for the viewed month (leading blanks + real days)
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => localISO(new Date(view.y, view.m, i + 1))),
  ];

  const atCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const atHorizonMonth =
    view.y === Number(maxISO.slice(0, 4)) && view.m === Number(maxISO.slice(5, 7)) - 1;
  const isDisabledDay = (iso: string) => iso < todayISO || iso > maxISO;
  const isWeekend = (iso: string) => {
    const d = new Date(view.y, view.m, Number(iso.slice(8)));
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(view.y, view.m, 1));

  const selectedHour = value.slotCSTHour;
  const hasSelection = selectedHour !== null;
  const selectedInstant =
    selectedHour !== null ? slotInstant(value.dateISO, selectedHour) : null;
  const slotGone = selectedInstant ? selectedInstant.getTime() < Date.now() : false;

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-[#5D1F13]">
          {monthLabel}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={atCurrentMonth}
            onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={atHorizonMonth}
            onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#1A1A1A] transition-colors hover:bg-[#EAE2D7] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Day grid */}
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/45">
            {d}
          </div>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <div key={`b${i}`} />
          ) : (
            <button
              key={iso}
              type="button"
              disabled={isDisabledDay(iso) || isWeekend(iso)}
              aria-pressed={value.dateISO === iso}
              aria-label={iso}
              onClick={() => onChange({ dateISO: iso, slotCSTHour: null })}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                value.dateISO === iso
                  ? "bg-[#A8532B] font-medium text-white"
                  : isDisabledDay(iso) || isWeekend(iso)
                    ? "cursor-default text-[#1A1A1A]/25"
                    : "bg-[#F5EFE6] text-[#1A1A1A] hover:bg-[#EAE2D7]"
              }`}
            >
              {Number(iso.slice(8))}
            </button>
          ),
        )}
      </div>

      {/* Timezone line */}
      <div className="mt-5 flex items-center gap-2 text-sm text-[#1A1A1A]/70">
        <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
        {tzChanging ? (
          <select
            aria-label="Select timezone"
            value={tz}
            onChange={(e) => {
              setTz(e.target.value);
              setTzChanging(false);
            }}
            onBlur={() => setTzChanging(false)}
            className="h-10 rounded-none border border-black/[0.08] bg-[#F3EDE5] px-3 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
          >
            {tzOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        ) : (
          <p>
            Times shown in <span className="font-semibold text-[#1A1A1A]">{tzLabel}</span>{" "}
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
      {value.dateISO ? (
        <div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/55">
            Open times — {formatDateLong(value.dateISO)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SLOT_HOURS_CST.map((hour) => {
              const inst = slotInstant(value.dateISO, hour);
              const past = inst.getTime() < Date.now();
              const selected = value.slotCSTHour === hour;
              return (
                <button
                  key={hour}
                  type="button"
                  disabled={past}
                  aria-pressed={selected}
                  onClick={() => onChange({ dateISO: value.dateISO, slotCSTHour: hour })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    selected
                      ? "border-[#A8532B] bg-[#A8532B]/10 font-semibold text-[#5D1F13]"
                      : past
                        ? "cursor-default border-black/[0.06] text-[#1A1A1A]/25"
                        : "border-black/10 bg-[#F5EFE6] text-[#1A1A1A] hover:border-[#A8532B]/40 hover:bg-[#EAE2D7]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                  {formatTimeIn(tz, inst)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-[#1A1A1A]/45">
            All 50-minute sessions start on the hour, scheduled in Central Time.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-black/[0.12] px-4 py-5 text-sm text-[#1A1A1A]/55">
          <CalendarDays className="h-4 w-4 shrink-0 text-[#A8532B]" aria-hidden="true" />
          Select a date above to see open times in your timezone.
        </div>
      )}

      {/* Action bar */}
      {hasSelection && !slotGone && (
        <div className="mt-6 flex flex-col gap-3 border-t border-black/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#1A1A1A]/80">
            Selected:{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {formatDateLong(value.dateISO)} at{" "}
              {formatTimeIn("America/Chicago", slotInstant(value.dateISO, selectedHour))} CST
            </span>
            {tz !== "America/Chicago" && selectedInstant && (
              <span className="text-[#1A1A1A]/55">
                {" "}
                ({formatTimeIn(tz, selectedInstant)} your time)
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] sm:self-auto"
          >
            Continue to Details
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
