import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 8 — lead capture + email nurture, pure layer.
 *
 * A lead is a visitor who is not ready to book. Nurture emails are
 * MARKETING: they require their own email consent, they stop the moment
 * the same email address books (booking confirmation is the business
 * event — Stripe card setup alone never triggers or stops marketing),
 * and they stop immediately on unsubscribe.
 */

export const LEAD_STATUSES = [
  "new",
  "nurturing",
  "booked",
  "unsubscribed",
  "invalid",
  "archived",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Only these statuses may receive nurture email. */
export const NURTURE_STATUSES: LeadStatus[] = ["new", "nurturing"];

/** Nurture cadence in days after capture (email 1 immediately). */
export const NURTURE_SCHEDULE_DAYS = [0, 2, 5];

export type LeadRecord = {
  id: string;
  first_name: string;
  email: string;
  status: LeadStatus;
  email_consent: boolean;
  unsubscribed_at: string | null;
};

/** Normalized dedup key: trimmed + lowercase. Null when unusable. */
export function normalizeLeadEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const value = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** Basic name sanity: trimmed, capped, non-empty after trim. */
export function normalizeLeadName(name: string | null | undefined): string | null {
  if (!name) return null;
  const value = name.trim().slice(0, 80);
  return value.length > 0 ? value : null;
}

export function normalizeLeadPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  const rest = digits.replace(/\+/g, "");
  if (!rest || rest.length < 8 || rest.length > 15) return null;
  return `+${rest}`;
}

/**
 * May THIS lead receive the next nurture email right now?
 * Booking wins (status left the nurture set), unsubscribe wins, and the
 * lead must hold email consent. Unsubscribed_at is checked explicitly so
 * a stale status can never send.
 */
export function canSendNurture(lead: LeadRecord): boolean {
  if (lead.unsubscribed_at) return false;
  if (!lead.email_consent) return false;
  return NURTURE_STATUSES.includes(lead.status);
}

/**
 * The three nurture jobs for a fresh lead, with run times relative to
 * `base` (capture moment): immediately, ~2 days, ~5 days.
 */
export function nurtureSchedule(base: Date = new Date()): Array<{
  type: "lead_email_1" | "lead_email_2" | "lead_email_3";
  runAt: Date;
}> {
  return NURTURE_SCHEDULE_DAYS.map((days, index) => ({
    type: `lead_email_${index + 1}` as "lead_email_1" | "lead_email_2" | "lead_email_3",
    runAt: new Date(base.getTime() + days * 86_400_000),
  }));
}

/** Opaque unsubscribe token (256-bit, url-safe hex). */
export function generateUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Crisis screening for free-text input. The site deliberately collects
 * no clinical information; if a configured emergency term ever appears
 * in free text, we respond with pre-defined emergency information and
 * route the message to human review — never automated advice, and such
 * text must never reach advertising systems.
 */
export function crisisTerms(): string[] {
  const configured = (process.env.CRISIS_TERMS ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0
    ? configured
    : [
        "suicide",
        "suicidal",
        "kill myself",
        "end my life",
        "self-harm",
        "self harm",
        "hurt myself",
      ];
}

export function containsCrisisTerms(text: string | null | undefined): boolean {
  if (!text) return false;
  const value = text.toLowerCase();
  return crisisTerms().some((term) => value.includes(term));
}

/* ── server-side database helpers (supabase-js) ──────────────────────── */

/**
 * The business event that stops marketing: the same email booked.
 * Marks matching nurture-eligible leads as booked and cancels any
 * pending lead_email_* jobs for them. Card-on-file setup alone never
 * calls this — only an actual booking confirmation does.
 */
export async function stopNurtureForEmail(
  supabase: SupabaseClient,
  rawEmail: string,
): Promise<void> {
  const email = normalizeLeadEmail(rawEmail);
  if (!email) return;

  const { data: leads } = await supabase
    .from("leads")
    .update({
      status: "booked",
      booked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .in("status", ["new", "nurturing"])
    .select("id");

  const ids = ((leads ?? []) as Array<{ id: string }>).map((l) => l.id);
  if (ids.length === 0) return;

  await supabase
    .from("notification_jobs")
    .update({ status: "cancelled" })
    .in("lead_id", ids)
    .in("type", ["lead_email_1", "lead_email_2", "lead_email_3"])
    .in("status", ["pending", "processing"]);
}

/** Marks a lead unsubscribed and cancels its pending nurture jobs. */
export async function unsubscribeLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  await supabase
    .from("leads")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await supabase
    .from("notification_jobs")
    .update({ status: "cancelled" })
    .eq("lead_id", leadId)
    .in("type", ["lead_email_1", "lead_email_2", "lead_email_3"])
    .in("status", ["pending", "processing"]);
}
