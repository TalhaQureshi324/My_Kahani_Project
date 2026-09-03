import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { bioConclusion } from "@/lib/content";

/**
 * Section 5 — Bio conclusion & primary CTA: continues the rust
 * palette, centered copy, gold pill CTA, hand-drawn image mark
 * tucked into the container's lower-right corner.
 */
export default function BioConclusion() {
  return (
    <section className="bg-rust text-creamwarm">
      <div className="mx-auto max-w-7xl px-5 pt-4 pb-24 sm:px-8 lg:pb-32">
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="font-display text-2xl leading-snug font-medium text-balance sm:text-3xl">
            {bioConclusion.text}
          </p>
          <Button
            href="/#contact"
            variant="gold"
            className="mt-10 px-9 py-4 text-xs tracking-[0.2em] uppercase"
          >
            {bioConclusion.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Image
            src="/images/ImageElements_meet_your_therapist.webp"
            alt=""
            aria-hidden="true"
            width={500}
            height={500}
            className="pointer-events-none absolute right-4 bottom-2 h-auto w-16 select-none md:right-12 md:bottom-6 md:w-24"
          />
        </div>
      </div>
    </section>
  );
}
