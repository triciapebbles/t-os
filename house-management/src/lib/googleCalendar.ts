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
