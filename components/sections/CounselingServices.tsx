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
        width={141}
        height={141}
        className="h-[141px] w-[141px] object-contain"
      />
      <span className="mt-6 inline-block whitespace-nowrap rounded-none bg-black px-3 py-[3px] text-center font-sans text-[20px] font-bold uppercase tracking-tight text-white md:text-[28px]">
        {badge}
      </span>
      <p className="mt-4 text-[24px] leading-relaxed text-[#F5EBE6]">
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
        <h2 className="whitespace-nowrap text-center font-display text-3xl font-bold uppercase leading-[1.05] tracking-wide text-[#F5EBE6] md:text-5xl lg:text-6xl">
          {title}
        </h2>
        <p className="mt-4 text-center font-sans text-[1.5rem] font-bold uppercase tracking-wider text-[#F5EBE6] md:text-[46px]">
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
            className="inline-flex h-[65px] w-[302px] items-center justify-center rounded-full border border-white bg-[#5C6430] px-8 text-[20px] text-[#F5EBE6] transition-colors hover:bg-[#4E5528]"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
