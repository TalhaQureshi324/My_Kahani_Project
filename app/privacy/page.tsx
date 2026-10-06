import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — True Self Me",
  description:
    "How True Self Me collects, uses, and protects your information when you use our coaching services and website.",
  alternates: { canonical: `${site.url}/privacy` },
  robots: { index: true, follow: true },
};

const lastUpdated = "September 30, 2026";

export default function PrivacyPage() {
  return (
    <main id="top" className="bg-[#F5EFE6]">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
          Legal
        </p>
        <h1 className="mt-4 font-display text-4xl text-[#5D1F13] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-[#1A1A1A]/55">
          Last updated: {lastUpdated}
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="space-y-10 rounded-2xl border border-black/[0.08] bg-white p-8 sm:p-12">
          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              1. Overview
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              True Self Me (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates
              {" "}
              <Link
                href="/"
                className="font-semibold text-[#A8532B] underline underline-offset-4"
              >
                trueselfme.com
              </Link>
              , providing non-clinical coaching and personal development
              services. This Privacy Policy explains what information we
              collect, how we use it, and the choices you have. By using our
              website or booking a session, you agree to the practices
              described here.
            </p>
            <p className="mt-3 rounded-lg border border-[#A8532B]/25 bg-[#A8532B]/[0.06] px-4 py-3 text-sm leading-relaxed text-[#5D1F13]">
              <strong>Important:</strong> Our services are non-clinical
              coaching — not psychotherapy, diagnosis, or medical treatment.
              We do not collect or store clinical or health information
              through this website.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              2. Information We Collect
            </h2>
            <div className="mt-4 space-y-4 text-[1A1A1A]/75">
              <div>
                <h3 className="font-semibold text-[#1A1A1A]">
                  Information you provide directly
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
                  <li>
                    <strong>Booking details:</strong> first name, last name,
                    email address, and phone number (optional) when you book
                    a session
                  </li>
                  <li>
                    <strong>Lead capture:</strong> first name and email
                    address (and optional phone) when you sign up to stay in
                    touch
                  </li>
                  <li>
                    <strong>Payment card:</strong> processed entirely by
                    Stripe — we never see or store your full card number,
                    CVC, or expiry. We only retain the card brand and last
                    four digits for reference.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A]">
                  Information collected automatically
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
                  <li>
                    <strong>Marketing attribution:</strong> if you arrive
                    from an advertisement, we store the click identifier
                    (gclid, gbraid, or wbraid) and campaign parameters (UTM
                    tags) in first-party cookies on your browser to attribute
                    your booking correctly
                  </li>
                  <li>
                    <strong>Usage analytics:</strong> anonymous page views,
                    scroll depth, and section engagement when Google
                    Analytics is enabled
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              3. How We Use Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
              <li>To confirm and manage your booking (confirmation and reminder emails, calendar invitations)</li>
              <li>To send transactional payment notifications (receipts, payment failure alerts, refund confirmations)</li>
              <li>To send occasional coaching emails if you opted in (you can unsubscribe at any time)</li>
              <li>To measure which marketing channels produce bookings so we can improve our outreach</li>
              <li>To comply with legal obligations and resolve disputes</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              4. Cookies
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              We use a small number of first-party cookies on this site:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
              <li>
                <strong>tsm_attribution</strong> — remembers which ad or
                campaign brought you here (30-day expiry, first-party only)
              </li>
              <li>
                <strong>tsm_attribution_last</strong> — remembers the most
                recent campaign landing (30-day expiry, first-party only)
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-[#1A1A1A]/70">
              These cookies do not track you across other websites. You can
              clear them at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              5. Third-Party Services
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              We rely on the following providers, each governed by their own
              privacy policies:
            </p>
            <div className="mt-3 space-y-3">
              {[
                {
                  name: "Stripe",
                  what: "Payment processing, card storage, and billing",
                  link: "https://stripe.com/privacy",
                },
                {
                  name: "Supabase",
                  what: "Database hosting for booking and lead records",
                  link: "https://supabase.com/privacy",
                },
                {
                  name: "Resend",
                  what: "Email delivery for booking confirmations and reminders",
                  link: "https://resend.com/privacy",
                },
                {
                  name: "Google Analytics",
                  what: "Anonymous usage analytics (when enabled)",
                  link: "https://policies.google.com/privacy",
                },
                {
                  name: "Microsoft Clarity",
                  what: "Anonymous session recordings and heatmaps",
                  link: "https://privacy.microsoft.com/privacystatement",
                },
                {
                  name: "Google Ads",
                  what: "Advertising conversion attribution",
                  link: "https://policies.google.com/privacy",
                },
              ].map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col gap-1 rounded-lg border border-black/[0.06] bg-[#F3EDE5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-semibold text-[#5D1F13]">
                      {s.name}
                    </span>
                    <span className="ml-2 text-sm text-[#1A1A1A]/65">
                      {s.what}
                    </span>
                  </div>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#A8532B] underline underline-offset-4"
                  >
                    Privacy Policy →
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              6. What We Never Do
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
              <li>We never sell or rent your personal information to third parties</li>
              <li>We never share your email address with advertisers or data brokers</li>
              <li>We never store your full card number, CVC, or bank details on our servers</li>
              <li>We never collect clinical, medical, or health-diagnosis data through this website</li>
              <li>We never send marketing emails to someone who has not opted in or has unsubscribed</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              7. Data Retention
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Booking records (including your name, email, session date, and
              price) are retained for as long as needed to provide the
              service and meet tax/accounting obligations. Lead records are
              retained until you unsubscribe or request deletion. Attribution
              cookies expire automatically after 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              8. Your Rights
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your personal data (&quot;right to be forgotten&quot;)</li>
              <li>Withdraw consent for marketing communications at any time</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-[#1A1A1A]/70">
              To exercise any of these rights, email us at{" "}
              <a
                href={`mailto:${site.email}`}
                className="font-semibold text-[#A8532B] underline underline-offset-4"
              >
                {site.email}
              </a>
              . We respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              9. Security
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              We protect your information using industry-standard measures:
              all traffic is encrypted via HTTPS, card data is tokenized by
              Stripe (we never touch raw card numbers), database access is
              restricted to server-side service-role credentials, and
              webhook payloads are cryptographically verified. No system is
              perfectly secure, but we take reasonable steps to safeguard
              what you share with us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              10. Children&apos;s Privacy
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Our services are directed at adults. We do not knowingly
              collect personal information from anyone under 18. If you
              believe a child has provided us information, contact us and
              we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              11. Changes to This Policy
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              We may update this Privacy Policy from time to time. The
              &quot;Last updated&quot; date at the top of this page reflects
              the current version. Material changes will be communicated via
              email to active clients.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              12. Contact
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Questions about this policy? Reach us:
            </p>
            <div className="mt-4 space-y-2 text-sm text-[#1A1A1A]/75">
              <p>
                <span className="font-semibold text-[#5D1F13]">Email: </span>
                <a
                  href={`mailto:${site.email}`}
                  className="text-[#A8532B] underline underline-offset-4"
                >
                  {site.email}
                </a>
              </p>
              <p>
                <span className="font-semibold text-[#5D1F13]">Phone: </span>
                <a
                  href={site.phoneHref}
                  className="text-[#A8532B] underline underline-offset-4"
                >
                  {site.phone}
                </a>
              </p>
              <p>
                <span className="font-semibold text-[#5D1F13]">
                  Location:{" "}
                </span>
                {site.city} — serving clients nationwide
              </p>
            </div>
          </section>
        </div>

        {/* Cross-link */}
        <p className="mt-8 text-center text-sm text-[#1A1A1A]/55">
          See also our{" "}
          <Link
            href="/terms"
            className="font-semibold text-[#A8532B] underline underline-offset-4"
          >
            Terms of Service
          </Link>
        </p>
      </section>
    </main>
  );
}
