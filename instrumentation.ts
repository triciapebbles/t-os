// Runs once when the Next.js server process starts (see next.config.js —
// experimental.instrumentationHook). We use it to keep the Render service
// awake by having it ping its own /api/health endpoint on a timer, instead
// of relying on someone opening the page.
//
// Set DISABLE_SELF_PING=true to turn this off (e.g. for local dev, where
// it's pointless and just spams the console).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_SELF_PING === "true") return;

  // Avoid double-scheduling if `register` somehow runs more than once in
  // the same process (Next.js dev hot-reload, etc).
  const g = globalThis as unknown as { __tosSelfPingStarted?: boolean };
  if (g.__tosSelfPingStarted) return;
  g.__tosSelfPingStarted = true;

  const baseUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.NEXTAUTH_URL ||
    `http://localhost:${process.env.PORT ?? 3000}`;
  const pingUrl = `${baseUrl.replace(/\/$/, "")}/api/health`;

  // Comfortably under Render's ~15-minute idle timeout.
  const INTERVAL_MS = 10 * 60 * 1000;

  const ping = () => {
    fetch(pingUrl)
      .then((res) => {
        if (!res.ok) console.warn(`[self-ping] ${pingUrl} responded ${res.status}`);
      })
      .catch((err) => {
        console.warn("[self-ping] failed:", err instanceof Error ? err.message : err);
      });
  };

  const timer = setInterval(ping, INTERVAL_MS);
  // Don't let the ping timer itself keep the process alive if something
  // else is trying to shut it down cleanly.
  timer.unref?.();

  console.log(`[self-ping] scheduled every ${INTERVAL_MS / 60000} min -> ${pingUrl}`);
}
