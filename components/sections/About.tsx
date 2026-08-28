import Image from "next/image";
import { SectionHeading } from "@/components/ui/primitives";
import { CornerAccent } from "@/components/ui/doodles";
import { about } from "@/lib/content";

/**
 * Section 2 — About: text left, inset portrait right with a
 * line-art accent tucked behind the frame's top-right corner.
 */
export default function About() {
  return (
    <section id="about" className="scroll-mt-24 border-t border-ink/10">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
        {/* Copy */}
        <div>
          <SectionHeading eyebrow={about.eyebrow} title={about.title} />
          <p className="mt-6 text-lg leading-relaxed font-bold text-ink">
            {about.lead}
          </p>
          <div className="mt-5 space-y-5 text-base leading-relaxed text-ink-soft">
            {about.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>

        {/* Inset portrait + accent */}
        <div className="relative px-6 pt-8 pb-6 sm:px-10 lg:px-10">
          <CornerAccent className="absolute top-0 right-0 z-0 h-32 w-32 text-terracotta/70" />
          <div className="relative z-10 aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_26px_50px_-28px_rgba(38,33,24,0.45)]">
            <Image
              src="/images/ABOUT-1.jpg"
              alt="A father and his young son walk hand in hand down a tree-lined path at sunset"
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
