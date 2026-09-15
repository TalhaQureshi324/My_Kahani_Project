import type { Metadata } from "next";
import { SparkleDoodle } from "@/components/ui/doodles";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book a Session",
  description:
    "Schedule your 50-minute virtual consultation with True Self Me — held nationwide, cash-pay, card on file, no upfront charge.",
};

/**
 * Standalone booking landing — the destination for paid traffic
 * (/book?gclid=...) and anyone arriving from search. Full-width hero
 * plus the centered booking suite.
 */
export default function BookPage() {
  return (
    <div className="bg-[#F5EFE6]">
      {/* Hero */}
      <section className="border-b border-black/[0.08] px-4 pb-10 pt-14 text-center sm:pt-20">
        <div className="mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#5D1F13]">
            <SparkleDoodle className="h-3.5 w-3.5 text-[#A8532B]" />
            Cash-pay • Card on file • No upfront charge
          </p>
          <h1 className="mt-6 font-display text-5xl font-normal tracking-tight text-[#5D1F13] sm:text-6xl">
            Begin Your Journey
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#1A1A1A]/70">
            Select a time for your 50-minute consultation. Held virtually
            nationwide.
          </p>
        </div>
      </section>

      {/* Booking suite */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <BookingFlow />
        </div>
      </section>
    </div>
  );
}
