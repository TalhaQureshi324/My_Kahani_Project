import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import {
  readAttributionFromCookieHeader,
  resolveAttribution,
} from "@/lib/attribution";
import {
  normalizeLeadEmail,
  normalizeLeadName,
  normalizeLeadPhone,
  generateUnsubscribeToken,
  nurtureSchedule,
  containsCrisisTerms,
} from "@/lib/leads";
import { enqueueLead } from "@/lib/ads/conversionOutbox";
import { sendEmail } from "@/lib/email/provider";
import { emergencyInfoEmail } from "@/lib/email/templates";

/**
 * POST /api/leads
 * Body: { first_name, email, phone?, sms_consent?, website? }
 *
 * Lead capture for visitors who are not ready to book. `website` is a
 * honeypot — bots that fill it are silently discarded. Attribution comes
 * from the same first/last-touch cookies the booking flow uses; absent
 * cookies are a perfectly valid organic lead.
 *
 * No clinical or health information is collected, ever.
 */

function ok(extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, ...extra });
}

export async function POST(request: Request) {
  const rl = rateLimit(`leads:${clientIp(request)}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { success: false, error: "Signups are not connected yet." },
      { status: 503 },
    );
  }

  let body: {
    first_name?: string;
    email?: string;
    phone?: string;
    sms_consent?: boolean;
    website?: string; // honeypot
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  // Honeypot: pretend success, store nothing.
  if ((body.website ?? "").trim() !== "") {
    return ok();
  }

  const supabase = getSupabaseAdmin();

  const firstName = normalizeLeadName(body.first_name);
  const email = normalizeLeadEmail(body.email);
  const phone = normalizeLeadPhone(body.phone);
  if (!firstName || !email) {
    return NextResponse.json(
      { success: false, error: "Please provide your first name and a valid email." },
      { status: 400 },
    );
  }

  // Crisis screening on the only free-text fields we accept. If a
  // configured emergency term appears: respond with the predefined
  // emergency-information message, flag for human review, and do NOT
  // enroll the address in nurture. Never automated advice.
  const freeText = `${firstName} ${body.phone ?? ""}`;
  if (containsCrisisTerms(freeText)) {
    console.error(
      `[crisis] emergency-term detected in lead capture from ${clientIp(request)} — human review required`,
    );
    try {
      const { firstTouch: ft, lastTouch: lt } =
        readAttributionFromCookieHeader(request.headers.get("cookie"));
      await supabase.from("leads").insert({
        first_name: firstName,
        email,
        phone,
        status: "invalid", // excluded from nurture
        attribution: resolveAttribution(ft, lt),
        unsubscribe_token: generateUnsubscribeToken(),
      });
    } catch {
      /* even if storage fails, the emergency response below still goes out */
    }
    await sendEmail(emergencyInfoEmail(firstName));
    return ok({ crisis: true });
  }

  const smsConsent = body.sms_consent === true && Boolean(phone);
  const { firstTouch, lastTouch } = readAttributionFromCookieHeader(
    request.headers.get("cookie"),
  );
  const attributionRecord = resolveAttribution(firstTouch, lastTouch);

  // Duplicate handling: the email is the dedup key. An existing lead is
  // never re-enrolled (no duplicate emails) and an unsubscribed lead is
  // never silently resurrected.
  const { data: existing } = await supabase
    .from("leads")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return ok({ duplicate: true });
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      first_name: firstName,
      email,
      phone,
      email_consent: true, // documented on the form itself
      sms_consent: smsConsent,
      status: "new",
      gclid: attributionRecord?.gclid ?? null,
      attribution: attributionRecord,
      unsubscribe_token: generateUnsubscribeToken(),
    })
    .select("id, unsubscribe_token")
    .single();

  if (insertError || !lead) {
    return NextResponse.json(
      { success: false, error: "Could not save your signup. Please try again." },
      { status: 500 },
    );
  }

  // Nurture schedule: immediately, ~2 days, ~5 days. Jobs are linked to
  // the lead; the worker re-checks the lead's status at send time, so a
  // booking or unsubscribe between now and then stops them anyway.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const jobs = nurtureSchedule().map((step) => ({
    lead_id: lead.id,
    type: step.type,
    payload: {
      lead_id: lead.id,
      to_email: email,
      first_name: firstName,
      book_url: `${siteUrl}/book`,
      unsubscribe_url: `${siteUrl}/api/leads/unsubscribe/${lead.unsubscribe_token}`,
    },
    status: "pending",
    run_at: step.runAt.toISOString(),
  }));
  await supabase.from("notification_jobs").insert(jobs);

  // Phase 10: paid lead conversion — enqueued only when the lead arrived
  // with a Google click id; organic leads are never uploaded. Fire-and-
  // forget: capture success must not depend on Google.
  try {
    await enqueueLead(supabase, lead.id);
  } catch (conversionError) {
    console.error(
      "[leads] lead conversion enqueue failed",
      conversionError instanceof Error ? conversionError.message : conversionError,
    );
  }

  return ok();
}
