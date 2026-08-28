import { whyWork } from "@/lib/content";

/**
 * Section 7 — "Why work with me" & qualifications: sage field,
 * centered intro, 2-column credential grid (stacks on mobile),
 * centered badge inside an outbound anchor.
 */
export default function WhyWorkWithMe() {
  return (
    <section
      id="qualifications"
      className="scroll-mt-24 bg-sage py-20 text-charcoal sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        {/* Heading + intro */}
        <h2 className="font-display text-4xl font-normal uppercase tracking-[0.22em] sm:text-5xl">
          {whyWork.heading}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed font-normal sm:text-lg">
          {whyWork.intro}
        </p>

        {/* Qualifications grid */}
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-terradark">
          {whyWork.qualHeading}
        </p>
        <div className="mt-6 grid gap-10 text-center sm:grid-cols-2 sm:gap-6 sm:text-left">
          <div>
            <h3 className="text-lg font-bold">{whyWork.education.header}</h3>
            <ul className="mt-3 space-y-4">
              {whyWork.education.items.map((item) => (
                <li key={item.degree}>
                  <p className="font-medium">{item.degree}</p>
                  <p className="italic">{item.school}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold">{whyWork.license.header}</h3>
            <p className="mt-3 font-medium">{whyWork.license.title}</p>
            <p>{whyWork.license.number}</p>
            <p className="mt-2 italic">{whyWork.license.supervision}</p>
          </div>
        </div>

        {/* Badge */}
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-14 inline-block transition-transform duration-300 hover:-translate-y-1"
          aria-label="Professional verification badge (link destination to be configured)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- badge image supplied by the practice */}
          <img
            src="/images/Badge_WHY_WORK_WITH_ME.jpg"
            alt="Inclusive Therapist badge — celebrating all identities"
            width={148}
            height={148}
            className="rounded-full shadow-[0_16px_35px_-18px_rgba(42,42,42,0.55)]"
          />
        </a>
      </div>
    </section>
  );
}
