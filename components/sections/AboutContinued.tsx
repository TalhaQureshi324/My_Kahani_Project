import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { aboutContinued } from "@/lib/content";

/**
 * Section 3 — About continuation: mirrored 2-column grid
 * (portrait left, deep-dive copy + CTA right). The grunge splash
 * tucks behind the portrait's bottom-right corner — half on the
 * photo, half off, always underneath it.
 */
export default function AboutContinued() {
  return (
    <section className="relative bg-[#DED5C8]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/ABOUT_THE_PRACTICE_BACKGROUND.webp')] bg-repeat"
      />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-24">
        {/* Inset portrait + grunge splash (mirrored column) */}
        <div className="relative order-2 px-6 pt-8 pb-6 sm:px-10 lg:order-1 lg:px-10">
          <div className="relative">
            {/* splash sits behind the photo, straddling its corner */}
            <Image
              src="/images/dad_block_extra_design_trim.webp"
              alt=""
              aria-hidden="true"
              width={154}
              height={247}
              className="pointer-events-none absolute bottom-0 right-0 z-0 w-[30%] translate-x-1/2 translate-y-1/2 select-none"
            />
            <div className="relative z-10 aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_26px_50px_-28px_rgba(38,33,24,0.45)]">
              <Image
                src="/images/ABOUT-2.jpg"
                alt="A father stands with his arms around his two sons, facing a mountain vista at sunset"
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Copy + CTA */}
        <div className="order-1 flex flex-col justify-center lg:order-2">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-terracotta">
            About the practice
          </p>
          <h2 className="mt-3 font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl">
            {aboutContinued.heading}
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-ink-soft sm:text-lg">
            {aboutContinued.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <Button href="/#contact" className="mt-9 self-start">
            {aboutContinued.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
