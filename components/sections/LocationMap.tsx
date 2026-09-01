import { site } from "@/lib/site";

/**
 * Section 11 — Location map: the muted slate-teal street-map texture
 * continuing directly from the banner above, with a centered, framed
 * interactive Google Maps embed pointing at the practice address from
 * site config (placeholder address → centers on the Austin area until
 * the real one is set). Keyless embed: standard light-mode street map
 * with zoom controls, pannable inside its rounded, bordered frame.
 */
export default function LocationMap() {
  const query = encodeURIComponent(site.addressLines.join(", "));

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/location_map_bg.webp')] bg-cover bg-center"
      />

      <div className="relative flex w-full items-center justify-center">
        <div className="aspect-square w-[90%] max-w-[360px] overflow-hidden rounded-lg border border-white/20 shadow-xl md:h-[500px] md:w-full md:max-w-[550px]">
          <iframe
            title="Map to the office"
            src={`https://www.google.com/maps?q=${query}&z=15&output=embed`}
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
