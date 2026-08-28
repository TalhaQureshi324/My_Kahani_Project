import { ArrowRight, CalendarDays } from "lucide-react";
import { SquiggleDoodle } from "@/components/ui/doodles";
import { program } from "@/lib/content";

/**
 * Homepage feature card for the community program
 * (the "Dad Block" role in the original spec).
 */
export default function DadBlockSummary() {
  return (
    <section id="dad-block-summary" className="scroll-mt-24 border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-night px-8 py-14 text-cream sm:px-14 lg:px-20 lg:py-20">
          <div
            className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-terracotta/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-terracotta-tint">
                {program.home.eyebrow}
              </p>
              <h2 className="mt-4 font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl">
                {program.home.title}
              </h2>
              <p className="mt-3 font-display text-xl italic text-cream/70">
                {program.tagline}
              </p>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/75">
                {program.home.blurb}
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="/the-dad-block"
                  className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-bold tracking-wide text-cream transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-deep"
                >
                  {program.home.learnCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="/the-dad-block/events"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-cream/30 px-6 py-3 text-sm font-bold tracking-wide text-cream transition-all duration-200 hover:-translate-y-0.5 hover:border-terracotta-tint hover:text-terracotta-tint"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {program.home.eventsCta}
                </a>
              </div>
            </div>
            <SquiggleDoodle className="hidden h-10 w-56 animate-float-slow text-terracotta-tint/70 lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
