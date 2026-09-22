import Image from "next/image";
import BookingTrigger from "@/components/booking/BookingTrigger";
import { counselingServices } from "@/lib/content";

/**
 * Section 9 — Counseling services: kraft/terracotta field with the
 * supplied spray-paint texture background, serif display title, and a
 * 3-over-2 grid of service cards. Each card stacks a graffiti icon,
 * a solid black title badge, and a centered cream description; a thin
 * black rule divides the rows and an olive pill CTA closes the section.
 */

function ServiceCard({
  icon,
  iconAlt,
  badge,
  description,
}: {
  icon: string;
  iconAlt: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={icon}
        alt={iconAlt}
        width={141}
        height={141}
        className="mb-4 h-[141px] w-[141px] object-contain md:mb-6"
      />
      {/* No nowrap / fixed widths — long titles wrap to two balanced lines
          inside their own grid column; min-h keeps sibling rows aligned. */}
      <h3 className="mb-3 flex min-h-[3rem] items-center justify-center text-balance font-serif text-lg font-bold uppercase leading-snug tracking-wide text-white md:mb-4 md:text-xl">
        {badge}
      </h3>
      <p className="text-base leading-relaxed text-[#F5EBE6] md:text-lg">
        {description}
      </p>
    </div>
  );
}

export default function CounselingServices() {
  const { title, items, ctaLabel } = counselingServices;

  return (
    <section id="services" className="relative scroll-mt-24 bg-[#A26838]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/counseling_services_background.webp')] bg-cover bg-center bg-no-repeat"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-4 md:pt-24 md:pb-6">
        <h2 className="text-center font-display text-3xl font-bold uppercase leading-[1.05] tracking-wide text-[#F5EBE6] md:text-5xl lg:text-6xl">
          {title}
        </h2>

        {/* Row 1 — three columns */}
        <div className="mt-14 grid grid-cols-1 items-start gap-8 md:grid-cols-3 lg:gap-12">
          {items.slice(0, 3).map((item) => (
            <ServiceCard key={item.badge} {...item} />
          ))}
        </div>

        {/* Divider */}
        <div
          aria-hidden="true"
          className="my-12 w-full border-t border-black/80"
        />

        {/* Row 2 — two centered columns */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-8 md:grid-cols-2 lg:gap-12">
          {items.slice(3).map((item) => (
            <ServiceCard key={item.badge} {...item} />
          ))}
        </div>

        {/* CTA — tight beneath the bottom row */}
        <div className="mt-10 text-center md:mt-12">
          <BookingTrigger
            aria-label="Schedule an initial coaching session"
            className="inline-flex h-[65px] w-[302px] items-center justify-center rounded-full border border-[rgb(243,237,229)] bg-[#5C6430] px-8 text-[18px] text-[rgb(243,237,229)] transition-colors hover:bg-[#4E5528]"
          >
            {ctaLabel}
          </BookingTrigger>
        </div>
      </div>
    </section>
  );
}
