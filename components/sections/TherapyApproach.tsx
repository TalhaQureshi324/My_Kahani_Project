import Image from "next/image";
import { approaches } from "@/lib/content";

/**
 * Section 8 — Therapy approach: warm sand field, full-width olive title
 * banner, and an exact fixed desktop grid — 180px offset | 630px copy |
 * 95px gap | 335px framed photos | 210px right space (1450px total,
 * centered). The 465px geometric texture sits BEHIND the photo stack,
 * each pattern unit scaled to 100px tall. Below 1450px the section
 * falls back to a fluid two-column layout with a scaled border.
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

      {/* Desktop ≥1450px: exact fixed grid (180 + 630 + 95 + 335 + 210 = 1450) */}
      <div className="relative z-10 mx-auto hidden w-[1450px] grid-cols-[180px_630px_95px_335px_210px] py-20 min-[1450px]:grid">
        {/* 180px left offset */}
        <div aria-hidden="true" />

        {/* 630px copy column: intro + 5 modalities */}
        <div>
          <ModalityList />
        </div>

        {/* 95px middle gap */}
        <div aria-hidden="true" />

        {/* 335px photo column with texture behind */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 z-0 w-[465px] -translate-x-1/2"
            style={{
              backgroundImage: "url('/images/approach-texture.svg')",
              backgroundSize: "auto 100px",
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

        {/* 210px right space */}
        <div aria-hidden="true" />
      </div>

      {/* Mobile / tablet / narrow desktop: fluid fallback */}
      <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20 min-[1450px]:hidden">
        <div>
          <ModalityList />
        </div>
        <div className="flex flex-col gap-8">
          {approaches.photos.map((photo) => (
            <figure
              key={photo.src}
              className="relative aspect-[335/390] w-full border-[10px] border-[#6B6F38] shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)] sm:border-[14px] lg:border-[20px]"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
