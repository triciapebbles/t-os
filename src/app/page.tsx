import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const choreCount = session ? await prisma.chore.count() : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">
          Welcome{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-brand-600 mt-1">Here's a quick jump-off point for the household dashboard.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/schedule"
          className="block rounded-2xl border border-brand-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📅</div>
          <h2 className="font-semibold text-brand-900">Weekly Schedule</h2>
          <p className="text-sm text-brand-600 mt-1">See this week's Google Calendar events at a glance.</p>
        </Link>

        <Link
          href="/chores"
          className="block rounded-2xl border border-brand-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">🧹</div>
          <h2 className="font-semibold text-brand-900">Chores</h2>
          <p className="text-sm text-brand-600 mt-1">{choreCount} chores tracked. Add, edit, assign and manage them.</p>
        </Link>
      </div>
    </div>
  );
}
