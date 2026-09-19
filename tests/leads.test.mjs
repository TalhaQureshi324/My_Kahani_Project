/**
 * Phase 8 tests — lead capture, nurture & communication automation.
 *
 * Pure-layer coverage: email/phone normalization, nurture schedule,
 * send gating (booking stops, unsubscribe stops, consent required),
 * crisis screening, unsubscribe tokens, and template content rules
 * (non-clinical copy, CTAs, no Stripe secrets in payment mail).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLeadEmail,
  normalizeLeadName,
  normalizeLeadPhone,
  canSendNurture,
  nurtureSchedule,
  generateUnsubscribeToken,
  containsCrisisTerms,
  crisisTerms,
} from "../lib/leads.ts";
import {
  leadWelcomeEmail,
  leadNurtureEmail2,
  leadNurtureEmail3,
  paymentSucceededEmail,
  paymentFailedEmail,
  paymentActionRequiredEmail,
  refundCompletedEmail,
  emergencyInfoEmail,
} from "../lib/email/templates.ts";

const nurturingLead = {
  id: "lead-1",
  first_name: "Dana",
  email: "dana@example.com",
  status: "nurturing",
  email_consent: true,
  unsubscribed_at: null,
};

/* ── capture normalization ───────────────────────────────────────────── */

test("lead email normalization: trim + lowercase, invalid rejected", () => {
  assert.equal(normalizeLeadEmail("  Dana@Example.COM "), "dana@example.com");
  assert.equal(normalizeLeadEmail("nope"), null);
  assert.equal(normalizeLeadEmail(""), null);
  assert.equal(normalizeLeadEmail(null), null);
});

test("lead name: trimmed, capped, empty rejected", () => {
  assert.equal(normalizeLeadName("  Dana  "), "Dana");
  assert.equal(normalizeLeadName("   "), null);
  assert.equal(normalizeLeadName("x".repeat(200)).length, 80);
});

test("lead phone: digits normalized to E.164, junk rejected", () => {
  assert.equal(normalizeLeadPhone("(555) 555-0100"), "+5555550100");
  assert.equal(normalizeLeadPhone("123"), null);
  assert.equal(normalizeLeadPhone(undefined), null);
});

/* ── duplicate leads ─────────────────────────────────────────────────── */

test("duplicate lead: normalized email is the dedup key", () => {
  // 'Dana@Example.com' and 'dana@example.com' collapse to the same key,
  // so a second signup can never create a second nurture stream.
  assert.equal(
    normalizeLeadEmail("Dana@Example.com"),
    normalizeLeadEmail("  dana@example.com "),
  );
});

/* ── nurture schedule ────────────────────────────────────────────────── */

test("nurture schedule: immediately, ~2 days, ~5 days", () => {
  const base = new Date("2026-09-19T12:00:00Z");
  const schedule = nurtureSchedule(base);
  assert.deepEqual(
    schedule.map((s) => s.type),
    ["lead_email_1", "lead_email_2", "lead_email_3"],
  );
  assert.equal(schedule[0].runAt.toISOString(), "2026-09-19T12:00:00.000Z");
  assert.equal(schedule[1].runAt.toISOString(), "2026-09-21T12:00:00.000Z");
  assert.equal(schedule[2].runAt.toISOString(), "2026-09-24T12:00:00.000Z");
});

/* ── send gating ─────────────────────────────────────────────────────── */

test("nurture gating: new/nurturing send; booking, unsubscribe, archive stop", () => {
  assert.equal(canSendNurture(nurturingLead), true);
  assert.equal(canSendNurture({ ...nurturingLead, status: "new" }), true);
  assert.equal(canSendNurture({ ...nurturingLead, status: "booked" }), false);
  assert.equal(canSendNurture({ ...nurturingLead, status: "unsubscribed" }), false);
  assert.equal(
    canSendNurture({ ...nurturingLead, status: "invalid" }),
    false,
  );
  assert.equal(
    canSendNurture({ ...nurturingLead, status: "archived" }),
    false,
  );
  assert.equal(
    canSendNurture({ ...nurturingLead, email_consent: false }),
    false,
  );
});

/* ── unsubscribe token ───────────────────────────────────────────────── */

test("nurture gating: unsubscribed_at blocks even with a live status", () => {
  assert.equal(
    canSendNurture({
      ...nurturingLead,
      unsubscribed_at: new Date().toISOString(),
    }),
    false,
  );
});

/* ── unsubscribe token ───────────────────────────────────────────────── */

test("unsubscribe tokens: 64-char url-safe hex, unique per call", () => {
  const a = generateUnsubscribeToken();
  const b = generateUnsubscribeToken();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, b);
});

