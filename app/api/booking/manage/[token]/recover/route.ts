import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { hashManageToken } from "@/lib/bookingTokens";

/**
 * POST /api/booking/manage/[token]/recover
 *
 * Returns the PaymentIntent client secret for an off-session charge that
 * ended in requires_customer_action, so the customer can complete
 * authentication on-session from the manage page. Gated by the manage
 * token (capability).
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { success: false, error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }

  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return NextResponse.json(
      { success: false, error: "Invalid manage link." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const tokenHash = hashManageToken(token);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, status, payment_status, stripe_payment_intent_id, stripe_client_secret",
    )
    .eq("manage_token_hash", tokenHash)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { success: false, error: "Booking not found." },
      { status: 404 },
    );
  }
  if (
    booking.payment_status !== "requires_customer_action" ||
    !booking.stripe_client_secret
  ) {
    return NextResponse.json(
      { success: false, error: "No customer action is required." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    client_secret: booking.stripe_client_secret,
    payment_intent_id: booking.stripe_payment_intent_id,
  });
}
