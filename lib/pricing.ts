/**
 * Server-side pricing snapshot. Bookings store the agreed price at
 * booking time; historical bookings never re-read current pricing.
 */

export const SESSION_CURRENCY = "USD";

export const PRICING_SOURCE = "standard_individual_v1_2026-09";

/** Default 50-minute consultation list price, in cents. */
export const SESSION_PRICE_CENTS = 12500;
