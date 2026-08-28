import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Button, PhotoFrame, SectionHeading } from "@/components/ui/primitives";
import { HeartArrowDoodle, SmileyDoodle, SparkleDoodle } from "@/components/ui/doodles";
import { program } from "@/lib/content";

export const metadata: Metadata = {
  title: program.name,
  description: `${program.tagline} — a free community for fathers in Austin, Texas.`,
};

export default function DadBlockPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night text-cream">
        <div
          className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-terracotta/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cream/70">
              <SparkleDoodle className="h-3.5 w-3.5 text-terracotta-tint" />
              A community organization
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              {program.name}
            </h1>
            <p className="mt-4 font-display text-xl italic text-terracotta-tint sm:text-2xl">
              {program.tagline}
            </p>
            <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-cream/75">
              {program.mission.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button href="/the-dad-block/events" variant="primary">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                See upcoming events
              </Button>
              <Button href="/#contact" variant="cream">
                Get on the list
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <PhotoFrame label="Fathers' Circle gathering — drop a photo in /public/images" tone="dark" />
            <SmileyDoodle className="absolute -top-6 -left-5 h-14 w-14 animate-float text-terracotta-tint" />
          </div>
        </div>
      </section>

      {/* Format */}
      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <SectionHeading
            eyebrow="What to expect"
            title="Community, built one gathering at a time"
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {program.format.map((item, i) => (
              <article
                key={item.title}
                className="rounded-3xl border border-ink/10 bg-paper p-8 transition-transform duration-300 hover:-translate-y-1.5"
              >
                <p className="font-display text-sm font-semibold tracking-[0.2em] text-terracotta">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 font-display text-2xl font-semibold text-balance">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink/10 bg-cream-dark/60">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
          <SectionHeading eyebrow="FAQ" title="Questions dads actually ask" />
          <div className="mt-10 space-y-3">
            {program.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-ink/10 bg-paper px-6 py-5 open:shadow-[0_18px_40px_-25px_rgba(38,33,24,0.4)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <Plus
                    className="h-5 w-5 shrink-0 text-terracotta transition-transform duration-300 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          <div className="relative mt-12 overflow-hidden rounded-3xl bg-night p-8 text-cream sm:p-10">
            <HeartArrowDoodle className="absolute -right-4 -bottom-6 h-32 w-32 text-terracotta-tint/30" />
            <div className="relative">
              <h3 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
                Ready to pull up a chair?
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/70">
                RSVP to the next gathering or send a note through the contact
                form — you will get the details by email, no commitment.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Button href="/the-dad-block/events" variant="primary">
                  See events
                </Button>
                <Link
                  href="/#contact"
                  className="inline-flex items-center justify-center rounded-full border-2 border-cream/30 px-6 py-3 text-sm font-bold tracking-wide transition-all hover:-translate-y-0.5 hover:border-terracotta-tint hover:text-terracotta-tint"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
