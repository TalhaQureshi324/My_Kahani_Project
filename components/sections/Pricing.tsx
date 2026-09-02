import Image from "next/image";
import { pricing } from "@/lib/content";

/**
 * Section 15 — Pricing & accessibility: one supplied graphic
 * (pricing_background.webp, 1500x1787) carries the whole design —
 * cream brick canvas, the centered dusty-slate card (measured at
 * x 14–88%, y 14–87%), and the graffiti squiggles. All content is
 * text overlays locked to the image's aspect ratio, so positioning
 * holds at every viewport width. No CSS card, no CSS graffiti.
 */
export default function Pricing() {
  return (
    <section id="pricing" className="relative w-full scroll-mt-24 overflow-hidden">
      <div className="relative aspect-[1500/1787] w-full">
        <Image
          src="/images/pricing_background.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />

        {/* Heading — on the cream canvas above the slate card */}
        <h2 className="absolute inset-x-0 top-[5.5%] text-center font-display text-[max(30px,3.5vw)] font-normal uppercase tracking-wide text-charcoal">
          {pricing.heading}
        </h2>

        {/* Rates — upper slate area */}
        <div className="absolute inset-x-[20%] top-[16.5%]">
          <p className="text-center font-sans text-[max(12px,1.3vw)] italic text-charcoal">
            {pricing.perSession}
          </p>
          <div className="mx-auto mt-[1.1vw] h-px w-1/2 bg-charcoal/70" />
          <ul className="mt-[1.4vw] space-y-[0.8vw] text-center font-sans text-[max(13px,1.4vw)] text-charcoal">
            {pricing.rates.map((rate) => (
              <li key={rate}>{rate}</li>
            ))}
          </ul>
        </div>

        {/* Accessibility statement — lower slate area */}
        <div className="absolute inset-x-[18%] top-[50%] text-center">
          <h3 className="font-display text-[max(16px,1.9vw)] font-semibold uppercase leading-[1.4] text-charcoal">
            {pricing.accessibilityHeading.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h3>
          <p className="mx-auto mt-[1.6vw] max-w-[46ch] font-sans text-[max(12px,1.15vw)] font-normal leading-relaxed text-charcoal/80">
            {pricing.accessibilityTextPre}
            <strong className="font-bold">{pricing.accessibilityTextBold}</strong>
            {pricing.accessibilityTextPost}
          </p>

          <a
            href="#contact"
            className="mt-[2vw] inline-flex items-center justify-center rounded-full border border-white/40 bg-black px-8 py-3 font-sans text-[max(13px,1.2vw)] text-white transition-colors hover:bg-night-2"
          >
            {pricing.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
