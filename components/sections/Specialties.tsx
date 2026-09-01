import Image from "next/image";
import { specialties } from "@/lib/content";

/**
 * Section 12 — Specialties / Areas of focus: the olive #605C31 urban
 * texture (areas_of_focus.webp, repeating) runs from behind the giant
 * SPECIALTIES marquee (padded clear of the slanted map section above)
 * down through four subsections of alternating photo/text rows — items
 * 1–3, 4–6, 7–9 and the final single item. Photos render borderless at
 * exact dimensions (2.webp carries its own offset frame in the asset).
 * A curved black-stroked wave in the next section's cream-dark fills
 * the bottom edge of the last subsection as the transition into
 * Pricing.
 */

const TEXTURE =
  "bg-[#605C31] bg-[url('/images/areas_of_focus.webp')] bg-repeat";

type Item = (typeof specialties.items)[number];

function Frame({ item }: { item: Item }) {
  return (
    <div
      className="relative max-w-full overflow-hidden border-none bg-transparent p-0"
      style={{ width: item.w, height: item.h }}
    >
      <Image
        src={item.img}
        alt={`${item.title} — area of focus illustration`}
        fill
        sizes="(min-width: 768px) 460px, 92vw"
        className="object-cover"
      />
    </div>
  );
}

function ItemText({ item, center }: { item: Item; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-xl text-center" : "max-w-md"}>
      <h3 className="mb-2 text-[24px] font-bold text-white">{item.title}</h3>
      <p className="text-[24px] font-normal leading-relaxed text-[#F5EBE6]">
        {item.text}
      </p>
    </div>
  );
}

function Row({ item }: { item: Item }) {
  if (item.align === "center") {
    return (
      <div className="flex flex-col items-center gap-8 py-10 text-center md:py-14">
        <Frame item={item} />
        <ItemText item={item} center />
      </div>
    );
  }

  const imageFirst = item.align === "left";
  const frame = (
    <div className={imageFirst ? "md:justify-self-start" : "md:justify-self-end"}>
      <Frame item={item} />
    </div>
  );
  const text = <ItemText item={item} />;

  return (
    <div className="grid items-center gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-14">
      {imageFirst ? (
        <>
          {frame}
          {text}
        </>
      ) : (
        <>
          {text}
          {frame}
        </>
      )}
    </div>
  );
}

function Ticker() {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="px-6 font-display text-6xl font-semibold uppercase tracking-wide text-[#F5EBE6] md:text-8xl lg:text-9xl"
        >
          {specialties.marqueeWord}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`w-full overflow-hidden whitespace-nowrap border-b border-black/20 py-4 pt-16 md:pt-24 ${TEXTURE}`}
    >
      <div className="flex w-max animate-marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export default function Specialties() {
  const groups = [
    specialties.items.slice(0, 3),
    specialties.items.slice(3, 6),
    specialties.items.slice(6, 9),
    specialties.items.slice(9),
  ];

  return (
    <section id="specialties" className="scroll-mt-24">
      <Ticker />

      {/* Subsection 1 — items 1–3, opened by the Areas of focus heading */}
      <div className={TEXTURE}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="pt-12 text-center font-display text-[30px] font-semibold uppercase tracking-wide text-[#F5EBE6] md:pt-16 md:text-[45px]">
            {specialties.subheading}
          </h2>
          {groups[0].map((item) => (
            <Row key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* Subsection 2 — items 4–6 */}
      <div className={TEXTURE}>
        <div className="mx-auto max-w-6xl px-6">
          {groups[1].map((item) => (
            <Row key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* Subsection 3 — items 7–9 */}
      <div className={TEXTURE}>
        <div className="mx-auto max-w-6xl px-6">
          {groups[2].map((item) => (
            <Row key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* Subsection 4 — final item with the wave divider into Pricing */}
      <div className={`relative ${TEXTURE}`}>
        <div className="mx-auto max-w-6xl px-6 pb-28 md:pb-36">
          {groups[3].map((item) => (
            <Row key={item.title} item={item} />
          ))}
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 block h-[60px] w-full md:h-[90px]"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
        >
          <path
            d="M0 45 C 240 95, 480 -5, 720 45 C 960 95, 1200 -5, 1440 45 L1440 90 L0 90 Z"
            fill="#EEE5D2"
          />
          <path
            d="M0 45 C 240 95, 480 -5, 720 45 C 960 95, 1200 -5, 1440 45"
            fill="none"
            stroke="#000"
            strokeWidth="6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </section>
  );
}
