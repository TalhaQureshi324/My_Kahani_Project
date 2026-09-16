"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Lock, MonitorPlay, ShieldCheck } from "lucide-react";
import { getStoredGclid } from "@/lib/tracking";
import { formatDateLong, formatTimeIn, slotInstant } from "./CustomScheduler";

/**
 * Stages 2 & 3 — the 3-field intake plus Authorize.net Accept.js card
 * tokenization. Card details live only inside Accept.js: the browser
 * exchanges them for an opaque token (dataDescriptor/dataValue) and our
 * server never sees a card number.
 */

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        request: {
          authData: { clientKey: string; apiLoginId: string };
          cardData: {
            cardNumber: string;
            cardCode: string;
            cardExpiration: string;
          };
        },
        handler: (response: {
          messages: { resultCode: "Ok" | "Error"; message: { code: string; text: string } | Array<{ code: string; text: string }> };
          opaqueData?: { dataDescriptor: string; dataValue: string };
        }) => void,
      ) => void;
    };
  }
}

const ACCEPT_JS_URL =
  process.env.NEXT_PUBLIC_AUTHORIZENET_ENVIRONMENT === "PRODUCTION"
    ? "https://js.authorize.net/v1/Accept.js"
    : "https://jstest.authorize.net/v1/Accept.js";

const CLIENT_KEY = process.env.NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY ?? "";
const API_LOGIN_ID = process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID ?? "";

const paymentConfigured = Boolean(CLIENT_KEY && API_LOGIN_ID);

const inputClass =
  "w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]";

const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60";

