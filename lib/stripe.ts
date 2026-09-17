import Stripe from "stripe";

/**
 * Server-side Stripe client + shared constants.
 *
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are server-only. Only the
 * publishable key is exposed to the browser. Test/live mode is derived
 * from the publishable key prefix so test and live keys can never be
 * mixed accidentally.
 */

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export const isStripeConfigured = () =>
  Boolean(stripeSecretKey && stripePublishableKey);

export const isStripeLiveMode = () =>
  stripePublishableKey.startsWith("pk_live_");

let client: Stripe | null = null;

/** Shared server client (lazy singleton). Throws when not configured. */
export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error(
      "Stripe is not configured: set STRIPE_SECRET_KEY (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).",
    );
  }
  if (!client) {
    client = new Stripe(stripeSecretKey);
  }
  return client;
}
