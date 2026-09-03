import Image from "next/image";
import Link from "next/link";
import { dadBlockSpotlight as dad } from "@/lib/content";

/**
 * Section 16 — The Dad Block spotlight: full-width kraft/terracotta
 * section on the dad_block_background.webp texture. Giant 170px serif
 * "THE DAD BLOCK" wordmark on top, then a staggered two-column grid —
 * left: the 84px "WE BELIEVE GROWTH HAPPENS IN COMMUNITY" statement,
 * 45px "- NOT IN ISOLATION" subtitle, bold 21px intro, and the hiking
 * photo below; right: the brewery photo with a black grunge texture
 * overlapping its bottom-right corner onto the canvas, the 21px bold
 * copy, and the black pill "Learn More" CTA. Mobile stacks in the
 * spec's order via grid order utilities.
 */
export default function TheDadBlockSection() {
  return (
    <section className="relative w-full scroll-mt-24 bg-[#A26838]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/dad_block_background.webp')] bg-repeat"
      />

      <div className="relative pt-16 pb-24 px-6 md:px-12">
        {/* Giant wordmark — always a single row */}
        <h2 className="whitespace-nowrap text-center font-display text-[min(48px,11vw)] font-semibold uppercase leading-none tracking-wide text-black md:text-[min(96px,12.5vw)] lg:text-[min(165px,12.6vw)]">
          {dad.heading}
        </h2>

        <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 items-start gap-12 lg:grid-cols-2">
          {/* Left column — belief statement (mobile: first) */}
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <h3 className="font-display text-[min(84px,13vw)] font-semibold uppercase leading-[0.95] text-[#F5EBE6]">
              {dad.beliefHeading.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h3>
            <p className="mt-4 font-display text-[min(45px,8.5vw)] font-semibold uppercase tracking-wide text-white">
              {dad.beliefSub}
            </p>
            <p className="mt-6 mb-12 text-[21px] font-bold text-[#F5EBE6]">
              {dad.beliefIntro}
            </p>
          </div>

          {/* Right column — brewery photo with grunge overlay (mobile: second) */}
          <div className="relative order-2 w-full lg:col-start-2 lg:row-start-1">
            <Image
              src="/images/dad_block_right_side.webp"
              alt="Fathers from the Dad Block community laughing and high-fiving at a brewery gathering"
              width={750}
              height={500}
              sizes="(min-width: 1024px) 50vw, 92vw"
              className="h-auto w-full object-cover"
            />
            <Image
              src="/images/dad_block_extra_design.webp"
              alt=""
              aria-hidden="true"
              width={300}
              height={300}
              className="pointer-events-none absolute -bottom-6 -right-6 z-10 w-[42%] translate-x-[23%] translate-y-[8%] select-none"
            />
          </div>

          {/* Right column — copy (mobile: third) */}
          <div className="order-3 lg:col-start-2 lg:row-start-2">
            <p className="text-[21px] font-bold text-[#F5EBE6]">
              {dad.paragraph1}
            </p>
            <p className="mt-4 mb-8 text-[21px] font-bold text-[#F5EBE6]">
              {dad.paragraph2}
            </p>
          </div>

          {/* Left column — hiking photo below the text (mobile: fourth) */}
          <div className="order-4 lg:col-start-1 lg:row-start-2">
            <Image
              src="/images/dad_block_left_side.webp"
              alt="A group of fathers hiking together along a trail in the woods"
              width={750}
              height={500}
              sizes="(min-width: 1024px) 50vw, 92vw"
              className="h-auto w-full object-cover"
            />
          </div>

          {/* Right column — CTA (mobile: last) */}
          <div className="order-5 lg:col-start-2 lg:row-start-3">
            <Link
              href={dad.ctaHref}
              className="inline-block rounded-full border border-white/60 bg-black px-10 py-3 text-[18px] font-medium text-white transition-colors hover:bg-night-2"
            >
              {dad.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
