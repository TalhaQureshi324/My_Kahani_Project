/**
 * Stripe-era booking self-check — zero dependencies.
 *
 *   npm run booking:check            # checks http://localhost:3000
 *   npm run booking:check http://localhost:4827
 *
 * Verifies the pieces a live booking depends on:
 *   1. Server reachable + database connected (availability endpoint answers).
 *   2. Stripe keys present in .env.local (publishable + secret, both test/live
 *      consistently).
 *
 * The full card-on-file flow (hold → details → SetupIntent → Payment Element
 * → verify → confirmed) is exercised manually in the browser with Stripe's
 * 4242 4242 4242 4242 test card.
 */

const base = process.argv[2] ?? "http://localhost:3000";

// 1. Availability (proves server + Supabase connection).
let availabilityOk = false;
try {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const res = await fetch(`${base}/api/availability?from=${from}&to=${to}`);
  availabilityOk = res.ok;
  if (!res.ok) {
    console.error(`❌ /api/availability answered ${res.status} — check Supabase env vars and that the migrations ran.`);
  }
} catch {
  console.error(`❌ Server not reachable at ${base} — is \`npm run dev\` running?`);
}
if (availabilityOk) {
  console.log("✅ Server reachable and Supabase availability query works.");
}

// 2. Stripe env sanity (read directly from .env.local).
import { readFileSync } from "node:fs";
let env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("❌ .env.local not found in this directory.");
}
const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const sk = env.STRIPE_SECRET_KEY ?? "";
const mode = (k) => (k.startsWith("pk_test") || k.startsWith("sk_test") ? "test" : k.startsWith("pk_live") || k.startsWith("sk_live") ? "live" : "?");
if (!pk || !sk) {
  console.error("❌ Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or STRIPE_SECRET_KEY in .env.local.");
} else if (mode(pk) !== mode(sk)) {
  console.error(`❌ Key mode mismatch: publishable is ${mode(pk)}, secret is ${mode(sk)}. Both must be test (or both live).`);
} else {
  console.log(`✅ Stripe keys present and consistent (${mode(sk)} mode).`);
  console.log("   Card-on-file flow: use test card 4242 4242 4242 4242, any future expiry, any CVC.");
}

if (!availabilityOk || !pk || !sk || mode(pk) !== mode(sk)) process.exit(1);
