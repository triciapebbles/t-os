import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggles a chore's completion for a specific calendar date. For a
// carried-over chore, the client sends the chore's *original* due date
// here (not the day it's currently showing up on) so that completing it
// actually clears the carry-over rather than just hiding today's copy.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { choreId, date, completed } = body as {
    choreId?: string;
    date?: string;
    completed?: boolean;
  };

  if (!choreId || !date) {
    return NextResponse.json({ error: "choreId and date are required" }, { status: 400 });
  }

  if (completed) {
    await prisma.choreCompletion.upsert({
      where: { choreId_date: { choreId, date } },
      update: {},
      create: { choreId, date },
    });
  } else {
    await prisma.choreCompletion.deleteMany({ where: { choreId, date } });
  }

  return NextResponse.json({ ok: true });
}
