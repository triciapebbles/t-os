"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

type WeekDay = { date: string; label: string; eventCount: number };
type CalEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  calendarName: string;
};
type ChoreItem = {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  durationMinutes: number | null;
  assignees: { id: string; name: string }[];
  carriedOver: boolean;
  flexible: boolean;
  originalDate?: string;
  completed: boolean;
};
type SimpleTask = {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  durationMinutes: number | null;
  assignees: { id: string; name: string }[];
  dueDate: string | null;
  done: boolean;
};
type EventColumn = { owner: string; events: CalEvent[] };

// Split into two independent pieces of state, backed by two independent
// endpoints. `calendar` is the slow, Google-Calendar-backed half; `chores`
// is the fast, DB-only half. Ticking a checkbox only ever touches
// `chores` — it never re-triggers a calendar fetch.
type CalendarData = {
  date: string;
  weekDays: WeekDay[];
  eventColumnsByDate: Record<string, EventColumn[]>;
  eventColumns: EventColumn[];
  eventCount: number;
  calendarError: string | null;
};

// How often we re-poll Google Calendar in the background. Switching the
// selected day tab never triggers a fetch — see the comment on
// `loadCalendar` below.
const CALENDAR_REFRESH_MS = 60 * 60 * 1000;
type ChoresData = {
  date: string;
  chores: { due: ChoreItem[] };
  admin: SimpleTask[];
  maintenance: SimpleTask[];
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hrs = minutes / 60;
  return `${Number.isInteger(hrs) ? hrs : hrs.toFixed(1)} hr${hrs !== 1 ? "s" : ""}`;
}

