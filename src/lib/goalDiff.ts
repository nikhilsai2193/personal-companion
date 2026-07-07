import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { RawNode } from "@/lib/goalExtraction";
import { nodesWithCheckpoints } from "@/lib/goals";
import type { Prisma } from "@/generated/prisma/client";

export async function loadExistingTree(goalPlanId: string) {
  return prisma.goalNode.findMany({
    where: { goalPlanId },
    ...nodesWithCheckpoints,
  });
}

type ExistingTree = Awaited<ReturnType<typeof loadExistingTree>>;

export type MergeDiff = {
  addedNodes: { tempId: string; title: string; parentTitle: string }[];
  changedTitles: { id: string; oldTitle: string; newTitle: string }[];
  addedCheckpoints: { nodeId: string; nodeTitle: string; title: string }[];
  removedNodes: { id: string; title: string; hasProgress: boolean }[];
  removedCheckpoints: {
    id: string;
    nodeId: string;
    nodeTitle: string;
    title: string;
    completed: boolean;
  }[];
};

// Compares the model's proposed tree against what's actually in the
// database right now (never a stale snapshot — checkpoints may have been
// completed since the entry was submitted). Never mutates anything; the
// caller shows this to the user before applyMerge is allowed to run.
export function computeDiff(existing: ExistingTree, proposed: RawNode[]): MergeDiff {
  const existingById = new Map(existing.map((n) => [n.id, n]));
  const proposedById = new Map(proposed.map((n) => [n.id, n]));
  const titleOf = (id: string | null) =>
    id
      ? (proposedById.get(id)?.title ?? existingById.get(id)?.title ?? "the goal")
      : "the goal";

  const diff: MergeDiff = {
    addedNodes: [],
    changedTitles: [],
    addedCheckpoints: [],
    removedNodes: [],
    removedCheckpoints: [],
  };

  for (const p of proposed) {
    const existingNode = existingById.get(p.id);
    if (!existingNode) {
      diff.addedNodes.push({
        tempId: p.id,
        title: p.title,
        parentTitle: titleOf(p.parentId),
      });
      continue;
    }
    if (existingNode.title !== p.title) {
      diff.changedTitles.push({
        id: p.id,
        oldTitle: existingNode.title,
        newTitle: p.title,
      });
    }
    const existingCpIds = new Set(existingNode.checkpoints.map((c) => c.id));
    for (const c of p.checkpoints) {
      if (!existingCpIds.has(c.id)) {
        diff.addedCheckpoints.push({
          nodeId: p.id,
          nodeTitle: p.title,
          title: c.title,
        });
      }
    }
    const proposedCpIds = new Set(p.checkpoints.map((c) => c.id));
    for (const c of existingNode.checkpoints) {
      if (!proposedCpIds.has(c.id)) {
        diff.removedCheckpoints.push({
          id: c.id,
          nodeId: existingNode.id,
          nodeTitle: existingNode.title,
          title: c.title,
          completed: c.completed,
        });
      }
    }
  }

  for (const n of existing) {
    if (!proposedById.has(n.id)) {
      const hasProgress = n.checkpoints.some((c) => c.completed);
      diff.removedNodes.push({ id: n.id, title: n.title, hasProgress });
    }
  }

  return diff;
}

export function diffIsEmpty(diff: MergeDiff) {
  return (
    diff.addedNodes.length === 0 &&
    diff.changedTitles.length === 0 &&
    diff.addedCheckpoints.length === 0 &&
    diff.removedNodes.length === 0 &&
    diff.removedCheckpoints.length === 0
  );
}

