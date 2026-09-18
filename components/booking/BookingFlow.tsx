"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Lock } from "lucide-react";
import CustomScheduler, {
  formatDateLong,
  formatTimeIn,
  type SlotOption,
} from "./CustomScheduler";
import BookingConfirmation from "./BookingConfirmation";
import StripePaymentStep from "./StripePaymentStep";

/**
 * The booking interaction shell: a four-stage state machine with a
 * persistent stepper (left) and a dynamic stage container (right).
 * Stage 1 — live availability (in-house scheduler).
 * Stage 2 — streamlined intake (first/last name, email, phone).
 * Stage 3 — card-on-file consent + Stripe-hosted payment
 *           profile form (server-verified), which also performs the
 *           database-checked hold → confirmed conversion.
 * Stage 4 — confirmation + .ics calendar download.
 */

const STAGES = [
  { id: 1, label: "Select Date & Time" },
  { id: 2, label: "Your Details" },
  { id: 3, label: "Review & Confirm" },
  { id: 4, label: "Confirmation" },
] as const;

type Hold = { booking_id: string; expires_at: string };

export default function BookingFlow() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [bookingId, setBookingId] = useState<string | null>(null);

  const detailsValid =
    fields.firstName.trim() !== "" &&
    fields.lastName.trim() !== "" &&
    /.+@.+\..+/.test(fields.email) &&
    fields.phone.trim() !== "";

  /** Creates the 10-minute database hold for the chosen slot. */
  async function createHold(slot: SlotOption) {
    setHoldError(null);
    setContinuing(true);
    try {
      const res = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_start: slot.start, slot_end: slot.end }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setHoldError(
          data.error ?? "Could not reserve that time. Please choose another slot.",
        );
        return;
      }
      setHold({
        booking_id: data.booking_id,
        expires_at: data.hold.expires_at,
      });
      setStage(2);
    } catch {
      setHoldError("Network error. Please try again.");
    } finally {
      setContinuing(false);
    }
  }

  const slotLabel =
    selected !== null
      ? `${formatDateLong(chicagoDateOf(selected.start))} at ${formatTimeIn(
          selected.start,
        )} your time`
      : "";

  return (
    <div className="grid gap-10 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
      {/* Left rail — stepper, session summary, hold status, terms */}
      <aside className="space-y-8">
        <ol className="space-y-1">
          {STAGES.map(({ id, label }) => {
            const state = id === stage ? "current" : id < stage ? "done" : "upcoming";
            return (
              <li
                key={id}
                aria-current={state === "current" ? "step" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  state === "current"
                    ? "bg-[#5D1F13]/[0.06] font-bold text-[#5D1F13]"
                    : state === "done"
                      ? "text-[#1A1A1A]"
                      : "text-[#1A1A1A]/45"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    state === "current"
                      ? "border-[#A8532B] bg-[#A8532B] text-white"
                      : state === "done"
                        ? "border-[#1A1A1A]/25 bg-[#1A1A1A] text-white"
                        : "border-black/[0.08] bg-white"
                  }`}
                >
                  {state === "done" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : id}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        {/* Session summary */}
        <div className="border-t border-black/[0.08] pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A8532B]">
            Session summary
          </p>
          <p className="mt-3 text-sm font-semibold text-[#1A1A1A]">
            Initial consultation — 50 minutes
          </p>
          {selected ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#1A1A1A]/75">
              <CalendarDays className="h-3.5 w-3.5 text-[#A8532B]" aria-hidden="true" />
              {slotLabel}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#1A1A1A]/60">
              Held virtually, nationwide.
            </p>
          )}
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#5D1F13]/[0.06] px-3 py-1 text-xs font-bold text-[#5D1F13]">
            <Lock className="h-3 w-3" aria-hidden="true" />
            $0 due today
          </p>
        </div>

        <p className="border-t border-black/[0.08] pt-6 text-xs leading-relaxed text-[#1A1A1A]/55">
          Free cancellation up to 24 hours before your session. Your card would
          be kept securely on file (once payments are enabled) and only charged
          for missed or late-cancelled appointments, in line with our practice
          policy.
        </p>
      </aside>

      {/* Right — dynamic stage container */}
      <div className="min-h-[420px] rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8">
        {stage === 1 && (
          <div className="flex h-full flex-col">
            <h3 className="font-display text-2xl text-[#5D1F13]">Pick your time</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
              Choose a date and an open slot — all times shown in Central Time
              (CST), or your local timezone.
            </p>
            <div className="mt-6">
              <CustomScheduler
                selected={selected}
                onSelect={setSelected}
                onContinue={() => selected && createHold(selected)}
                continuing={continuing}
                error={holdError}
              />
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="flex h-full flex-col">
            <h3 className="font-display text-2xl text-[#5D1F13]">Your details</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
              Just the essentials — we keep intake light for a first
              conversation.
            </p>
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="bf-first"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
                  >
                    First name
                  </label>
                  <input
                    id="bf-first"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={fields.firstName}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, firstName: e.target.value }))
                    }
                    className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bf-last"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
                  >
                    Last name
                  </label>
                  <input
                    id="bf-last"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={fields.lastName}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, lastName: e.target.value }))
                    }
                    className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="bf-email"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
                >
                  Email
                </label>
                <input
                  id="bf-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={fields.email}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="bf-phone"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
                >
                  Phone
                </label>
                <input
                  id="bf-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={fields.phone}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
                  placeholder="(555) 555-0100"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-black/[0.08] pt-6">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#1A1A1A]/60 transition-colors hover:text-[#1A1A1A]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStage(3)}
                disabled={!detailsValid}
                className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
              >
                Review & Confirm
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="flex h-full flex-col">
            <h3 className="font-display text-2xl text-[#5D1F13]">
              Review & Confirm
            </h3>
            <div className="mt-6 space-y-3 rounded-xl border border-black/[0.08] bg-[#F3EDE5] px-5 py-4 text-sm">
              <p className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
                  <CalendarDays className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
                  Date & time
                </span>
                <span className="font-semibold text-[#1A1A1A]">
                  {formatDateLong(chicagoDateOf(selected!.start))} ·{" "}
                  {formatTimeIn(selected!.start)} your time
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
                  <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
                  Duration / format
                </span>
                <span className="font-semibold text-[#1A1A1A]">
                  50 minutes · Virtual video
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-[#1A1A1A]/60">Name</span>
                <span className="font-semibold text-[#1A1A1A]">
                  {fields.firstName} {fields.lastName}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-[#1A1A1A]/60">Email</span>
                <span className="font-semibold text-[#1A1A1A]">{fields.email}</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="text-[#1A1A1A]/60">Phone</span>
                <span className="font-semibold text-[#1A1A1A]">{fields.phone}</span>
              </p>
            </div>

            <StripePaymentStep
              bookingId={hold!.booking_id}
              holdExpiresAt={hold!.expires_at}
              slot={{
                dateISO: chicagoDateOf(selected!.start),
                slotCSTHour: chicagoHour(selected!.start),
              }}
              onConfirmed={() => setStage(4)}
              onExpired={() => {
                setHoldError(
                  "Your slot hold has expired. Please choose a new time to continue.",
                );
                setStage(1);
                setSelected(null);
                setHold(null);
              }}
              onBack={() => setStage(2)}
            />
          </div>
        )}

        {stage === 4 && selected && (
          <BookingConfirmation
            bookingId={bookingId ?? "TSM-PENDING"}
            slot={{
              dateISO: chicagoDateOf(selected.start),
              slotCSTHour: chicagoHour(selected.start),
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Chicago calendar date (YYYY-MM-DD) of a UTC instant. */
function chicagoDateOf(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** CST/CDT wall hour (0–23) of a UTC instant. */
function chicagoHour(instant: Date | string): number {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(d),
  );
}
