import { NextResponse } from "next/server";

// Unauthenticated health-check endpoint (see middleware.ts for the
// exclusion). Used by the self-ping keep-alive in instrumentation.ts and
// can also be pointed at by Render's own health checks or an external
// uptime pinger.
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
