import { createHash } from "node:crypto";

/**
 * Phase 7 — Google Ads server-side conversions via the Data Manager API.
 *
 * Pure layer: normalization, hashing, transaction ids, consent gating and
 * Data Manager API request building. No network, no database — fully
 * unit-testable, and auditable for the redaction guarantees:
 *
 *   - Stripe identifiers (customer / payment method / payment intent /
 *     setup intent ids, card brand, last4) NEVER enter a request.
 *   - Raw emails/phones NEVER enter a request — only hex SHA-256 digests
 *     computed after Google's normalization, and only when the advertising
 *     user-data consent is granted.
 *
 * API surface (current Data Manager API v1, NOT the legacy
 * UploadClickConversions endpoint):
 *   POST https://datamanager.googleapis.com/v1/events:ingest
 */

export const DATA_MANAGER_ENDPOINT =
  "https://datamanager.googleapis.com/v1/events:ingest";
export const DATA_MANAGER_SCOPE =
  "https://www.googleapis.com/auth/datamanager";

export const ACCOUNT_TYPE_GOOGLE_ADS = "ACCOUNT_TYPE_GOOGLE_ADS";

/** Event names — these map to conversion actions configured in Google Ads. */
export const EVENT_BOOKING_CONFIRMED = "booking_confirmed";
export const EVENT_SESSION_PAID = "session_paid";

/** Consent statuses exactly as the API expects them. */
export const CONSENT_GRANTED = "CONSENT_GRANTED";
export const CONSENT_DENIED = "CONSENT_DENIED";

/** The attribution record as persisted on the booking (subset we upload). */
export type BookingAttribution = {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  first_seen_at?: string | null;
};

/* ── normalization + hashing ──────────────────────────────────────────── */

/**
 * Google email normalization: trim, lowercase; for gmail/googlemail
 * addresses also drop dots in the local part. Returns null when the
 * result is not a plausible address.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  let value = email.trim().toLowerCase();
  if (!value) return null;
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    value = `${local.replace(/\./g, "")}@${domain}`;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/**
 * Google phone normalization: E.164 — strip everything but a leading +,
 * require 8–15 digits total. Returns null when not plausibly a number.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  const plus = digits.startsWith("+");
  const rest = digits.replace(/\+/g, "");
  if (!rest || rest.length < 8 || rest.length > 15) return null;
  return `+${rest}`;
}

/** Hex SHA-256 of a UTF-8 string — the encoding Google requires. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Normalized + hashed email, or null when unusable. */
export function hashedEmail(email: string | null | undefined): string | null {
  const normalized = normalizeEmail(email);
  return normalized ? sha256Hex(normalized) : null;
}

/** Normalized + hashed phone (E.164), or null when unusable. */
export function hashedPhone(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? sha256Hex(normalized) : null;
}

/* ── transaction ids ──────────────────────────────────────────────────── */

/**
 * Stable dedup ids. booking_confirmed → `booking:{ref}`;
 * session_paid → `booking:{ref}:paid`. The SAME id is reused on every
 * worker retry (the outbox row stores it once, at enqueue time).
 */
export function transactionIdFor(
  eventType: string,
  bookingReference: string,
): string {
  return eventType === EVENT_SESSION_PAID
    ? `booking:${bookingReference}:paid`
    : `booking:${bookingReference}`;
}

/* ── consent ──────────────────────────────────────────────────────────── */

export type ConsentValue = "granted" | "denied";

/**
 * Advertising consent is INDEPENDENT of the card-on-file consent — never
 * infer one from the other. Until a CMP is wired in, the practice-wide
 * default comes from ADS_CONSENT_DEFAULT ("granted" | "denied"; the safe
 * default is "denied", which suppresses user-identifier uploads entirely
 * while still allowing click-id conversions).
 */
export function resolveConsent(explicit?: string | null): {
  userData: ConsentValue;
  personalization: ConsentValue;
} {
  const configured = (process.env.ADS_CONSENT_DEFAULT ?? "denied")
    .trim()
    .toLowerCase();
  const userData: ConsentValue =
    explicit === "granted" || explicit === "denied"
      ? explicit
      : configured === "granted"
        ? "granted"
        : "denied";
  const personalization: ConsentValue =
    (process.env.ADS_PERSONALIZATION_DEFAULT ?? configured)
      .trim()
      .toLowerCase() === "granted"
      ? "granted"
      : "denied";
  return { userData, personalization };
}

/* ── outbox row construction (pure projection of a booking) ───────────── */

export type BookingSnapshot = {
  id: string;
  booking_reference: string | null;
  status: string;
  payment_status?: string | null;
  email?: string | null;
  phone?: string | null;
  confirmed_at?: string | null;
  paid_at?: string | null;
  gclid?: string | null;
  attribution?: BookingAttribution | string | null;
};

