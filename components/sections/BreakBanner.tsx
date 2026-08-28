import Image from "next/image";

/**
 * Section 6 — full-width break banner: 100vw bleed photograph.
 */
export default function BreakBanner() {
  return (
    <section
      aria-label="Austin, Texas — the community this practice calls home"
      className="relative h-[46vh] min-h-[340px] w-full overflow-hidden"
    >
      <Image
        src="/images/FULL_WIDTH.jpg"
        alt="The Austin skyline at sunset seen from the river, with kayakers paddling beneath a graffiti-covered bridge"
        fill
        className="object-cover"
        sizes="100vw"
      />
    </section>
  );
}
