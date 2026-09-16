import { NextResponse } from "next/server";
import { uploadOfflineConversion } from "@/lib/adsConversion";
import { readAttributionFromCookieHeader } from "@/lib/attribution";

/**
 * Booking vaulting endpoint. Receives the Accept.js opaque card token
 * (never raw card data) plus the client's details, creates an
 * Authorize.Net customer profile with a payment profile (card on file —
 * NO charge is triggered), and records the appointment.
 */

const API_LOGIN_ID = process.env.AUTHORIZENET_API_LOGIN_ID ?? "";
const TRANSACTION_KEY = process.env.AUTHORIZENET_TRANSACTION_KEY ?? "";
const IS_PRODUCTION = process.env.AUTHORIZENET_ENVIRONMENT === "PRODUCTION";
const XML_ENDPOINT = IS_PRODUCTION
  ? "https://api.authorize.net/xml/v1/request.api"
  : "https://apitest.authorize.net/xml/v1/request.api";

type BookingBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  gclid?: string | null;
  opaqueToken?: { dataDescriptor?: string; dataValue?: string };
  slotDetails?: { dateISO?: string; slotCSTHour?: number | null };
};

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  return { first: first || "Client", last: last || "Record" };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bookingReference(): string {
  return `TSM-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function tag(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  return `<${name}>${xmlEscape(String(value))}</${name}>`;
}

export async function POST(request: Request) {
  let body: BookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { fullName, email, phone, gclid, opaqueToken, slotDetails } = body ?? {};

  // First-party attribution — read from cookies set at the landing visit
  // (survives landing → scheduler → card entry → confirmation).
  const { firstTouch, lastTouch } = readAttributionFromCookieHeader(
    request.headers.get("cookie"),
  );
  const attribution = {
    first_touch: firstTouch,
    last_touch: lastTouch,
    // client-supplied gclid as fallback (e.g. cookies blocked)
    gclid_fallback: gclid ?? null,
  };

  if (!fullName || !email || !opaqueToken?.dataDescriptor || !opaqueToken?.dataValue) {
    return NextResponse.json(
      { success: false, error: "Missing booking details or card token." },
      { status: 400 },
    );
  }

  if (!API_LOGIN_ID || !TRANSACTION_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Card-on-file is not configured yet. Please contact us directly to complete your booking.",
      },
      { status: 503 },
    );
  }

  const { first, last } = splitName(fullName);
  const bookingId = bookingReference();

  // CIM: create the customer profile and vault the opaque card token in
  // one call. validationMode "none" — the card is stored, never charged.
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<createCustomerProfileRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">
  <merchantAuthentication>
    <name>${xmlEscape(API_LOGIN_ID)}</name>
    <transactionKey>${xmlEscape(TRANSACTION_KEY)}</transactionKey>
  </merchantAuthentication>
  <refId>${xmlEscape(bookingId)}</refId>
  <profile>
    <merchantCustomerId>${xmlEscape(bookingId)}</merchantCustomerId>
    ${tag("description", `True Self Me client — ${fullName}`)}
    ${tag("email", email)}
    <paymentProfiles>
      <customerType>individual</customerType>
      <billTo>
        ${tag("firstName", first)}
        ${tag("lastName", last)}
        ${tag("phoneNumber", phone)}
      </billTo>
      <payment>
        <opaqueData>
          ${tag("dataDescriptor", opaqueToken.dataDescriptor)}
          ${tag("dataValue", opaqueToken.dataValue)}
        </opaqueData>
      </payment>
    </paymentProfiles>
  </profile>
  <validationMode>none</validationMode>
</createCustomerProfileRequest>`;

  let profileId = "";
  let paymentProfileId = "";
  let resultCode = "";
  let resultText = "";

  try {
    const anetRes = await fetch(XML_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
    });
    const anetXml = await anetRes.text();

    resultCode =
      anetXml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1] ?? "Error";
    resultText =
      anetXml.match(/<text>([^<]+)<\/text>/)?.[1] ?? "Payment processor error.";
    profileId =
      anetXml.match(/<customerProfileId>([^<]+)<\/customerProfileId>/)?.[1] ?? "";
    paymentProfileId =
      anetXml.match(/<customerPaymentProfileId>([^<]+)<\/customerPaymentProfileId>/)?.[1] ?? "";
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach the payment processor. Please try again." },
      { status: 502 },
    );
  }

  if (resultCode !== "Ok" || !profileId) {
    return NextResponse.json(
      {
        success: false,
        error: `The card could not be saved: ${resultText}`,
        bookingId,
      },
      { status: 502 },
    );
  }

  // Appointment record. There is no database in this project yet — the
  // record is logged server-side and appended to a local JSONL file
  // (best-effort; on serverless the filesystem write is a no-op).
  const appointment = {
    bookingId,
    customerProfileId: profileId,
    customerPaymentProfileId: paymentProfileId,
    fullName,
    email,
    phone,
    slotDetails: slotDetails ?? null,
    // full marketing attribution from the landing-visit cookies
    gclid: gclid ?? null,
    gbraid: null,
    wbraid: null,
    utm_source: firstTouch?.utm_source ?? lastTouch?.utm_source ?? null,
    utm_medium: firstTouch?.utm_medium ?? lastTouch?.utm_medium ?? null,
    utm_campaign: firstTouch?.utm_campaign ?? lastTouch?.utm_campaign ?? null,
    utm_term: firstTouch?.utm_term ?? lastTouch?.utm_term ?? null,
    utm_content: firstTouch?.utm_content ?? lastTouch?.utm_content ?? null,
    landing_page: firstTouch?.landing_page ?? null,
    referrer: firstTouch?.referrer ?? null,
    attribution_first_touch: firstTouch,
    attribution_last_touch: lastTouch,
    createdAt: new Date().toISOString(),
  };
  console.log("[booking] appointment created:", JSON.stringify(appointment));
  try {
    const { appendFile, mkdir } = await import("node:fs/promises");
    await mkdir(".data", { recursive: true });
    await appendFile(".data/bookings.jsonl", JSON.stringify(appointment) + "\n", "utf8");
  } catch {
    // Read-only filesystem (serverless) — the log above is the record.
  }

  // Google Ads offline conversion — fire-and-forget for gclid-attributed
  // bookings. Logged inside; failures never touch the client response.
  if (gclid) {
    void uploadOfflineConversion({ gclid, bookingId });
  }

  return NextResponse.json({
    success: true,
    bookingId,
    customerProfileId: profileId,
    customerPaymentProfileId: paymentProfileId,
  });
}
