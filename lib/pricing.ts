/**
 * Server-side pricing snapshot. Bookings store the agreed price at
 * booking time; historical bookings never re-read current pricing.
 */

export const SESSION_CURRENCY = "USD";

export const PRICING_SOURCE = "test_individual_v1_2026-09-30";

/** Default 50-minute consultation list price, in cents. */
export const SESSION_PRICE_CENTS = 10; // TEST PRICE — $0.10 for sandbox testing
