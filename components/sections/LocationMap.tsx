import { site } from "@/lib/site";

/**
 * Section 11 — Location map: the muted slate-teal street-map texture
 * continuing directly from the banner above, with a centered, framed
 * interactive Google Maps embed centered on the coordinates from
 * site.mapQuery (keyless embed: light-mode street map, zoom controls,
 * pannable inside its rounded, bordered frame).
 */
export default function LocationMap() {
  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/location_map_bg.webp')] bg-cover bg-center"
      />

      <div className="relative flex w-full items-center justify-center">
        <div className="aspect-square w-[90%] max-w-[360px] overflow-hidden rounded-lg border border-white/20 shadow-xl md:h-[500px] md:w-[550px] md:max-w-none">
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
