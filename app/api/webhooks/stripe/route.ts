import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";
import { getStripe, stripeWebhookSecret } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe signed webhooks (Stripe-Signature header, verified against the
 * RAW body with STRIPE_WEBHOOK_SECRET). Processing is idempotent: every
 * event id is stored in stripe_events with a unique constraint — retries
 * are acknowledged but never execute business logic twice.
 *
 * Handled events:
 *   setup_intent.succeeded / setup_intent.failed
 *   payment_intent.succeeded / payment_intent.payment_failed
 *   charge.refunded
 */

type StripeEventLike = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      status?: string;
      customer?: string;
      payment_method?: string;
      last_setup_error?: { message?: string };
      last_payment_error?: { code?: string; message?: string };
      amount_due?: number;
      metadata?: Record<string, string>;
    };
  };
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!stripeWebhookSecret || !signature) {
    return NextResponse.json(
      { error: "Webhook signature verification is not configured." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  let looseEvent: { type: string; data: { object: Record<string, unknown> } };
  try {
    // Verifies the signature over the RAW body; throws on mismatch.
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
    // Narrow to a loose shape: without generated Stripe types installed,
    // the full Stripe.Event union is not available to the handler switch.
    looseEvent = event as unknown as {
      type: string;
      data: { object: Record<string, unknown> };
    };
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotency gate: insert-first; unique violation = duplicate delivery.
  const { error: insertError } = await supabase.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] event persist failed", insertError.message);
    return NextResponse.json({ error: "Could not store event." }, { status: 500 });
  }

  // Booking linkage rides in event metadata (set at SetupIntent / PI creation).
  // Loose shape: the full Stripe.Event type is not installed client-
  // side, so we read only the fields this handler needs.
  const obj = (looseEvent.data.object ?? {}) as {
    id?: string;
    metadata?: Record<string, string>;
    payment_method?: string | { id?: string };
    last_setup_error?: { message?: string };
    last_payment_error?: { code?: string; message?: string };
  };
  const bookingId = obj.metadata?.booking_id;

  switch (looseEvent.type) {
    case "setup_intent.succeeded": {
      if (bookingId) {
        const pmId =
          typeof obj.payment_method === "string"
            ? obj.payment_method
            : undefined;
        await supabase
          .from("bookings")
          .update({
            stripe_setup_intent_id: obj.id,
            ...(pmId ? { stripe_payment_method_id: pmId } : {}),
          })
          .eq("id", bookingId)
          .eq("status", "held");
      }
      break;
    }
    case "setup_intent.setup_failed": {
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({
            payment_failure_code: "setup_intent_failed",
            payment_failure_reason:
              obj.last_setup_error?.message ?? "Card setup failed.",
          })
          .eq("id", bookingId)
          .eq("status", "held");
      }
      break;
    }
    case "payment_intent.succeeded": {
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: obj.id,
          })
          .eq("id", bookingId);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      if (bookingId) {
        const lastErr = obj.last_payment_error;
        await supabase
          .from("bookings")
          .update({
            payment_status: "failed",
            payment_failure_code: lastErr?.code ?? "card_declined",
            payment_failure_reason: lastErr?.message ?? "Payment failed.",
            last_payment_attempt_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      }
      break;
    }
    case "charge.refunded": {
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
      }
      break;
    }
    default:
      // Unhandled event types are acknowledged and archived.
      break;
  }

  await supabase
    .from("stripe_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id);

  return NextResponse.json({ received: true });
}
