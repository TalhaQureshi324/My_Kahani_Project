import Image from "next/image";

/**
 * Section 13 — "Your potential is limitless" mural, edge-to-edge.
 * The image spans the full viewport width (w-full object-cover with a
 * minimum height) on a terracotta #7B3B26 base. The top edge is cut by
 * an olive #605C31 wave overlay with a bold black stroke running along
 * the curve, directly into the mural; the bottom edge is clipped on a
 * subtle upward diagonal traced by another bold black stroke, with the
 * terracotta base showing immediately beneath the line. No cream
 * wrapper, no container margins.
 */
export default function PotentialLimitlessBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-[#7B3B26]">
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
          className="block h-auto w-full min-h-[380px] object-cover md:min-h-[480px]"
        />
      </div>

      {/* Top wave — olive fill above the curve, black stroke on it,
          cutting directly into the mural image */}
      <svg
        aria-hidden="true"
        className="absolute left-0 top-0 block h-[90px] w-full"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0 H1440 V45 C1200 -5 960 95 720 45 C480 -5 240 95 0 45 Z"
          fill="#605C31"
        />
        <path
          d="M0 45 C 240 95, 480 -5, 720 45 C 960 95, 1200 -5, 1440 45"
          fill="none"
          stroke="#000"
          strokeWidth="6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Bottom slant — bold black line across the clipped edge,
          terracotta immediately below */}
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
    </section>
  );
}
