/**
 * Google Ads offline conversion upload — fired after a successful
 * card-on-file booking when the visitor arrived with a gclid. Purely
 * server-side and fire-and-forget: failures are logged for monitoring
 * and never surface to the client UI.
 */

const CONVERSION_ACTION_ID = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? "";
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID ?? "";
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "";
const OAUTH_CLIENT_ID = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID ?? "";
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET ?? "";

const CONVERSION_VALUE = "75.00";
const CURRENCY_CODE = "USD";

function utcConversionDateTime(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(
    now.getUTCDate(),
  )} ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(
    now.getUTCSeconds(),
  )}+00:00`;
}

async function fetchAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth token exchange failed: ${data.error ?? res.status}`);
  }
  return data.access_token as string;
}

/**
 * Uploads the click conversion for a gclid-attributed booking.
 * Resolves once the outcome has been logged (SUCCESS or FAILED).
 */
export async function uploadOfflineConversion(input: {
  gclid: string;
  bookingId: string;
}): Promise<void> {
  const { gclid, bookingId } = input;
  const tag = `[ads-conversion][${bookingId}]`;

  if (!gclid) {
    console.log(`${tag} SKIPPED: booking has no stored gclid.`);
    return;
  }

  const missing = [
    ["GOOGLE_ADS_CONVERSION_ACTION_ID", CONVERSION_ACTION_ID],
    ["GOOGLE_ADS_CUSTOMER_ID", CUSTOMER_ID],
    ["GOOGLE_ADS_DEVELOPER_TOKEN", DEVELOPER_TOKEN],
    ["GOOGLE_ADS_REFRESH_TOKEN", REFRESH_TOKEN],
    ["GOOGLE_ADS_OAUTH_CLIENT_ID", OAUTH_CLIENT_ID],
    ["GOOGLE_ADS_OAUTH_CLIENT_SECRET", OAUTH_CLIENT_SECRET],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.warn(`${tag} FAILED: conversion upload is not configured (missing env: ${missing.join(", ")}).`);
    return;
  }

  try {
    const accessToken = await fetchAccessToken();

    const payload = {
      customerId: CUSTOMER_ID.replace(/-/g, ""),
      conversions: [
        {
          entity: "CLICK_CONVERSION",
          gclid,
          conversion_date_time: utcConversionDateTime(),
          conversion_value: Number(CONVERSION_VALUE),
          currency_code: CURRENCY_CODE,
          conversion_action: `customers/${CUSTOMER_ID.replace(/-/g, "")}/conversionActions/${CONVERSION_ACTION_ID}`,
        },
      ],
      partialFailure: false,
    };

    const apiVersion = "v16";
    const res = await fetch(
      `https://googleads.googleapis.com/${apiVersion}/customers/${CUSTOMER_ID.replace(/-/g, "")}/googleAds:uploadClickConversions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    if (!res.ok) {
      const detail = data?.error?.message ?? res.status;
      console.warn(`${tag} FAILED: Google Ads API rejected the upload (${detail}).`);
      return;
    }
    console.log(`${tag} SUCCESS: offline conversion uploaded for gclid ${gclid.slice(0, 12)}…`);
  } catch (err) {
    console.warn(`${tag} FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }
}
