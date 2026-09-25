/**
 * Date and time helpers. PBP runs in Wilmington, NC, so times are entered and
 * shown in America/New_York and stored as UTC timestamps.
 */
export const PBP_TIME_ZONE = "America/New_York";

function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/** Converts a wall-clock date ("2026-10-05") and time ("17:30") in `timeZone` to a UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone = PBP_TIME_ZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset, including across daylight-saving changes.
  let guess = wall - offsetMinutes(new Date(wall), timeZone) * 60_000;
  guess = wall - offsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess);
}

/** The calendar date ("YYYY-MM-DD") of an instant in `timeZone`. */
export function dateKey(instant: Date | string, timeZone = PBP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "Mon, Oct 5" */
export function formatDay(instant: Date | string, timeZone = PBP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(instant));
}

/** "5:00 PM" */
export function formatTime(instant: Date | string, timeZone = PBP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(
    new Date(instant),
  );
}

/** "Mon, Oct 5 · 5:00 PM – 6:30 PM" */
export function formatSessionTime(startsAt: string, endsAt: string, timeZone = PBP_TIME_ZONE): string {
  return `${formatDay(startsAt, timeZone)} · ${formatTime(startsAt, timeZone)} – ${formatTime(endsAt, timeZone)}`;
}

/** "Oct 1, 2026" from a "YYYY-MM-DD" date. */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "medium" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** "17:30" wall-clock time of an instant, for form defaults. */
export function timeKey(instant: Date | string, timeZone = PBP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/** The Monday ("YYYY-MM-DD") of the week containing a "YYYY-MM-DD" date. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const isoDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
  return addDays(date, 1 - isoDay);
}

/** "Week of Oct 5, 2026" from a Monday "YYYY-MM-DD". */
export function formatWeek(monday: string): string {
  return `Week of ${formatDate(monday)}`;
}
