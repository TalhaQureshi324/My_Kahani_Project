import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { hashManageToken } from "@/lib/bookingTokens";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/**
 * POST /api/booking/manage/[token]/cancel
 * Body: { reason?: "schedule_conflict" | "plans_changed" | "other" }
 *
 * Customer self-service cancellation. Atomic + idempotent via the
 * cancel_booking_by_hash database function. No charges are made in this
 * phase — the function only records whether the cancellation falls
 * inside the 24-hour late window.
 */

const REASONS = ["schedule_conflict", "plans_changed", "other"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const rl = rateLimit(`manage-cancel:${clientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { success: false, error: "Scheduling is not connected yet." },
      { status: 503 },
    );
  }
  const supabase = getSupabaseAdmin();

  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return NextResponse.json(
      { success: false, error: "Invalid manage link." },
      { status: 400 },
    );
  }

  let reason = "other";
  try {
    const body = await request.json();
    if (typeof body.reason === "string" && REASONS.includes(body.reason)) {
      reason = body.reason;
    }
  } catch {
    /* empty body is fine */
  }

  const tokenHash = hashManageToken(token);
  const { data, error } = await supabase.rpc("cancel_booking_by_hash", {
    p_manage_token_hash: tokenHash,
    p_cancelled_by: "customer",
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 },
      );
    }
    if (error.message.includes("ONLY_CONFIRMED_CAN_CANCEL")) {
      return NextResponse.json(
        {
          success: false,
          error: "This booking can no longer be cancelled from here.",
        },
        { status: 409 },
      );
    }
    console.error("[manage-cancel] failed", error.message);
    return NextResponse.json(
      { success: false, error: "Could not cancel the booking. Please try again." },
      { status: 500 },
    );
  }

  const row = (data ?? [])[0];
  return NextResponse.json({
    success: true,
    booking_reference: row?.booking_reference ?? null,
    slot_start: row?.slot_start ?? null,
    hours_before: row?.hours_before ?? null,
    cancellation_fee_eligible: row?.fee_eligible ?? false,
    status: "cancelled",
  });
}
