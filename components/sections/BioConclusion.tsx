import Image from "next/image";
import { ArrowRight } from "lucide-react";
import BookingTrigger from "@/components/booking/BookingTrigger";
import { bioConclusion } from "@/lib/content";

/**
 * Section 5 — Bio conclusion & primary CTA: continues the rust
 * palette, centered copy, gold pill CTA, hand-drawn image mark
 * tucked into the container's lower-right corner.
 */
export default function BioConclusion() {
  return (
    <section className="bg-rust text-creamwarm">
      <div className="mx-auto max-w-7xl overflow-hidden px-5 pt-4 pb-32 sm:px-8 lg:pb-40">
        <div className="relative mx-auto max-w-2xl text-center md:max-w-4xl md:px-40 lg:max-w-5xl lg:px-44">
          <p className="font-display text-2xl leading-snug font-medium text-balance sm:text-3xl">
            {bioConclusion.text}
          </p>
          <BookingTrigger
            location="bio_conclusion"
          aria-label="Schedule an initial coaching session"
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-9 py-4 text-xs font-bold uppercase tracking-[0.2em] text-creamwarm border border-creamwarm/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold/90"
          >
            {bioConclusion.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </BookingTrigger>
          <Image
            src="/images/ImageElements_meet_your_therapist.webp"
            alt=""
            aria-hidden="true"
            width={500}
            height={500}
            className="pointer-events-none absolute right-0 -bottom-28 z-0 h-auto w-24 select-none md:-right-20 md:bottom-2 md:w-44 lg:-right-28 lg:w-56"
          />
        </div>
      </div>
    </section>
  );
}
