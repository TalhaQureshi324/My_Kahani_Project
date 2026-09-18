import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { hashManageToken } from "@/lib/bookingTokens";
import { enqueueSessionPaid } from "@/lib/ads/conversionOutbox";

/**
 * POST /api/booking/manage/[token]/complete-payment
 * Body: { client_secret: string }
 *
 * On-session recovery for off-session charges that ended in
 * requires_customer_action: confirms the SAME PaymentIntent (never a
 * new one) using the stored PI id, then records the outcome.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const rl = rateLimit(`manage-pay:${clientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!isDatabaseConfigured || !getStripe) {
    return NextResponse.json(
      { success: false, error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }

  const { token } = await params;

  let body: { client_secret?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }
  const clientSecret = body.client_secret ?? "";
  const paymentIntentId = clientSecret.split("_secret_")[0] ?? "";
  if (!paymentIntentId || !clientSecret) {
    return fail("Missing payment reference.");
  }

  const supabase = getSupabaseAdmin();
  const tokenHash = hashManageToken(token);

  // Ownership proof: the booking must match the token hash AND carry this PI.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, payment_status, stripe_payment_intent_id")
    .eq("manage_token_hash", tokenHash)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { success: false, error: "Booking not found." },
      { status: 404 },
    );
  }
  if (booking.stripe_payment_intent_id !== paymentIntentId) {
    return NextResponse.json(
      { success: false, error: "Payment reference does not match this booking." },
      { status: 409 },
    );
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "succeeded") {
    await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    // Phase 7: queue the Google session_paid conversion with the ACTUAL
    // collected amount. Fire-and-forget — payment success must not
    // depend on Google.
    try {
      await enqueueSessionPaid(
        supabase,
        booking.id,
        intent.amount_received ?? intent.amount ?? null,
      );
    } catch (conversionError) {
      console.error(
        "[complete-payment] session_paid enqueue failed",
        conversionError instanceof Error
          ? conversionError.message
          : conversionError,
      );
    }
    return NextResponse.json({ success: true, status: "paid" });
  }
  if (intent.status === "requires_payment_method") {
    // The customer abandoned or the method failed on-session.
    await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
        payment_failure_code: intent.last_payment_error?.code ?? "abandoned",
        payment_failure_reason:
          intent.last_payment_error?.message ?? "Payment attempt abandoned.",
        last_payment_attempt_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    return NextResponse.json(
      { success: false, error: "The payment attempt failed. Please try again." },
      { status: 402 },
    );
  }

  // Any other status: report it without changing our state machine.
  return NextResponse.json(
    { success: false, error: `Payment is ${intent.status}.` },
    { status: 409 },
  );
}
