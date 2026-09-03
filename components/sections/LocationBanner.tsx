import Image from "next/image";
import { locationBanner } from "@/lib/content";
import { site } from "@/lib/site";

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

        {/* Text centered inside the red torn-paper body, clear of the rip */}
        <div className="absolute left-[6%] top-[28%] w-[34%] md:left-[7%] md:w-[27%]">
          <h2 className="font-sans text-[4vw] font-bold uppercase tracking-[0.12em] text-[#F7F1E6] md:text-[1.8vw]">
            {locationBanner.heading}
          </h2>
          <ul className="mt-[8%] space-y-[9%] font-sans text-[3.2vw] font-semibold uppercase leading-snug text-[#F7F1E6] md:text-[1.35vw]">
            <li>
              • {locationBanner.virtualLine1}
              <br />
              {locationBanner.virtualLine2}
            </li>
            <li>
              • {locationBanner.virtualOnlyLabel}
              <br />
              {site.addressLines[0]}
              <br />
              {site.addressLines[1]}
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
