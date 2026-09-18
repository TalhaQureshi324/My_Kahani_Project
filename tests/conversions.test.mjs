/**
 * Phase 7 tests — Google Ads Data Manager conversion pipeline.
 *
 * Pure-layer coverage: normalization/hashing, transaction-id stability,
 * consent gating, value rules, redaction guarantees, and retry
 * classification. No network, no database.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEmail,
  normalizePhone,
  hashedEmail,
  hashedPhone,
  transactionIdFor,
  resolveConsent,
  buildBookingConfirmedOutbox,
  buildSessionPaidOutbox,
  buildIngestRequest,
  isUploadable,
  EVENT_BOOKING_CONFIRMED,
  EVENT_SESSION_PAID,
} from "../lib/ads/convert.ts";

/** Stubs auth success (real signable key) so tests reach the API call. */
async function withAuthEnv(run) {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const savedEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const savedKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "sa@test.iam.gserviceaccount.com";
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  try {
    return await run();
  } finally {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = savedEmail;
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = savedKey;
  }
}

function stubFetchAndRecord(routes, calls) {
  const inner = stubFetch(routes);
  return async (url, init) => {
    calls.push(String(url));
    return inner(url, init);
  };
}

function stubFetch(routes) {
  return (async (url) => {
    const u = String(url);
    if (u.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
    }
    const match = routes.find((r) => r.match(u));
    if (!match) throw new Error('no route for ' + u);
    if (match.throw) throw new Error(match.throw);
    return new Response(JSON.stringify(match.body ?? {}), { status: match.status ?? 200 });
  });
}

import {
  ingestEvents,
  backoffMinutesForAttempt,
  nextAttemptAtFor,
  MAX_ATTEMPTS,
} from "../lib/ads/dataManager.ts";

const baseBooking= {
  id: "11111111-1111-1111-1111-111111111111",
  booking_reference: "TSM-TEST000001",
  status: "confirmed",
  payment_status: "not_due",
  email: "e2e.browserflow@example.com",
  phone: "(555) 555-0188",
  confirmed_at: "2026-09-18T07:32:34.018Z",
  paid_at: null,
  gclid: "GCLID123",
  attribution: {
    gclid: "GCLID123",
    gbraid: null,
    wbraid: null,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "fall-launch",
    utm_term: null,
    utm_content: null,
    landing_page: "/book",
    referrer: "https://www.google.com/",
    first_seen_at: "2026-09-18T07:00:00.000Z",
  },
};

/* ── normalization + hashing ─────────────────────────────────────────── */

