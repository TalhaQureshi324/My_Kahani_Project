"use client";

import { useState } from "react";
import { BadgePercent, Check, Loader2, X } from "lucide-react";
import { SESSION_PRICE_CENTS } from "@/lib/pricing.ts";

/**
 * Promo/discount code input for the Review & Confirm step.
 * Validates against POST /api/booking/promo and, when valid, exposes the
 * discounted price to the parent via the onChange callback.
 */

export type AppliedPromo = {
  code: string;
  type: "percent" | "flat_cents";
  value: number;
  label: string | null;
};

export function promoDiscountCents(
  promo: AppliedPromo | null,
  priceCents: number = SESSION_PRICE_CENTS,
): number {
  if (!promo) return 0;
  if (promo.type === "percent") {
    return Math.min(priceCents, Math.round((priceCents * promo.value) / 100));
  }
  return Math.min(priceCents, promo.value);
}

export default function PromoCodeInput({
  promo,
  onApply,
  onClear,
}: {
  promo: AppliedPromo | null;
  onApply: (p: AppliedPromo) => void;
  onClear: () => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/booking/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error ?? "Invalid promo code.");
        return;
      }
      onApply({
        code: data.code,
        type: data.type,
        value: data.value,
        label: data.label,
      });
      setCode("");
    } catch {
      setError("Could not verify the code. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  if (promo) {
    const discount = promoDiscountCents(promo);
    const remaining = SESSION_PRICE_CENTS - discount;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-green-700/25 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <Check className="h-4 w-4" aria-hidden="true" />
          {promo.type === "percent" && promo.value >= 100
            ? `100% OFF — $0.00 due`
            : promo.type === "percent"
              ? `${promo.value}% OFF — $${(discount / 100).toFixed(2)} discount`
              : `$${(discount / 100).toFixed(2)} Discount Applied`}
          {remaining === 0 ? null : (
            <span className="font-normal text-green-700/70">
              (${(remaining / 100).toFixed(2)} session)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs font-bold text-green-800/60 transition-colors hover:text-green-800"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <BadgePercent
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/35"
            aria-hidden="true"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Promo / Discount Code"
            aria-label="Promo or discount code"
            className="w-full rounded-md border border-black/10 bg-[#F3EDE5] py-2.5 pl-9 pr-3 text-sm font-medium tracking-wide text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
            maxLength={24}
          />
        </div>
        <button
          type="submit"
          disabled={!code.trim() || checking}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#5D1F13] px-4 py-2.5 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            "Apply"
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
