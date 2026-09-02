import Image from "next/image";

/**
 * Section 13 — Mural transition banner: the full-width "Your potential
 * is limitless" mural (1500x500, edge-to-edge at natural aspect so the
 * portraits and central type never crop). The section tucks 90px under
 * Section 12 (z-0 below its z-10), where the specialties' masked
 * texture and black wave stroke overlay the mural's top. Its own
 * bottom edge is a bold black diagonal slant (clip-path polygon +
 * non-scaling SVG stroke) rising into the section below.
 */
export default function PotentialLimitlessBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative z-0 -mt-[90px]">
        <div
          className="relative w-full"
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 3vw), 0 100%)",
          }}
        >
          <Image
            src="/images/potential_is_limitless.webp"
            alt="Mural artwork with portraits and the message Your potential is limitless"
            width={1500}
            height={500}
            sizes="100vw"
            className="w-full object-cover"
          />
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 block h-[3vw] w-full"
          viewBox="0 0 1440 43"
          preserveAspectRatio="none"
        >
          <path
            d="M0 43 L1440 0"
            fill="none"
            stroke="#000"
            strokeWidth="6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </section>
  );
}
