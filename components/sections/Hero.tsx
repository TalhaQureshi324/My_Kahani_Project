import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { SmileyDoodle, SparkleDoodle } from "@/components/ui/doodles";
import { hero } from "@/lib/content";

/**
 * Section 1 — Hero: 2-column split (copy left, portrait right),
 * collapsing to a single column on mobile.
 */
export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden">
      {/* textured backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#DED5C8] bg-[url('/images/HERO_SECTION_BACKGROUND.webp')] bg-repeat"
      />
      {/* soft backdrop shapes */}
      <div
        className="pointer-events-none absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full bg-terracotta-tint/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-20%] left-[-8%] h-[360px] w-[360px] rounded-full bg-cream-dark blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 lg:pb-24">
        {/* Copy */}
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
            <SparkleDoodle className="h-3.5 w-3.5 text-terracotta" />
            {hero.eyebrow}
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {hero.titleTop}{" "}
            <em className="marker-underline text-terracotta">{hero.titleAccent}</em>{" "}
            {hero.titleEnd}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {hero.lede}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button href="/#contact">
              {hero.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <a
              href="/#services"
              className="text-sm font-bold tracking-wide text-ink underline decoration-terracotta decoration-2 underline-offset-8 transition-colors hover:text-terracotta"
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        {/* Portrait */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            className="absolute inset-x-6 bottom-6 h-full rounded-[2rem] bg-terracotta/90"
            aria-hidden="true"
          />
          <div className="relative z-10 aspect-[4/5] overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgba(38,33,24,0.5)]">
            <Image
              src="/images/HERO.jpg"
              alt="A man sits on a rock at the edge of a lake at sunset, seen from behind"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <SmileyDoodle className="absolute -top-16 -left-2 z-20 h-14 w-14 animate-float text-ink" />
        </div>
      </div>
    </section>
  );
}
