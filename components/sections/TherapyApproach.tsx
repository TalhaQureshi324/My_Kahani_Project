import Image from "next/image";
import { approaches } from "@/lib/content";

/**
 * Section 8 — Therapy approach: warm sand field, full-width olive
 * title banner, 2-column body (modality list left, thick olive-framed
 * photo cards right). The geometric texture sits BESIDE the photos —
 * [ PHOTOS ] → gap → [ TEXTURE ] — never behind or beneath them.
 */
function FramedPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="w-full border-[12px] border-olivegreen bg-sand shadow-[0_24px_45px_-25px_rgba(42,42,42,0.5)]">
      <div className="relative aspect-[4/3]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 28vw, 90vw"
          className="object-cover"
        />
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
      {/* Full-width olive title banner */}
      <div className="relative z-10 w-full bg-olivegreen">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.14em] text-cream sm:text-4xl">
            {approaches.bannerTitle}
          </h2>
        </div>
      </div>

      {/* Body: modality list + framed photos with the texture after them */}
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

        {/* Photos, then texture — separate sibling layers with a gap */}
        <div className="flex items-stretch gap-6 lg:-mr-8 xl:-mr-8">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            {approaches.photos.map((photo) => (
              <FramedPhoto key={photo.src} src={photo.src} alt={photo.alt} />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="hidden w-20 shrink-0 self-stretch lg:block"
            style={{
              backgroundImage: "url('/images/approach-texture.svg')",
              backgroundSize: "100% auto",
              backgroundRepeat: "repeat-y",
            }}
          />
        </div>
      </div>
    </section>
  );
}
