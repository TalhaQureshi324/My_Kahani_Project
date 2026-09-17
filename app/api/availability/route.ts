import { NextResponse } from "next/server";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/supabase";
import { generateSlots, addDaysISO, todayChicago } from "@/lib/scheduling";
import type { AvailabilityRule, AvailabilityException } from "@/lib/scheduling";

/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD[&tz=Area/City]
 *
 * Returns only bookable slots: generated from the availability rules
 * minus exceptions minus already-booked/held time, filtered to the
 * future and the 60-day booking horizon.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      {
        configured: false,
        slots: [],
        error:
          "Online scheduling is not connected yet. Please contact us to book.",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const tz = url.searchParams.get("tz") ?? "America/Chicago";
  const today = todayChicago();
  const from = url.searchParams.get("from") ?? today;
  const to = url.searchParams.get("to") ?? addDaysISO(from, 30);

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(from) || !dateRe.test(to) || to < from) {
    return bad("Invalid date range.");
  }

  const supabase = getSupabaseAdmin();

  // Opportunistic auto-release of stale holds so their slots reopen.
  await supabase.rpc("release_expired_holds");

  const [rulesRes, exceptionsRes, bookingsRes] = await Promise.all([
    supabase.from("availability_rules").select("*").eq("active", true),
    supabase
      .from("availability_exceptions")
      .select("*")
      .lte("starts_at", `${to}T23:59:59Z`)
      .gte("ends_at", `${from}T00:00:00Z`),
    supabase
      .from("bookings")
      .select("slot_start, slot_end, status")
      .in("status", ["held", "confirmed"])
      .gt("slot_end", `${from}T00:00:00Z`)
      .lt("slot_start", `${to}T23:59:59Z`),
  ]);

  if (rulesRes.error || exceptionsRes.error || bookingsRes.error) {
    // Migration not yet applied (tables missing) or transient failure —
    // surface the graceful "not connected" state to the scheduler.
    console.error("[availability] query failed", {
      rules: rulesRes.error?.message,
      exceptions: exceptionsRes.error?.message,
      bookings: bookingsRes.error?.message,
    });
    return NextResponse.json(
      {
        configured: false,
        slots: [],
        error:
          "Online scheduling is not connected yet. Please contact us to book.",
      },
      { status: 503 },
    );
  }

  const slots = generateSlots({
    fromISO: from,
    toISO: to,
    rules: (rulesRes.data ?? []) as unknown as AvailabilityRule[],
    exceptions: (exceptionsRes.data ?? []) as unknown as AvailabilityException[],
    busy: (bookingsRes.data ?? []).map((b: { slot_start: string; slot_end: string }) => ({
      start: new Date(b.slot_start).toISOString(),
      end: new Date(b.slot_end).toISOString(),
    })),
  });

  // Visitor-local display strings are computed on the client from UTC.
  void tz;

  return NextResponse.json({
    configured: true,
    timezone: "America/Chicago",
    from,
    to,
    slots: slots.map((s) => ({
      start: s.start,
      end: s.end,
      chicago_date: s.chicago_date,
    })),
  });
}

export const dynamic = "force-dynamic";
