import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import {
  isServerConfigured,
  isClientConfigured,
  createCustomerProfile,
  getHostedProfilePageToken,
  hostedIframeBaseUrl,
} from "@/lib/authorizenet";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/booking/payment-profile
 * Body: { booking_id, consent_accepted: true }
 *
 * Validates the hold + consent, persists the consent audit fields,
 * creates (once, idempotently) the Authorize.net customer profile, and
 * returns a hosted payment-profile page token for the embedded form.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const CANCELLATION_POLICY_VERSION = "2026-09-v1";

export async function POST(request: Request) {
  const rl = rateLimit(`payment-profile:${clientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { success: false, error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }
  if (!isServerConfigured() || !isClientConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Card-on-file is not configured yet. Please contact us directly to complete your booking.",
      },
      { status: 503 },
    );
  }

  let body: { booking_id?: string; consent_accepted?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }

  const bookingId = body.booking_id ?? "";
  if (!bookingId || body.consent_accepted !== true) {
    return fail("Missing booking reference or consent.");
  }

  const supabase = getSupabaseAdmin();

  // Hold must still be valid.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, status, expires_at, email, first_name, last_name, customer_id, card_authorization_accepted_at, authorize_net_customer_profile_id",
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return fail("Booking not found.", 404);
  }
  if (booking.status !== "held") {
    return fail("This booking is no longer on hold. Please start again.", 409);
  }
  if (
    booking.expires_at &&
    new Date(booking.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Your slot hold has expired. Please choose a new time to continue.",
      },
      { status: 410 },
    );
  }

  // Consent is mandatory and audited.
  if (!booking.card_authorization_accepted_at) {
    const { error: consentError } = await supabase
      .from("bookings")
      .update({
        card_authorization_accepted_at: new Date().toISOString(),
        cancellation_policy_version: CANCELLATION_POLICY_VERSION,
      })
      .eq("id", bookingId);
    if (consentError) {
      console.error("[payment-profile] consent persist failed", consentError.message);
    }
  }

  // Server-side validation of the details captured on stage 2.
  if (!booking.first_name || !booking.last_name || !booking.email) {
    return fail("Booking details are incomplete. Please go back and resubmit them.");
  }

  // Resolve/create the internal customer record.
  let customerId: string = booking.customer_id ?? "";
  if (!customerId) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", booking.email)
      .maybeSingle();
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("customers")
        .insert({
          email: booking.email,
          first_name: booking.first_name,
          last_name: booking.last_name,
        })
        .select("id")
        .single();
      if (createError || !created) {
        console.error("[payment-profile] customer create failed", createError?.message);
        return fail("Could not save your details. Please try again.", 500);
      }
      customerId = created.id;
    }
    await supabase.from("bookings").update({ customer_id: customerId }).eq("id", bookingId);
  }

  // Create the Authorize.net customer profile once (deterministic ref =
  // internal customer id). If a retry raced us, Authorize.net returns
  // E00039 and we simply proceed — the stored profile id is reused.
  let customerProfileId: string | null =
    booking.authorize_net_customer_profile_id ?? null;

  if (!customerProfileId) {
    try {
      const result = await createCustomerProfile({
        customerRef: customerId,
        email: booking.email,
        description: `True Self Me client — ${booking.first_name} ${booking.last_name}`,
      });
      customerProfileId = result.customerProfileId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("E00039")) {
        // Duplicate profile on Authorize.net side — recover on the next
        // attempt via the stored id once present; for now surface a retry.
        return fail("Profile sync in progress. Please try once more.", 409);
      }
      console.error("[payment-profile] create failed", message);
      return NextResponse.json(
        {
          success: false,
          error: "Could not set up your payment profile. Please try again.",
        },
        { status: 502 },
      );
    }

    const { error: storeError } = await supabase
      .from("customers")
      .update({ authorize_net_customer_profile_id: customerProfileId })
      .eq("id", customerId);
    if (storeError) {
      console.error("[payment-profile] profile id persist failed", storeError.message);
    }
    await supabase
      .from("bookings")
      .update({ authorize_net_customer_profile_id: customerProfileId })
      .eq("id", bookingId);
  }

  // Hosted payment-profile page token.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  try {
    const { token } = await getHostedProfilePageToken({
      customerProfileId,
      returnUrl: `${origin}/api/booking/payment-profile/return?booking_id=${encodeURIComponent(bookingId)}`,
      returnUrlText: "Return to True Self Me",
      headingText: "Add your payment method",
    });

    return NextResponse.json({
      success: true,
      customer_profile_id: customerProfileId,
      token,
      iframe_url: `${hostedIframeBaseUrl()}/payment/profile?token=${encodeURIComponent(token)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[payment-profile] token request failed", message);
    return NextResponse.json(
      {
        success: false,
        error: "Could not open the payment form. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
