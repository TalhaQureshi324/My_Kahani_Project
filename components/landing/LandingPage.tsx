import type { LandingPageContent } from "@/lib/landingPages";
import { BOOKING_URL } from "@/lib/landingPages";
import { site } from "@/lib/site";
import { EMERGENCY_DISCLAIMER, NON_CLINICAL_DISCLAIMER } from "@/lib/landingPages";
import { SESSION_PRICE_CENTS } from "@/lib/pricing";
import LeadCaptureSection from "@/components/sections/LeadCaptureSection";
import { BadgeCheck, ArrowRight, Phone, Mail } from "lucide-react";

/**
 * Phase 9 — shared template for Google Ads landing pages.
 *
 * Server component: zero client JS except the lead-capture form.
 * The booking CTA is a plain link into the existing /book funnel
 * (custom scheduler → Stripe Payment Element → confirmed booking);
 * attribution persists via the root-layout AttributionCapture cookies
 * (a plain href — no new utm params, so the Google click attribution
 * is never overwritten). Stripe is never loaded on this page.
 */

const priceLabel = `$${(SESSION_PRICE_CENTS / 100).toFixed(0)}`;

function jsonLd(p: LandingPageContent) {
  const base = {
    "@context": "https://schema.org",
  };
  return {
    "@graph": [
      {
        ...base,
        "@type": "Service",
        name: `${p.hero.eyebrow.replace(/^./, (c) => c.toUpperCase())} — True Self Me`,
        serviceType: "Non-clinical life coaching",
        description: p.meta.description,
        provider: {
          "@type": "Person",
          name: "Fahd Alam",
          jobTitle: "Coach & Mentor",
          worksFor: { "@type": "Organization", name: site.name },
        },
        areaServed: "United States",
        offers: {
          "@type": "Offer",
          price: (SESSION_PRICE_CENTS / 100).toFixed(2),
          priceCurrency: "USD",
          url: `${site.url}${BOOKING_URL}`,
          description: "50-minute virtual coaching session",
        },
      },
      {
        ...base,
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default function LandingPage({ page }: { page: LandingPageContent }) {
  const bookHref = BOOKING_URL;
  return (
    <main id="top" className="bg-[#F5EFE6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)) }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
          {page.hero.eyebrow}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl leading-tight text-[#5D1F13] sm:text-5xl">
          {page.hero.h1}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#1A1A1A]/75">
          {page.hero.subhead}
        </p>
        <div className="mt-9 flex flex-col items-center gap-4">
          <a
            href={bookHref}
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#5D1F13] px-8 py-4 text-base font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811] sm:w-auto"
          >
            {page.hero.primaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#stay-in-touch"
            className="text-sm font-semibold text-[#1A1A1A]/60 underline decoration-[#A8532B]/40 underline-offset-4 transition-colors hover:text-[#1A1A1A]"
          >
            {page.hero.secondaryCta}
          </a>
        </div>
        <p className="mt-6 text-xs font-semibold text-[#1A1A1A]/50">
          {priceLabel} · Virtual video · Free cancellation up to 24 hours
        </p>
      </section>

      {/* Goals / problems */}
      <section className="border-y border-black/[0.06] bg-[#F3EDE5] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-3xl text-[#5D1F13]">
            {page.goalsHeading}
          </h2>
          <p className="mt-3 max-w-2xl text-[#1A1A1A]/70">{page.goalsIntro}</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.goals.map((g) => (
              <li
                key={g.title}
                className="rounded-2xl border border-black/[0.08] bg-white p-6"
              >
                <h3 className="font-bold text-[#5D1F13]">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A]/70">
                  {g.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Approach + credentials */}
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-[#5D1F13]">
              {page.approachHeading}
            </h2>
            {page.approachParagraphs.map((para) => (
              <p key={para.slice(0, 24)} className="mt-4 leading-relaxed text-[#1A1A1A]/75">
                {para}
              </p>
            ))}
          </div>
          <div className="rounded-2xl border border-black/[0.08] bg-white p-8">
            <h2 className="font-display text-2xl text-[#5D1F13]">
              {page.credentialsHeading}
            </h2>
            <ul className="mt-5 space-y-4">
              {page.credentialsLines.map((line) => (
                <li key={line.slice(0, 24)} className="flex items-start gap-3 text-sm leading-relaxed text-[#1A1A1A]/80">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#A8532B]" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-black/[0.06] bg-[#F3EDE5] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-3xl text-[#5D1F13]">Pricing</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:items-center">
            <div className="rounded-2xl border border-[#5D1F13]/15 bg-white p-8 text-center">
              <p className="font-display text-5xl text-[#5D1F13]">{priceLabel}</p>
              <p className="mt-2 text-sm text-[#1A1A1A]/60">
                per 50-minute virtual session
              </p>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <li>· Cash-pay, booked per session — no packages pushed.</li>
              <li>· Free cancellation up to 24 hours before your session.</li>
              <li>· Reschedule any time from your secure booking page.</li>
              <li>
                · Full details on the{" "}
                <a href="/#pricing" className="font-semibold text-[#A8532B] underline underline-offset-4">
                  pricing section
                </a>{" "}
                of the main site.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl text-[#5D1F13]">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {page.faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-black/[0.08] bg-white px-5 py-4 open:bg-[#F3EDE5]"
              >
                <summary className="cursor-pointer list-none font-semibold text-[#1A1A1A] marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#1A1A1A]/75">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="border-y border-black/[0.06] bg-[#5D1F13] py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl text-[#F5EFE6] sm:text-4xl">
            {page.ctaHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#F5EFE6]/80">{page.ctaText}</p>
          <a
            href={bookHref}
            className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#F5EFE6] px-8 py-4 text-base font-bold text-[#5D1F13] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
          >
            {page.hero.primaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Lead capture (marketing consent handled in the form) */}
      <LeadCaptureSection />

      {/* Disclaimers + contact */}
      <section className="border-t border-black/[0.06] bg-[#F3EDE5] py-12">
        <div className="mx-auto max-w-5xl space-y-5 px-6 text-xs leading-relaxed text-[#1A1A1A]/65">
          <p>{NON_CLINICAL_DISCLAIMER}</p>
          <p className="font-semibold text-[#5D1F13]">{EMERGENCY_DISCLAIMER}</p>
          <p>
            Questions? Call{" "}
            <a href={site.phoneHref} className="font-semibold underline underline-offset-4">
              {site.phone}
            </a>{" "}
            or email{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-semibold underline underline-offset-4"
            >
              {site.email}
            </a>{" "}
            · {site.hours} · {site.virtual}
          </p>
        </div>
      </section>
    </main>
  );
}
