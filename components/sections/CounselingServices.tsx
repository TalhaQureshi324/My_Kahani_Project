import Image from "next/image";
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
        width={120}
        height={120}
        className="h-24 w-24 object-contain md:h-[120px] md:w-[120px]"
      />
      <span className="mt-6 inline-block bg-black px-3 py-1 text-center font-sans text-sm font-bold uppercase tracking-wide text-white">
        {badge}
      </span>
      <p className="mt-4 max-w-xs text-base leading-relaxed text-[#F5EBE6]">
        {description}
      </p>
    </div>
  );
}

export default function CounselingServices() {
  const { title, subtitle, items, ctaLabel } = counselingServices;

  return (
    <section id="services" className="relative scroll-mt-24 bg-[#A26838]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/images/counseling_services_background.webp')] bg-cover bg-center bg-no-repeat"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-10 md:pt-24 md:pb-12">
        <h2 className="text-center font-display text-4xl font-semibold uppercase tracking-wide text-[#F5EBE6] sm:text-5xl">
          {title}
        </h2>
        <p className="mt-4 text-center font-sans text-base uppercase tracking-wider text-[#F5EBE6] sm:text-lg">
          {subtitle}
        </p>

        {/* Row 1 — three columns */}
        <div className="mt-14 grid gap-12 sm:gap-10 md:grid-cols-3">
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
        <div className="mx-auto grid max-w-4xl gap-12 sm:gap-10 md:grid-cols-2">
          {items.slice(3).map((item) => (
            <ServiceCard key={item.badge} {...item} />
          ))}
        </div>

        {/* CTA — tight beneath the bottom row */}
        <div className="mt-10 text-center md:mt-12">
          <a
            href="#contact"
            className="inline-block rounded-full border border-white bg-[#5C6430] px-8 py-3 text-[#F5EBE6] transition-colors hover:bg-[#4E5528]"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
