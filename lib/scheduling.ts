/**
 * Pure scheduling engine — no database, no external services.
 *
 * All availability is defined as WALL TIME in the practice timezone
 * (America/Chicago). UTC instants are derived through Intl offsets so
 * daylight saving transitions are always correct. Session length and
 * start interval are configurable per availability rule.
 */

export const BOOKING_TIMEZONE = "America/Chicago";
export const SESSION_LENGTH_MINUTES = 50;
export const START_INTERVAL_MINUTES = 60;
export const MAX_DAYS_AHEAD = 60;
export const HOLD_MINUTES = 10;

export type AvailabilityRule = {
  weekday: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // "HH:MM" local wall time
  end_time: string; // "HH:MM" local wall time
  session_length_minutes?: number;
  start_interval_minutes?: number;
  active?: boolean;
};

export type AvailabilityException = {
  starts_at: string; // UTC ISO
  ends_at: string; // UTC ISO
  is_available: boolean; // false = block, true = special extra availability
  reason?: string;
};

export type BusyInterval = { start: string; end: string }; // UTC ISO pair

export type Slot = {
  start: string; // UTC ISO
  end: string; // UTC ISO
  chicago_date: string; // YYYY-MM-DD in the practice timezone
};

/* ── timezone math ───────────────────────────────────────────── */

export function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return (asUTC - utcMs) / 60000;
}

/** Wall time (HH:MM) on a Chicago calendar date → correct UTC instant. */
export function chicagoWallTimeToUtc(dateISO: string, time: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = tzOffsetMinutes(BOOKING_TIMEZONE, naive);
  const off2 = tzOffsetMinutes(BOOKING_TIMEZONE, naive - off1 * 60000);
  return new Date(naive - off2 * 60000);
}

