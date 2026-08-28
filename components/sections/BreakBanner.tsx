import Image from "next/image";

/**
 * Section 6 — full-width break banner: 100vw bleed photograph.
 * The bundled SVG is an original placeholder; swap in a real photo
 * at /public/images/banner.jpg and remove `unoptimized`.
 */
export default function BreakBanner() {
  return (
    <section
      aria-label="Full-width break image"
      className="relative h-[46vh] min-h-[340px] w-full overflow-hidden"
    >
      <Image
        src="/images/banner-placeholder.svg"
        alt="Placeholder panoramic break image — replace with your own photo of the community"
        fill
        unoptimized
        className="object-cover"
      />
    </section>
  );
}
