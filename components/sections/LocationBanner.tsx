import Image from "next/image";
import { locationBanner } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Section 10 — Locations banner: the supplied split background (kraft
 * texture top, dusty-teal street map bottom) with the red torn-paper
 * scrap baked into the graphic on the left. Overlay text sits inside
 * the torn paper ("LOCATIONS:" + virtual/in-person bullets) and the
 * serif headline stacks over the teal map in the lower right. The
 * wrapper keeps the image's aspect ratio (taller crop below md, with
 * object-left so the paper stays in frame) so the % positioned
 * overlays stay aligned at every width.
 */
export default function LocationBanner() {
  return (
    <section id="location" className="relative w-full scroll-mt-24 overflow-hidden">
      <div className="relative aspect-[3/4] md:aspect-[1500/844]">
        <Image
          src="/images/location_banner_bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-left md:object-center"
        />

        {/* Text inside the red torn paper */}
        <div className="absolute left-[6%] top-[15%] w-[34%] md:left-[7%] md:top-[16%] md:w-[27%]">
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
              • {locationBanner.inPersonLabel}
              <br />
              {site.addressLines[0]}
              <br />
              {site.addressLines[1]}
            </li>
          </ul>
        </div>

        {/* Serif headline over the teal map, lower right */}
        <h3 className="absolute bottom-[7%] right-[5%] text-left font-display text-[7vw] font-semibold uppercase leading-[1.05] text-[#F5EBE6] md:bottom-[8%] md:text-[3vw]">
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
