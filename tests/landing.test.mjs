/**
 * Phase 9 tests — Google Ads landing page configuration.
 *
 * Guards the content rules that matter legally and commercially:
 * unique slugs, required sections, non-clinical positioning in all
 * marketing copy (disclaimers are exempt — they negate clinical
 * claims), booking CTA present, and the prepared draft route status.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  landingPages,
  indexedLandingSlugs,
  getLandingPage,
  BOOKING_URL,
  NON_CLINICAL_DISCLAIMER,
  EMERGENCY_DISCLAIMER,
} from "../lib/landingPages.ts";

const LIVE_SLUGS = ["coaching-for-dads", "career-coaching", "relationship-coaching"];

/** Clinical-claim patterns that must NOT appear in marketing copy. */
const CLINICAL_CLAIMS = /psychotherap|licensed therapis|licensed therap\b|clinical diagnosis|medical treatment|treats|treatment for|cures?|diagnose you/i;

function marketingText(p) {
  return [
    p.hero.eyebrow,
    p.hero.h1,
    p.hero.subhead,
    p.goalsIntro,
    ...p.goals.map((g) => `${g.title} ${g.text}`),
    p.approachHeading,
    ...p.approachParagraphs,
    ...p.credentialsLines,
    p.ctaHeading,
    p.ctaText,
  ].join("\n");
}

test("all required routes have configs with unique slugs", () => {
  const slugs = Object.keys(landingPages);
  assert.deepEqual(
    [...slugs].sort(),
    ["career-coaching", "coaching-for-dads", "mens-life-coaching", "relationship-coaching"].sort(),
  );
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every page has all required sections and metadata", () => {
  for (const p of Object.values(landingPages)) {
    assert.ok(p.meta.title.length >= 20 && p.meta.title.length <= 70, `title length: ${p.slug}`);
    assert.ok(p.meta.description.length >= 50 && p.meta.description.length <= 165, `description length: ${p.slug}`);
    assert.ok(p.hero.h1.length > 15);
    assert.ok(p.goals.length >= 4);
    assert.ok(p.approachParagraphs.length >= 2);
    assert.ok(p.credentialsLines.length >= 2);
    assert.ok(p.faq.length >= 4);
    assert.ok(p.ctaText.length > 20);
  }
});

test("marketing copy makes no clinical claims", () => {
  for (const p of Object.values(landingPages)) {
    const text = marketingText(p);
    assert.equal(
      CLINICAL_CLAIMS.test(text),
      false,
      `clinical-claim language found in ${p.slug}: ${text.match(CLINICAL_CLAIMS)?.[0]}`,
    );
  }
});

test("disclaimers negate clinical claims on every page's FAQ", () => {
  for (const p of Object.values(landingPages)) {
    const joined = p.faq.map((f) => `${f.q} ${f.a}`).join("\n");
    assert.match(joined, /not psychotherapy|non-clinical|not clinical/i);
  }
});

test("disclaimer constants are present and correct", () => {
  assert.match(NON_CLINICAL_DISCLAIMER, /not psychotherapy, clinical diagnosis, medical treatment or licensed therapy/);
  assert.match(EMERGENCY_DISCLAIMER, /988/);
  assert.match(EMERGENCY_DISCLAIMER, /911/);
  assert.match(EMERGENCY_DISCLAIMER, /not an emergency service/);
});

test("booking CTA targets the existing funnel entry", () => {
  assert.equal(BOOKING_URL, "/book");
  for (const p of Object.values(landingPages)) {
    assert.match(p.hero.primaryCta, /book/i);
  }
});

test("truthful credentials: CPCAB framed as training, not licence", () => {
  for (const p of Object.values(landingPages)) {
    const creds = p.credentialsLines.join("\n");
    assert.match(creds, /CPCAB/);
    assert.match(creds, /not a clinical licence/);
    assert.match(creds, /20\+ years|MBA/);
  }
});

test("mens-life-coaching is a prepared noindex draft", () => {
  const p = getLandingPage("mens-life-coaching");
  assert.ok(p);
  assert.equal(p.noindex, true);
  assert.equal(indexedLandingSlugs.includes("mens-life-coaching"), false);
  for (const slug of LIVE_SLUGS) {
    assert.equal(getLandingPage(slug)?.noindex ?? false, false);
    assert.ok(indexedLandingSlugs.includes(slug));
  }
});
