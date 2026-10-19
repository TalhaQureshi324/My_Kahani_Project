/**
 * Server-side pricing snapshot. Bookings store the agreed price at
 * booking time; historical bookings never re-read current pricing.
 */

export const SESSION_CURRENCY = "USD";

export const PRICING_SOURCE = "test_individual_v1_2026-09-30";

/** Default 50-minute consultation list price, in cents. */
export const SESSION_PRICE_CENTS = 10; // TEST PRICE — $0.10 for sandbox testing

/** Selectable booking tiers. */
export type BookingPackage = "single" | "bundle4";

/** 4-Session Introductory Package: $200 USD total ($50 per session). */
export const BUNDLE4_SESSIONS = 4;
export const BUNDLE4_PRICE_CENTS = 20000;
export const BUNDLE4_PRICING_SOURCE = "bundle4_2026-10-v1";
export const BUNDLE4_LABEL = "4 Virtual Sessions Bundle";

export function isBookingPackage(value: unknown): value is BookingPackage {
  return value === "single" || value === "bundle4";
}

/** Agreed price snapshot for a tier, in cents. */
export function priceCentsFor(pkg: BookingPackage): number {
  return pkg === "bundle4" ? BUNDLE4_PRICE_CENTS : SESSION_PRICE_CENTS;
}

/** Pricing-config identifier persisted with the booking snapshot. */
export function pricingSourceFor(pkg: BookingPackage): string {
  return pkg === "bundle4" ? BUNDLE4_PRICING_SOURCE : PRICING_SOURCE;
}

/** Human-facing tier name for summaries and emails. */
export function packageLabel(pkg: BookingPackage): string {
  return pkg === "bundle4" ? BUNDLE4_LABEL : "Initial consultation — 50 minutes";
}
