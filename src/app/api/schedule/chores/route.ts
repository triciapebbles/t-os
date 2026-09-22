import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, formatDateOnly, addDaysUTC, weekdayCodeUTC, startOfWeekMondayUTC } from "@/lib/date";

type ChoreWithRelations = Awaited<ReturnType<typeof loadChores>>[number];

async function loadChores() {
  return prisma.chore.findMany({
    include: { category: true, assignees: { include: { person: true } } },
  });
}

function shapeChore(
  chore: ChoreWithRelations,
  extra: { carriedOver: boolean; flexible: boolean; originalDate?: string; completed: boolean }
) {
  return {
    id: chore.id,
    name: chore.name,
    description: chore.description,
    categoryName: chore.category?.name ?? null,
    durationMinutes: chore.durationMinutes,
    assignees: chore.assignees.map((a) => ({ id: a.person.id, name: a.person.name })),
    ...extra,
  };
}

function shapeSimpleTask(chore: ChoreWithRelations) {
  return {
    id: chore.id,
    name: chore.name,
    description: chore.description,
    categoryName: chore.category?.name ?? null,
    durationMinutes: chore.durationMinutes,
    assignees: chore.assignees.map((a) => ({ id: a.person.id, name: a.person.name })),
    dueDate: chore.dueDate,
    done: chore.done,
  };
}

// This is the fast, DB-only half of what used to be /api/schedule/daily:
// no Google Calendar call at all, just chores/admin/maintenance for the
// given date. The page fetches this on its own after a checkbox toggle,
// instead of re-fetching the (slow) calendar data too.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const today = parseDateOnly(dateParam ?? formatDateOnly(new Date()));
  const dateStr = formatDateOnly(today);
  const weekStart = startOfWeekMondayUTC(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDateOnly(addDaysUTC(weekStart, i)));

  const allChores = await loadChores();
  const dailyChores = allChores.filter((c) => c.kind === "CHORE");
  const completions = await prisma.choreCompletion.findMany({
    where: { date: { in: weekDates } },
  });
  const completedSet = new Set(completions.map((c) => `${c.choreId}:${c.date}`));

  const todayCode = weekdayCodeUTC(today);
  const due: ReturnType<typeof shapeChore>[] = [];
  const seen = new Set<string>();

  for (const chore of dailyChores) {
    if (chore.flexible) continue;
    const scheduled = chore.daysOfWeek.length === 0 || chore.daysOfWeek.includes(todayCode);
    if (!scheduled) continue;
    const completed = completedSet.has(`${chore.id}:${dateStr}`);
    due.push(shapeChore(chore, { carriedOver: false, flexible: false, completed }));
    seen.add(chore.id);
  }

  // Carry incomplete chores forward from earlier in the same week only —
  // this resets every Monday rather than accumulating forever.
  for (let i = 0; i < 7; i++) {
    const d = addDaysUTC(weekStart, i);
    const key = formatDateOnly(d);
    if (key >= dateStr) break;
    const code = weekdayCodeUTC(d);
    for (const chore of dailyChores) {
      if (chore.flexible || seen.has(chore.id)) continue;
      const scheduled = chore.daysOfWeek.length === 0 || chore.daysOfWeek.includes(code);
      if (!scheduled) continue;
      if (completedSet.has(`${chore.id}:${key}`)) continue;
      due.push(shapeChore(chore, { carriedOver: true, flexible: false, originalDate: key, completed: false }));
      seen.add(chore.id);
    }
  }

  // Flexible ("if there's time") chores are shown inline in the same list,
  // every day, tagged instead of split into their own section.
  for (const chore of dailyChores) {
    if (!chore.flexible) continue;
    const completed = completedSet.has(`${chore.id}:${dateStr}`);
    due.push(shapeChore(chore, { carriedOver: false, flexible: true, completed }));
  }

  const admin = allChores.filter((c) => c.kind === "ADMIN").map(shapeSimpleTask);
  const maintenance = allChores.filter((c) => c.kind === "MAINTENANCE").map(shapeSimpleTask);

  return NextResponse.json({
    date: dateStr,
    chores: { due },
    admin,
    maintenance,
  });
}
