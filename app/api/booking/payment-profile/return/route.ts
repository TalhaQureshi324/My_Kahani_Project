import { NextResponse } from "next/server";

/**
 * GET /api/booking/payment-profile/return?booking_id=...
 *
 * Authorize.net redirects the hosted payment iframe here after the
 * payment profile is saved. Because this page is served from OUR origin,
 * it can postMessage the parent booking panel — which then triggers the
 * server-side verification — and show a short confirmation inline.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("booking_id") ?? "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment method saved — True Self Me</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; background: #F5EFE6;
             color: #1A1A1A; display: flex; align-items: center; justify-content: center;
             min-height: 100vh; margin: 0; text-align: center; }
      .box { padding: 24px; }
      .ok { font-size: 40px; }
      p { margin: 8px 0; }
      .muted { color: #6b5d52; font-size: 14px; font-family: Arial, sans-serif; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="ok">&#10003;</div>
      <h1 style="font-size: 22px; margin: 12px 0;">Payment method saved</h1>
      <p class="muted">You can close this panel — finishing your booking…</p>
    </div>
    <script>
      (function () {
        var payload = { source: "trueselfme", type: "payment_profile_saved"${
          bookingId ? `, booking_id: ${JSON.stringify(bookingId)}` : ""
        } };
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(payload, window.location.origin);
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
