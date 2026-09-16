import crypto from "node:crypto";

/**
 * Server-side Authorize.net (CIM + webhooks) helpers.
 *
 * Secrets (transaction key, signature key) live only here. The browser
 * receives only the public client key + API login id, which are the two
 * values Authorize.net documents as safe for Accept Hosted.
 */

const ENV = (process.env.AUTHORIZENET_ENVIRONMENT ?? "SANDBOX").toUpperCase();
const IS_PRODUCTION = ENV === "PRODUCTION";

export const API_LOGIN_ID = process.env.AUTHORIZENET_API_LOGIN_ID ?? "";
export const TRANSACTION_KEY = process.env.AUTHORIZENET_TRANSACTION_KEY ?? "";
export const SIGNATURE_KEY = process.env.AUTHORIZENET_SIGNATURE_KEY ?? "";
export const PUBLIC_CLIENT_KEY =
  process.env.NEXT_PUBLIC_AUTHORIZENET_PUBLIC_CLIENT_KEY ?? "";
export const PUBLIC_API_LOGIN_ID =
  process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID ?? "";

/** One source of truth for sandbox vs production mixing. */
export const isProduction = () => IS_PRODUCTION;
export const isSandbox = () => !IS_PRODUCTION;

export const isServerConfigured = () =>
  Boolean(API_LOGIN_ID && TRANSACTION_KEY);
export const isClientConfigured = () =>
  Boolean(PUBLIC_CLIENT_KEY && PUBLIC_API_LOGIN_ID);

export const xmlEndpoint = () =>
  IS_PRODUCTION
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";

/** Base URL for Accept Hosted iframes (payment profile management). */
export const hostedIframeBaseUrl = () =>
  IS_PRODUCTION ? "https://secure.authorize.net" : "https://test.authorize.net";

/* ── XML helpers ──────────────────────────────────────────────── */

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function merchantAuthentication(): string {
  return (
    "<merchantAuthentication>" +
    `<name>${xmlEscape(API_LOGIN_ID)}</name>` +
    `<transactionKey>${xmlEscape(TRANSACTION_KEY)}</transactionKey>` +
    "</merchantAuthentication>"
  );
}

async function postXml(xml: string): Promise<string> {
  const res = await fetch(xmlEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: xml,
  });
  return res.text();
}

function extract(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return m ? m[1] : null;
}

function extractAll(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, "g"))].map(
    (m) => m[1],
  );
}

/* ── operations ───────────────────────────────────────────────── */

/**
 * Creates a customer profile (no payment method yet — the card is added
 * through the hosted payment-profile form). Deterministic per internal
 * customer id, so retries cannot create duplicates: a duplicate
 * merchantCustomerId returns E00039 which callers resolve by reading the
 * profile id we stored on the first successful attempt.
 */
export async function createCustomerProfile(input: {
  customerRef: string; // internal customers.id — deterministic
  email: string;
  description?: string;
}): Promise<{ customerProfileId: string }> {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<createCustomerProfileRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">` +
    merchantAuthentication() +
    `<refId>${xmlEscape(input.customerRef)}</refId>` +
    "<profile>" +
    `<merchantCustomerId>${xmlEscape(input.customerRef)}</merchantCustomerId>` +
    `<description>${xmlEscape(input.description ?? "True Self Me coaching client")}</description>` +
    `<email>${xmlEscape(input.email)}</email>` +
    "</profile>" +
    "<validationMode>none</validationMode>" +
    "</createCustomerProfileRequest>";

  const response = await postXml(xml);
  const profileId = extract(response, "customerProfileId");
  if (profileId) return { customerProfileId: profileId };

  const code = extract(response, "code") ?? "E00000";
  const text = extract(response, "text") ?? "Unknown Authorize.net error.";
  throw new Error(`ANET:${code}:${text}`);
}

/**
 * Returns a short-lived hosted payment-profile page token for the
 * Authorize.net-hosted "add payment method" form.
 */