/** The Chicago calendar date (YYYY-MM-DD) of a UTC instant. */
export function chicagoDateOf(instant: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** ISO weekday (0=Sun…6=Sat) of a Chicago calendar date. */
export function chicagoWeekday(dateISO: string): number {
  const d = new Date(`${dateISO}T12:00:00Z`); // noon-safe
  return d.getUTCDay();
}

/* ── calendar-date helpers ───────────────────────────────────── */

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function todayChicago(): string {
  return chicagoDateOf(new Date());
}

export function eachDateISO(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  let cursor = fromISO;
  const guard = 400;
  for (let i = 0; i < guard && cursor <= toISO; i++) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return out;
}

/* ── slot generation ─────────────────────────────────────────── */

function minutesOf(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function overlaps(aS: number, aE: number, bS: string, bE: string): boolean {
  const bs = new Date(bS).getTime();
  const be = new Date(bE).getTime();
  return aS < be && aE > bs;
}

function slotsForWindow(
  dateISO: string,
  startTime: string,
  endTime: string,
  sessionLength: number,
  startInterval: number,
  blocked: Array<[number, number]>,
  nowMs: number,
  horizonMs: number,
): Array<{ start: Date; end: Date }> {
  const out: Array<{ start: Date; end: Date }> = [];
  const windowStart = minutesOf(startTime);
  const windowEnd = minutesOf(endTime);
  for (
    let cursor = windowStart;
    cursor + sessionLength <= windowEnd;
    cursor += startInterval
  ) {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const start = chicagoWallTimeToUtc(dateISO, `${hh}:${mm}`);
    const end = new Date(start.getTime() + sessionLength * 60000);
    if (start.getTime() < nowMs) continue; // past
    if (start.getTime() > horizonMs) continue; // beyond booking horizon
    if (blocked.some(([bs, be]) => start.getTime() < be && end.getTime() > bs)) continue;
    out.push({ start, end });
  }
  return out;
}

export type GenerateSlotsInput = {
  fromISO: string; // Chicago calendar date
  toISO: string; // Chicago calendar date
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  busy: BusyInterval[]; // active bookings (held/confirmed), UTC ISO pairs
  now?: Date;
};

/** Generates bookable slots for the Chicago date range. Sorted by start. */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const horizonMs = nowMs + MAX_DAYS_AHEAD * 86400000;

  const blocking = input.exceptions.filter((e) => !e.is_available);
  const specials = input.exceptions.filter((e) => e.is_available);

  const slots: Slot[] = [];

  for (const dateISO of eachDateISO(input.fromISO, input.toISO)) {
    const weekday = chicagoWeekday(dateISO);
    const dayRules = input.rules.filter((r) => r.active !== false && r.weekday === weekday);

    for (const rule of dayRules) {
      const sessionLength = rule.session_length_minutes ?? SESSION_LENGTH_MINUTES;
      const interval = rule.start_interval_minutes ?? START_INTERVAL_MINUTES;
      const windowStartMin = minutesOf(rule.start_time);
      const windowEndMin = minutesOf(rule.end_time);
      for (
        let cursor = windowStartMin;
        cursor + sessionLength <= windowEndMin;
        cursor += interval
      ) {
        const startHH = String(Math.floor(cursor / 60)).padStart(2, "0");
        const startMM = String(cursor % 60).padStart(2, "0");
        const start = chicagoWallTimeToUtc(dateISO, `${startHH}:${startMM}`);
        const end = new Date(start.getTime() + sessionLength * 60000);
        if (start.getTime() < nowMs) continue;
        if (start.getTime() > horizonMs) continue;
        // blocked exception overlap (UTC compare)
        if (
          blocking.some(
            (e) =>
              start.getTime() < new Date(e.ends_at).getTime() &&
              end.getTime() > new Date(e.starts_at).getTime(),
          )
        ) {
          continue;
        }
        // already booked/held
        if (
          input.busy.some(
            (b) =>
              start.getTime() < new Date(b.end).getTime() &&
              end.getTime() > new Date(b.start).getTime(),
          )
        ) {
          continue;
        }
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          chicago_date: dateISO,
        });
      }
    }

    // special availability: extra windows on otherwise-unavailable days
    for (const sp of specials) {
      const spStart = new Date(sp.starts_at);
      const spEnd = new Date(sp.ends_at);
      const dayStart = chicagoWallTimeToUtc(dateISO, "00:00");
      const dayEnd = chicagoWallTimeToUtc(addDaysISO(dateISO, 1), "00:00");
      if (spEnd.getTime() <= dayStart.getTime() || spStart.getTime() >= dayEnd.getTime()) {
        continue;
      }
      const windowStartMin = Math.max(
        0,
        Math.round((Math.max(spStart.getTime(), dayStart.getTime()) - dayStart.getTime()) / 60000),
      );
      const windowEndMin = Math.min(
        24 * 60,
        Math.round((Math.min(spEnd.getTime(), dayEnd.getTime()) - dayStart.getTime()) / 60000),
      );
      const sessionLength = SESSION_LENGTH_MINUTES;
      const interval = START_INTERVAL_MINUTES;
      for (
        let cursor = windowStartMin;
        cursor + sessionLength <= windowEndMin;
        cursor += interval
      ) {
        const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
        const mm = String(cursor % 60).padStart(2, "0");
        const start = chicagoWallTimeToUtc(dateISO, `${hh}:${mm}`);
        const end = new Date(start.getTime() + sessionLength * 60000);
        if (start.getTime() < nowMs || start.getTime() > horizonMs) continue;
        if (
          blocking.some(
            (e) =>
              start.getTime() < new Date(e.ends_at).getTime() &&
              end.getTime() > new Date(e.starts_at).getTime(),
          )
        ) {
          continue;
        }
        if (
          input.busy.some(
            (b) =>
              start.getTime() < new Date(b.end).getTime() &&
              end.getTime() > new Date(b.start).getTime(),
          )
        ) {
          continue;
        }
        if (slots.some((s) => s.start === start.toISOString())) continue; // dedupe
        slots.push({ start: start.toISOString(), end: end.toISOString(), chicago_date: dateISO });
      }
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
