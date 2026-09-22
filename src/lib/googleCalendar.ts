import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Returns an authenticated Google Calendar client for the given user,
 * refreshing the stored access token first if it has expired. Returns
 * null if the user has no Google account linked (shouldn't normally
 * happen, since Google is the only sign-in method) or never granted
 * calendar access.
 */
export async function getCalendarClientForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  const isExpired = account.expires_at ? account.expires_at * 1000 < Date.now() : true;

  if (isExpired && account.refresh_token) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : undefined,
      },
    });
  }

  const hasCalendarScope = account.scope?.includes("calendar") ?? false;
  if (!hasCalendarScope) return null;

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export type NamedCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  calendarName: string;
  creator: { email: string | null; displayName: string | null } | null;
};

/**
 * Fetches events from a specific set of the user's calendars (matched by
 * display name, case-insensitive) rather than just their default "primary"
 * calendar, and merges them into one time-sorted list. Returns null if the
 * user hasn't granted calendar access at all.
 */
export async function getNamedCalendarEvents(
  userId: string,
  calendarNames: string[],
  timeMinISO: string,
  timeMaxISO: string
): Promise<NamedCalendarEvent[] | null> {
  const calendar = await getCalendarClientForUser(userId);
  if (!calendar) return null;

  const { data: listData } = await calendar.calendarList.list();
  const wanted = calendarNames.map((name) => name.trim().toLowerCase()).filter(Boolean);
  const matches = (listData.items ?? []).filter((cal) =>
    wanted.includes((cal.summary ?? "").trim().toLowerCase())
  );

  const perCalendar = await Promise.all(
    matches.map(async (cal) => {
      if (!cal.id) return [];
      const { data } = await calendar.events.list({
        calendarId: cal.id,
        timeMin: timeMinISO,
        timeMax: timeMaxISO,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
      });

      return (data.items ?? []).map((event) => ({
        id: `${cal.id}:${event.id}`,
        title: event.summary ?? "(No title)",
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        location: event.location ?? null,
        htmlLink: event.htmlLink ?? null,
        calendarName: cal.summary ?? "",
        creator: event.creator
          ? { email: event.creator.email ?? null, displayName: event.creator.displayName ?? null }
          : null,
      }));
    })
  );

  return perCalendar.flat().sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}
