import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/authorizenet";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/webhooks/authorize-net
 *
 * Authorize.net signed webhooks (X-ANET-Signature, HMAC-SHA512 over the
 * raw body). Processing is idempotent: every event id is stored in
 * authorize_net_events with a unique constraint — retries are answered
 * with 200 but never run business logic twice. Business logic here is
 * deliberately light (payment-profile bookkeeping); heavier work should
 * go through the notification_jobs queue.
 */

type AnetEvent = {
  eventId?: string;
  eventType?: string;
  payload?: {
    id?: string;
    customerProfileId?: number | string;
    customerType?: string;
  };
};

const HANDLED_EVENTS = new Set([
  "net.authorize.customer.paymentProfile.created",
  "net.authorize.customer.paymentProfile.updated",
  "net.authorize.customer.paymentProfile.deleted",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-anet-signature");

  // Unsigned or invalid requests are rejected outright.
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid or missing webhook signature." },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured) {
    // Acknowledge but do nothing — nothing to persist against.
    return NextResponse.json({ received: true, processed: false });
  }

  let event: AnetEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = event.eventId ?? "";
  const eventType = event.eventType ?? "";
  if (!eventId || !eventType) {
    return NextResponse.json(
      { error: "Webhook payload missing eventId/eventType." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Idempotency gate: insert-first; a unique violation means we have
  // already processed this event and can safely acknowledge the retry.
  const { error: insertError } = await supabase
    .from("authorize_net_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload: event as unknown as Record<string, unknown>,
    });

  if (insertError) {
    // 23505 = unique_violation → duplicate delivery: acknowledge, no work.
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[webhook] event persist failed", insertError.message);
    return NextResponse.json({ error: "Could not store event." }, { status: 500 });
  }

  // Light bookkeeping for payment-profile lifecycle events. Heavier work
  // is never done inline.
  if (HANDLED_EVENTS.has(eventType)) {
    const profileId = event.payload?.customerProfileId
      ? String(event.payload.customerProfileId)
      : null;

    if (profileId) {
      if (eventType === "net.authorize.customer.paymentProfile.deleted") {
        await supabase
          .from("customers")
          .update({ authorize_net_payment_profile_id: null })
          .eq("authorize_net_customer_profile_id", profileId);
      }
      // created/updated: card metadata is pulled from the API during
      // booking verification; the webhook only refreshes our audit.
      await supabase
        .from("authorize_net_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
    }
  }

  // Acknowledge quickly; no heavy processing inline.
  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
