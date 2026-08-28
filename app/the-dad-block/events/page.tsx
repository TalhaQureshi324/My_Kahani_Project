import type { Metadata } from "next";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";
import { PeaceDoodle } from "@/components/ui/doodles";
import RsvpForm from "@/components/forms/RsvpForm";
import { events, program } from "@/lib/content";

export const metadata: Metadata = {
  title: `${program.name} — Events`,
  description:
    "Upcoming Austin meetups, workshops, and gatherings for fathers. Free and beginner-friendly — RSVP to save a spot.",
};

export default function EventsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night text-cream">
        <div
          className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-olive/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cream/70">
            <CalendarDays className="h-3.5 w-3.5 text-terracotta-tint" aria-hidden="true" />
            {program.name} · Austin, TX
          </p>
          <h1 className="mt-6 max-w-2xl font-display text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            {events.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/70 sm:text-lg">
            {events.lede}
          </p>
          <p className="mt-3 text-sm text-cream/50">{events.rsvpNote}</p>
        </div>
      </section>

      {/* Event cards */}
      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-3">
            {events.list.map((event, i) => (
              <article
                key={event.name}
                className={`flex flex-col rounded-3xl border p-8 transition-transform duration-300 hover:-translate-y-1.5 ${
                  i === 0
                    ? "border-terracotta/40 bg-terracotta/10"
                    : "border-ink/10 bg-paper"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                      i === 0
                        ? "bg-terracotta text-cream"
                        : "bg-olive/15 text-olive"
                    }`}
                  >
                    {event.tag}
                  </span>
                  {i === 0 ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-terracotta-deep">
                      Next up
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-5 font-display text-2xl leading-snug font-semibold text-balance">
                  {event.name}
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
                    {event.when}
                  </li>
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
                    {event.where}
                  </li>
                </ul>
                <p className="mt-4 border-t border-ink/10 pt-4 text-sm leading-relaxed text-ink-soft">
                  {event.blurb}
                </p>
                <a
                  href="#rsvp"
                  className="mt-6 inline-flex items-center justify-center rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  RSVP
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RSVP form */}
      <section id="rsvp" className="scroll-mt-24 border-t border-ink/10 bg-cream-dark/60">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
          <div className="relative">
            <SectionHeading
              eyebrow="RSVP"
              title="Save your spot"
              lede="Takes thirty seconds. Bring yourself, bring the kids if the gathering allows, and we will handle the rest."
            />
            <PeaceDoodle className="mt-8 h-14 w-14 animate-float text-olive" />
          </div>
          <RsvpForm />
        </div>
      </section>
    </>
  );
}
