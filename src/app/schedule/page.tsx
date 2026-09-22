"use client";

import { useEffect, useState } from "react";
import { format, parseISO, addDays } from "date-fns";

type CalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

type WeekData = {
  weekStart: string;
  weekEnd: string;
  events: CalendarEvent[];
};

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/calendar/weekly?weekOffset=${weekOffset}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message ?? "Failed to load calendar");
        }
        return res.json();
      })
      .then((json: WeekData) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const days = data
    ? Array.from({ length: 7 }, (_, i) => addDays(parseISO(data.weekStart), i))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand-900">Weekly schedule</h1>
        <div className="mono flex items-center gap-2 text-[13px]">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-1.5 rounded-[10px] border border-brand-200 bg-white text-brand-500 hover:bg-brand-100"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 rounded-[10px] border border-brand-200 bg-white text-brand-500 hover:bg-brand-100"
          >
            This week
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-1.5 rounded-[10px] border border-brand-200 bg-white text-brand-500 hover:bg-brand-100"
          >
            Next →
          </button>
        </div>
      </div>

      {loading && <p className="mono text-sm text-brand-500">Loading calendar…</p>}

      {error && (
        <div className="rounded-2xl border border-flag/40 bg-flag-soft p-4 text-flag text-sm">
          {error}
        </div>
      )}

      {data && !error && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = data.events.filter((e) => e.start?.startsWith(dayKey));
            return (
              <div key={dayKey} className="rounded-2xl border border-brand-200 bg-white p-3.5 min-h-[140px]">
                <div className="mono text-[11px] tracking-wide uppercase text-brand-400">{format(day, "EEE")}</div>
                <div className="text-sm font-semibold text-brand-900 mb-2">{format(day, "MMM d")}</div>
                <div className="space-y-1.5">
                  {dayEvents.length === 0 && <div className="mono text-[11px] text-brand-300">No events</div>}
                  {dayEvents.map((event) => (
                    <a
                      key={event.id}
                      href={event.htmlLink ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md bg-brand-100 px-2 py-1.5 text-xs text-brand-800 hover:bg-brand-200"
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {!event.allDay && event.start && (
                        <div className="mono text-brand-500">{format(parseISO(event.start), "h:mm a")}</div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
