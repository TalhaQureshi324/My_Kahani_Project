// Scheduling engine tests — pure logic, no database required.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chicagoWallTimeToUtc,
  chicagoDateOf,
  generateSlots,
  addDaysISO,
} from "../lib/scheduling.ts";

const WEEKDAY_RULES = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, start_time: "09:00", end_time: "12:00", active: true },
  { weekday, start_time: "13:00", end_time: "17:00", active: true },
]);

const NOW = new Date("2026-09-16T12:00:00Z"); // fixed "today" for determinism

function slotsFor(fromISO, toISO, opts = {}) {
  return generateSlots({
    fromISO,
    toISO,
    rules: opts.rules ?? WEEKDAY_RULES,
    exceptions: opts.exceptions ?? [],
    busy: opts.busy ?? [],
    now: opts.now ?? NOW,
  });
}

test("DST spring forward: same 9 AM wall time, UTC shifts 15:00Z → 14:00Z", () => {
  // America/Chicago: CST (UTC-6) before 2026-03-08, CDT (UTC-5) after.
  const before = chicagoWallTimeToUtc("2026-03-06", "09:00");
  const after = chicagoWallTimeToUtc("2026-03-09", "09:00");
  assert.equal(before.toISOString(), "2026-03-06T15:00:00.000Z");
  assert.equal(after.toISOString(), "2026-03-09T14:00:00.000Z");
});

test("DST fall back: UTC shifts 14:00Z → 15:00Z across November 1, 2026", () => {
  const before = chicagoWallTimeToUtc("2026-10-30", "09:00");
  const after = chicagoWallTimeToUtc("2026-11-02", "09:00");
  assert.equal(before.toISOString(), "2026-10-30T14:00:00.000Z");
  assert.equal(after.toISOString(), "2026-11-02T15:00:00.000Z");
});

test("timezone conversion: 9 AM Chicago = 10 AM New York = 7 AM Pacific", () => {
  const instant = chicagoWallTimeToUtc("2026-09-18", "09:00");
  const fmt = (tz) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(instant);
  assert.equal(fmt("America/New_York"), "10:00 AM");
  assert.equal(fmt("America/Chicago"), "9:00 AM");
  assert.equal(fmt("America/Los_Angeles"), "7:00 AM");
});

test("slot generation: 50-minute sessions on 60-minute starts, 7 slots per weekday", () => {
  // Week of Sep 14–18, 2026 (Mon–Fri); reference time placed BEFORE the week
  // so the whole week is in the future: 9,10,11,13,14,15,16 local = 7 slots/day.
  const slots = slotsFor("2026-09-14", "2026-09-18", {
    now: new Date("2026-09-14T05:00:00Z"),
  });
  assert.equal(slots.length, 5 * 7);
  const hours = slots
    .filter((s) => s.chicago_date === "2026-09-14")
    .map((s) => new Date(s.start).getUTCHours());
  // Sep 14 is CDT (UTC-5): 9,10,11,13,14,15,16 local = 14,15,16,18,19,20,21 UTC
  assert.deepEqual(hours, [14, 15, 16, 18, 19, 20, 21]);
});

test("month boundary: December → January generation spans correctly", () => {
  const slots = slotsFor("2026-12-30", "2027-01-02", {
    now: new Date("2026-12-01T00:00:00Z"),
  });
  // Dec 30 (Wed), Dec 31 (Thu), Jan 1 (Fri) — all weekdays with 7 slots
  assert.equal(slots.length, 21);
  const dates = [...new Set(slots.map((s) => s.chicago_date))];
  assert.deepEqual(dates, ["2026-12-30", "2026-12-31", "2027-01-01"]);
});

test("past dates and 60-day horizon are filtered", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  // range includes past days (Sep 14-15) and beyond horizon (Nov 20+)
  const slots = slotsFor("2026-09-14", "2026-11-25", { now });
  const dates = [...new Set(slots.map((s) => s.chicago_date))];
  assert.ok(!dates.some((d) => d < "2026-09-16"), "no past dates");
  assert.ok(!dates.some((d) => d > "2026-11-15"), "no dates beyond 60-day horizon");
});

test("weekends are never generated from Mon–Fri rules", () => {
  const slots = slotsFor("2026-09-01", "2026-09-30");
  const dows = new Set(
    slots.map((s) => new Date(s.start).getUTCDay()),
  );
  assert.ok(!dows.has(0) && !dows.has(6));
});

test("blocked exceptions remove overlapping slots", () => {
  // Sep 17, 2026: block 9:00–11:00 CDT (14:00–16:00 UTC)
  const slots = slotsFor("2026-09-17", "2026-09-17", {
    exceptions: [
      {
        starts_at: "2026-09-17T14:00:00Z",
        ends_at: "2026-09-17T16:00:00Z",
        is_available: false,
      },
    ],
  });
  const hours = slots.map((s) => new Date(s.start).getUTCHours());
  assert.ok(!hours.includes(14) && !hours.includes(15), "blocked 9 and 10 AM slots removed");
  assert.equal(slots.length, 5); // 7 per day − 2 blocked
});

test("special availability adds slots on a Saturday", () => {
  // Sep 19, 2026 is a Saturday — special window 10:00–12:00 CDT
  const slots = slotsFor("2026-09-19", "2026-09-19", {
    exceptions: [
      {
        starts_at: "2026-09-19T15:00:00Z",
        ends_at: "2026-09-19T17:00:00Z",
        is_available: true,
      },
    ],
  });
  assert.equal(slots.length, 2);
  const dows = new Set(slots.map((s) => new Date(s.start).getUTCDay()));
  assert.ok(dows.has(6), "Saturday slot present");
});

test("busy intervals (held/confirmed) exclude the slot; cancelled ones do not", () => {
  // Sep 17 has 7 slots; hold the 9 AM CDT slot (14:00Z)
  const withHold = slotsFor("2026-09-17", "2026-09-17", {
    busy: [{ start: "2026-09-17T14:00:00Z", end: "2026-09-17T14:50:00Z" }],
  });
  assert.equal(withHold.length, 6);
  assert.ok(!withHold.some((s) => s.start === "2026-09-17T14:00:00.000Z"));

  // a CANCELLED booking must not block — it is never passed as busy
  const withCancelled = slotsFor("2026-09-17", "2026-09-17");
  assert.equal(withCancelled.length, 7);
});

test("addDaysISO handles month boundaries", () => {
  assert.equal(addDaysISO("2026-09-30", 1), "2026-10-01");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("2028-02-28", 1), "2028-02-29"); // leap year
});