export type OutboxInsert = {
  booking_id: string;
  event_type: string;
  transaction_id: string;
  event_timestamp: string;
  conversion_value: number | null;
  currency: string;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  hashed_identifiers: { email?: string; phone?: string } | null;
  ads_user_data_consent: ConsentValue;
  ads_personalization_consent: ConsentValue;
};

/** Parses the booking's attribution jsonb (string or object). */
export function parseAttributionJson(
  raw: BookingSnapshot["attribution"],
): BookingAttribution | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as BookingAttribution;
  try {
    return JSON.parse(raw) as BookingAttribution;
  } catch {
    return null;
  }
}

function clickIds(
  snapshot: BookingSnapshot,
  attribution: BookingAttribution | null,
): { gclid: string | null; gbraid: string | null; wbraid: string | null } {
  // Dedicated column wins (hold route writes it), jsonb fallback next.
  const gclid = snapshot.gclid ?? attribution?.gclid ?? null;
  const gbraid = attribution?.gbraid ?? null;
  const wbraid = attribution?.wbraid ?? null;
  return {
    gclid: gclid || null,
    gbraid: gbraid || null,
    wbraid: wbraid || null,
  };
}

/**
 * booking_confirmed — the PRIMARY conversion. Only valid for a confirmed
 * booking (Stripe Customer + succeeded SetupIntent + saved PaymentMethod
 * are all preconditions of the confirmed status itself). Value: the
 * configured booking value when set; otherwise null → omitted from the
 * Google request, and the conversion action's own default applies.
 * NEVER the session revenue — that money has not been collected yet.
 */
export function buildBookingConfirmedOutbox(
  booking: BookingSnapshot,
  configuredValueCents: number | null,
): OutboxInsert | null {
  if (booking.status !== "confirmed") return null;
  const reference = booking.booking_reference;
  if (!reference) return null;
  const attribution = parseAttributionJson(booking.attribution);
  const consent = resolveConsent();
  const hashed = consent.userData === "granted"
    ? {
        email: hashedEmail(booking.email) ?? undefined,
        phone: hashedPhone(booking.phone) ?? undefined,
      }
    : {};
  const identifiers =
    hashed.email || hashed.phone
      ? {
          ...(hashed.email ? { email: hashed.email } : {}),
          ...(hashed.phone ? { phone: hashed.phone } : {}),
        }
      : null;
  return {
    booking_id: booking.id,
    event_type: EVENT_BOOKING_CONFIRMED,
    transaction_id: transactionIdFor(EVENT_BOOKING_CONFIRMED, reference),
    event_timestamp: booking.confirmed_at ?? new Date().toISOString(),
    conversion_value:
      configuredValueCents != null && configuredValueCents > 0
        ? Math.round(configuredValueCents) / 100
        : null,
    currency: "USD",
    ...clickIds(booking, attribution),
    hashed_identifiers: identifiers,
    ads_user_data_consent: consent.userData,
    ads_personalization_consent: consent.personalization,
  };
}

/**
 * session_paid — the SECONDARY conversion. Only for a completed-and-paid
 * state: booking confirmed + PaymentIntent succeeded + payment_status
 * 'paid'. Value: the ACTUAL collected Stripe amount (cents → dollars).
 */
export function buildSessionPaidOutbox(
  booking: BookingSnapshot,
  collectedCents: number | null,
): OutboxInsert | null {
  if (booking.status !== "confirmed") return null;
  if (booking.payment_status !== "paid") return null;
  const reference = booking.booking_reference;
  if (!reference) return null;
  const attribution = parseAttributionJson(booking.attribution);
  const consent = resolveConsent();
  const hashed = consent.userData === "granted"
    ? {
        email: hashedEmail(booking.email) ?? undefined,
        phone: hashedPhone(booking.phone) ?? undefined,
      }
    : {};
  const identifiers =
    hashed.email || hashed.phone
      ? {
          ...(hashed.email ? { email: hashed.email } : {}),
          ...(hashed.phone ? { phone: hashed.phone } : {}),
        }
      : null;
  return {
    booking_id: booking.id,
    event_type: EVENT_SESSION_PAID,
    transaction_id: transactionIdFor(EVENT_SESSION_PAID, reference),
    event_timestamp: booking.paid_at ?? new Date().toISOString(),
    conversion_value:
      collectedCents != null && collectedCents > 0
        ? Math.round(collectedCents) / 100
        : null,
    currency: "USD",
    ...clickIds(booking, attribution),
    hashed_identifiers: identifiers,
    ads_user_data_consent: consent.userData,
    ads_personalization_consent: consent.personalization,
  };
}

