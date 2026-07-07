import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedCheckpoint, nodeWithCheckpoints } from "@/lib/goals";

// Mirrors PATCH /api/subtasks/[id] exactly — checking the last remaining
// checkpoint auto-completes the parent node; unchecking one reopens it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const checkpoint = await ownedCheckpoint(user.id, id);
  if (!checkpoint) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const completed = !!body?.completed;

  const siblings = await prisma.goalCheckpoint.findMany({
    where: { nodeId: checkpoint.nodeId },
    select: { id: true, completed: true },
  });
  const allOthersComplete = siblings
    .filter((s) => s.id !== id)
    .every((s) => s.completed);
  const nodeShouldComplete = completed && allOthersComplete;

  const [, node] = await prisma.$transaction([
    prisma.goalCheckpoint.update({
      where: { id },
      data: { completed, completedAt: completed ? new Date() : null },
    }),
    prisma.goalNode.update({
      where: { id: checkpoint.nodeId },
      data: {
        completed: nodeShouldComplete,
        completedAt: nodeShouldComplete ? new Date() : null,
      },
      ...nodeWithCheckpoints,
    }),
  ]);

  return Response.json({ node });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const checkpoint = await ownedCheckpoint(user.id, id);
  if (!checkpoint) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.goalCheckpoint.delete({ where: { id } });

  const node = await prisma.goalNode.findUnique({
    where: { id: checkpoint.nodeId },
    ...nodeWithCheckpoints,
  });
  return Response.json({ node });
}
