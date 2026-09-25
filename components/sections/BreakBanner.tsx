import Image from "next/image";

/**
 * Section 6 — full-width break banner after "Meet Fahd": the
 * "Your story is still unfolding" graphic displayed at its natural
 * aspect ratio (2089×753) — no fixed-height crop, nothing clipped.
 */
export default function BreakBanner() {
  return (
    <section
      aria-label="Your story is still unfolding — a message from True Self Me"
      className="relative w-full"
    >
      <Image
        src="/images/your_story_is_still_unfolding.png"
        alt="Your story is still unfolding"
        width={2089}
        height={753}
        priority
        className="block h-auto w-full"
        sizes="100vw"
      />
    </section>
  );
}
