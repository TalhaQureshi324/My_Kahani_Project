"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send } from "lucide-react";
import { events } from "@/lib/content";

const rsvpSchema = z.object({
  name: z.string().min(2, "Please share your name."),
  email: z.string().email("Please enter a valid email address."),
  event: z.string().min(1, "Choose the gathering you want to join."),
  attendees: z.string().min(1, "How many are coming?"),
  note: z.string().max(300, "Please keep it under 300 characters.").optional(),
});

type RsvpValues = z.infer<typeof rsvpSchema>;

const fieldClass =
  "w-full rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-terracotta focus:outline-none";

const errorClass = "mt-1.5 text-xs font-medium text-terracotta-deep";

export default function RsvpForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RsvpValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { name: "", email: "", event: "", attendees: "1", note: "" },
  });

  const onSubmit = async (_values: RsvpValues) => {
    // Wire this to an API route or your events mailing list relay.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitted(true);
    reset();
  };

  return (
    <div className="rounded-[2rem] border border-ink/10 bg-cream-dark/50 p-7 sm:p-10">
      {submitted ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-12 w-12 text-olive" aria-hidden="true" />
          <h3 className="mt-5 font-display text-3xl font-semibold">
            You are on the list
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Watch your inbox for a confirmation with the meeting spot and what
            to bring. See you there.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-7 rounded-full border-2 border-ink/20 px-6 py-3 text-sm font-bold transition-colors hover:border-terracotta hover:text-terracotta"
          >
            RSVP for another gathering
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="rsvp-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                Name *
              </label>
              <input id="rsvp-name" type="text" autoComplete="name" className={fieldClass} placeholder="Your name" {...register("name")} />
              {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
            </div>
            <div>
              <label htmlFor="rsvp-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                Email *
              </label>
              <input id="rsvp-email" type="email" autoComplete="email" className={fieldClass} placeholder="you@example.com" {...register("email")} />
              {errors.email ? <p className={errorClass}>{errors.email.message}</p> : null}
            </div>
            <div>
              <label htmlFor="rsvp-event" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                Gathering *
              </label>
              <select id="rsvp-event" className={fieldClass} {...register("event")}>
                <option value="">Select a gathering…</option>
                {events.list.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name}
                  </option>
                ))}
              </select>
              {errors.event ? <p className={errorClass}>{errors.event.message}</p> : null}
            </div>
            <div>
              <label htmlFor="rsvp-attendees" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                Attendees *
              </label>
              <select id="rsvp-attendees" className={fieldClass} {...register("attendees")}>
                <option value="1">Just me</option>
                <option value="2">Me + 1</option>
                <option value="3">Me + 2</option>
                <option value="4+">Me + 3 or more</option>
              </select>
              {errors.attendees ? <p className={errorClass}>{errors.attendees.message}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="rsvp-note" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                Anything we should know? <span className="font-medium normal-case">(optional)</span>
              </label>
              <textarea
                id="rsvp-note"
                rows={3}
                className={`${fieldClass} resize-y`}
                placeholder="Bringing a toddler? First time? Nervous? All good — tell us."
                {...register("note")}
              />
              {errors.note ? <p className={errorClass}>{errors.note.message}</p> : null}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-4 text-sm font-bold tracking-wide text-cream shadow-[0_6px_20px_-8px_rgba(152,67,31,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-deep disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? "Sending…" : "Count me in"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}