test("email normalization: lowercase, trim, gmail dots", () => {
  assert.equal(normalizeEmail("  DanaM@GMAIL.com "), "danam@gmail.com");
  assert.equal(
    normalizeEmail("Alex.F@CymbalGroup.com"),
    "alex.f@cymbalgroup.com",
  );
  assert.equal(normalizeEmail("quinn@CYMBALGROUP.com"), "quinn@cymbalgroup.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(null), null);
});

test("phone normalization: E.164, formatting characters stripped", () => {
  assert.equal(normalizePhone("(555) 555-0188"), "+5555550188");
  assert.equal(normalizePhone("+1 800 555 0100"), "+18005550100");
  assert.equal(normalizePhone("555-555-0100"), "+5555550100");
  assert.equal(normalizePhone("12"), null);
  assert.equal(normalizePhone(""), null);
});

test("hashing: SHA-256 hex, stable across raw variants", () => {
  const a = hashedEmail("DanaM@Example.COM");
  const b = hashedEmail("  danam@example.com ");
  assert.equal(a, b);
  assert.match(a ?? "", /^[0-9a-f]{64}$/);
  const p = hashedPhone("+1 (800) 555-0100");
  assert.match(p ?? "", /^[0-9a-f]{64}$/);
});

/* ── transaction ids ─────────────────────────────────────────────────── */

test("transaction ids: stable per event type, distinct across types", () => {
  const confirmed1 = transactionIdFor(EVENT_BOOKING_CONFIRMED, "TSM-ABC");
  const confirmed2 = transactionIdFor(EVENT_BOOKING_CONFIRMED, "TSM-ABC");
  const paid = transactionIdFor(EVENT_SESSION_PAID, "TSM-ABC");
  assert.equal(confirmed1, "booking:TSM-ABC");
  assert.equal(confirmed1, confirmed2, "retries must reuse the same id");
  assert.notEqual(confirmed1, paid);
  assert.equal(paid, "booking:TSM-ABC:paid");
});

/* ── consent ─────────────────────────────────────────────────────────── */

test("consent: defaults to denied without env config; explicit wins", () => {
  delete process.env.ADS_CONSENT_DEFAULT;
  assert.equal(resolveConsent().userData, "denied");
  assert.equal(resolveConsent("denied").userData, "denied");
  process.env.ADS_CONSENT_DEFAULT = "granted";
  assert.equal(resolveConsent().userData, "granted");
  // Explicit denial beats an env default of granted.
  assert.equal(resolveConsent("denied").userData, "denied");
  delete process.env.ADS_CONSENT_DEFAULT;
});

/* ── outbox construction ─────────────────────────────────────────────── */

test("booking_confirmed: gclid booking builds a pending outbox row", () => {
  const row = buildBookingConfirmedOutbox(baseBooking, 7500);
  assert.ok(row);
  assert.equal(row.event_type, EVENT_BOOKING_CONFIRMED);
  assert.equal(row.transaction_id, "booking:TSM-TEST000001");
  assert.equal(row.gclid, "GCLID123");
  assert.equal(row.conversion_value, 75);
  assert.equal(row.currency, "USD");
});

test("booking_confirmed: never built for non-confirmed bookings", () => {
  assert.equal(
    buildBookingConfirmedOutbox(
      { ...baseBooking, status: "held" },
      null,
    ),
    null,
  );
});

test("session_paid: requires confirmed + paid, uses ACTUAL collected value", () => {
  const paidBooking= {
    ...baseBooking,
    payment_status: "paid",
    paid_at: "2026-09-25T20:00:00.000Z",
  };
  const row = buildSessionPaidOutbox(paidBooking, 15000);
  assert.ok(row);
  assert.equal(row.event_type, EVENT_SESSION_PAID);
  assert.equal(row.transaction_id, "booking:TSM-TEST000001:paid");
  assert.equal(row.conversion_value, 150, "actual collected amount in dollars");

  // Not paid yet → no session_paid event.
  assert.equal(buildSessionPaidOutbox(baseBooking, 15000), null);
  // Completed status on the booking is a precondition too.
  assert.equal(
    buildSessionPaidOutbox({ ...paidBooking, status: "cancelled" }, 15000),
    null,
  );
});

test("booking_confirmed value: omitted when unconfigured (never session revenue)", () => {
  const row = buildBookingConfirmedOutbox(baseBooking, null);
  assert.equal(row.conversion_value, null);
});

/* ── redaction guarantees ────────────────────────────────────────────── */

test("built requests NEVER contain Stripe identifiers or raw PII", () => {
  process.env.ADS_CONSENT_DEFAULT = "granted";
  const row = buildBookingConfirmedOutbox(baseBooking, 7500);
  assert.ok(row);
  const { body } = buildIngestRequest([row], {
    accountId: "1234567890",
    confirmedActionId: "9876543",
    paidActionId: null,
  });
  assert.ok(body);
  const text = JSON.stringify(body);
  for (const forbidden of [
    "cus_",
    "pm_",
    "pi_",
    "seti_",
    "card_brand",
    "last4",
    "e2e.browserflow@example.com",
    "(555) 555-0188",
  ]) {
    assert.equal(text.includes(forbidden), false, `leaked: ${forbidden}`);
  }
  delete process.env.ADS_CONSENT_DEFAULT;
});

/* ── consent gating in requests ──────────────────────────────────────── */

test("consent denied: no userData, consent denied, click-id still uploaded", () => {
  delete process.env.ADS_CONSENT_DEFAULT; // denied
  const row = buildBookingConfirmedOutbox(baseBooking, null);
  assert.ok(row);
  assert.equal(row.hashed_identifiers, null);
  assert.equal(row.ads_user_data_consent, "denied");
  const { body } = buildIngestRequest([row], {
    accountId: "1234567890",
    confirmedActionId: "9876543",
    paidActionId: null,
  });
  const event = body.events[0];
  assert.equal(event.userData, undefined);
  assert.deepEqual(event.adIdentifiers, { gclid: "GCLID123" });
  assert.deepEqual(event.consent, {
    adUserData: "CONSENT_DENIED",
    adPersonalization: "CONSENT_DENIED",
  });
});

test("consent granted: hashed email + phone uploaded, raw values absent", () => {
  process.env.ADS_CONSENT_DEFAULT = "granted";
  const row = buildBookingConfirmedOutbox(baseBooking, null);
  assert.ok(row.hashed_identifiers);
  assert.match(row.hashed_identifiers.email ?? "", /^[0-9a-f]{64}$/);
  assert.match(row.hashed_identifiers.phone ?? "", /^[0-9a-f]{64}$/);
  const { body } = buildIngestRequest([row], {
    accountId: "1234567890",
    confirmedActionId: "9876543",
    paidActionId: null,
  });
  const event = body.events[0];
  const userData = event.userData;
  assert.equal(userData.userIdentifiers.length, 2);
  delete process.env.ADS_CONSENT_DEFAULT;
});

/* ── click-id variants ───────────────────────────────────────────────── */

test("gbraid-only, wbraid-only, and organic bookings build valid rows", () => {
  delete process.env.ADS_CONSENT_DEFAULT; // denied
  const gbraidOnly= {
    ...baseBooking,
    gclid: null,
    attribution: { ...baseBooking.attribution, gclid: null, gbraid: "GBRAID123" },
  };
  const row = buildBookingConfirmedOutbox(gbraidOnly, null);
  assert.equal(row.gbraid, "GBRAID123");
  assert.ok(isUploadable(row));

  const wbraidOnly= {
    ...baseBooking,
    gclid: null,
    attribution: { ...baseBooking.attribution, gclid: null, wbraid: "WBRAID123" },
  };
  assert.equal(
    buildBookingConfirmedOutbox(wbraidOnly, null)?.wbraid,
    "WBRAID123",
  );

  // UTM-only / organic: still a valid business event, but without a click
  // id and without user-data consent there is nothing Google could match.
  const organic= {
    ...baseBooking,
    gclid: null,
    attribution: null,
    email: null,
    phone: null,
  };
  const row2 = buildBookingConfirmedOutbox(organic, null);
  assert.ok(row2, "organic bookings still enqueue");
  assert.equal(isUploadable(row2), false, "but are not uploadable without identifiers");

  // With consent granted AND a contact on file, a UTM-only booking
  // becomes uploadable via hashed user identifiers (enhanced-conversion
  // style matching). A contactless organic row stays non-uploadable.
  process.env.ADS_CONSENT_DEFAULT = "granted";
  const row3 = buildBookingConfirmedOutbox(organic, null);
  assert.equal(isUploadable(row3), false, "no contact info to hash");
  const utmOnly = {
    ...baseBooking,
    gclid: null,
    attribution: { ...baseBooking.attribution, gclid: null },
  };
  const row4 = buildBookingConfirmedOutbox(utmOnly, null);
  assert.equal(isUploadable(row4), true);
  delete process.env.ADS_CONSENT_DEFAULT;
});

/* ── request shaping ─────────────────────────────────────────────────── */

test("separate conversion actions route via destinationReferences", () => {
  delete process.env.ADS_CONSENT_DEFAULT;
  const confirmed = buildBookingConfirmedOutbox(baseBooking, 7500);
  const paid = buildSessionPaidOutbox(
    { ...baseBooking, payment_status: "paid", paid_at: "2026-09-25T20:00:00Z" },
    15000,
  );
  const rows = [
    { ...confirmed, id: "r1", status: "pending" },
    { ...paid, id: "r2", status: "pending" },
  ];
  const { body } = buildIngestRequest(rows, {
    accountId: "1234567890",
    confirmedActionId: "111",
    paidActionId: "222",
  });
  const b = body;
  assert.equal(b.destinations.length, 2);
  assert.deepEqual(
    b.destinations.map((d) => d.productDestinationId).sort(),
    ["111", "222"],
  );
  const evConfirmed = b.events.find((e) => e.transactionId === "booking:TSM-TEST000001");
  const evPaid = b.events.find((e) => e.transactionId === "booking:TSM-TEST000001:paid");
  assert.deepEqual(evConfirmed?.destinationReferences, ["booking_confirmed"]);
  assert.deepEqual(evPaid?.destinationReferences, [EVENT_SESSION_PAID]);
  assert.equal(evConfirmed?.eventName, "booking_confirmed");
  assert.match(evConfirmed?.eventTimestamp ?? "", /^\d{4}-\d{2}-\d{2}T/);
});

test("unconfigured action → nothing uploaded, row skipped", () => {
  const row = buildBookingConfirmedOutbox(baseBooking, 7500);
  const { body, skipped } = buildIngestRequest([{ ...row, id: "r", status: "pending" }], {
    accountId: "1234567890",
    confirmedActionId: null,
    paidActionId: null,
  });
  assert.equal(body, null);
  assert.equal(skipped.length, 1);
});

/* ── worker-facing classification + backoff ──────────────────────────── */

test("ingestEvents: auth misconfiguration is PERMANENT", async () => {
  const saved = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "";
  const outcome = await ingestEvents({ body: { events: [] }, fetchImpl: fetch });
  assert.equal(outcome.kind, "permanent");
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = saved;
});

test("ingestEvents: HTTP 500 from Google is RETRYABLE", () => {
  return withAuthEnv(() =>
    ingestEvents({
      body: { events: [] },
      fetchImpl: stubFetch([
        { match: (u) => u.includes("datamanager"), status: 500, body: { error: { status: "INTERNAL" } } },
      ]),
    }).then((outcome) => assert.equal(outcome.kind, "retryable")),
  );
});

test("ingestEvents: HTTP 400 from Google is PERMANENT", () => {
  return withAuthEnv(() =>
    ingestEvents({
      body: { events: [] },
      fetchImpl: stubFetch([
        { match: (u) => u.includes("datamanager"), status: 400, body: { error: { status: "INVALID_ARGUMENT" } } },
      ]),
    }).then((outcome) => assert.equal(outcome.kind, "permanent")),
  );
});

test("ingestEvents: network timeout is RETRYABLE", () => {
  return withAuthEnv(() =>
    ingestEvents({
      body: { events: [] },
      fetchImpl: stubFetch([
        { match: (u) => u.includes("datamanager"), throw: "The operation was aborted due to timeout" },
      ]),
    }).then((outcome) => {
      assert.equal(outcome.kind, "retryable");
      assert.equal(outcome.errorCode, "network");
    }),
  );
});

test("ingestEvents: success returns requestId", async () => {
  const calls = [];
  const outcome = await withAuthEnv(() =>
    ingestEvents({
      body: { events: [{ transactionId: "t" }] },
      fetchImpl: stubFetchAndRecord(
        [{ match: (u) => u.includes("datamanager"), status: 200, body: { requestId: "req-1" } }],
        calls,
      ),
    }),
  );
  assert.equal(outcome.kind, "sent");
  assert.equal(outcome.requestId, "req-1");
  assert.ok(calls.some((c) => c.includes("datamanager.googleapis.com")));
});

test("backoff: exponential-ish schedule capped at MAX_ATTEMPTS", () => {
  assert.equal(backoffMinutesForAttempt(1), 1);
  assert.equal(backoffMinutesForAttempt(2), 5);
  assert.equal(backoffMinutesForAttempt(3), 30);
  assert.equal(backoffMinutesForAttempt(4), 120);
  assert.equal(backoffMinutesForAttempt(5), 720);
  assert.equal(MAX_ATTEMPTS, 5);
  const next = nextAttemptAtFor(1, new Date("2026-09-18T00:00:00Z"));
  assert.equal(next.toISOString(), "2026-09-18T00:01:00.000Z");
});
