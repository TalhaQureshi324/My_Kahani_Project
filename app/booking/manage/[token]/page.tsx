import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { hashManageToken } from "@/lib/bookingTokens";
import ManageBookingClient from "@/components/booking/ManageBookingClient";

export const dynamic = "force-dynamic";

/**
 * /booking/manage/[token]
 *
 * Self-service booking management, addressed by a high-entropy
 * capability token. Only the SHA-256 hash is stored, so the token in
 * the URL is the sole key to the booking. Shows safe fields only —
 * never payment provider ids, database ids or attribution data.
 */
export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return (
      <main className="min-h-screen bg-[#F5EFE6] px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-[#5D1F13]">Invalid link</h1>
        <p className="mt-4 text-sm text-[#1A1A1A]/70">
          This manage link doesn&apos;t look right. Please use the link from
          your confirmation email.
        </p>
      </main>
    );
  }

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
  const tokenHash = hashManageToken(token);

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "booking_reference, status, slot_start, slot_end, first_name, last_name, client_timezone, card_brand, card_last4",
    )
    .eq("manage_token_hash", tokenHash)
    .single();

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#F5EFE6] px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-[#5D1F13]">
          Booking not found
        </h1>
        <p className="mt-4 text-sm text-[#1A1A1A]/70">
          Check the manage link from your confirmation email.
        </p>
      </main>
    );
  }

  return (
    <ManageBookingClient
      token={token}
      booking={{
        reference: booking.booking_reference,
        status: booking.status,
        slotStartISO: booking.slot_start,
        slotEndISO: booking.slot_end,
        firstName: booking.first_name ?? "",
        lastName: booking.last_name ?? "",
        clientTimezone: booking.client_timezone ?? "America/Chicago",
        cardBrand: booking.card_brand,
        cardLast4: booking.card_last4,
      }}
    />
  );
}
