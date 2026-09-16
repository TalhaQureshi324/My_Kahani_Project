// Attribution logic tests — node --test tests/attribution.test.mjs
// Covers: gclid / wbraid / UTM visits, parameterless navigation,
// second campaign, cookie expiration, malformed values, cookie flags.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTION_PARAMS,
  buildAttribution,
  mergeFirstTouch,
  mergeLastTouch,
  isExpired,
  serializeAttribution,
  parseAttribution,
  attributionCookieOptions,
  readAttributionFromCookieHeader,
  sanitizeParamValue,
} from "../lib/attribution.ts";

const NOW = new Date("2026-09-16T12:00:00Z");
const LATER = new Date("2026-09-16T12:05:00Z");
const IN_31_DAYS = new Date("2026-10-17T12:00:00Z");

function visit(search, referrer = "https://www.google.com/", now = NOW) {
  return buildAttribution(search, "/book" + (search || ""), referrer, now);
}

test("1. visit with gclid captures first-touch attribution", () => {
  const a = visit("?gclid=TEST_GCLID_12345");
  assert.equal(a.gclid, "TEST_GCLID_12345");
  assert.equal(a.landing_page, "/book?gclid=TEST_GCLID_12345");
  assert.equal(a.referrer, "https://www.google.com/");
  assert.equal(a.first_seen_at, NOW.toISOString());
  assert.equal(a.utm_source, null);
});

test("2. visit with wbraid captures it", () => {
  const a = visit("?wbraid=WBRAID_ABC");
  assert.equal(a.wbraid, "WBRAID_ABC");
  assert.equal(a.gclid, null);
});

test("3. visit with UTMs captures all five fields", () => {
  const a = visit(
    "?utm_source=google&utm_medium=cpc&utm_campaign=fall&utm_term=coaching&utm_content=hero",
  );
  assert.equal(a.utm_source, "google");
  assert.equal(a.utm_medium, "cpc");
  assert.equal(a.utm_campaign, "fall");
  assert.equal(a.utm_term, "coaching");
  assert.equal(a.utm_content, "hero");
});

test("4. later navigation without parameters does not overwrite first touch", () => {
  const first = visit("?gclid=TEST_GCLID_12345");
  const laterVisit = buildAttribution("", "/", "", LATER); // internal nav, no params
  const merged = mergeFirstTouch(first, laterVisit);
  assert.equal(merged, first, "first-touch object must be preserved");
  assert.equal(merged.gclid, "TEST_GCLID_12345");
  // and when there is no first touch yet, a direct landing still records one
  const direct = mergeFirstTouch(null, laterVisit);
  assert.equal(direct.landing_page, "/");
});

test("5. second campaign visit keeps first touch, updates last touch", () => {
  const first = visit("?gclid=FIRST_GCLID&utm_campaign=spring", "https://google.com/", NOW);
  const second = visit(
    "?utm_source=newsletter&utm_campaign=fall",
    "https://example.com/",
    LATER,
  );
  const keptFirst = mergeFirstTouch(first, second);
  assert.equal(keptFirst.gclid, "FIRST_GCLID", "first-touch gclid survives");
  assert.equal(keptFirst.utm_campaign, "spring", "first-touch campaign survives");
  const last = mergeLastTouch(null, second);
  assert.equal(last.utm_source, "newsletter");
  assert.equal(last.utm_campaign, "fall");
});

test("6. cookie expiration: records older than 30 days are rejected", () => {
  const fresh = visit("?gclid=NEW_GCLID", "https://google.com/", NOW);
  assert.equal(isExpired(fresh, NOW), false, "fresh record not expired");
  const stale = visit("?gclid=OLD_GCLID", "https://google.com/", new Date("2026-08-01T00:00:00Z"));
  assert.equal(isExpired(stale, NOW), true, "46-day-old record expired");
  // boundary: exactly 30 days old is still valid; one second more expires
  const edge = visit("?gclid=EDGE_GCLID", "https://google.com/", new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000));
  assert.equal(isExpired(edge, NOW), false, "exactly 30 days not expired");
  // parseAttribution drops expired records
  const raw = serializeAttribution(stale);
  assert.equal(parseAttribution(raw, NOW), null, "expired cookie parses to null");
  assert.equal(parseAttribution(raw, new Date("2026-08-15T00:00:00Z")).gclid, "OLD_GCLID");
});

test("7. malformed values are sanitized or rejected", () => {
  // garbage cookie → null
  assert.equal(parseAttribution("%%%not-json%%%"), null);
  assert.equal(parseAttribution("e30="), null, "'{}' has no first_seen_at");
  // oversized value truncated to 256 chars
  const huge = "x".repeat(5000);
  const a = visit(`?gclid=${encodeURIComponent(huge)}`);
  assert.ok(a.gclid.length <= 256, "value capped at 256 chars");
  // script-ish content is stored inert (cookie is SameSite=Lax, encoded)
  const sneaky = visit(`?utm_source=${encodeURIComponent("<script>alert(1)</script>")}`);
  assert.ok(sneaky.utm_source.includes("<script>"), "stored raw (consumer must escape)");
  // missing param → null field, not empty string
  assert.equal(a.utm_content, null);
});

test("cookie options: 30-day expiry, SameSite=Lax, Path=/, Secure flag", () => {
  const prod = attributionCookieOptions(true);
  assert.ok(prod.includes("Max-Age=" + 30 * 24 * 60 * 60));
  assert.ok(prod.includes("SameSite=Lax"));
  assert.ok(prod.includes("Path=/"));
  assert.ok(prod.includes("Secure"));
  const dev = attributionCookieOptions(false);
  assert.ok(!dev.includes("Secure"), "no Secure flag on http dev");
});

test("server helper reads first/last touch from Cookie header", () => {
  const a = visit("?gclid=HDR_GCLID&utm_source=google");
  const header = `other=1; ${"tsm_attribution"}=${serializeAttribution(a)}`;
  const { firstTouch, lastTouch } = readAttributionFromCookieHeader(header, NOW);
  assert.equal(firstTouch.gclid, "HDR_GCLID");
  assert.equal(lastTouch, null);
  // garbage header → nulls
  const none = readAttributionFromCookieHeader("other=1");
  assert.equal(none.firstTouch, null);
  assert.equal(readAttributionFromCookieHeader(null).firstTouch, null);
});

test("sanitizeParamValue trims and nulls empties", () => {
  assert.equal(sanitizeParamValue("  x  "), "x");
  assert.equal(sanitizeParamValue(""), null);
  assert.equal(sanitizeParamValue("   "), null);
  assert.equal(sanitizeParamValue(null), null);
  assert.ok(ATTRIBUTION_PARAMS.includes("gclid"));
});
