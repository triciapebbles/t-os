import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chores = await prisma.chore.findMany({
    include: {
      category: true,
      assignees: { include: { person: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(chores);
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    name,
    description,
    categoryId,
    newCategoryName,
    frequency,
    bestDoneOn,
    remarks,
    durationMinutes,
    personIds,
    daysOfWeek,
    flexible,
  } = body as {
    name: string;
    description?: string;
    categoryId?: string;
    newCategoryName?: string;
    frequency?: string;
    bestDoneOn?: string;
    remarks?: string;
    durationMinutes?: number;
    personIds?: string[];
    daysOfWeek?: string[];
    flexible?: boolean;
  };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && newCategoryName) {
    const category = await prisma.category.upsert({
      where: { name: newCategoryName.trim().toLowerCase() },
      update: {},
      create: { name: newCategoryName.trim().toLowerCase() },
    });
    resolvedCategoryId = category.id;
  }

  const userId = (session.user as { id: string }).id;

  const chore = await prisma.chore.create({
    data: {
      name,
      description,
      categoryId: resolvedCategoryId || undefined,
      frequency,
      bestDoneOn,
      remarks,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      daysOfWeek: daysOfWeek ?? [],
      flexible: flexible ?? false,
      createdById: userId,
      assignees: {
        create: (personIds ?? []).map((personId) => ({ personId })),
      },
    },
    include: { category: true, assignees: { include: { person: true } } },
  });

  return NextResponse.json(chore, { status: 201 });
}
