import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/booking/confirm
 * Body: { booking_id, first_name, last_name, email, phone }
 *
 * Converts an active hold into a confirmed booking and upserts the
 * customer record. The WHERE clause re-checks status + expiry at the
 * database, so an expired/converted hold can never be confirmed.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const emailOk = (v: string) => /.+@.+\..+/.test(v);

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Online scheduling is not connected yet. Please contact us to book.",
      },
      { status: 503 },
    );
  }

  let body: {
    booking_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request body.");
  }

  const bookingId = body.booking_id ?? "";
  const firstName = (body.first_name ?? "").trim();
  const lastName = (body.last_name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!bookingId || !firstName || !lastName || !emailOk(email) || !phone) {
    return bad("Missing or invalid booking details.");
  }

  const supabase = getSupabaseAdmin();

  // Upsert the customer by email.
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (customerError || !customer) {
    console.error("[booking] customer upsert failed", customerError?.message);
    return NextResponse.json(
      { success: false, error: "Could not save your details. Please try again." },
      { status: 500 },
    );
  }

  // Convert hold → confirmed, re-checking status and expiry in the UPDATE
  // itself (atomic at the database level).
  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      customer_id: customer.id,
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "held")
    .gt("expires_at", new Date().toISOString())
    .select("slot_start, slot_end")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This hold has expired or was already confirmed. Please choose a time again.",
      },
      { status: 410 },
    );
  }

  // Mark the hold as converted in the audit table.
  await supabase
    .from("slot_holds")
    .update({ released_reason: "converted" })
    .eq("booking_id", bookingId)
    .is("released_reason", null);

  return NextResponse.json({
    success: true,
    booking_id: bookingId,
    status: "confirmed",
    slot: {
      start: updated.slot_start,
      end: updated.slot_end,
    },
  });
}
