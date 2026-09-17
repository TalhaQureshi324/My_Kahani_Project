import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { generateSlots, chicagoDateOf } from "@/lib/scheduling";
import { hashManageToken } from "@/lib/bookingTokens";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/**
 * POST /api/booking/manage/[token]/reschedule
 * Body: { slot_start: UTC ISO, slot_end: UTC ISO }
 *
 * Atomically moves a confirmed booking to a new slot:
 * 1. server-side validation that the new slot is genuinely bookable
 *    (own booking excluded from the busy set),
 * 2. single guarded UPDATE — the exclusion constraint re-validates the
 *    new range against every other active booking at the database level,
 * 3. old reminders cancelled + fresh ones created by the RPC function,
 * 4. a reschedule confirmation email job is queued.
 *
 * The old appointment is never released unless the move succeeds.
 */

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const rl = rateLimit(`manage-reschedule:${clientIp(request)}`, 20, 60_000);
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

  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return NextResponse.json(
      { success: false, error: "Invalid manage link." },
      { status: 400 },
    );
  }

  let body: { slot_start?: string; slot_end?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }

  const slotStart = body.slot_start ?? "";
  const slotEnd = body.slot_end ?? "";
  const startDate = new Date(slotStart);
  const endDate = new Date(slotEnd);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate ||
    startDate.getTime() <= Date.now()
  ) {
    return fail("Invalid or past slot times.");
  }

  const supabase = getSupabaseAdmin();
  const tokenHash = hashManageToken(token);

  // Locate the booking by manage-token hash (ownership proof).
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_reference, status, email, first_name, last_name")
    .eq("manage_token_hash", tokenHash)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { success: false, error: "Booking not found." },
      { status: 404 },
    );
  }
  if (booking.status !== "confirmed") {
    return fail("Only confirmed bookings can be rescheduled.", 409);
  }

  await supabase.rpc("release_expired_holds");

  // Server-side slot validation: the new slot must be a genuinely
  // bookable slot (rules − exceptions − other bookings), with this
  // booking excluded from the busy set.
  const newChicagoDate = chicagoDateOf(startDate);
  const [rulesRes, exceptionsRes, bookingsRes] = await Promise.all([
    supabase.from("availability_rules").select("*").eq("active", true),
    supabase
      .from("availability_exceptions")
      .select("*")
      .lte("starts_at", `${newChicagoDate}T23:59:59Z`)
      .gte("ends_at", `${newChicagoDate}T00:00:00Z`),
    supabase
      .from("bookings")
      .select("slot_start, slot_end")
      .in("status", ["held", "confirmed"])
      .neq("id", booking.id)
      .gte("slot_start", `${newChicagoDate}T00:00:00Z`)
      .lte("slot_start", `${newChicagoDate}T23:59:59Z`),
  ]);
  if (rulesRes.error || exceptionsRes.error || bookingsRes.error) {
    return fail("Could not verify availability. Please try again.", 500);
  }

  const bookableSlots = generateSlots({
    fromISO: newChicagoDate,
    toISO: newChicagoDate,
    rules: (rulesRes.data ?? []) as never[],
    exceptions: (exceptionsRes.data ?? []) as never[],
    busy: [
      ...(bookingsRes.data ?? []).map(
        (b: { slot_start: string; slot_end: string }) => ({
          start: new Date(b.slot_start).toISOString(),
          end: new Date(b.slot_end).toISOString(),
        }),
      ),
    ],
    now: new Date(),
  });

  const isBookable = bookableSlots.some(
    (s) => s.start === slotStart && s.end === slotEnd,
  );
  if (!isBookable) {
    return NextResponse.json(
      { success: false, error: "That time is not available." },
      { status: 409 },
    );
  }

  // Atomically move the booking: the RPC re-validates status/ownership,
  // cancels old reminders, creates fresh ones, and the exclusion
  // constraint re-validates the new range at the database level.
  const { data: moved, error: moveError } = await supabase.rpc(
    "reschedule_booking_by_hash",
    {
      p_manage_token_hash: tokenHash,
      p_new_start: slotStart,
      p_new_end: slotEnd,
      p_manage_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/booking/manage/${token}`,
      p_client_timezone: "America/Chicago",
    },
  );

  if (moveError || !moved) {
    const conflict = /23P01|exclusion/i.test(moveError?.message ?? "");
    return NextResponse.json(
      {
        success: false,
        error: conflict
          ? "That time was just taken. Please pick another slot."
          : "Could not reschedule. Please try again.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  await supabase.from("booking_operations").upsert(
    {
      booking_id: booking.id,
      operation: "reschedule",
      provider_reference: slotStart,
      status: "done",
    },
    { onConflict: "booking_id,operation" },
  );

  // Old reminders were cancelled + new ones created by reschedule_booking_by_hash.
  // Queue the reschedule confirmation email.
  await supabase.from("notification_jobs").insert({
    booking_id: booking.id,
    type: "reschedule",
    payload: {
      to_email: booking.email ?? "",
      first_name: booking.first_name ?? "",
      new_slot_start: slotStart,
      new_slot_end: slotEnd,
      manage_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/booking/manage/${token}`,
      client_timezone: "America/Chicago",
    },
    status: "pending",
    run_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    booking_reference: booking.booking_reference,
    slot: { start: slotStart, end: slotEnd },
  });
}
