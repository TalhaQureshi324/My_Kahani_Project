import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AtSign, Mail, MapPin, Phone } from "lucide-react";
import BookingTrigger from "@/components/booking/BookingTrigger";
import BackToTop from "@/components/footer/BackToTop";
import { site } from "@/lib/site";

/**
 * Footer — editorial three-tier composition:
 *
 *   A. Centered brand anchor — large logo, brand title, short description.
 *   B. Balanced four-column grid — Contact / Explore / Programs / Ready to
 *      begin? (2×2 on tablet, stacked on mobile).
 *   C. Compact legal bar — copyright, privacy/terms, Instagram, back-to-top.
 *
 * Dark earthy night background with a whisper-faint speckle texture and
 * two very subtle hand-painted edge decorations (muted terracotta, 4–8%
 * opacity) kept well clear of all text.
 */

const EXPLORE_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Meet Fahd", href: "/#meet-fahd" },
  { label: "Approach", href: "/#approach" },
  { label: "Services", href: "/#services" },
  { label: "Specialties", href: "/#specialties" },
];

// Dad Block is paused — no link until it returns.
const PROGRAM_LINKS = [
  { label: "Group Coaching Cohorts", href: "/#services" },
  { label: "Sliding Scale", href: "/#pricing" },
  { label: "Pricing", href: "/#pricing" },
];

const HEADING =
  "text-[12px] font-semibold uppercase tracking-[0.16em] text-cream/45";
const LINK =
  "text-[15px] text-cream/75 transition-colors duration-300 hover:text-terracotta-tint";

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return <p className={HEADING}>{children}</p>;
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-night text-cream">
      {/* Very subtle organic speckle texture (≈4%) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(220,205,180,0.7) 0.8px, transparent 0.9px), radial-gradient(rgba(151,105,64,0.6) 0.6px, transparent 0.7px)",
          backgroundSize: "26px 26px, 41px 41px",
          backgroundPosition: "0 0, 13px 19px",
        }}
      />

      {/* Edge decorations — muted terracotta, away from all content */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 text-[#976940]/[0.07]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M100 18 C 148 18 182 52 182 100 C 182 148 148 182 100 182 C 52 182 18 148 18 100 C 18 66 40 38 72 26"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 text-[#976940]/[0.06]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M100 30 C 160 30 175 85 140 110 C 112 130 78 122 76 96 C 74 74 96 62 112 72 C 124 80 122 96 110 100"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-16">
        {/* ── SECTION A — centered brand anchor ─────────────────────── */}
        <div className="flex flex-col items-center pb-10 pt-16 text-center md:pt-[70px]">
          <Image
            src="/images/true_self_me_footer_logo_original.png"
            alt={site.name}
            width={1203}
            height={951}
            sizes="(min-width: 1024px) 210px, (min-width: 768px) 160px, 140px"
            className="w-[140px] md:w-[160px] lg:w-[210px]"
            priority={false}
          />
          <p className="mt-6 text-lg font-bold tracking-wide text-cream">
            True Self Me — Coaching &amp; Mentorship
          </p>
          <p className="mt-3 max-w-[520px] text-[15px] leading-[1.6] text-cream/70">
            Coaching and community for every chapter of your story — virtual
            sessions across the United States.
          </p>
        </div>

        {/* Divider */}
        <div aria-hidden="true" className="border-t border-[#DCCDB4]/[0.16]" />

        {/* ── SECTION B — balanced four-column grid ─────────────────── */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 py-12 md:grid-cols-2 md:gap-y-12 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr]">
          {/* Column 1 — Contact */}
          <div>
            <ColumnHeading>Contact</ColumnHeading>
            <ul className="mt-6 space-y-4 text-[15px] text-cream/75">
              <li className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-tint/70"
                  aria-hidden="true"
                />
                <span>
                  Based in Austin, Texas
                  <br />
                  Serving clients nationwide
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone
                  className="h-4 w-4 shrink-0 text-terracotta-tint/70"
                  aria-hidden="true"
                />
                <a
                  href={site.phoneHref}
                  className="transition-colors duration-300 hover:text-cream"
                >
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail
                  className="h-4 w-4 shrink-0 text-terracotta-tint/70"
                  aria-hidden="true"
                />
                <a
                  href={`mailto:${site.email}`}
                  className="break-all transition-colors duration-300 hover:text-cream"
                >
                  {site.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2 — Explore */}
          <nav aria-label="Footer — explore">
            <ColumnHeading>Explore</ColumnHeading>
            <ul className="mt-6 space-y-3">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={LINK}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3 — Programs */}
          <nav aria-label="Footer — programs">
            <ColumnHeading>Programs</ColumnHeading>
            <ul className="mt-6 space-y-3">
              {PROGRAM_LINKS.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={LINK}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 4 — CTA */}
          <div>
            <ColumnHeading>Ready to begin?</ColumnHeading>
            <p className="mt-6 text-[17px] font-medium leading-snug text-cream">
              Start with a conversation.
            </p>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-cream/60">
              Take the first step toward feeling more grounded, connected, and
              clear.
            </p>
            <BookingTrigger
              location="footer"
          aria-label="Book a coaching consultation with True Self Me"
              className="group mt-6 inline-flex h-[50px] items-center gap-2.5 rounded-full border border-cream/60 bg-transparent px-8 text-sm font-bold tracking-wide text-cream transition-all duration-300 hover:border-cream hover:bg-cream hover:text-night"
            >
              Book a consultation
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </BookingTrigger>
          </div>
        </div>

        {/* Divider */}
        <div aria-hidden="true" className="border-t border-[#DCCDB4]/[0.16]" />

        {/* ── SECTION C — compact legal bar ─────────────────────────── */}
        <div className="flex flex-col items-center gap-5 py-7 text-[13px] text-cream/50 sm:flex-row sm:justify-between">
          <p>© 2026 True Self Me. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="transition-colors duration-300 hover:text-terracotta-tint"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors duration-300 hover:text-terracotta-tint"
            >
              Terms
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="True Self Me on Instagram"
              className="text-cream/60 transition-colors duration-300 hover:text-terracotta-tint"
            >
              <AtSign className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
