import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service — True Self Me",
  description:
    "The terms governing your use of True Self Me coaching services, including booking, cancellation, payment, and liability.",
  alternates: { canonical: `${site.url}/terms` },
  robots: { index: true, follow: true },
};

const lastUpdated = "September 30, 2026";

export default function TermsPage() {
  return (
    <main id="top" className="bg-[#F5EFE6]">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
          Legal
        </p>
        <h1 className="mt-4 font-display text-4xl text-[#5D1F13] sm:text-5xl">
          Terms of Service
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
              1. Agreement to Terms
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              These Terms of Service (&quot;Terms&quot;) govern your use of
              {" "}
              <Link
                href="/"
                className="font-semibold text-[#A8532B] underline underline-offset-4"
              >
                trueselfme.com
              </Link>{" "}
              and the coaching services offered by True Self Me
              (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
              accessing our website, booking a session, or using any of our
              services, you agree to be bound by these Terms. If you do not
              agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              2. Nature of Services
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <p>
                True Self Me provides <strong>non-clinical coaching</strong>{" "}
                and personal development services. Our services include:
              </p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Individual coaching sessions (50 minutes, virtual)</li>
                <li>Career and professional coaching</li>
                <li>Relationship and communication coaching</li>
                <li>Fatherhood / parenting coaching</li>
              </ul>
              <div className="rounded-lg border border-[#A8532B]/25 bg-[#A8532B]/[0.06] px-4 py-3 text-[#5D1F13]">
                <p className="font-semibold">What we are NOT:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>We are not licensed psychotherapists or mental-health counselors</li>
                  <li>We do not provide clinical diagnosis or medical treatment</li>
                  <li>Our services are not a substitute for professional mental-health care</li>
                  <li>We do not provide emergency or crisis services</li>
                </ul>
              </div>
              <p>
                If you are experiencing a mental-health crisis, contact the
                988 Suicide &amp; Crisis Lifeline (call or text 988) or
                emergency services (911) immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              3. Booking and Scheduling
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <p>
                <strong>Slot holds:</strong> When you select a time, we place
                a temporary 10-minute hold on that slot while you complete
                the booking form. If you do not complete the process within
                the hold window, the slot is released.
              </p>
              <p>
                <strong>Confirmation:</strong> A booking is confirmed only
                after your card has been successfully verified and stored on
                file. You will receive a confirmation email with a calendar
                invitation at that point.
              </p>
              <p>
                <strong>Rescheduling:</strong> You may reschedule your
                session using the secure link in your confirmation email.
                Rescheduling is free when done more than 24 hours before the
                scheduled start time.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              4. Cancellation Policy
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <div className="rounded-lg border border-green-700/20 bg-green-50 px-4 py-3">
                <p className="font-semibold text-green-800">
                  Free cancellation: more than 24 hours before your session
                </p>
                <p className="mt-1 text-green-700">
                  No charge. Your card on file is not billed.
                </p>
              </div>
              <div className="rounded-lg border border-[#A8532B]/25 bg-[#A8532B]/[0.06] px-4 py-3">
                <p className="font-semibold text-[#5D1F13]">
                  Late cancellation: less than 24 hours before your session
                </p>
                <p className="mt-1 text-[#5D1F13]/80">
                  A late-cancellation fee may apply, charged to the card on
                  file, in line with our practice policy communicated at the
                  time of booking.
                </p>
              </div>
              <div className="rounded-lg border border-red-700/20 bg-red-50 px-4 py-3">
                <p className="font-semibold text-red-800">
                  No-show: failure to attend without notice
                </p>
                <p className="mt-1 text-red-700">
                  The full session fee will be charged to the card on file.
                </p>
              </div>
              <p>
                You may cancel at any time using the secure link in your
                confirmation email. Cancellations by us (illness, emergency,
                etc.) are always fully refunded or rescheduled at no cost.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              5. Payment Terms
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <p>
                <strong>Card on file:</strong> At booking, we verify and
                store your payment method securely through Stripe. A
                temporary authorization hold (released immediately) confirms
                your card is active.
              </p>
              <p>
                <strong>Session billing:</strong> The session fee is charged
                to your card on file <em>after</em> the session is completed,
                not at the time of booking.
              </p>
              <p>
                <strong>Pricing:</strong> Current pricing is displayed on
                our website and confirmed at booking. Bookings snapshot the
                price at the time of booking — future price changes do not
                affect confirmed bookings.
              </p>
              <p>
                <strong>Payment failure:</strong> If a post-session charge
                fails, we will notify you by email with a secure link to
                update your payment method or complete authentication.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              6. Client Responsibilities
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              As a client, you agree to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-[#1A1A1A]/70">
              <li>Provide accurate booking information (name, email, phone)</li>
              <li>Attend sessions on time and participate in good faith</li>
              <li>Not record sessions without prior written consent</li>
              <li>Not share calendar invitations or booking links with others</li>
              <li>
                Understand that coaching is a collaborative process — results
                depend on your own effort and engagement
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              7. Intellectual Property
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              All content on this website — including text, graphics, logos,
              images, and design — is the property of True Self Me and is
              protected by copyright law. You may not reproduce,
              distribute, or create derivative works from our content
              without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              8. Limitation of Liability
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#1A1A1A]/75">
              <p>
                To the maximum extent permitted by law, True Self Me and its
                practitioners shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages
                arising from your use of our services.
              </p>
              <p>
                Our total liability for any claim arising from our services
                shall not exceed the amount you paid for the session giving
                rise to the claim.
              </p>
              <p>
                <strong>
                  You acknowledge that coaching outcomes are not guaranteed
                </strong>{" "}
                and depend on factors including your own effort,
                circumstances, and engagement with the process.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              9. Disclaimer of Warranties
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Our services are provided &quot;as is&quot; without
              warranties of any kind, express or implied. We do not warrant
              that our services will meet your specific expectations or that
              our website will be uninterrupted or error-free.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              10. Marketing Communications
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              If you sign up to stay in touch, you agree to receive
              occasional coaching-related emails. You can unsubscribe at any
              time using the link in any email. Unsubscribing from marketing
              emails does <strong>not</strong> stop transactional emails
              (booking confirmations, payment notices, session reminders)
              for active bookings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              11. Governing Law
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              These Terms are governed by the laws of the State of Texas,
              United States of America, without regard to conflict-of-law
              principles. Any disputes shall be resolved in the courts of
              Travis County, Texas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              12. Changes to These Terms
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              We may update these Terms from time to time. The
              &quot;Last updated&quot; date at the top of this page reflects
              the current version. Continued use of our services after
              changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[#5D1F13]">
              13. Contact
            </h2>
            <p className="mt-3 leading-relaxed text-[#1A1A1A]/75">
              Questions about these Terms? Reach us:
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
            </div>
          </section>
        </div>

        {/* Cross-link */}
        <p className="mt-8 text-center text-sm text-[#1A1A1A]/55">
          See also our{" "}
          <Link
            href="/privacy"
            className="font-semibold text-[#A8532B] underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </p>
      </section>
    </main>
  );
}
