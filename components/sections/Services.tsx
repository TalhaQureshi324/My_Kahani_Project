import { ArrowRight } from "lucide-react";
import { Button, SectionHeading } from "@/components/ui/primitives";
import { serviceIcons, SmileyDoodle } from "@/components/ui/doodles";
import { services } from "@/lib/content";

export default function Services() {
  return (
    <section
      id="services"
      className="scroll-mt-24 border-t border-ink/10 bg-cream-dark/60"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <SectionHeading
          eyebrow={services.eyebrow}
          title={services.title}
          lede={services.lede}
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item) => {
            const Icon = serviceIcons[item.icon] ?? serviceIcons.person;
            return (
              <article
                key={item.title}
                className="group flex flex-col rounded-3xl border border-ink/10 bg-paper p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-terracotta/40 hover:shadow-[0_24px_45px_-25px_rgba(38,33,24,0.4)]"
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta transition-colors duration-300 group-hover:bg-terracotta group-hover:text-cream">
                  <Icon className="h-8 w-8" />
                </span>
                <h3 className="mt-6 font-display text-2xl font-semibold text-balance">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {item.blurb}
                </p>
                <p className="mt-4 border-l-2 border-olive/60 pl-3 text-xs leading-relaxed text-ink-soft italic">
                  {item.fit}
                </p>
                <p className="mt-5 pt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft/80 border-t border-ink/10 mt-auto">
                  {item.meta}
                </p>
              </article>
            );
          })}

          {/* CTA tile */}
          <article className="flex flex-col justify-between rounded-3xl bg-night p-8 text-cream">
            <div>
              <SmileyDoodle className="h-12 w-12 text-terracotta-tint" />
              <h3 className="mt-6 font-display text-2xl leading-snug font-semibold text-balance">
                Not sure where to start?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Book a free 15-minute consult. No forms, no pressure — just a
                conversation about what brought you here.
              </p>
            </div>
            <Button href="/#contact" variant="cream" className="mt-8 self-start">
              Let us talk
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
