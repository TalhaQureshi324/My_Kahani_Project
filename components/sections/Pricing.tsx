import { pricing } from "@/lib/content";

/**
 * Section 15 — Pricing & accessibility: the supplied graphic
 * (pricing_background.webp — cream brick canvas, centered slate card,
 * graffiti squiggles) is anchored from the top center and cropped by
 * the section's own height. The PRICING heading floats on the cream
 * brick canvas above the card (45px, black, display serif); the card's
 * content flows as one centered column starting with the per-session
 * note, and the section ends exactly 100px below the CTA button.
 */
export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative w-full scroll-mt-24 overflow-hidden bg-[#96A7A7]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/pricing_background.webp')] bg-cover bg-top bg-no-repeat"
      />

      <div className="relative mx-auto w-[88%] max-w-[860px] pb-[100px]">
        {/* Heading floats on the cream brick canvas above the slate box */}
        <h2 className="pt-[max(44px,6vw)] text-center font-display text-[min(84px,11.5vw)] font-normal uppercase leading-none tracking-wide text-black">
          {pricing.heading}
        </h2>

        {/* Slate card content starts directly with the per-session note */}
        <div className="pt-[max(52px,6vw)] text-center">
          <p className="font-sans text-[max(12px,1.3vw)] italic text-charcoal">
            {pricing.perSession}
          </p>
          <div className="mx-auto mt-4 h-px w-1/2 bg-charcoal/70" />

          <ul className="mt-6 space-y-2 font-sans text-[max(14px,1.4vw)] text-charcoal">
            {pricing.rates.map((rate) => (
              <li key={rate}>{rate}</li>
            ))}
          </ul>

          <h3 className="mt-12 font-display text-[max(16px,1.9vw)] font-semibold uppercase leading-[1.4] text-charcoal">
            {pricing.accessibilityHeading.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h3>

          <p className="mx-auto mt-6 max-w-[46ch] font-sans text-[max(12px,1.15vw)] font-normal leading-relaxed text-charcoal/80">
            {pricing.accessibilityTextPre}
            <strong className="font-bold">{pricing.accessibilityTextBold}</strong>
            {pricing.accessibilityTextPost}
          </p>

          <a
            href="#contact"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-white/40 bg-black px-8 py-3 font-sans text-[max(13px,1.2vw)] text-white transition-colors hover:bg-night-2"
          >
            {pricing.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
