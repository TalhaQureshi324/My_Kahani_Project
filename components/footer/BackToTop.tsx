"use client";

import { ArrowUp } from "lucide-react";

/**
 * Footer back-to-top: small circular control, smooth scroll, subtle
 * upward hover movement. Client component (needs onClick).
 */
export default function BackToTop() {
  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-all duration-300 hover:-translate-y-1 hover:border-terracotta-tint/60 hover:text-terracotta-tint"
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
