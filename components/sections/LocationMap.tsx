import { site } from "@/lib/site";

/**
 * Section 11 — Location map: the muted slate-teal street-map texture
 * continuing directly from the banner above, with a wide, centered,
 * framed interactive Google Maps embed (keyless: light-mode street
 * map, zoom controls, pannable). The section's bottom edge is the one
 * angled divider in the location module — a clip-path diagonal rising
 * left to right, pulled 40px over the next section via -mb-10/z-10 so
 * the wedge reveals the dark section below instead of the page body.
 */
export default function LocationMap() {
  return (
    <section
      className="relative z-10 -mb-10 w-full overflow-hidden py-16 md:py-24"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 40px), 0 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/location_map_bg.webp')] bg-cover bg-center"
      />

      <div className="relative flex w-full items-center justify-center px-6">
        <div className="aspect-square w-[90%] max-w-[360px] overflow-hidden rounded-xl border border-white/30 shadow-2xl md:h-[500px] md:w-full md:max-w-4xl md:aspect-auto">
          <iframe
            title="Map to the office"
            src={`https://www.google.com/maps?q=${site.mapQuery}&z=${site.mapZoom}&output=embed`}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
