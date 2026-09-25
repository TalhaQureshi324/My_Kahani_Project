import Image from "next/image";

/**
 * Section 6 — full-width break banner: 100vw bleed photograph.
 */
export default function BreakBanner() {
  return (
    <section
      aria-label="Your story is still unfolding — a message from True Self Me"
      className="relative h-[46vh] min-h-[340px] w-full overflow-hidden"
    >
      <Image
        src="/images/your_story_is_still_unfolding.png"
        alt="Your story is still unfolding"
        fill
        className="object-cover"
        sizes="100vw"
      />
    </section>
  );
}
