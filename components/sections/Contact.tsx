"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Mail, Phone, Send } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";
import { contact } from "@/lib/content";
import { site } from "@/lib/site";

const inquirySchema = z.object({
  name: z.string().min(2, "Please share the name you go by."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  service: z.string().min(1, "Choose the service you are curious about."),
  referral: z.string().min(1, "Let us know how you found the practice."),
  message: z
    .string()
    .min(10, "Tell us a little more — ten characters or more.")
    .max(1000, "Please keep it under 1000 characters."),
});

type InquiryValues = z.infer<typeof inquirySchema>;

const fieldClass =
  "w-full rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-terracotta focus:outline-none";

const errorClass = "mt-1.5 text-xs font-medium text-terracotta-deep";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      referral: "",
      message: "",
    },
  });

  const onSubmit = async (_values: InquiryValues) => {
    // Wire this to an API route, Formspree, or your practice email relay.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitted(true);
    reset();
  };

  return (
    <section id="contact" className="scroll-mt-24 border-t border-ink/10">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
        {/* Info column */}
        <div>
          <SectionHeading
            eyebrow={contact.eyebrow}
            title={contact.title}
            lede={contact.lede}
          />
          <ul className="mt-8 space-y-4 text-sm">
            <li>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-3 font-bold transition-colors hover:text-terracotta"
              >
                <Mail className="h-4 w-4 text-terracotta" aria-hidden="true" />
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.phoneHref}
                className="inline-flex items-center gap-3 font-bold transition-colors hover:text-terracotta"
              >
                <Phone className="h-4 w-4 text-terracotta" aria-hidden="true" />
                {site.phone}
              </a>
            </li>
          </ul>
          <p className="mt-8 rounded-2xl border border-ink/10 bg-cream-dark/70 p-5 text-xs leading-relaxed text-ink-soft">
            {contact.crisis}
          </p>
        </div>

        {/* Form column */}
        <div className="rounded-[2rem] border border-ink/10 bg-cream-dark/50 p-7 sm:p-10">
          {submitted ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-14 w-14 text-olive" aria-hidden="true" />
              <h3 className="mt-6 font-display text-3xl font-semibold">
                {contact.successTitle}
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
                {contact.successBody}
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-8 rounded-full border-2 border-ink/20 px-6 py-3 text-sm font-bold transition-colors hover:border-terracotta hover:text-terracotta"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Name *
                  </label>
                  <input id="name" type="text" autoComplete="name" className={fieldClass} placeholder="Your name" {...register("name")} />
                  {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
                </div>
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Email *
                  </label>
                  <input id="email" type="email" autoComplete="email" className={fieldClass} placeholder="you@example.com" {...register("email")} />
                  {errors.email ? <p className={errorClass}>{errors.email.message}</p> : null}
                </div>
                <div>
                  <label htmlFor="phone" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Phone <span className="font-medium normal-case">(optional)</span>
                  </label>
                  <input id="phone" type="tel" autoComplete="tel" className={fieldClass} placeholder="(512) 555-0143" {...register("phone")} />
                </div>
                <div>
                  <label htmlFor="service" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Service *
                  </label>
                  <select id="service" className={fieldClass} {...register("service")}>
                    <option value="">Select a service…</option>
                    {contact.serviceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.service ? <p className={errorClass}>{errors.service.message}</p> : null}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="referral" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    How did you hear about us? *
                  </label>
                  <select id="referral" className={fieldClass} {...register("referral")}>
                    <option value="">Choose one…</option>
                    {contact.referralOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.referral ? <p className={errorClass}>{errors.referral.message}</p> : null}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="message" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className={`${fieldClass} resize-y`}
                    placeholder="What brings you here? Share as much or as little as you like."
                    {...register("message")}
                  />
                  {errors.message ? <p className={errorClass}>{errors.message.message}</p> : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-4 text-sm font-bold tracking-wide text-cream shadow-[0_6px_20px_-8px_rgba(152,67,31,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-deep disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? "Sending…" : "Send message"}
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-4 text-xs leading-relaxed text-ink-soft/80">
                This form is for scheduling and general questions. Please do not
                include medical details you would rather save for the session.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
