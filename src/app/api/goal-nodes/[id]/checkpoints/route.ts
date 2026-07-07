import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedNode, nodeWithCheckpoints } from "@/lib/goals";
import { MAX_TITLE_LEN } from "@/lib/tasks";

// Mirrors POST /api/tasks/[id]/subtasks — adding a checkpoint to an
// already-complete node reopens it, since a node is only "done" once every
// checkpoint it currently has is checked off.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const node = await ownedNode(user.id, id);
  if (!node) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LEN) {
    return Response.json({ error: "Invalid title" }, { status: 400 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.goalCheckpoint.create({
      data: { nodeId: id, title, orderIndex: node.checkpoints.length },
    }),
    prisma.goalNode.update({
      where: { id },
      data: { completed: false, completedAt: null },
      ...nodeWithCheckpoints,
    }),
  ]);

  return Response.json({ node: updated }, { status: 201 });
}
