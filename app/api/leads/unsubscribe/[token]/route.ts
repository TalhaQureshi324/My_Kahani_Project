import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { unsubscribeLead } from "@/lib/leads";

/**
 * GET /api/leads/unsubscribe/[token]
 *
 * One-click marketing unsubscribe from the nurture emails. Transactional
 * booking mail (confirmations, reminders, payment notices) is separate
 * and is NOT affected. Unknown tokens get the same neutral confirmation
 * as known ones — no address enumeration.
 */

function page(message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>True Self Me — Unsubscribe</title>
<style>
  body { font-family: Georgia, serif; background: #F5EFE6; color: #1A1A1A;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; }
  .card { background: #fff; border: 1px solid rgba(0,0,0,.08);
          border-radius: 16px; padding: 40px; max-width: 480px; text-align: center; }
  h1 { color: #5D1F13; font-size: 24px; margin-top: 0; }
  p { line-height: 1.6; color: rgba(26,26,26,.75); }
</style>
</head>
<body>
  <div class="card">
    <h1>True Self Me — Coaching &amp; Mentorship</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const neutral =
    "You have been unsubscribed from our coaching emails. Booking confirmations, reminders and payment notices for existing sessions are separate and will still be delivered if you have a session scheduled.";
  if (!isDatabaseConfigured) {
    return page("Signups are not connected right now. Please try again later.");
  }
  const { token } = await params;
  if (!token || token.length < 16) {
    return page(neutral);
  }
  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!lead) {
    return page(neutral);
  }
  await unsubscribeLead(supabase, lead.id);
  return page(neutral);
}
