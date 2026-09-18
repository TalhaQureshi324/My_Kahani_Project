import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { ArrowDownToLine, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import BookingConfirmation from "@/components/booking/BookingConfirmation";

export const dynamic = "force-dynamic";

/**
 * /booking/confirmed/[bookingReference]
 *
 * Shareable confirmation view addressed by the public booking
 * reference. Shows only safe fields: reference, status, slot times,
 * masked card, practitioner. Never exposes payment provider profile ids,
 * database ids, attribution or email addresses.
 */
export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ bookingReference: string }>;
}) {
  const { bookingReference } = await params;
  const reference = decodeURIComponent(bookingReference).toUpperCase();

  if (!isDatabaseConfigured) {
    return (
      <main className="min-h-screen bg-[#F5EFE6] px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-[#5D1F13]">
          Scheduling is not connected yet.
        </h1>
      </main>
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "booking_reference, status, slot_start, slot_end, first_name, card_brand, card_last4, client_timezone",
    )
    .eq("booking_reference", reference)
    .single();

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#F5EFE6] px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-[#5D1F13]">
          Booking not found
        </h1>
        <p className="mt-4 text-sm text-[#1A1A1A]/70">
          Check the link in your confirmation email.
        </p>
      </main>
    );
  }

  const cardLabel =
    booking.card_last4 && booking.status !== "cancelled"
      ? `Card on file — ${booking.card_brand ?? "card"} ending ${booking.card_last4}`
      : null;

  return (
    <main className="min-h-screen bg-[#F5EFE6] px-4 py-24">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#5D1F13]">
          <CheckCircle2 className="h-9 w-9 text-[#F5EFE6]" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-4xl text-[#5D1F13]">
          {booking.status === "cancelled"
            ? "This booking was cancelled"
            : "Your Consultation is Reserved"}
        </h1>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-[#A8532B]">
          Reference {booking.booking_reference}
        </p>

        <div className="mt-8 space-y-2.5 rounded-xl border border-black/[0.08] bg-[#F3EDE5] px-5 py-4 text-left text-sm">
          <p className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
              <CalendarDays className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
              Date
            </span>
            <span className="font-semibold text-[#1A1A1A]">
              {new Intl.DateTimeFormat("en-US", {
                timeZone: booking.client_timezone ?? "America/Chicago",
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(booking.slot_start))}
            </span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[#1A1A1A]/60">
              <Clock className="h-4 w-4 text-[#A8532B]" aria-hidden="true" />
              Time
            </span>
            <span className="font-semibold text-[#1A1A1A]">
              {new Intl.DateTimeFormat("en-US", {
                timeZone: booking.client_timezone ?? "America/Chicago",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }).format(new Date(booking.slot_start))}{" "}
              ({booking.client_timezone ?? "America/Chicago"})
            </span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-[#1A1A1A]/60">Duration</span>
            <span className="font-semibold text-[#1A1A1A]">50 minutes</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-[#1A1A1A]/60">Format</span>
            <span className="font-semibold text-[#1A1A1A]">
              Virtual video consultation
            </span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-[#1A1A1A]/60">Practitioner</span>
            <span className="font-semibold text-[#1A1A1A]">
              Fahd Alam — Coach &amp; Mentor
            </span>
          </p>
          {cardLabel && (
            <p className="flex items-center justify-between gap-4">
              <span className="text-[#1A1A1A]/60">Payment method</span>
              <span className="font-semibold text-[#1A1A1A]">{cardLabel}</span>
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href={`/api/bookings/${encodeURIComponent(booking.booking_reference)}/calendar`}
            className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] shadow-[0_6px_20px_-8px_rgba(93,31,19,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4A1811]"
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
            Add to Calendar (.ics)
          </a>
          <p className="max-w-md text-xs leading-relaxed text-[#1A1A1A]/55">
            A card has been placed on file. No charges will be processed until
            after your consultation. Use the link from your confirmation email
            to manage or cancel this booking.
          </p>
        </div>
      </div>
    </main>
  );
}
