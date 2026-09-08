import Image from "next/image";
import { locationBanner } from "@/lib/content";

/**
 * Section 10 — Locations banner: the supplied split background (kraft
 * texture over teal street map, red torn-paper scrap baked into the
 * graphic on the left) extended to 1731x741 so the paper renders at
 * ~490px tall on desktop viewports. Clean horizontal edges; the angled
 * divider lives at the bottom of Section 11. The "LOCATIONS:" text
 * block sits centered inside the red body, clear of the top rip, and
 * the serif headline pins to the bottom-right corner over the map.
 * Below md a taller 3/4 crop with object-left keeps the paper framed.
 */
export default function LocationBanner() {
  return (
    <section id="location" className="relative w-full scroll-mt-24 overflow-hidden">
      <div className="relative aspect-[3/4] md:aspect-[1731/741]">
        <Image
          src="/images/location_banner_bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-left md:object-center"
        />

        {/* Text block — enlarged and vertically centered in the red torn-paper body */}
        <div className="absolute left-[6%] top-1/2 w-[46%] -translate-y-1/2 md:left-[7%] md:w-[27%]">
          <h2 className="font-sans text-[5vw] font-bold uppercase tracking-[0.12em] text-[#F7F1E6] md:text-[2.6vw]">
            {locationBanner.heading}
          </h2>
          <ul className="mt-[6%] space-y-[6%] font-sans text-[4vw] font-semibold uppercase leading-snug text-[#F7F1E6] md:text-[2.1vw]">
            <li>
              • {locationBanner.virtualLine1}
              <br />
              {locationBanner.virtualLine2}
            </li>
          </ul>
        </div>

        {/* Serif headline pinned low in the bottom-right corner over the teal map */}
        <h3 className="absolute bottom-[3%] right-[4%] text-left font-display text-[7vw] font-semibold uppercase leading-[1.05] text-[#F5EBE6] md:text-[3vw]">
          {locationBanner.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h3>
      </div>
    </section>
  );
}
