"use client";

import { useEffect, useMemo, useState } from "react";
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
type DailyData = {
  date: string;
  weekDays: WeekDay[];
  eventColumns: EventColumn[];
  eventCount: number;
  calendarError: string | null;
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
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const today = useMemo(() => todayStr(), []);

  async function load(date: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/daily?date=${date}&tz=${encodeURIComponent(tz)}`);
      if (!res.ok) throw new Error("Failed to load schedule");
      const json: DailyData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function toggleChore(item: ChoreItem) {
    setBusyId(item.id);
    const date = item.carriedOver ? item.originalDate! : selectedDate;
    try {
      await fetch("/api/chores/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: item.id, date, completed: !item.completed }),
      });
      await load(selectedDate);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleTask(item: SimpleTask) {
    setBusyId(item.id);
    try {
      await fetch(`/api/chores/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !item.done }),
      });
      await load(selectedDate);
    } finally {
      setBusyId(null);
    }
  }

  const selectedLabel = data ? format(parseISO(data.date), "EEEE") : "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {data?.weekDays.map((day) => {
          const active = day.date === selectedDate;
          const isToday = day.date === today;
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
              <span className={active ? "text-white/60" : "text-brand-400"}>{day.eventCount || ""}</span>
            </button>
          );
        })}
      </div>

      {data?.calendarError && (
        <div className="rounded-2xl border border-flag/40 bg-flag-soft p-4 text-flag text-sm">
          {data.calendarError === "no_calendar_access"
            ? "Google Calendar access hasn't been granted yet. Sign out and sign back in, making sure to approve the calendar permission."
            : "Could not fetch calendar events."}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-900">On the calendar</h1>
          {data && <span className="mono text-sm text-brand-400">{data.eventCount} events</span>}
        </div>

        {loading && <p className="mono text-sm text-brand-500">Loading…</p>}

        {!loading && (
          <div className="grid sm:grid-cols-2 gap-3">
            {data?.eventColumns.map((column) => (
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
          {data && <span className="mono text-sm text-brand-400">{data.chores.due.length} chores</span>}
        </div>

        <div className="divide-y divide-brand-100">
          {!loading && data?.chores.due.length === 0 && (
            <p className="text-sm text-brand-400 py-3">Nothing due — enjoy the day off.</p>
          )}
          {data?.chores.due.map((item) => (
            <div key={`${item.id}-${item.carriedOver ? item.originalDate : "today"}`} className="flex items-center gap-3 py-3">
              <button
                onClick={() => toggleChore(item)}
                disabled={busyId === item.id}
                className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
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
            {data && <span className="mono text-sm text-brand-400">{data.admin.length}</span>}
          </div>
          <div className="divide-y divide-brand-100">
            {!loading && data?.admin.length === 0 && (
              <p className="text-sm text-brand-400 py-3">Nothing here.</p>
            )}
            {data?.admin.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggleTask(item)}
                  disabled={busyId === item.id}
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
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
            {data && <span className="mono text-sm text-brand-400">{data.maintenance.length}</span>}
          </div>
          <div className="divide-y divide-brand-100">
            {!loading && data?.maintenance.length === 0 && (
              <p className="text-sm text-brand-400 py-3">Nothing here.</p>
            )}
            {data?.maintenance.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggleTask(item)}
                  disabled={busyId === item.id}
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
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

      {error && <p className="text-sm text-flag">{error}</p>}
    </div>
  );
}