export async function getHostedProfilePageToken(input: {
  customerProfileId: string;
  returnUrl: string;
  returnUrlText: string;
  headingText: string;
}): Promise<{ token: string }> {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<getHostedProfilePageRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">` +
    merchantAuthentication() +
    `<customerProfileId>${xmlEscape(input.customerProfileId)}</customerProfileId>` +
    "<hostedProfileSettings>" +
    "<setting>" +
    "<settingName>hostedProfileReturnUrl</settingName>" +
    `<settingValue>${xmlEscape(input.returnUrl)}</settingValue>` +
    "</setting>" +
    "<setting>" +
    "<settingName>hostedProfileReturnUrlText</settingName>" +
    `<settingValue>${xmlEscape(input.returnUrlText)}</settingValue>` +
    "</setting>" +
    "<setting>" +
    "<settingName>hostedProfileHeadingText</settingName>" +
    `<settingValue>${xmlEscape(input.headingText)}</settingValue>` +
    "</setting>" +
    "<setting>" +
    "<settingName>hostedProfileManageEnabled</settingName>" +
    "<settingValue>false</settingValue>" +
    "</setting>" +
    "<setting>" +
    "<settingName>hostedProfilePaymentOptions</settingName>" +
    "<settingValue>ShowCreditCard</settingValue>" +
    "</setting>" +
    "<setting>" +
    "<settingName>hostedProfileCardCodeRequired</settingName>" +
    "<settingValue>true</settingValue>" +
    "</setting>" +
    "</hostedProfileSettings>" +
    "</getHostedProfilePageRequest>";

  const response = await postXml(xml);
  const token = extract(response, "hostedPaymentProfilePageToken");
  if (!token) {
    const code = extract(response, "code") ?? "E00000";
    const text = extract(response, "text") ?? "Unknown Authorize.net error.";
    throw new Error(`ANET:${code}:${text}`);
  }
  return { token };
}

/**
 * Verifies a payment profile belongs to the customer profile and returns
 * only safe, masked card metadata (brand + last4). Fails when the ids do
 * not match or the profile does not exist.
 */
export async function getMaskedPaymentProfile(input: {
  customerProfileId: string;
  paymentProfileId: string;
}): Promise<{ cardBrand: string | null; cardLast4: string | null }> {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<getCustomerPaymentProfileRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">` +
    merchantAuthentication() +
    `<customerProfileId>${xmlEscape(input.customerProfileId)}</customerProfileId>` +
    `<customerPaymentProfileId>${xmlEscape(input.paymentProfileId)}</customerPaymentProfileId>` +
    "<includeIssuerInfo>true</includeIssuerInfo>" +
    "</getCustomerPaymentProfileRequest>";

  const response = await postXml(xml);
  const resultCode = extract(response, "resultCode");
  if (resultCode !== "Ok") {
    const text = extract(response, "text") ?? "Payment profile not found.";
    throw new Error(`ANET:E00003:${text}`);
  }
  // Masked card number renders like "XXXX9639"; the brand rides in
  // cardType when the issuer supplies it.
  const masked = extract(response, "cardNumber") ?? "";
  const last4 = masked.replace(/\D/g, "").slice(-4) || null;
  const brand = extract(response, "cardType") ?? null;
  void brand;
  return { cardBrand: brand, cardLast4: last4 };
}

/**
 * Lists a customer profile's payment profiles (safe, masked) with the
 * newest first. Used after the hosted "add payment" form to discover the
 * payment profile Authorize.net just created.
 */
export async function getCustomerPaymentProfiles(
  customerProfileId: string,
): Promise<Array<{ id: string; cardBrand: string | null; cardLast4: string | null }>> {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<getCustomerProfileRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">` +
    merchantAuthentication() +
    `<customerProfileId>${xmlEscape(customerProfileId)}</customerProfileId>` +
    "<includeIssuerInfo>true</includeIssuerInfo>" +
    "</getCustomerProfileRequest>";

  const response = await postXml(xml);
  const resultCode = extract(response, "resultCode");
  if (resultCode !== "Ok") {
    const text = extract(response, "text") ?? "Customer profile not found.";
    throw new Error(`ANET:E00003:${text}`);
  }

  // paymentProfiles blocks in document order (oldest first) — newest last.
  const blocks = response.split("<paymentProfiles>").slice(1);
  return blocks.map((block) => {
    const id = block.match(/<customerPaymentProfileId>(\d+)</)?.[1] ?? "";
    const masked = block.match(/<cardNumber>([^<]+)<\/cardNumber>/)?.[1] ?? "";
    const cardType = block.match(/<cardType>([^<]+)<\/cardType>/)?.[1] ?? null;
    const last4 = masked.replace(/\D/g, "").slice(-4) || null;
    return { id, cardBrand: cardType, cardLast4: last4 };
  });
}

export function newestPaymentProfile<
  T extends { id: string },
>(profiles: T[]): T | null {
  if (profiles.length === 0) return null;
  return profiles.reduce((newest, p) =>
    BigInt(p.id || "0") > BigInt(newest.id || "0") ? p : newest,
  );
}

/* ── webhooks ─────────────────────────────────────────────────── */

/** HMAC-SHA512 validation of the X-ANET-Signature header (raw body). */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!SIGNATURE_KEY || !signatureHeader) return false;
  const expected =
    "sha512=" +
    crypto.createHmac("sha512", SIGNATURE_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
