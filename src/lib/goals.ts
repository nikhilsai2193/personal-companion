import { prisma } from "@/lib/db";

export const MAX_ENTRY_LEN = 20_000;
export const MAX_TITLE_LEN = 120;

export async function ownedGoalPlan(userId: string, id: string) {
  const plan = await prisma.goalPlan.findUnique({ where: { id } });
  return plan && plan.userId === userId ? plan : null;
}

// For findUnique/update — a single-record op, no top-level orderBy allowed.
export const nodeWithCheckpoints = {
  include: { checkpoints: { orderBy: { orderIndex: "asc" as const } } },
};

// For findMany — same include, plus ordering across the result set.
export const nodesWithCheckpoints = {
  ...nodeWithCheckpoints,
  orderBy: { orderIndex: "asc" as const },
};

export async function ownedNode(userId: string, id: string) {
  const node = await prisma.goalNode.findUnique({
    where: { id },
    include: { goalPlan: true, checkpoints: true },
  });
  return node && node.goalPlan.userId === userId ? node : null;
}

export async function ownedCheckpoint(userId: string, id: string) {
  const checkpoint = await prisma.goalCheckpoint.findUnique({
    where: { id },
    include: { node: { include: { goalPlan: true } } },
  });
  return checkpoint && checkpoint.node.goalPlan.userId === userId
    ? checkpoint
    : null;
}
