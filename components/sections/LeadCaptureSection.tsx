"use client";

import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";

/**
 * Lead capture form — for visitors who are not ready to book.
 * Collects first name + email (+ optional phone with explicit SMS
 * consent). No clinical or health information is ever asked for.
 * `website` is an invisible honeypot field for bots.
 */
export default function LeadCaptureForm() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const valid =
    firstName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          email,
          phone: phone.trim() || undefined,
          sms_consent: smsConsent,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error ?? "Could not save your signup. Please try again.",
        );
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <section id="stay-in-touch" className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center">
          <p className="font-display text-2xl text-[#5D1F13]">
            You&apos;re on the list, {firstName.trim()}.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#1A1A1A]/70">
            Keep an eye on your inbox — and whenever you&apos;re ready, your
            first conversation is one click away.
          </p>
          <a
            href="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-8 py-3.5 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811]"
          >
            Book your intro conversation
          </a>
        </div>
      </section>
    );
  }

  const inputClass =
    "w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]";

  return (
    <section id="stay-in-touch" className="mx-auto max-w-5xl px-6 py-20">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-black/[0.08] bg-white p-8"
      >
      <h3 className="font-display text-2xl text-[#5D1F13]">
        Not ready to book yet?
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
        Leave your first name and email and Fahd will check in from time to
        time — a short note, no pressure, and you can unsubscribe with one
        click.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="lead-first"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
          >
            First name
          </label>
          <input
            id="lead-first"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder="First name"
          />
        </div>
        <div>
          <label
            htmlFor="lead-email"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
          >
            Email
          </label>
          <input
            id="lead-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Honeypot — hidden from humans, irresistible to bots. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="mt-4">
        <label
          htmlFor="lead-phone"
          className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
        >
          Phone <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="lead-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="(555) 555-0100"
        />
        {phone.trim().length > 0 && (
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-[#1A1A1A]/70">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#A8532B]"
            />
            <span>
              It&apos;s okay to text me about sessions and scheduling. No
              clinical talk, no spam — reply STOP anytime.
            </span>
          </label>
        )}
      </div>

      {state === "error" && errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || state === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {state === "sending" ? "Saving…" : "Keep me in touch"}
      </button>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#1A1A1A]/50">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A8532B]" aria-hidden="true" />
        Just your name and email — never any sensitive personal details, and
        never shared or sold.
      </p>
      </form>
    </section>
  );
}
