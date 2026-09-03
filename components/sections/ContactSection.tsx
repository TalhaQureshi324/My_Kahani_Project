import { contact } from "@/lib/content";

/**
 * Section 17 — Contact Me: deep rust full-width canvas with an
 * asymmetric 12-col split. Left (5 cols, sticky on desktop): the
 * "CONTACT ME" display heading and the consultation paragraph.
 * Right (7 cols): the consultation form — cream (#F3EDE5) borderless
 * inputs with white focus rings, first/last name pair, phone, email,
 * message textarea, service checkbox stack, a styled native select
 * with chevron for the referral source, and the gold bordered pill
 * "Submit" CTA. Stacks to one column on mobile/tablet.
 */

const labelClass = "block text-sm font-medium text-[#F3EDE5]";
const inputClass =
  "h-12 w-full rounded-none border-none bg-[#F3EDE5] px-4 text-black focus:outline-none focus:ring-1 focus:ring-white";

function Required() {
  return <span className="italic"> (required)</span>;
}

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="w-full scroll-mt-24 bg-[#5D1F13] px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left column — heading & copy (sticky on desktop) */}
        <div className="lg:sticky lg:top-24 lg:col-span-5">
          <h2 className="font-display text-5xl font-normal uppercase tracking-wide text-[#F3EDE5] md:text-7xl">
            {contact.heading}
          </h2>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-[#F3EDE5]">
            {contact.paragraph}
          </p>
        </div>

        {/* Right column — consultation form */}
        <div className="lg:col-span-7">
          <form action="#" method="post" className="space-y-6">
            {/* A. Name — first/last pair */}
            <div>
              <span className={`${labelClass} mb-3 block`}>
                {contact.nameLabel}
              </span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={`${labelClass} mb-2`}>
                    {contact.firstNameLabel}
                    <Required />
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className={`${labelClass} mb-2`}>
                    {contact.lastNameLabel}
                    <Required />
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* B. Phone */}
            <div>
              <label htmlFor="phone" className={`${labelClass} mb-2`}>
                {contact.phoneLabel}
                <Required />
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className={inputClass}
              />
            </div>

            {/* C. Email */}
            <div>
              <label htmlFor="email" className={`${labelClass} mb-2`}>
                {contact.emailLabel}
                <Required />
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            {/* D. Message */}
            <div>
              <label htmlFor="message" className={`${labelClass} mb-2`}>
                {contact.messageLabel}
                <Required />
              </label>
              <textarea
                id="message"
                name="message"
                required
                className={`${inputClass} h-32 resize-y py-3`}
              />
            </div>

            {/* E. Service checkboxes */}
            <div>
              <span className={labelClass}>
                {contact.servicesLabel}
                <Required />
              </span>
              <div className="mt-3 space-y-3">
                {contact.serviceOptions.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 text-[#F3EDE5]"
                  >
                    <input
                      type="checkbox"
                      name="services"
                      value={option}
                      className="h-5 w-5 shrink-0 accent-[#F3EDE5]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* F. Referral source dropdown */}
            <div>
              <label htmlFor="referral" className={`${labelClass} mb-2`}>
                {contact.referralLabel}
                <Required />
              </label>
              <div className="relative">
                <select
                  id="referral"
                  name="referral"
                  required
                  defaultValue=""
                  className={`${inputClass} appearance-none pr-10 text-stone-700`}
                >
                  <option value="">{contact.referralPlaceholder}</option>
                  {contact.referralOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600"
                >
                  <path d="M5 7.5 10 12.5 15 7.5" />
                </svg>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="mt-8 inline-block rounded-full border-2 border-white bg-[#9E8120] px-10 py-3 text-lg font-bold text-white transition-colors hover:bg-[#8B7119]"
            >
              {contact.submitLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
