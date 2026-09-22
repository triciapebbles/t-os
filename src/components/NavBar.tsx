"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

export default function NavBar() {
  const { data: session } = useSession();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  const offsetHours = now ? -now.getTimezoneOffset() / 60 : 0;
  const offsetLabel = `GMT${offsetHours >= 0 ? "+" : ""}${offsetHours}`;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3">
      <nav className="flex items-center gap-2">
        <span className="mono text-sm rounded-full px-4 py-2 bg-[#E4EAC6] text-[#5B6B2E]">
          Weekly schedule
        </span>
        <span
          title="Not part of this dashboard yet"
          className="mono text-sm rounded-full px-4 py-2 bg-brand-100 text-brand-400 cursor-not-allowed select-none"
        >
          Today&apos;s fit
        </span>
        <span
          title="Not part of this dashboard yet"
          className="mono text-sm rounded-full px-4 py-2 bg-brand-100 text-brand-400 cursor-not-allowed select-none"
        >
          Feeding the cats
        </span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="mono text-sm text-brand-700">{now ? format(now, "EEEE, d MMMM") : ""}</span>
        <span className="mono text-sm text-brand-700">
          {now ? `${format(now, "h:mm a")} ${offsetLabel}` : ""}
        </span>
        <span className="text-xl leading-none" aria-hidden>
          🥬
        </span>
      </div>
    </div>
  );
}