/* ── crisis screening ────────────────────────────────────────────────── */

test("crisis screening: configured terms detected case-insensitively", () => {
  delete process.env.CRISIS_TERMS;
  assert.equal(containsCrisisTerms("sometimes I think about suicide"), true);
  assert.equal(containsCrisisTerms("I want to end my life"), true);
  assert.equal(containsCrisisTerms("Self-Harm is mentioned here"), true);
  assert.equal(containsCrisisTerms("I had a hard week at work"), false);
  assert.equal(containsCrisisTerms(null), false);
  assert.equal(containsCrisisTerms(""), false);
});

test("crisis terms: env override replaces the default list", () => {
  process.env.CRISIS_TERMS = "hopeline, distress";
  assert.deepEqual(crisisTerms(), ["hopeline", "distress"]);
  assert.equal(containsCrisisTerms("feeling distress today"), true);
  assert.equal(containsCrisisTerms("thinking about suicide"), false);
  delete process.env.CRISIS_TERMS;
});

test("crisis response email: real resources, no automated advice", () => {
  const mail = emergencyInfoEmail("Dana");
  assert.match(mail.text, /988/);
  assert.match(mail.text, /911/);
  assert.match(mail.text, /not an emergency service/);
  assert.match(mail.subject, /support resources/i);
});

/* ── nurture template content rules ──────────────────────────────────── */

const CLINICAL_PATTERNS = /diagnos|treatm|therapy|therapist|cure|disorder|prescrib|mental illness/i;

test("nurture emails: non-clinical copy, booking CTA, unsubscribe link", () => {
  const data = {
    firstName: "Dana",
    bookUrl: "https://trueselfme.com/book",
    unsubscribeUrl: "https://trueselfme.com/api/leads/unsubscribe/tok",
  };
  for (const mail of [
    leadWelcomeEmail(data),
    leadNurtureEmail2(data),
    leadNurtureEmail3(data),
  ]) {
    assert.equal(CLINICAL_PATTERNS.test(mail.html), false, mail.subject);
    assert.equal(CLINICAL_PATTERNS.test(mail.text), false, mail.subject);
    assert.ok(mail.html.includes(data.bookUrl), "booking CTA present");
    assert.ok(mail.html.includes(data.unsubscribeUrl), "unsubscribe link present");
    assert.ok(mail.text.includes(data.unsubscribeUrl), "text version has it too");
  }
});

test("nurture emails: no health promises", () => {
  const data = {
    firstName: "Dana",
    bookUrl: "https://trueselfme.com/book",
    unsubscribeUrl: "https://trueselfme.com/api/leads/unsubscribe/tok",
  };
  const banned = /anxiety|depression|heal your|fix your|trauma/i;
  for (const mail of [
    leadWelcomeEmail(data),
    leadNurtureEmail2(data),
    leadNurtureEmail3(data),
  ]) {
    assert.equal(banned.test(mail.html), false, mail.subject);
    assert.equal(banned.test(mail.text), false, mail.subject);
  }
});

/* ── transactional payment templates ─────────────────────────────────── */

test("payment templates: no Stripe secrets, secure links only", () => {
  const manageUrl = "https://trueselfme.com/booking/manage/tok123";
  const mails = [
    paymentFailedEmail({
      firstName: "Dana",
      bookingReference: "TSM-1",
      manageUrl,
    }),
    paymentActionRequiredEmail({
      firstName: "Dana",
      bookingReference: "TSM-1",
      manageUrl,
    }),
  ];
  for (const mail of mails) {
    const text = mail.html + mail.text + mail.subject;
    assert.equal(text.includes("client_secret"), false);
    assert.equal(/pi_[A-Za-z0-9]/.test(text), false);
    assert.equal(/pm_[A-Za-z0-9]/.test(text), false);
    assert.ok(text.includes(manageUrl), "secure manage link present");
  }
});

test("payment action required email asks for bank verification, not new details", () => {
  const mail = paymentActionRequiredEmail({
    firstName: "Dana",
    bookingReference: "TSM-1",
    manageUrl: "https://trueselfme.com/booking/manage/tok",
  });
  assert.match(mail.subject, /one quick step/i);
  assert.match(mail.text, /verification step/i);
});

test("payment success + refund emails report the actual amount", () => {
  const paid = paymentSucceededEmail({
    firstName: "Dana",
    amount: "$150.00",
    bookingReference: "TSM-1",
  });
  assert.match(paid.subject, /\$150\.00/);
  const refunded = refundCompletedEmail({
    firstName: "Dana",
    amount: "$75.00",
    bookingReference: "TSM-1",
  });
  assert.match(refunded.subject, /\$75\.00/);
  assert.match(refunded.text, /few business days/i);
});
