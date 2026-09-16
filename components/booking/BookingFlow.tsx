"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import CustomScheduler, {
  formatDateLong,
  formatTimeIn,
  slotInstant,
} from "./CustomScheduler";
import IntakeAndPayment from "./IntakeAndPayment";
import BookingConfirmation from "./BookingConfirmation";

/**
 * The booking interaction shell: a four-stage state machine with a
 * persistent stepper (left) and a dynamic stage container (right).
 * Stage 1 is the in-house scheduler; stages 2–3 are the streamlined
 * intake with Authorize.net Accept.js card-on-file vaulting.
 */

const STAGES = [
  { id: 1, label: "Select Date & Time" },
  { id: 2, label: "Your Details" },
  { id: 3, label: "Card on File" },
  { id: 4, label: "Confirmation" },
] as const;

export default function BookingFlow() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [slot, setSlot] = useState({ dateISO: "", slotCSTHour: null as number | null });
  const [fields, setFields] = useState({ name: "", email: "", mobile: "" });
  const [bookingId, setBookingId] = useState<string | null>(null);

  return (
    <div className="grid gap-10 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
      {/* Left rail — stepper, session summary, cancellation terms */}
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
          {slot.slotCSTHour !== null ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#1A1A1A]/75">
              <Clock className="h-3.5 w-3.5 text-[#A8532B]" aria-hidden="true" />
              {formatDateLong(slot.dateISO)} ·{" "}
              {formatTimeIn("America/Chicago", slotInstant(slot.dateISO, slot.slotCSTHour))} CST
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
          Free cancellation up to 24 hours before your session. Your card is
          kept securely on file and is only charged for missed or late-cancelled
          appointments, in line with our practice policy.
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
                value={slot}
                onChange={setSlot}
                onContinue={() => setStage(2)}
              />
            </div>
          </div>
        )}

        {(stage === 2 || stage === 3) && slot.slotCSTHour !== null && (
          <IntakeAndPayment
            stage={stage}
            slot={{ dateISO: slot.dateISO, slotCSTHour: slot.slotCSTHour }}
            fields={fields}
            onFieldChange={setFields}
            onDetailsNext={() => setStage(3)}
            onBack={() => setStage(2)}
            onBooked={(id) => {
              setBookingId(id);
              setStage(4);
            }}
          />
        )}

        {stage === 4 && slot.slotCSTHour !== null && (
          <BookingConfirmation
            bookingId={bookingId ?? "TSM-PREVIEW"}
            slot={{ dateISO: slot.dateISO, slotCSTHour: slot.slotCSTHour }}
          />
        )}
      </div>
    </div>
  );
}
