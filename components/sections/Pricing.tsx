import { Check } from "lucide-react";
import { Button, SectionHeading } from "@/components/ui/primitives";
import { HeartArrowDoodle } from "@/components/ui/doodles";
import { pricing } from "@/lib/content";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-t border-ink/10 bg-cream-dark/60"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <SectionHeading
          eyebrow={pricing.eyebrow}
          title={pricing.title}
          lede={pricing.lede}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pricing.cards.map((card, i) => (
            <article
              key={card.name}
              className={`flex flex-col rounded-3xl p-8 ${
                i === 1
                  ? "bg-night text-cream shadow-[0_30px_60px_-30px_rgba(38,33,24,0.6)]"
                  : "border border-ink/10 bg-paper"
              }`}
            >
              <h3
                className={`text-xs font-bold uppercase tracking-[0.22em] ${
                  i === 1 ? "text-terracotta-tint" : "text-terracotta"
                }`}
              >
                {card.name}
              </h3>
              <p className="mt-5 font-display text-5xl font-semibold tracking-tight">
                {card.price}
              </p>
              <p
                className={`mt-2 text-sm ${
                  i === 1 ? "text-cream/60" : "text-ink-soft"
                }`}
              >
                {card.unit}
              </p>
              <ul
                className={`mt-6 space-y-3 border-t pt-6 text-sm ${
                  i === 1 ? "border-cream/15 text-cream/85" : "border-ink/10 text-ink-soft"
                }`}
              >
                {card.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        i === 1 ? "text-terracotta-tint" : "text-olive"
                      }`}
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Sliding scale block */}
        <div className="relative mt-8 overflow-hidden rounded-3xl border-2 border-dashed border-olive/50 bg-olive/10 p-8 sm:p-12">
          <HeartArrowDoodle className="absolute -right-4 -bottom-4 h-36 w-36 text-olive/25" />
          <div className="relative max-w-3xl">
            <h3 className="font-display text-2xl font-semibold text-forest sm:text-3xl">
              {pricing.sliding.title}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              {pricing.sliding.text}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-ink-soft/80">
              As required by law, all clients receive a Good Faith Estimate of
              expected charges before beginning care.
            </p>
            <Button href="/#contact" className="mt-7">
              Ask about sliding scale
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
