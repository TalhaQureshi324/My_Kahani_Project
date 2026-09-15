"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  UserRound,
} from "lucide-react";
import CustomScheduler, {
  formatDateLong,
  formatTimeIn,
  slotInstant,
  type SlotSelection,
} from "./CustomScheduler";

/**
 * The booking interaction shell: a four-stage state machine with a
 * persistent stepper (left) and a dynamic stage container (right).
 * Stage content is scaffolding for now — the zero-API calendar, the
 * intake fields and the Authorize.net Accept.js vaulting arrive in
 * the following milestones; the shell, states and navigation ship first.
 */

const STAGES = [
  { id: 1, label: "Select Date & Time", icon: CalendarDays },
  { id: 2, label: "Your Details", icon: UserRound },
  { id: 3, label: "Card on File", icon: CreditCard },
  { id: 4, label: "Confirmation", icon: CheckCircle2 },
] as const;

const inputClass =
  "h-12 w-full rounded-none border border-black/[0.08] bg-[#F3EDE5] px-4 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:outline-none focus:ring-1 focus:ring-[#A8532B]";

export default function BookingFlow() {
  const [stage, setStage] = useState(1);
  const [slot, setSlot] = useState<SlotSelection>({ dateISO: "", slotCSTHour: null });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const stage1Done = slot.slotCSTHour !== null;
  const stage2Done =
    name.trim() !== "" && /.+@.+\..+/.test(email) && mobile.trim() !== "";

  const canAdvance = stage === 1 ? stage1Done : stage === 2 ? stage2Done : true;

  function next() {
    if (!canAdvance) return;
    setStage((s) => Math.min(4, s + 1));
  }

  return (
    <div className="grid gap-10 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
      {/* Left rail — stepper, session summary, cancellation terms */}
      <aside className="space-y-8">
        <ol className="space-y-1">
          {STAGES.map(({ id, label, icon: Icon }) => {
            const state =
              id === stage ? "current" : id < stage ? "done" : "upcoming";
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
            <StageHead
              title="Pick your time"
              sub="Choose a date and an open slot — all times shown in Central Time (CST), or your local timezone."
            />
            <div className="mt-6">
              <CustomScheduler value={slot} onChange={setSlot} onContinue={next} />
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="flex h-full flex-col">
            <StageHead
              title="Your details"
              sub="Just the three essentials — we keep intake light for a first conversation."
            />
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="bf-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60">
                  Full name
                </label>
                <input
                  id="bf-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="bf-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60">
                  Email
                </label>
                <input
                  id="bf-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="bf-mobile" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60">
                  Mobile
                </label>
                <input
                  id="bf-mobile"
                  type="tel"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className={inputClass}
                  placeholder="(555) 555-0100"
                />
              </div>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="flex h-full flex-col">
            <StageHead
              title="Card on file"
              sub="No upfront charge. Your card is vaulted securely and used only for missed or late-cancelled sessions."
            />
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/[0.12] px-6 py-10 text-center">
              <CreditCard className="h-8 w-8 text-[#A8532B]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#1A1A1A]">
                Authorize.net Accept.js vaulting
              </p>
              <p className="max-w-sm text-sm text-[#1A1A1A]/60">
                Card fields are tokenized in the browser — no raw card number
                ever touches our server. Arrives in the next milestone.
              </p>
            </div>
          </div>
        )}

        {stage === 4 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-[#5D1F13]" aria-hidden="true" />
            <p className="font-display text-3xl text-[#5D1F13]">
              You&apos;re booked.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-[#1A1A1A]/70">
              {name.trim() !== ""
                ? `Thank you, ${name.trim().split(" ")[0]}. `
                : ""}
              A confirmation with your .ics calendar file will arrive by email,
              and we&apos;ll see you at your 50-minute consultation.
            </p>
            <p className="rounded-full bg-[#5D1F13]/[0.06] px-4 py-1.5 text-xs font-bold text-[#5D1F13]">
              Cash-pay · Card on file · No upfront charge
            </p>
          </div>
        )}

        {/* Navigation — stage 1's Continue lives inside the scheduler */}
        <div className="mt-8 flex items-center justify-between border-t border-black/[0.08] pt-6">
          <button
            type="button"
            onClick={() => setStage((s) => Math.max(1, s - 1))}
            disabled={stage === 1}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#1A1A1A]/60 transition-colors hover:text-[#1A1A1A] disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {stage >= 2 && stage < 4 && (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
            >
              {stage === 3 ? "Confirm booking" : "Continue"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h3 className="font-display text-2xl text-[#5D1F13]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
        {sub}
      </p>
    </div>
  );
}
