/**
 * Booking credentials self-check — zero dependencies.
 *
 * Run AFTER filling your Authorize.Net credentials in .env.local and
 * restarting the server:
 *
 *   npm run booking:check            # checks http://localhost:3000
 *   npm run booking:check http://localhost:4827
 *
 * What it tells you:
 *   503 "not configured"             → .env.local missing or server not restarted
 *   E00007 "invalid authentication"  → API Login ID / Transaction Key are wrong
 *   token-related error (E00114 etc.) → credentials are VALID ✅ (only our test
 *                                       token is fake — now try the real
 *                                       booking flow in the browser)
 *   success + bookingId              → full end-to-end vault worked
 */

const base = process.argv[2] ?? "http://localhost:3000";

const res = await fetch(`${base}/api/booking/authorize`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Booking Check",
    email: "booking-check@trueselfme.test",
    phone: "5125550143",
    gclid: null,
    opaqueToken: {
      dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT",
      dataValue: "booking-check-invalid-token",
    },
    slotDetails: {
      dateISO: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      slotCSTHour: 9,
      durationMinutes: 50,
      format: "Virtual Video Consultation",
    },
  }),
});

const data = await res.json().catch(() => ({}));
const text = String(data.error ?? "");

if (res.status === 503) {
  console.error("❌ Not configured — fill your Authorize.Net credentials in .env.local and restart the server.");
  process.exit(1);
}
if (res.status === 400) {
  console.error("❌ Route rejected the request payload:", text);
  process.exit(1);
}
if (/invalid authentication values/i.test(text)) {
  console.error("❌ Credentials are INVALID (E00007). Double-check AUTHORIZENET_API_LOGIN_ID and AUTHORIZENET_TRANSACTION_KEY in .env.local, restart, and re-run.");
  process.exit(1);
}
if (res.status === 502) {
  console.log("✅ Credentials are VALID — Authorize.Net accepted the request and only rejected our deliberately fake card token (" + text + ").");
  console.log("   Your .env.local is correct. Open the booking flow in the browser and make a real test-card reservation.");
  process.exit(0);
}
if (data.success) {
  console.log("✅ Full end-to-end vault succeeded — bookingId:", data.bookingId);
  process.exit(0);
}

console.log("Unrecognised response:", res.status, text || "(no error text)");
process.exit(1);
