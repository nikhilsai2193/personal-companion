import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import {
  MAX_TITLE_LEN,
  MAX_DESC_LEN,
  taskWithSubtasks,
  sortOpenTasks,
} from "@/lib/tasks";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const user = await getCurrentUser();
  const [open, completed] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id, completed: false },
      ...taskWithSubtasks,
    }),
    prisma.task.findMany({
      where: { userId: user.id, completed: true },
      ...taskWithSubtasks,
      orderBy: { completedAt: "desc" },
    }),
  ]);
  return Response.json({ open: sortOpenTasks(open), completed });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LEN) {
    return Response.json(
      { error: `Title is required, max ${MAX_TITLE_LEN} characters` },
      { status: 400 }
    );
  }
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, MAX_DESC_LEN)
      : null;
  const priority = PRIORITIES.includes(body?.priority) ? body.priority : "MEDIUM";
  const deadline =
    typeof body?.deadline === "string" && DATE_RE.test(body.deadline)
      ? new Date(`${body.deadline}T00:00:00.000Z`)
      : null;
  const subtaskTitles: string[] = Array.isArray(body?.subtasks)
    ? body.subtasks
        .map((s: unknown) => String(s).trim())
        .filter((s: string) => s.length > 0 && s.length <= MAX_TITLE_LEN)
        .slice(0, 50)
    : [];

  const count = await prisma.task.count({ where: { userId: user.id } });
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      description,
      priority,
      deadline,
      orderIndex: count,
      subtasks: {
        create: subtaskTitles.map((t, i) => ({ title: t, orderIndex: i })),
      },
    },
    ...taskWithSubtasks,
  });

  return Response.json({ task }, { status: 201 });
}
