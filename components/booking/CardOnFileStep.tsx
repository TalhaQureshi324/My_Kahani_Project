"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  formatDateLong,
  formatTimeIn,
  slotInstant,
} from "./CustomScheduler";

/**
 * Stage 3 — card-on-file consent + Authorize.net-hosted payment profile
 * form. Card data is entered directly into Authorize.net's iframe; this
 * component never touches card numbers. When Authorize.net redirects the
 * hosted iframe to our return page, that page postMessages us and we ask
 * the server to verify the saved payment profile and confirm the booking.
 */

export default function CardOnFileStep({
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
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  /** Asks the server for the hosted payment-profile page token + iframe. */
  const loadToken = useCallback(async () => {
    setTokenError(null);
    setLoadingToken(true);
    try {
      const res = await fetch("/api/booking/payment-profile", {
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
      setIframeUrl(data.iframe_url as string);
    } catch {
      setTokenError("Network error. Please try again.");
    } finally {
      setLoadingToken(false);
    }
  }, [bookingId, onExpired]);

  /** Asks the server to verify the saved card and confirm the booking. */
  const verifyAndConfirm = useCallback(async () => {
    setVerifyError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/booking/payment-profile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();

      if (res.status === 410) {
        setVerifyError(
          data.error ?? "Your slot hold has expired. Please choose a new time.",
        );
        onExpired();
        return;
      }
      if (!res.ok || !data.success) {
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
  }, [bookingId, onConfirmed, onExpired]);

  // The hosted form's return page (served from OUR origin) postMessages
  // the parent when the payment profile has been saved.
  useEffect(() => {
    if (!iframeUrl) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string };
      if (data?.source === "trueselfme" && data.type === "payment_profile_saved") {
        void verifyAndConfirm();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeUrl, verifyAndConfirm]);

  const minutesLeft = Math.max(
    0,
    Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 60000),
  );

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-display text-2xl text-[#5D1F13]">Card on file</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#1A1A1A]/60">
        No charge today. Your payment method is entered directly into
        Authorize.net&apos;s secure hosted form and stored for billing after
        the appointment.
      </p>

      {(tokenError || verifyError) && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]"
        >
          {verifyError ?? tokenError}
        </p>
      )}

      {/* Consent — required, never preselected */}
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#1A1A1A]/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#A8532B]"
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

      {/* Authorize.net hosted form */}
      {!iframeUrl ? (
        <button
          type="button"
          disabled={!consent || loadingToken || continuing}
          onClick={loadToken}
          className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-[#5D1F13] px-8 py-3.5 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {loadingToken ? "Preparing secure form…" : "Add payment method"}
        </button>
      ) : (
        <div className="mt-6">
          <iframe
            title="Authorize.net secure payment form"
            src={iframeUrl}
            className="h-[560px] w-full rounded-xl border border-black/10 bg-white"
          />
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#1A1A1A]/55">
            <Lock className="h-3.5 w-3.5 text-[#A8532B]" aria-hidden="true" />
            Secured by Authorize.net — entered directly on their form.
          </p>
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
          Secured by Authorize.net
        </span>
      </div>
    </div>
  );
}
