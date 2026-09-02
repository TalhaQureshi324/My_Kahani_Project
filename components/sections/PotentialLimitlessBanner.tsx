import Image from "next/image";

/**
 * Section 13 — "Your potential is limitless" transition band: a cream
 * (#F5EBE6) sandwich between the olive Specialties section and what
 * follows. The specialties' wave fill is the same cream, so the curve
 * and its bold black stroke read as the band's top edge with a slim
 * buffer above the mural. The mural (1500x500) sits centered at
 * max-w-[1200px] — not edge-to-edge — framed by cream on all sides.
 * The band's bottom edge is a subtle upward diagonal clipped with a
 * polygon and traced by a bold non-scaling black stroke.
 */
export default function PotentialLimitlessBanner() {
  return (
    <section className="relative w-full">
      <div
        className="relative w-full overflow-hidden bg-[#F5EBE6]"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 3vw), 0 100%)",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 pt-10 pb-16 md:px-8 md:pt-14 md:pb-20">
          <Image
            src="/images/potential_is_limitless.webp"
            alt="Mural artwork with portraits and the message Your potential is limitless"
            width={1500}
            height={500}
            sizes="(min-width: 1200px) 1200px, 100vw"
            className="h-auto w-full object-cover"
          />
        </div>
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
    </section>
  );
}
