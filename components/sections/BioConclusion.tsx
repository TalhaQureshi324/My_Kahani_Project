import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { CommunityHands } from "@/components/ui/doodles";
import { bioConclusion } from "@/lib/content";

/**
 * Section 5 — Bio conclusion & primary CTA: continues the rust
 * palette, centered copy, gold pill CTA, floating hands mark.
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
          <CommunityHands className="absolute -right-6 -bottom-8 h-24 w-24 text-mustard lg:-right-16 lg:-bottom-10 lg:h-32 lg:w-32" />
        </div>
      </div>
    </section>
  );
}
