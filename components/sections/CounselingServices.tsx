import Image from "next/image";
import BookingTrigger from "@/components/booking/BookingTrigger";
import { counselingServices } from "@/lib/content";

/**
 * Section 9 — Counseling services: kraft/terracotta field with the
 * supplied spray-paint texture background, serif display title, and a
 * 3-over-2 grid of service cards. Each card stacks a graffiti icon, a
 * single-line black label badge, and a centered cream description; a
 * thin black rule divides the rows and an olive pill CTA closes the
 * section.
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
      {/* Spray / Doodle Icon */}
      <div className="mb-4">
        <Image
          src={icon}
          alt={iconAlt}
          width={141}
          height={141}
          className="h-[141px] w-[141px] object-contain"
        />
      </div>

      {/* Exact fitted black highlight heading — hugs the text, sharp
          corners, strictly one line. (h3 keeps document semantics; the
          inline-block classes make it render as a fitted label.) */}
      <div className="mb-3 flex justify-center">
        <h3 className="inline-block whitespace-nowrap rounded-none bg-black px-2 py-0.5 font-serif text-xs font-bold uppercase leading-tight tracking-wider text-white sm:text-sm md:text-base lg:text-[17px]">
          {badge}
        </h3>
      </div>

      {/* Description Body */}
      <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-[#F5EBE6] md:text-base">
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
        className="absolute inset-0 bg-[url('/New%20images/counseling_services_background.png')] bg-cover bg-center bg-no-repeat"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 pb-4 md:pt-24 md:pb-6 lg:px-8">
        <h2 className="text-center font-display text-3xl font-bold uppercase leading-[1.05] tracking-wide text-[#F5EBE6] md:text-5xl lg:text-6xl">
          {title}
        </h2>

        {/* Row 1 — three columns */}
        <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-3 lg:gap-10">
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
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-center gap-12 md:flex-row lg:gap-24">
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
