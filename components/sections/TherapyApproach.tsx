import Image from "next/image";
import { approaches } from "@/lib/content";

/**
 * Section 8 — Therapy approach: warm sand field, full-width olive title
 * banner, and the reference fixed grid on a 1505px canvas —
 * 55px pad | 180px offset | 630px copy | 95px gap | 335px photos |
 * 210px right space. The image column therefore starts exactly 960px
 * from the left edge. Photos are 335x390 inside a 20px #6B6F38 border;
 * the 465px geometric texture sits BEHIND the stack, each diamond box
 * scaled to 100px tall (tile = 7 boxes = auto 700px). Below 1300px the
 * section falls back to a fluid layout with capped image width.
 */

function ModalityList() {
  return (
    <>
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
    </>
  );
}

export default function TherapyApproach() {
  return (
    <section
      id="therapy-approach"
      className="relative scroll-mt-24 overflow-hidden bg-sand"
    >
      {/* Full-width olive title banner */}
      <div className="relative z-10 w-full bg-olivegreen">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.14em] text-cream sm:text-4xl">
            {approaches.bannerTitle}
          </h2>
        </div>
      </div>

      {/* Desktop >=1300px: reference canvas — 55 | 180 | 630 | 95 | 335 | rest(210 at 1505) */}
      <div className="relative z-10 mx-auto hidden w-[1505px] max-w-full grid-cols-[55px_180px_630px_95px_335px_1fr] py-20 min-[1300px]:grid">
        {/* 55px container padding */}
        <div aria-hidden="true" />

        {/* 180px left offset */}
        <div aria-hidden="true" />

        {/* 630px copy column: intro + 5 modalities */}
        <div>
          <ModalityList />
        </div>

        {/* 95px middle gap */}
        <div aria-hidden="true" />

        {/* 335px photo column (starts at 960px) with texture behind */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 z-0 w-[465px] -translate-x-1/2"
            style={{
              backgroundImage: "url('/images/approach-texture.svg')",
              backgroundSize: "auto 700px",
              backgroundRepeat: "repeat",
            }}
          />
          <div className="relative z-10 flex flex-col gap-8">
            {approaches.photos.map((photo) => (
              <figure
                key={photo.src}
                className="relative h-[390px] w-[335px] border-[20px] border-[#6B6F38] shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)]"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="295px"
                  className="object-cover"
                />
              </figure>
            ))}
          </div>
        </div>

        {/* >=210px right space (exactly 210 on the 1505px canvas) */}
        <div aria-hidden="true" />
      </div>

      {/* Mobile / tablet / narrow desktop: fluid fallback, image width capped */}
      <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20 min-[1300px]:hidden">
        <div>
          <ModalityList />
        </div>
        <div className="mx-auto flex w-full max-w-[430px] flex-col gap-8 lg:mx-0 lg:justify-self-end">
          {approaches.photos.map((photo) => (
            <figure
              key={photo.src}
              className="relative aspect-[335/390] w-full border-[10px] border-[#6B6F38] shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)] sm:border-[14px] lg:border-[20px]"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 430px, 90vw"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
