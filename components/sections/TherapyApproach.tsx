import Image from "next/image";
import { approaches } from "@/lib/content";

/**
 * Section 8 — Therapy approach: a structural replica of the reference
 * site's fluid engine grid, over a single full-section background
 * image (theraphy_section_background.webp — olive band top, sand field,
 * diamond lattice right). A 24-column proportional grid on a canvas
 * capped at 1500px with 4vw side gutters; row heights scale with the
 * container (factor 0.0215), and typography is fluid (body scales as
 * min(0.6vw + 1rem, 34px), serif 400 headings). Everything derives
 * from --container-width, so the whole section scales proportionally
 * at any viewport width or zoom level — there is no fixed-pixel
 * breakpoint to break.
 *
 * Desktop grid areas (row-start/col-start/row-end/col-end on 47×24):
 *   heading  3/2/6/18   intro 9/4/15/15   outro 39/4/42/15
 *   items    16/5/19/16 · 20/5/24/16 · 25/5/29/16 · 30/5/34/16 · 35/5/39/16
 *   images   7/17/21/24 · 21/17/33/24 · 34/17/46/24
 */

// Reference fluid scales — body large text and photo frame width.
const LARGE_TEXT = "text-[min(0.6vw+1rem,2.125rem)]";
const PHOTO_WIDTH = "calc(var(--container-width) * 0.2233)"; // 335px at 1500px canvas

// Reference grid areas for the five modality items and three photos.
const ITEM_AREAS = [
  "16 / 5 / 19 / 16",
  "20 / 5 / 24 / 16",
  "25 / 5 / 29 / 16",
  "30 / 5 / 34 / 16",
  "35 / 5 / 39 / 16",
];
const IMAGE_AREAS = ["7 / 17 / 21 / 24", "21 / 17 / 33 / 24", "34 / 17 / 46 / 24"];

const bodyText = `${LARGE_TEXT} font-normal leading-[1.6] tracking-[0.01em] text-charcoal`;

function Item({ name, blurb }: { name: string; blurb: string }) {
  return (
    <div>
      <p className={`${bodyText} font-bold`}>{name}</p>
      <p className={bodyText}>{blurb}</p>
    </div>
  );
}

function FramedPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure
      className="relative aspect-[335/390] border-[20px] border-[#6B6F38] shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)]"
      style={{ width: PHOTO_WIDTH }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 335px, 92vw"
        className="object-cover"
      />
    </figure>
  );
}

export default function TherapyApproach() {
  return (
    <section
      id="therapy-approach"
      className="relative scroll-mt-24 overflow-hidden bg-sand"
      style={
        {
          "--container-width": "min(1500px, calc(100vw - 8vw))",
        } as React.CSSProperties
      }
    >
      {/* Full-section background: olive band on top (behind the heading),
          sand field, and the diamond lattice on the right — anchored
          right/top so the pattern strip always stays fully visible. */}
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <Image
          src="/images/theraphy_section_background.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right-top"
        />
      </div>

      {/* Desktop >=768px: the 24-column fluid engine grid */}
      <div
        className="relative z-10 mx-auto hidden w-full max-w-[calc(1500px+8vw)] px-[4vw] md:grid"
        style={
          {
            gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
            gridTemplateRows:
              "repeat(47, minmax(calc(var(--container-width) * 0.0215), auto))",
            columnGap: "6px",
            rowGap: "11px",
          } as React.CSSProperties
        }
      >
        <h2
          className="self-center font-display text-[clamp(2rem,2.2vw+1.25rem,2.625rem)] font-normal leading-[1.2] tracking-normal text-cream"
          style={{ gridArea: "3 / 2 / 6 / 18" }}
        >
          {approaches.bannerTitle}
        </h2>

        <p className={bodyText} style={{ gridArea: "9 / 4 / 15 / 15" }}>
          {approaches.intro}
        </p>

        {approaches.items.map((item, i) => (
          <div key={item.name} style={{ gridArea: ITEM_AREAS[i] }}>
            <Item {...item} />
          </div>
        ))}

        <p className={bodyText} style={{ gridArea: "39 / 4 / 42 / 15" }}>
          {approaches.outro}
        </p>

        {approaches.photos.map((photo, i) => (
          <div
            key={photo.src}
            className="flex items-center justify-center"
            style={{ gridArea: IMAGE_AREAS[i] }}
          >
            <FramedPhoto src={photo.src} alt={photo.alt} />
          </div>
        ))}
      </div>

      {/* Mobile <768px: stacked fluid layout, same typography */}
      <div className="relative z-10 mx-auto flex w-full max-w-[calc(1500px+8vw)] flex-col px-[4vw] pb-16 pt-6 md:hidden">
        <h2 className="font-display text-[clamp(2rem,2.2vw+1.25rem,2.625rem)] font-normal leading-[1.2] tracking-normal text-cream">
          {approaches.bannerTitle}
        </h2>
        <p className={`${bodyText} mt-6`}>{approaches.intro}</p>
        <div className="mt-8 flex flex-col gap-6">
          {approaches.items.map((item) => (
            <Item key={item.name} {...item} />
          ))}
        </div>
        <p className={`${bodyText} mt-8`}>{approaches.outro}</p>
        <div className="mt-10 flex flex-col gap-8">
          {approaches.photos.map((photo) => (
            <figure
              key={photo.src}
              className="relative aspect-[335/390] w-full border-[12px] border-[#6B6F38]"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="92vw"
                className="object-cover"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
