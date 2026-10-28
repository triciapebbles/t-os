import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

// Next.js 15: a route's `params` is a promise, so it is awaited before use.
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
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
    kind,
    dueDate,
    done,
  } = body as {
    name?: string;
    description?: string;
    categoryId?: string | null;
    newCategoryName?: string;
    frequency?: string;
    bestDoneOn?: string;
    remarks?: string;
    durationMinutes?: number | null;
    personIds?: string[];
    daysOfWeek?: string[];
    flexible?: boolean;
    kind?: "CHORE" | "ADMIN" | "MAINTENANCE";
    dueDate?: string | null;
    done?: boolean;
  };

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && newCategoryName) {
    const category = await prisma.category.upsert({
      where: { name: newCategoryName.trim().toLowerCase() },
      update: {},
      create: { name: newCategoryName.trim().toLowerCase() },
    });
    resolvedCategoryId = category.id;
  }

  const existing = await prisma.chore.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chore = await prisma.$transaction(async (tx) => {
    if (personIds) {
      await tx.choreAssignee.deleteMany({ where: { choreId: id } });
      if (personIds.length > 0) {
        await tx.choreAssignee.createMany({
          data: personIds.map((personId) => ({ choreId: id, personId })),
        });
      }
    }

    return tx.chore.update({
      where: { id },
      data: {
        name,
        description,
        categoryId: resolvedCategoryId === null ? null : resolvedCategoryId || undefined,
        frequency,
        bestDoneOn,
        remarks,
        durationMinutes:
          durationMinutes === null ? null : durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        daysOfWeek: daysOfWeek ?? undefined,
        flexible: flexible ?? undefined,
        kind: kind ?? undefined,
        dueDate: dueDate === null ? null : dueDate ?? undefined,
        done: done ?? undefined,
      },
      include: { category: true, assignees: { include: { person: true } } },
    });
  });

  return NextResponse.json(chore);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.chore.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