export default function IntakeAndPayment({
  stage,
  slot,
  fields,
  onFieldChange,
  onDetailsNext,
  onBack,
  onBooked,
}: {
  stage: 2 | 3;
  slot: { dateISO: string; slotCSTHour: number };
  fields: { name: string; email: string; mobile: string };
  onFieldChange: (fields: { name: string; email: string; mobile: string }) => void;
  onDetailsNext: () => void;
  onBack: () => void;
  onBooked: (bookingId: string) => void;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MM/YY
  const [cardCode, setCardCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptReady = useRef(false);

  useEffect(() => {
    if (window.Accept) acceptReady.current = true;
  }, []);

  const detailsValid =
    fields.name.trim() !== "" &&
    /.+@.+\..+/.test(fields.email) &&
    fields.mobile.trim() !== "";
  const cardLooksValid =
    cardNumber.replace(/\D/g, "").length >= 13 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
    cardCode.replace(/\D/g, "").length >= 3;

  function handleExpiryChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  function handleConfirm() {
    setError(null);
    if (!agreed || submitting) return;

    if (!paymentConfigured || !window.Accept) {
      setError(
        "Online card-on-file isn't set up on this deployment yet. Please contact us directly to reserve your slot.",
      );
      return;
    }
    if (!cardLooksValid) {
      setError("Please check your card number, expiration date, and security code.");
      return;
    }

    setSubmitting(true);
    const [expMM, expYY] = expiry.split("/");

    window.Accept.dispatchData(
      {
        authData: { clientKey: CLIENT_KEY, apiLoginId: API_LOGIN_ID },
        cardData: {
          cardNumber: cardNumber.replace(/\s/g, ""),
          cardCode: cardCode.replace(/\D/g, ""),
          cardExpiration: `20${expYY}-${expMM}`,
        },
      },
      async (response) => {
        const messages = Array.isArray(response.messages.message)
          ? response.messages.message
          : [response.messages.message];
        if (response.messages.resultCode !== "Ok" || !response.opaqueData) {
          setSubmitting(false);
          setError(
            messages[0]?.text ??
              "We couldn't verify your card. Please double-check the details and try again.",
          );
          return;
        }

        try {
          const res = await fetch("/api/booking/authorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: fields.name,
              email: fields.email,
              phone: fields.mobile,
              gclid: getStoredGclid(),
              opaqueToken: response.opaqueData,
              slotDetails: {
                dateISO: slot.dateISO,
                slotCSTHour: slot.slotCSTHour,
                durationMinutes: 50,
                format: "Virtual Video Consultation",
              },
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setSubmitting(false);
            setError(
              data.error ??
                "We couldn't reserve your slot. Please try again or contact us directly.",
            );
            return;
          }
          setSubmitting(false);
          onBooked(data.bookingId as string);
        } catch {
          setSubmitting(false);
          setError("Network error while reserving your slot. Please try again.");
        }
      },
    );
  }

  return (
    <div className="space-y-8">
      {/* Accept.js — sandbox or production per deployment env */}
      {paymentConfigured && (
        <Script src={ACCEPT_JS_URL} strategy="afterInteractive" onLoad={() => (acceptReady.current = true)} />
      )}

      {/* Persistent booking summary banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-black/[0.08] bg-[#F3EDE5] px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
          <CalendarDays className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
          {formatDateLong(slot.dateISO)}
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
          <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
          {formatTimeIn(slotInstant(slot.dateISO, slot.slotCSTHour))} CST
        </span>
        <span className="text-sm text-[#1A1A1A]/70">50 mins</span>
        <span className="inline-flex items-center gap-2 text-sm text-[#1A1A1A]/70">
          <MonitorPlay className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
          Virtual Video Consultation
        </span>
      </div>

      {/* Intake — the only three fields we ask for */}
      <fieldset>
        <legend className="font-display text-2xl text-[#5D1F13]">Your details</legend>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="iap-name" className={labelClass}>
              Full name
            </label>
            <input
              id="iap-name"
              type="text"
              autoComplete="name"
              required
              value={fields.name}
              onChange={(e) => onFieldChange({ ...fields, name: e.target.value })}
              className={inputClass}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="iap-email" className={labelClass}>
              Email address
            </label>
            <input
              id="iap-email"
              type="email"
              autoComplete="email"
              required
              value={fields.email}
              onChange={(e) => onFieldChange({ ...fields, email: e.target.value })}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="iap-mobile" className={labelClass}>
              Mobile phone number
            </label>
            <input
              id="iap-mobile"
              type="tel"
              autoComplete="tel"
              required
              value={fields.mobile}
              onChange={(e) => onFieldChange({ ...fields, mobile: e.target.value })}
              className={inputClass}
              placeholder="(555) 555-0100"
            />
          </div>
        </div>
      </fieldset>

      {/* Payment — Accept.js tokenization */}
      <fieldset>
        <legend className="flex items-center gap-2 font-display text-2xl text-[#5D1F13]">
          <ShieldCheck className="h-5 w-5 text-[#A8532B]" aria-hidden="true" />
          Card on file
        </legend>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#1A1A1A]/60">
          Processed securely by Authorize.net. Your card number is tokenized in
          your browser — it is never stored on or sent to our servers.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]"
          >
            {error}
          </p>
        )}
        {!paymentConfigured && (
          <p className="mt-4 rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-sm text-[#1A1A1A]/70">
            Card-on-file isn&apos;t configured on this deployment yet — add the
            Authorize.net environment variables to enable live reservations.
          </p>
        )}

        {/* Accept.js hosted inputs */}
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="iap-card" className={labelClass}>
              Card number
            </label>
            <input
              id="iap-card"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className={`${inputClass} font-mono tracking-wider`}
              placeholder="4111 1111 1111 1111"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="iap-exp" className={labelClass}>
                Expiration (MM/YY)
              </label>
              <input
                id="iap-exp"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                className={inputClass}
                placeholder="09/28"
              />
            </div>
            <div>
              <label htmlFor="iap-code" className={labelClass}>
                Security code
              </label>
              <input
                id="iap-code"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass}
                placeholder="123"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Agreement */}
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#1A1A1A]/80">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#A8532B]"
          required
        />
        <span>
          I authorize True Self Me to store this card on file. Sessions are
          billed at completion ($150 list / sliding scale). Cancellations within
          24 hours of session time are subject to the late fee.
        </span>
      </label>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-black/[0.08] pt-6">
        <button
          type="button"
          onClick={stage === 3 ? onBack : onDetailsNext}
          disabled={stage === 2 && !detailsValid}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#1A1A1A]/60 transition-colors hover:text-[#1A1A1A] disabled:pointer-events-none disabled:opacity-40"
        >
          {stage === 3 ? (
            <>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </>
          ) : (
            <>
              Continue to card
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
        {stage === 3 && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !agreed || !cardLooksValid || !detailsValid}
            className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Reserving…" : "Confirm & Reserve Slot"}
          </button>
        )}
      </div>
    </div>
  );
}
