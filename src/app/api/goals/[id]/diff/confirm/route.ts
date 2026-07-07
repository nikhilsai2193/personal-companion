import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedGoalPlan, nodesWithCheckpoints } from "@/lib/goals";
import { applyMerge } from "@/lib/goalDiff";
import type { RawNode } from "@/lib/goalExtraction";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const plan = await ownedGoalPlan(user.id, id);
  if (!plan) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const entryId = typeof body?.entryId === "string" ? body.entryId : "";
  const confirmedRemovalIds: string[] = Array.isArray(body?.confirmedRemovalIds)
    ? body.confirmedRemovalIds.map(String)
    : [];

  const entry = await prisma.goalEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.goalPlanId !== id || !entry.proposedTree) {
    return Response.json({ error: "Nothing pending to confirm" }, { status: 404 });
  }

  await applyMerge(id, entry.proposedTree as unknown as RawNode[], confirmedRemovalIds);
  await prisma.goalEntry.update({
    where: { id: entryId },
    data: { status: "PROCESSED", proposedTree: Prisma.JsonNull },
  });
  await prisma.goalPlan.update({ where: { id }, data: { updatedAt: new Date() } });

  const nodes = await prisma.goalNode.findMany({
    where: { goalPlanId: id },
    ...nodesWithCheckpoints,
  });
  return Response.json({ nodes });
}
