import Image from "next/image";

/**
 * Section 13 — "Your potential is limitless" mural, edge-to-edge.
 * The image spans the full viewport width (object-cover, min-height,
 * scaled 1.08 to crop the asset's black letterbox frame). The top cut
 * is the specialties' own areas_of_focus.webp texture clipped to the
 * wave shape (objectBoundingBox clip-path) with a bold black stroke on
 * the curve, so it blends seamlessly with the section above. The
 * bottom edge is clipped on an upward diagonal with another bold
 * black stroke; the section has no background of its own, so whatever
 * follows shows beneath the slant.
 */
export default function PotentialLimitlessBanner() {
  return (
    <section className="relative z-10 w-full overflow-hidden">
      <div
        className="relative w-full"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), 0 100%)",
        }}
      >
        <Image
          src="/images/potential_is_limitless.webp"
          alt="Mural artwork with portraits and the message Your potential is limitless"
          width={1500}
          height={500}
          sizes="100vw"
          className="block h-auto w-full min-h-[380px] scale-[1.08] object-cover md:min-h-[480px]"
        />
      </div>

      {/* Wave clip definition (objectBoundingBox units keep it
          responsive at any width) */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <clipPath id="mural-wave-clip" clipPathUnits="objectBoundingBox">
            <path d="M0 0 H1 V0.5 C0.8333 -0.0556 0.6667 1.0556 0.5 0.5 C0.3333 -0.0556 0.1667 1.0556 0 0.5 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Top wave — specialties texture clipped to the curve */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 block h-[90px] w-full bg-[#605C31] bg-[url('/images/areas_of_focus.webp')] bg-repeat"
        style={{ clipPath: "url(#mural-wave-clip)" }}
      />

      {/* Bold black stroke along the curved boundary */}
      <svg
        aria-hidden="true"
        className="absolute left-0 top-0 block h-[90px] w-full"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
      >
        <path
          d="M0 45 C 240 95, 480 -5, 720 45 C 960 95, 1200 -5, 1440 45"
          fill="none"
          stroke="#000"
          strokeWidth="6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Bottom slant — bold black line across the gentle 20px tilted
          edge; the Right Guidance section's background fills the wedge
          beneath it */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 block h-[20px] w-full"
        viewBox="0 0 1440 20"
        preserveAspectRatio="none"
      >
        <path
          d="M0 20 L1440 0"
          fill="none"
          stroke="#000"
          strokeWidth="6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </section>
  );
}