// Applies a reviewed diff. Progress is structurally protected, not just by
// the UI: anything with a completed checkpoint is only removed if its id
// appears in confirmedRemovalIds — everything else proposed for removal
// (nothing at stake) goes through automatically. Updates/inserts run before
// deletes specifically so a kept node is re-parented away from a node being
// removed *before* that removal's cascade would otherwise take it down too.
export async function applyMerge(
  goalPlanId: string,
  proposed: RawNode[],
  confirmedRemovalIds: string[]
) {
  const existing = await loadExistingTree(goalPlanId);
  const existingNodeById = new Map(existing.map((n) => [n.id, n]));
  const confirmed = new Set(confirmedRemovalIds);

  // Real id for every proposed node — existing ids stay as-is, new
  // placeholder ids get minted once.
  const realId = new Map<string, string>();
  for (const p of proposed) {
    realId.set(p.id, existingNodeById.has(p.id) ? p.id : randomUUID());
  }
  const resolveParent = (placeholderParentId: string | null) =>
    placeholderParentId ? (realId.get(placeholderParentId) ?? null) : null;

  // Multi-pass topological upsert — mirrors persistFirstTree's approach,
  // extended to update-in-place for nodes that already exist.
  const remaining = [...proposed];
  const settled = new Set<string>();
  const nodeOps: Array<() => Prisma.PrismaPromise<unknown>> = [];

  while (remaining.length > 0) {
    const before = remaining.length;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const p = remaining[i];
      const parentReady = !p.parentId || settled.has(p.parentId);
      if (!parentReady) continue;

      const id = realId.get(p.id)!;
      const parentId = resolveParent(p.parentId);
      settled.add(p.id);
      remaining.splice(i, 1);

      const existingNode = existingNodeById.get(p.id);
      const targetDate = p.targetDate ? new Date(`${p.targetDate}T00:00:00.000Z`) : null;

      if (existingNode) {
        const existingCpIds = new Set(existingNode.checkpoints.map((c) => c.id));
        const proposedCpIds = new Set(p.checkpoints.map((c) => c.id));
        nodeOps.push(() =>
          prisma.goalNode.update({
            where: { id },
            data: {
              parentId,
              title: p.title,
              description: p.description,
              targetDate,
              choiceGroupId: p.choiceGroupId,
              obstacle: p.obstacle,
              obstaclePlan: p.obstaclePlan,
              checkpoints: {
                // Update titles of kept checkpoints — never touch completed.
                updateMany: p.checkpoints
                  .filter((c) => existingCpIds.has(c.id))
                  .map((c) => ({ where: { id: c.id }, data: { title: c.title } })),
                create: p.checkpoints
                  .filter((c) => !existingCpIds.has(c.id))
                  .map((c, i) => ({ id: randomUUID(), title: c.title, orderIndex: i })),
                // Only remove a checkpoint if it has no progress, or the
                // user explicitly confirmed removing it.
                deleteMany: existingNode.checkpoints
                  .filter(
                    (c) =>
                      !proposedCpIds.has(c.id) && (!c.completed || confirmed.has(c.id))
                  )
                  .map((c) => ({ id: c.id })),
              },
            },
          })
        );
      } else {
        nodeOps.push(() =>
          prisma.goalNode.create({
            data: {
              id,
              goalPlanId,
              parentId,
              title: p.title,
              description: p.description,
              targetDate,
              choiceGroupId: p.choiceGroupId,
              obstacle: p.obstacle,
              obstaclePlan: p.obstaclePlan,
              checkpoints: {
                create: p.checkpoints.map((c, i) => ({
                  id: randomUUID(),
                  title: c.title,
                  orderIndex: i,
                })),
              },
            },
          })
        );
      }
    }
    if (remaining.length === before) {
      for (const p of remaining) p.parentId = null;
    }
  }

  // Deletes last, and only ones allowed to go: no progress anywhere in the
  // node's own checkpoints, or explicitly confirmed. By now anything meant
  // to survive has already been re-parented above, so a cascade here only
  // ever takes down nodes that are themselves also being removed.
  const proposedIds = new Set(proposed.map((p) => p.id));
  const deleteIds = existing
    .filter((n) => !proposedIds.has(n.id))
    .filter((n) => n.checkpoints.every((c) => !c.completed) || confirmed.has(n.id))
    .map((n) => n.id);

  await prisma.$transaction([
    ...nodeOps.map((op) => op()),
    ...(deleteIds.length
      ? [prisma.goalNode.deleteMany({ where: { id: { in: deleteIds } } })]
      : []),
  ]);
}
