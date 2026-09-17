"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { formatDateLong, formatTimeIn, slotInstant } from "./CustomScheduler";

/**
 * Stage 3 — card-on-file consent + Stripe Payment Element.
 *
 * The customer's card details are entered directly into Stripe's
 * Payment Element; this component never touches card numbers. On
 * confirmSetup success the server verifies the SetupIntent
 * (status = succeeded, belongs to the expected customer) and
 * atomically converts the hold into a confirmed booking.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const stripeConfigured = Boolean(publishableKey);

export default function StripePaymentStep({
  bookingId,
  holdExpiresAt,
  slot,
  onConfirmed,
  onExpired,
  onBack,
  continuing = false,
}: {
  bookingId: string;
  holdExpiresAt: string;
  slot: { dateISO: string; slotCSTHour: number };
  onConfirmed: () => void;
  onExpired: () => void;
  onBack: () => void;
  continuing?: boolean;
}) {
  const [consent, setConsent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loadingSI, setLoadingSI] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Elements instance must remount when the client secret changes.
  const elementsOptions = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: "stripe" as const } } : null),
    [clientSecret],
  );

  const minutesLeft = Math.max(
    0,
    Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 60000),
  );

  /** Requests the SetupIntent (server creates/reuses the Stripe Customer). */
  const loadSetupIntent = useCallback(async () => {
    setTokenError(null);
    setConfirmError(null);
    setLoadingSI(true);
    try {
      const res = await fetch("/api/booking/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, consent_accepted: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 410) {
          setTokenError(
            data.error ?? "Your slot hold has expired. Please choose a new time.",
          );
          onExpired();
          return;
        }
        setTokenError(
          data.error ?? "Could not open the payment form. Please try again.",
        );
        return;
      }
      setClientSecret(data.client_secret as string);
    } catch {
      setTokenError("Network error. Please try again.");
    } finally {
      setLoadingSI(false);
    }
  }, [bookingId, onExpired]);

  /** Verifies the SetupIntent server-side and confirms the booking. */
  const verifyAndConfirm = useCallback(
    async (setupIntentId: string) => {
      setVerifyError(null);
      setVerifying(true);
      try {
        const res = await fetch("/api/booking/setup-intent/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            setup_intent_id: setupIntentId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 410) {
            setVerifyError(
              data.error ?? "Your slot hold has expired. Please choose a new time.",
            );
            onExpired();
            return;
          }
          setVerifyError(
            data.error ??
              "We could not verify the saved card. Please try again or add the card once more.",
          );
          return;
        }
        onConfirmed();
      } catch {
        setVerifyError("Network error while confirming. Please try again.");
      } finally {
        setVerifying(false);
      }
    },
    [bookingId, onConfirmed, onExpired],
  );

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-display text-2xl text-[#5D1F13]">Card on file</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
        No charge today. Your payment method is stored securely with Stripe
        and kept on file for billing after the appointment.
      </p>

      {(tokenError || confirmError) && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]"
        >
          {confirmError ?? tokenError}
        </p>
      )}
      {!stripeConfigured && (
        <p className="mt-4 rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-sm text-[#1A1A1A]/70">
          Card-on-file isn&apos;t configured on this deployment yet — add the
          Stripe environment variables to enable live reservations.
        </p>
      )}

      {/* Consent — required, never preselected */}
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#1A1A1A]/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#A8532B]"
          disabled={Boolean(clientSecret)}
        />
        <span>
          I authorize True Self Me to securely keep my payment method on file.
          Sessions are billed following the appointment. Cancellations with
          less than 24 hours notice may incur a cancellation fee.
        </span>
      </label>
      <p className="mt-2 flex items-start gap-2 text-xs text-[#1A1A1A]/55">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A8532B]" aria-hidden="true" />
        Your card may be subject to a small temporary verification
        authorization by the payment processor.
      </p>

      {/* Stripe Payment Element */}
      {!clientSecret ? (
        <button
          type="button"
          disabled={!consent || loadingSI || continuing}
          onClick={loadSetupIntent}
          className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-[#5D1F13] px-8 py-3.5 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {loadingSI ? "Preparing secure form…" : "Add payment method"}
        </button>
      ) : (
        <div className="mt-6">
          <Elements
            stripe={stripePromise}
            options={elementsOptions ?? undefined}
          >
            <PaymentElementForm
              onVerified={() => onConfirmed()}
            />
          </Elements>
        </div>
      )}

      {/* Slot hold window reminder */}
      <p className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-[#F3EDE5] px-4 py-1.5 text-xs font-semibold text-[#1A1A1A]/70">
        <CalendarDays className="h-3.5 w-3.5 text-[#A8532B]" aria-hidden="true" />
        {formatDateLong(slot.dateISO)} ·{" "}
        {formatTimeIn(slotInstant(slot.dateISO, slot.slotCSTHour))} CST — slot
        held for ~{minutesLeft} more min
      </p>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-black/[0.08] pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={verifying || continuing}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#1A1A1A]/60 transition-colors hover:text-[#1A1A1A] disabled:opacity-40"
        >
          Back
        </button>
        <span className="inline-flex items-center gap-2 text-xs text-[#1A1A1A]/45">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Secured by Stripe
        </span>
      </div>
    </div>
  );
}

/** Inner form: confirms the SetupIntent via Stripe.js. */
function PaymentElementForm({
  onVerified,
}: {
  onVerified: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (setupError) {
      setError(setupError.message ?? "Card setup failed. Please try again.");
      setSubmitting(false);
      return;
    }
    if (setupIntent && setupIntent.status !== "succeeded") {
      setError(
        `Payment setup is ${setupIntent.status}. Please complete any required verification.`,
      );
      setSubmitting(false);
      return;
    }
    // The server re-verifies the SetupIntent and confirms the booking.
    await fetch("/api/booking/setup-intent/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setup_intent_id: setupIntent.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error ?? "Verification failed. Please try again.");
          setSubmitting(false);
          return;
        }
        onVerified();
      })
      .catch(() => {
        setError("Network error while confirming. Please try again.");
        setSubmitting(false);
      });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <PaymentElementFormFields />
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex items-center gap-2 w-full justify-center rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-50"
      >
        <Lock className="h-4 w-4" aria-hidden="true" />
        {submitting ? "Verifying card…" : "Save card & confirm booking"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-[#A8532B]">
          {error}
        </p>
      )}
    </form>
  );
}

function PaymentElementFormFields() {
  return null;
}
