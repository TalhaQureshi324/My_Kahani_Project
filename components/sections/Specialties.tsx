import Marquee from "@/components/ui/Marquee";
import { SectionHeading } from "@/components/ui/primitives";
import { specialties } from "@/lib/content";

export default function Specialties() {
  return (
    <section id="specialties" className="scroll-mt-24 border-t border-ink/10">
      {/* Ticker band */}
      <div className="border-y border-night/20 bg-night text-cream">
        <Marquee items={specialties.marquee} />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <SectionHeading eyebrow={specialties.eyebrow} title={specialties.title} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.cards.map((card, i) => (
            <article
              key={card.title}
              className={`rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1.5 ${
                i % 5 === 0
                  ? "bg-terracotta/10 border border-terracotta/30"
                  : "border border-ink/10 bg-paper"
              }`}
            >
              <h3 className="font-display text-xl leading-snug font-semibold text-balance sm:text-2xl">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {card.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
