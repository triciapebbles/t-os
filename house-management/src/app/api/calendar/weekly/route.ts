import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarClientForUser } from "@/lib/googleCalendar";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekOffset = Number(searchParams.get("weekOffset") ?? "0");

  const userId = (session.user as { id: string }).id;
  const calendar = await getCalendarClientForUser(userId);

  if (!calendar) {
    return NextResponse.json(
      {
        error: "no_calendar_access",
        message:
          "Google Calendar access hasn't been granted yet. Sign out and sign back in, making sure to approve the calendar permission.",
      },
      { status: 403 }
    );
  }

  const now = addWeeks(new Date(), weekOffset);
  const timeMin = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const timeMax = endOfWeek(now, { weekStartsOn: 1 });

  try {
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = (data.items ?? []).map((event) => ({
      id: event.id,
      title: event.summary ?? "(No title)",
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
      location: event.location ?? null,
      htmlLink: event.htmlLink ?? null,
    }));

    return NextResponse.json({
      weekStart: timeMin.toISOString(),
      weekEnd: timeMax.toISOString(),
      events,
    });
  } catch (err) {
    console.error("Failed to fetch calendar events", err);
    return NextResponse.json(
      { error: "calendar_fetch_failed", message: "Could not fetch calendar events." },
      { status: 502 }
    );
  }
}
