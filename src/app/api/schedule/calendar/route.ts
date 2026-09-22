import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNamedCalendarEvents, type NamedCalendarEvent } from "@/lib/googleCalendar";
import { parseDateOnly, formatDateOnly, addDaysUTC, weekdayCodeUTC, startOfWeekMondayUTC, zonedDateRangeToUtc } from "@/lib/date";

// Which Google calendars (by display name) feed the "On the calendar"
// section, merged together. Override on Render with an env var
// GOOGLE_CALENDAR_NAMES="Name One, Name Two" if these ever change —
// no code change needed.
const CALENDAR_NAMES = (process.env.GOOGLE_CALENDAR_NAMES ?? "ztmf,fitness plan,to-do list")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const WEEKDAY_LABEL: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

// The household's two people always get their own column, even on days
// with no events for them. Any other event creator (a shared invite, a
// calendar entry made by someone else) gets its own extra column, named
// after whatever Google tells us about them.
const KNOWN_OWNERS = ["Tricia", "Zane"];

function normalizeOwnerLabel(raw: string): string {
  const lower = raw.toLowerCase();
  const known = KNOWN_OWNERS.find((name) => lower.includes(name.toLowerCase()));
  return known ?? raw;
}

function ownerLabelFor(event: NamedCalendarEvent): string {
  const displayName = event.creator?.displayName?.trim();
  if (displayName) return normalizeOwnerLabel(displayName);

  const email = event.creator?.email;
  if (email) {
    const local = email.split("@")[0].replace(/[._]+/g, " ").trim();
    const titled = local.replace(/\b\w/g, (c) => c.toUpperCase());
    return normalizeOwnerLabel(titled || email);
  }

  return "Unknown";
}

// This is the slow, network-bound half of what used to be
// /api/schedule/daily: it talks to Google Calendar (a calendar-list
// lookup plus an events.list call per matched calendar) on every
// request. It's now its own endpoint, fetched once per date/timezone
// change and never re-fetched just because a chore checkbox was
// clicked — see /api/schedule/chores for the fast, DB-only half.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(request.url);
  const tz = searchParams.get("tz") || "Asia/Singapore";
  const dateParam = searchParams.get("date");
  const today = parseDateOnly(dateParam ?? formatDateOnly(new Date()));
  const dateStr = formatDateOnly(today);
  const weekStart = startOfWeekMondayUTC(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDateOnly(addDaysUTC(weekStart, i)));

  const weekRangeUtc = {
    start: zonedDateRangeToUtc(weekDates[0], tz).start,
    end: zonedDateRangeToUtc(weekDates[6], tz).end,
  };

  let weekEvents: Awaited<ReturnType<typeof getNamedCalendarEvents>> = [];
  let calendarError: string | null = null;
  try {
    const events = await getNamedCalendarEvents(
      userId,
      CALENDAR_NAMES,
      weekRangeUtc.start.toISOString(),
      weekRangeUtc.end.toISOString()
    );
    if (events === null) {
      calendarError = "no_calendar_access";
    } else {
      weekEvents = events;
    }
  } catch (err) {
    console.error("Failed to fetch calendar events", err);
    calendarError = "calendar_fetch_failed";
  }

  function localDateKey(iso: string | null, allDay: boolean) {
    if (!iso) return null;
    if (allDay) return iso.slice(0, 10);
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
  }

  const weekDays = weekDates.map((key, i) => {
    const d = addDaysUTC(weekStart, i);
    return {
      date: key,
      label: WEEKDAY_LABEL[weekdayCodeUTC(d)],
      eventCount: (weekEvents ?? []).filter((e) => localDateKey(e.start, e.allDay) === key).length,
    };
  });

  const todaysEvents = (weekEvents ?? []).filter((e) => localDateKey(e.start, e.allDay) === dateStr);

  const columnsMap = new Map<string, NamedCalendarEvent[]>();
  for (const owner of KNOWN_OWNERS) columnsMap.set(owner, []);
  for (const event of todaysEvents) {
    const owner = ownerLabelFor(event);
    if (!columnsMap.has(owner)) columnsMap.set(owner, []);
    columnsMap.get(owner)!.push(event);
  }
  const eventColumns = Array.from(columnsMap.entries()).map(([owner, events]) => ({ owner, events }));

  return NextResponse.json({
    date: dateStr,
    weekDays,
    eventColumns,
    eventCount: todaysEvents.length,
    calendarError,
  });
}