const CATEGORY_STYLE: Record<string, string> = {
  kitchen: "text-[#8A6D1B] bg-[#FBF0C2]",
  plants: "text-[#3F7A4C] bg-[#DCEEDD]",
  laundry: "text-[#8B6544] bg-[#EFE0D2]",
  cats: "text-[#5B6B2E] bg-[#E4EAC6]",
};
function categoryStyle(name: string | null) {
  if (!name) return "text-brand-500 bg-brand-100";
  return CATEGORY_STYLE[name.toLowerCase()] ?? "text-brand-500 bg-brand-100";
}
function personStyle(name: string) {
  const n = name.toLowerCase();
  if (n === "tricia") return "text-tricia bg-tricia-soft";
  if (n === "zane") return "text-zane bg-zane-soft";
  return "text-flag bg-flag-soft";
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarErrorMsg, setCalendarErrorMsg] = useState<string | null>(null);

  const [chores, setChores] = useState<ChoresData | null>(null);
  const [choresLoading, setChoresLoading] = useState(true);
  const [choresErrorMsg, setChoresErrorMsg] = useState<string | null>(null);

  // Per-item "this toggle failed, we reverted it" message — separate from
  // the load error above so a flaky save doesn't blow away the whole list.
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Guards against a slow response from an earlier date/toggle landing
  // after a newer one and clobbering fresher state.
  const choresRequestId = useRef(0);

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const today = useMemo(() => todayStr(), []);

  // The Google-Calendar-backed half. This fetches the *whole current
  // week* in one call and is deliberately decoupled from `selectedDate`:
  // it only runs on mount and on a slow interval (CALENDAR_REFRESH_MS)
  // below, never when the person just clicks a different day tab —
  // switching days re-slices the already-fetched week client-side (see
  // `dayCalendar` below) instead of hitting Google again.
  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarErrorMsg(null);
    try {
      const res = await fetch(`/api/schedule/calendar?date=${todayStr()}&tz=${encodeURIComponent(tz)}`);
      if (!res.ok) throw new Error("Failed to load calendar");
      const json: CalendarData = await res.json();
      setCalendar(json);
    } catch (err) {
      setCalendarErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCalendarLoading(false);
    }
  }, [tz]);

  const loadChores = useCallback(async (date: string) => {
    const requestId = ++choresRequestId.current;
    setChoresLoading(true);
    setChoresErrorMsg(null);
    try {
      const res = await fetch(`/api/schedule/chores?date=${date}`);
      if (!res.ok) throw new Error("Failed to load chores");
      const json: ChoresData = await res.json();
      if (requestId === choresRequestId.current) setChores(json);
    } catch (err) {
      if (requestId === choresRequestId.current) {
        setChoresErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      if (requestId === choresRequestId.current) setChoresLoading(false);
    }
  }, []);

  // Fetch once on mount/refresh, then again every CALENDAR_REFRESH_MS —
  // not on every `selectedDate` change (see `loadCalendar` above).
  useEffect(() => {
    loadCalendar();
    const interval = setInterval(loadCalendar, CALENDAR_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadCalendar]);

  useEffect(() => {
    loadChores(selectedDate);
  }, [selectedDate, loadChores]);

  // Slice the already-fetched week down to whichever day is selected.
  // Falls back gracefully if the selected day isn't in the cached week
  // (e.g. right after midnight, before the next hourly refresh lands).
  const dayCalendar = useMemo(() => {
    if (!calendar) return null;
    const eventColumns = calendar.eventColumnsByDate[selectedDate] ?? calendar.eventColumns;
    const eventCount = calendar.weekDays.find((d) => d.date === selectedDate)?.eventCount ?? eventColumns.reduce((sum, c) => sum + c.events.length, 0);
    return { eventColumns, eventCount };
  }, [calendar, selectedDate]);

  // Optimistic: flip the checkbox instantly, fire the save in the
  // background, and only touch the network again if it actually fails.
  async function toggleChore(item: ChoreItem) {
    const date = item.carriedOver ? item.originalDate! : selectedDate;
    const nextCompleted = !item.completed;
    setToggleError(null);
    setChores((prev) =>
      prev
        ? { ...prev, chores: { due: prev.chores.due.map((c) => (c.id === item.id ? { ...c, completed: nextCompleted } : c)) } }
        : prev
    );
    try {
      const res = await fetch("/api/chores/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: item.id, date, completed: nextCompleted }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      setToggleError(`Couldn't save "${item.name}" — reverted.`);
      setChores((prev) =>
        prev
          ? { ...prev, chores: { due: prev.chores.due.map((c) => (c.id === item.id ? { ...c, completed: !nextCompleted } : c)) } }
          : prev
      );
    }
  }

  async function toggleTask(item: SimpleTask, section: "admin" | "maintenance") {
    const nextDone = !item.done;
    setToggleError(null);
    setChores((prev) =>
      prev ? { ...prev, [section]: prev[section].map((t) => (t.id === item.id ? { ...t, done: nextDone } : t)) } : prev
    );
    try {
      const res = await fetch(`/api/chores/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      setToggleError(`Couldn't save "${item.name}" — reverted.`);
      setChores((prev) =>
        prev ? { ...prev, [section]: prev[section].map((t) => (t.id === item.id ? { ...t, done: !nextDone } : t)) } : prev
      );
    }
  }

  const selectedLabel = chores ? format(parseISO(chores.date), "EEEE") : "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {calendar?.weekDays.map((day) => {
          const active = day.date === selectedDate;
          const isToday = day.date === today;
          const dayOfMonth = format(parseISO(day.date), "d");
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`mono text-sm rounded-2xl px-3 py-2.5 flex items-center justify-center gap-1.5 border transition-colors ${
                active
                  ? "bg-brand-900 border-brand-900 text-white"
                  : "bg-white border-brand-200 text-brand-700 hover:border-brand-400"
              }`}
            >
              <span>{day.label}</span>
              {isToday && <span className={active ? "text-white" : "text-brand-900"}>•</span>}
              <span className={active ? "text-white/60" : "text-brand-400"}>{dayOfMonth}</span>
            </button>
          );
        })}
      </div>

      {calendar?.calendarError && (
        <div className="rounded-2xl border border-flag/40 bg-flag-soft p-4 text-flag text-sm">
          {calendar.calendarError === "no_calendar_access"
            ? "Google Calendar access hasn't been granted yet. Sign out and sign back in, making sure to approve the calendar permission."
            : "Could not fetch calendar events."}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-900">On the calendar</h1>
          {dayCalendar && <span className="mono text-sm text-brand-400">{dayCalendar.eventCount} events</span>}
        </div>

        {calendarLoading && !calendar && <p className="mono text-sm text-brand-500">Loading…</p>}

        {(!calendarLoading || calendar) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {dayCalendar?.eventColumns.map((column) => (
              <div key={column.owner} className="rounded-2xl bg-brand-100/60 p-4 space-y-2">
                <span
                  className={`mono inline-block text-[11px] tracking-wide uppercase px-2.5 py-1 rounded-md ${personStyle(column.owner)}`}
                >
                  {column.owner}
                </span>
                {column.events.length === 0 ? (
                  <p className="text-sm text-brand-400 pt-1">No plans today</p>
                ) : (
                  <div className="divide-y divide-brand-200/70">
                    {column.events.map((event) => (
                      <a
                        key={event.id}
                        href={event.htmlLink ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-2 hover:opacity-80"
                      >
                        <span className="mono text-xs text-brand-400 w-12 shrink-0">
                          {event.allDay || !event.start ? "All day" : format(parseISO(event.start), "HH:mm")}
                        </span>
                        <span className="text-sm font-medium text-brand-900">{event.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-brand-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-900">
              {selectedLabel ? `${selectedLabel}'s chores` : "Chores"}
            </h2>
            <Link href="/chores" className="mono text-xs text-brand-400 hover:text-brand-600">
              Manage chores →
            </Link>
          </div>
          {chores && <span className="mono text-sm text-brand-400">{chores.chores.due.length} chores</span>}
        </div>

        <div className="divide-y divide-brand-100">
          {!choresLoading && chores?.chores.due.length === 0 && (
            <p className="text-sm text-brand-400 py-3">Nothing due — enjoy the day off.</p>
          )}
          {choresLoading && !chores && <p className="mono text-sm text-brand-500 py-3">Loading…</p>}
          {chores?.chores.due.map((item) => (
            <div key={`${item.id}-${item.carriedOver ? item.originalDate : "today"}`} className="flex items-center gap-3 py-3">
              <button
                onClick={() => toggleChore(item)}
                className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  item.completed ? "bg-done border-done text-white" : "border-brand-300 bg-white"
                }`}
                aria-label={item.completed ? "Mark not done" : "Mark done"}
              >
                {item.completed && "✓"}
              </button>
              <span className={`font-semibold ${item.completed ? "line-through text-brand-400" : "text-brand-900"}`}>
                {item.name}
              </span>
              {item.carriedOver && (
                <span className="mono text-[10px] tracking-wide uppercase rounded-full border border-flag text-flag px-2 py-0.5">
                  Carried over
                </span>
              )}
              {item.flexible && (
                <span className="mono text-[10px] tracking-wide uppercase rounded-full bg-brand-700 text-white px-2 py-0.5">
                  If there&apos;s time
                </span>
              )}
              {item.description && <span className="text-sm text-brand-400 truncate">{item.description}</span>}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {item.categoryName && (
                  <span className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${categoryStyle(item.categoryName)}`}>
                    {item.categoryName}
                  </span>
                )}
                {item.assignees.map((a) => (
                  <span
                    key={a.id}
                    className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${personStyle(a.name)}`}
                  >
                    {a.name}
                  </span>
                ))}
                <span className="mono text-xs text-brand-400 w-12 text-right">
                  {formatDuration(item.durationMinutes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-brand-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-900">Admin</h2>
            {chores && <span className="mono text-sm text-brand-400">{chores.admin.length}</span>}
          </div>
          <div className="divide-y divide-brand-100">
            {!choresLoading && chores?.admin.length === 0 && (
              <p className="text-sm text-brand-400 py-3">Nothing here.</p>
            )}
            {chores?.admin.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggleTask(item, "admin")}
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    item.done ? "bg-done border-done text-white" : "border-brand-300 bg-white"
                  }`}
                  aria-label={item.done ? "Mark not done" : "Mark done"}
                >
                  {item.done && "✓"}
                </button>
                <span className={`font-semibold ${item.done ? "line-through text-brand-400" : "text-brand-900"}`}>
                  {item.name}
                </span>
                {item.description && <span className="text-sm text-brand-400 truncate">{item.description}</span>}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {item.categoryName && (
                    <span className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${categoryStyle(item.categoryName)}`}>
                      {item.categoryName}
                    </span>
                  )}
                  {item.assignees.map((a) => (
                    <span
                      key={a.id}
                      className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${personStyle(a.name)}`}
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-brand-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-900">Maintenance Needed</h2>
            {chores && <span className="mono text-sm text-brand-400">{chores.maintenance.length}</span>}
          </div>
          <div className="divide-y divide-brand-100">
            {!choresLoading && chores?.maintenance.length === 0 && (
              <p className="text-sm text-brand-400 py-3">Nothing here.</p>
            )}
            {chores?.maintenance.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggleTask(item, "maintenance")}
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    item.done ? "bg-done border-done text-white" : "border-brand-300 bg-white"
                  }`}
                  aria-label={item.done ? "Mark not done" : "Mark done"}
                >
                  {item.done && "✓"}
                </button>
                <span className={`font-semibold ${item.done ? "line-through text-brand-400" : "text-brand-900"}`}>
                  {item.name}
                </span>
                {item.dueDate && (
                  <span className="mono text-[11px] text-brand-400">
                    Due {format(parseISO(item.dueDate), "MMM d")}
                  </span>
                )}
                {item.description && <span className="text-sm text-brand-400 truncate">{item.description}</span>}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {item.categoryName && (
                    <span className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${categoryStyle(item.categoryName)}`}>
                      {item.categoryName}
                    </span>
                  )}
                  {item.assignees.map((a) => (
                    <span
                      key={a.id}
                      className={`mono text-[11px] uppercase tracking-wide rounded-md px-2 py-1 ${personStyle(a.name)}`}
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(calendarErrorMsg || choresErrorMsg || toggleError) && (
        <p className="text-sm text-flag">{toggleError ?? choresErrorMsg ?? calendarErrorMsg}</p>
      )}
    </div>
  );
}
