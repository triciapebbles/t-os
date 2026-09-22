// Small date-only helpers used by the merged schedule+chores view.
//
// A "date" here is always a plain YYYY-MM-DD calendar date (no time, no
// timezone) — the day the person actually means when they say "Tuesday",
// regardless of what timezone the server happens to run in. All the
// calendar-math helpers below work on those strings using UTC arithmetic
// purely as a neutral clock; that's safe because a calendar date's weekday
// and week boundaries don't depend on timezone once the date itself is
// fixed.
//
// The one place timezone actually matters is asking Google Calendar for
// events "on" a given local day, since that requires a real UTC instant
// range. `zonedDateRangeToUtc` handles that conversion using the IANA
// timezone name the browser sends us (e.g. "Asia/Singapore").

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function weekdayCodeUTC(date: Date): string {
  return WEEKDAY_CODES[date.getUTCDay()];
}

// Monday-based week start, matching the rest of the app.
export function startOfWeekMondayUTC(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysUTC(date, diff);
}

// Converts a naive "YYYY-MM-DDTHH:mm:ss" local time in the given IANA
// timezone into the correct UTC Date instant.
function zonedTimeToUtc(localIso: string, tz: string): Date {
  const asUTC = new Date(localIso + "Z");
  const tzString = asUTC.toLocaleString("en-US", { timeZone: tz });
  const utcString = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const offset = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asUTC.getTime() + offset);
}

// Returns the UTC instants for the start and end of a given local calendar
// date in the given IANA timezone — the correct range to ask Google
// Calendar for "events on this day".
export function zonedDateRangeToUtc(dateStr: string, tz: string) {
  const start = zonedTimeToUtc(`${dateStr}T00:00:00.000`, tz);
  const end = zonedTimeToUtc(`${dateStr}T23:59:59.999`, tz);
  return { start, end };
}
