import { OverlapPattern } from "@/components/ui/doodles";
import { approaches } from "@/lib/content";

/**
 * Section 8 — Therapy approach: warm sand field, full-width olive
 * title banner, 2-column body (modality list left, thick olive-framed
 * photo cards right) layered over a right-half arc pattern.
 */
function FramedPhoto({ label }: { label: string }) {
  return (
    <figure className="w-full border-[12px] border-olivegreen bg-sand shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)]">
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 border border-dashed border-charcoal/25 p-6 text-center">
        <svg
          viewBox="0 0 48 48"
          className="h-9 w-9 text-charcoal/40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="7" y="10" width="34" height="28" rx="4" />
          <circle cx="19" cy="21" r="3.4" />
          <path d="M11 34l8-7 6 5 5-4 7 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <figcaption className="max-w-[26ch] text-[11px] leading-relaxed font-medium tracking-widest text-charcoal/60 uppercase">
          {label}
        </figcaption>
      </div>
    </figure>
  );
}

export default function TherapyApproach() {
  return (
    <section
      id="therapy-approach"
      className="relative scroll-mt-24 overflow-hidden bg-sand"
    >
      {/* Right-half decorative pattern layer, extending to the viewport edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-sand-deep lg:block"
      >
        <OverlapPattern className="h-full w-full text-terracotta/50" />
      </div>

      {/* Full-width olive title banner */}
      <div className="relative z-10 w-full bg-olivegreen">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.14em] text-cream sm:text-4xl">
            {approaches.bannerTitle}
          </h2>
        </div>
      </div>

      {/* Body: modality list + framed photos over the pattern */}
      <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="max-w-xl text-base leading-relaxed text-charcoal sm:text-lg">
            {approaches.intro}
          </p>
          <ul className="mt-10 space-y-7">
            {approaches.items.map((item) => (
              <li key={item.name} className="max-w-xl">
                <h3 className="text-lg font-bold text-charcoal">{item.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal/75">
                  {item.blurb}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-8 lg:max-w-none">
          {approaches.photoLabels.map((label) => (
            <FramedPhoto key={label} label={label} />
          ))}
        </div>
      </div>
    </section>
  );
}
