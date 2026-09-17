import { generateSlots, chicagoWallTimeToUtc } from "../lib/scheduling.ts";
const rules = [1, 2, 3, 4, 5].flatMap((w) => [
  { weekday: w, start_time: "09:00", end_time: "12:00", session_length_minutes: 50, start_interval_minutes: 60, active: true },
  { weekday: w, start_time: "13:00", end_time: "17:00", session_length_minutes: 50, start_interval_minutes: 60, active: true },
]);
const slots = generateSlots({
  fromISO: "2026-09-17",
  toISO: "2026-09-17",
  rules,
  exceptions: [],
  busy: [],
  now: new Date("2026-09-16T19:30:00Z"),
});
console.log("count:", slots.length);
for (const s of slots) console.log(" ", s.start, "->", s.end, "| chicago:", s.chicago_date);
const probe = chicagoWallTimeToUtc("2026-09-17", "09:00");
console.log("wall 09:00 probe:", probe.toISOString());
