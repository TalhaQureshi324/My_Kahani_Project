import { rightGuidance } from "@/lib/content";

/**
 * Section 14 — "The right guidance": a full-width centered statement
 * banner on the supplied textured background (deep terracotta/rust
 * fallback). Pulled up -mt-[20px] and layered beneath the mural
 * section (z-10 there) so its background fills the wedge under the
 * mural's gentle 20px tilted bottom edge — zero cream gap, the black
 * stroke rides directly above it. Two centered thought blocks in the
 * uppercase display serif at exactly 45px on large screens.
 */
export default function RightGuidance() {
  return (
    <section className="relative -mt-[20px] w-full overflow-hidden bg-[#7B3B26]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/right_guidance_background.webp')] bg-cover bg-center bg-no-repeat"
      />

      <div className="relative flex w-full items-center justify-center px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl space-y-8 text-center">
          {rightGuidance.blocks.map((lines) => (
            <h2
              key={lines[0]}
              className="font-display text-2xl font-normal uppercase leading-tight tracking-[0.05em] text-[#F5EBE6] md:text-4xl md:leading-[1.25] lg:text-[45px]"
            >
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
          ))}
        </div>
      </div>
    </section>
  );
}
