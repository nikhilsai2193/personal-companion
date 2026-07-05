import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { taskWithSubtasks } from "@/lib/tasks";

async function ownedSubtask(userId: string, id: string) {
  const subtask = await prisma.subtask.findUnique({
    where: { id },
    include: { task: true },
  });
  return subtask && subtask.task.userId === userId ? subtask : null;
}

// Toggling a subtask can flip the parent task's own completion:
// checking the last remaining one auto-completes the parent (one motion,
// no extra confirmation); unchecking one on a completed parent reopens it
// (forgiving — correcting a mistake never leaves you locked out).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const subtask = await ownedSubtask(user.id, id);
  if (!subtask) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const completed = !!body?.completed;

  const siblings = await prisma.subtask.findMany({
    where: { taskId: subtask.taskId },
    select: { id: true, completed: true },
  });
  const allOthersComplete = siblings
    .filter((s) => s.id !== id)
    .every((s) => s.completed);
  const parentShouldComplete = completed && allOthersComplete;

  const [, task] = await prisma.$transaction([
    prisma.subtask.update({
      where: { id },
      data: { completed, completedAt: completed ? new Date() : null },
    }),
    prisma.task.update({
      where: { id: subtask.taskId },
      data: {
        completed: parentShouldComplete,
        completedAt: parentShouldComplete ? new Date() : null,
      },
      ...taskWithSubtasks,
    }),
  ]);

  return Response.json({ task });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const subtask = await ownedSubtask(user.id, id);
  if (!subtask) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.subtask.delete({ where: { id } });

  // Deleting the last incomplete subtask can leave "all remaining complete"
  // — but deletion isn't completion, so we deliberately don't auto-complete
  // here, only re-fetch the parent for the caller to re-render correctly.
  const task = await prisma.task.findUnique({
    where: { id: subtask.taskId },
    ...taskWithSubtasks,
  });
  return Response.json({ task });
}
