import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { MAX_TITLE_LEN, ownedTask, taskWithSubtasks } from "@/lib/tasks";

// Adding a subtask to a task that was already complete reopens it — a task
// is only "done" once every subtask it currently has is checked off.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const task = await ownedTask(user.id, id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LEN) {
    return Response.json({ error: "Invalid title" }, { status: 400 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.subtask.create({
      data: { taskId: id, title, orderIndex: task.subtasks.length },
    }),
    prisma.task.update({
      where: { id },
      data: { completed: false, completedAt: null },
      ...taskWithSubtasks,
    }),
  ]);

  return Response.json({ task: updated }, { status: 201 });
}
