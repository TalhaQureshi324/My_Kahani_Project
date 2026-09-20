/**
 * Phase 10 tests — Google Ads campaign configuration guardrails.
 *
 * Enforces the constraints Google applies in the UI plus the rules the
 * practice cares about: RSA length limits, no clinical/guarantee
 * language in ad copy, phrase/exact-only keywords, safe negatives
 * (never the whole-category killers), and landing-page mapping.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  campaign,
  adGroups,
  futureAdGroups,
  campaignNegatives,
  RSA_LIMITS,
} from "../lib/googleAdsCampaign.ts";
import { landingPages } from "../lib/landingPages.ts";

test("campaign settings: paused build, search-only, presence US, 24/7", () => {
  assert.match(campaign.status, /PAUSED/);
  assert.equal(campaign.networks.search, true);
  assert.equal(campaign.networks.searchPartners, false);
  assert.equal(campaign.networks.displayExpansion, false);
  assert.match(campaign.location.option, /Presence/);
  assert.match(campaign.schedule, /24\/7/);
  assert.match(campaign.bidding.strategy, /Maximize Conversions/);
  assert.ok(!/Target CPA/i.test(campaign.bidding.strategy));
  assert.match(campaign.bidding.primary, /booking_confirmed/);
});

test("three live ad groups map to real indexed landing pages", () => {
  const names = adGroups.map((g) => g.name);
  assert.deepEqual(names.sort(), ["Career Coaching", "Coaching for Dads", "Relationship Coaching"].sort());
  for (const g of adGroups) {
    const page = landingPages[g.landingPath.replace(/^\//, "")];
    assert.ok(page, `no landing page config for ${g.landingPath}`);
    assert.equal(page.noindex ?? false, false, `${g.landingPath} must be indexable`);
  }
  // Future ad group is documented but NOT part of the initial build.
  assert.equal(adGroups.some((g) => g.name.includes("Men's")), false);
  assert.match(futureAdGroups[0].note, /noindex/);
});

test("keywords: exact/phrase only, no broad match", () => {
  for (const g of adGroups) {
    assert.ok(g.keywords.length >= 5, `${g.name} too few keywords`);
    for (const k of g.keywords) {
      assert.ok(k.match === "exact" || k.match === "phrase");
      assert.equal(k.text.includes("*"), false, "broad match leaked in");
      if (k.match === "exact") assert.ok(k.text.startsWith("[") && k.text.endsWith("]"));
      if (k.match === "phrase") assert.ok(k.text.startsWith('"') && k.text.endsWith('"'));
    }
  }
});

test("RSAs respect Google limits", () => {
  for (const g of adGroups) {
    const { headlines, descriptions } = g.rsa;
    assert.ok(headlines.length >= RSA_LIMITS.headlines.min);
    assert.ok(headlines.length <= RSA_LIMITS.headlines.max);
    assert.ok(descriptions.length >= RSA_LIMITS.descriptions.min);
    assert.ok(descriptions.length <= RSA_LIMITS.descriptions.max);
    for (const h of headlines) {
      assert.ok(h.length <= RSA_LIMITS.headlines.maxChars, `headline >30 (${h.length}): ${h}`);
    }
    for (const d of descriptions) {
      assert.ok(d.length <= RSA_LIMITS.descriptions.maxChars, `description >90 (${d.length}): ${d}`);
    }
  }
});

test("ad copy: no clinical claims, no guarantees, truthful credential framing", () => {
  const forbidden = /therap|diagnos|medical|prescrib|cures?|guarantee|licensed|100%/i;
  for (const g of adGroups) {
    for (const h of g.rsa.headlines) {
      assert.equal(forbidden.test(h), false, `headline violation: ${h}`);
    }
    for (const d of g.rsa.descriptions) {
      assert.equal(forbidden.test(d), false, `description violation: ${d}`);
    }
  }
  // Credential claims stay truthful: CPCAB as training, never a licence.
  const hasTrainingFraming = adGroups.every((g) =>
    g.rsa.headlines.some((h) => h.includes("CPCAB")),
  );
  assert.equal(hasTrainingFraming, true);
});

test("negative keywords: block junk and crisis, never the core nouns", () => {
  const texts = campaignNegatives.map((n) => n.text.toLowerCase());
  for (const mustBlock of ["free", "jobs", "salary", "training", "certification", "course", "degree", "school", "university", "become a coach", "suicide", "988", "self-harm", "therapy"]) {
    assert.ok(
      texts.some((t) => t.includes(mustBlock)),
      `missing expected negative: ${mustBlock}`,
    );
  }
  // Whole-category killers must never be added.
  for (const dangerous of ['"coach"', '"coaching"', '"career"', '"dad"', '"relationship"']) {
    assert.equal(texts.includes(dangerous), false, `overbroad negative would strangle the campaign: ${dangerous}`);
  }
});