/* ── Data Manager API request building ────────────────────────────────── */

export type GoogleAdsConversionConfig = {
  accountId: string; // Google Ads customer id, digits only
  confirmedActionId: string | null;
  paidActionId: string | null;
};

export type OutboxRow = OutboxInsert & {
  id: string;
  status: string;
};

/** True when the row carries anything Google could match on. */
export function isUploadable(row: OutboxRow): boolean {
  const hasClick = Boolean(row.gclid || row.gbraid || row.wbraid);
  const hasUser = row.ads_user_data_consent === "granted" &&
    row.hashed_identifiers != null &&
    ((row.hashed_identifiers.email ?? "").length > 0 ||
      (row.hashed_identifiers.phone ?? "").length > 0);
  return hasClick || hasUser;
}

const rfc3339 = (iso: string): string => new Date(iso).toISOString();

/**
 * Builds the events:ingest request. Each configured conversion action
 * becomes a Destination with a reference; each event targets its action
 * via destinationReferences — so booking_confirmed and session_paid can
 * be uploaded in one call while landing on separate conversion actions.
 */
export function buildIngestRequest(
  rows: OutboxRow[],
  config: GoogleAdsConversionConfig,
): {
  body: Record<string, unknown> | null;
  uploadable: OutboxRow[];
  skipped: OutboxRow[];
} {
  const uploadable: OutboxRow[] = [];
  const skipped: OutboxRow[] = [];
  for (const row of rows) {
    const actionForType =
      row.event_type === EVENT_SESSION_PAID
        ? config.paidActionId
        : config.confirmedActionId;
    if (!actionForType || !isUploadable(row)) {
      skipped.push(row);
      continue;
    }
    uploadable.push(row);
  }
  if (uploadable.length === 0) return { body: null, uploadable, skipped };

  const destinations: Array<Record<string, unknown>> = [];
  if (config.confirmedActionId && uploadable.some(isConfirmed)) {
    destinations.push({
      reference: "booking_confirmed",
      operatingAccount: {
        accountType: ACCOUNT_TYPE_GOOGLE_ADS,
        accountId: config.accountId,
      },
      productDestinationId: config.confirmedActionId,
    });
  }
  if (config.paidActionId && uploadable.some(isPaid)) {
    destinations.push({
      reference: EVENT_SESSION_PAID,
      operatingAccount: {
        accountType: ACCOUNT_TYPE_GOOGLE_ADS,
        accountId: config.accountId,
      },
      productDestinationId: config.paidActionId,
    });
  }

  const events = uploadable.map((row) => {
    const event: Record<string, unknown> = {
      transactionId: row.transaction_id,
      eventTimestamp: rfc3339(row.event_timestamp),
      eventName: row.event_type,
      eventSource: "WEB",
      destinationReferences: [row.event_type],
      currency: row.currency,
    };
    if (row.conversion_value != null) {
      event.conversionValue = row.conversion_value;
    }
    const adIdentifiers: Record<string, string> = {};
    if (row.gclid) adIdentifiers.gclid = row.gclid;
    if (row.gbraid) adIdentifiers.gbraid = row.gbraid;
    if (row.wbraid) adIdentifiers.wbraid = row.wbraid;
    if (Object.keys(adIdentifiers).length > 0) {
      event.adIdentifiers = adIdentifiers;
    }
    if (
      row.ads_user_data_consent === "granted" &&
      row.hashed_identifiers
    ) {
      const userIdentifiers: Array<Record<string, string>> = [];
      if (row.hashed_identifiers.email) {
        userIdentifiers.push({ emailAddress: row.hashed_identifiers.email });
      }
      if (row.hashed_identifiers.phone) {
        userIdentifiers.push({ phoneNumber: row.hashed_identifiers.phone });
      }
      if (userIdentifiers.length > 0) {
        event.userData = { userIdentifiers };
      }
    }
    event.consent = {
      adUserData: toConsentStatus(row.ads_user_data_consent),
      adPersonalization: toConsentStatus(row.ads_personalization_consent),
    };
    return event;
  });

  return {
    body: {
      destinations,
      events,
      encoding: "HEX",
    },
    uploadable,
    skipped,
  };
}

function isConfirmed(row: OutboxRow): boolean {
  return row.event_type === EVENT_BOOKING_CONFIRMED;
}
function isPaid(row: OutboxRow): boolean {
  return row.event_type === EVENT_SESSION_PAID;
}

function toConsentStatus(value: ConsentValue): string {
  return value === "granted" ? CONSENT_GRANTED : CONSENT_DENIED;
}
