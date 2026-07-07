import { stratify, tree, type HierarchyPointNode } from "d3-hierarchy";
import type { GoalNodeData } from "@/components/goals/types";

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 128;
const H_GAP = 40; // gap between unrelated siblings
const CHOICE_GAP = 16; // tighter gap between choice-group siblings
const V_GAP = 90; // vertical gap between depth levels

export type LayoutNode = {
  node: GoalNodeData;
  x: number;
  y: number;
};

export type LayoutEdge = {
  id: string;
  source: string;
  target: string;
  isChoice: boolean;
  progress: number; // 0..1, target subtree completion — drives edge tint
};

export type ChoiceLabel = { x: number; y: number; groupId: string };

// Fraction of checkpoints completed across a node and everything beneath
// it — this is what tints an edge toward ember as a subtree finishes, so
// progress reads at a glance without opening every card.
function subtreeProgress(
  nodeId: string,
  byId: Map<string, GoalNodeData>,
  childrenOf: Map<string, GoalNodeData[]>
): { done: number; total: number } {
  const n = byId.get(nodeId)!;
  let done = n.checkpoints.filter((c) => c.completed).length;
  let total = n.checkpoints.length;
  for (const child of childrenOf.get(nodeId) ?? []) {
    const sub = subtreeProgress(child.id, byId, childrenOf);
    done += sub.done;
    total += sub.total;
  }
  return { done, total };
}

export function layoutGoalTree(nodes: GoalNodeData[]): {
  positioned: LayoutNode[];
  edges: LayoutEdge[];
  choiceLabels: ChoiceLabel[];
  width: number;
  height: number;
} {
  const root = nodes.find((n) => n.parentId === null);
  if (!root) {
    return { positioned: [], edges: [], choiceLabels: [], width: 0, height: 0 };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, GoalNodeData[]>();
  for (const n of nodes) {
    if (n.parentId) {
      childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n]);
    }
  }

  const hierarchy = stratify<GoalNodeData>()
    .id((d) => d.id)
    .parentId((d) => d.parentId ?? undefined)(nodes);

  // Left-to-right sibling order: earliest deadline first. Choice-group
  // alternatives are treated as one cluster (keyed by choiceGroupId) so an
  // either/or fork still renders as a tight, adjacent pair — ordered by the
  // earliest date anyone in the group has, then by each member's own date.
  const dateValue = (d?: string | null) => (d ? new Date(d).getTime() : Infinity);
  const clusterMinDate = new Map<string, number>();
  for (const n of nodes) {
    const key = n.choiceGroupId ?? n.id;
    const prev = clusterMinDate.get(key) ?? Infinity;
    clusterMinDate.set(key, Math.min(prev, dateValue(n.targetDate)));
  }
  hierarchy.sort((a, b) => {
    const ka = clusterMinDate.get(a.data.choiceGroupId ?? a.data.id) ?? Infinity;
    const kb = clusterMinDate.get(b.data.choiceGroupId ?? b.data.id) ?? Infinity;
    if (ka !== kb) return ka - kb;
    const da = dateValue(a.data.targetDate);
    const db = dateValue(b.data.targetDate);
    if (da !== db) return da - db;
    return a.data.id.localeCompare(b.data.id);
  });

  const layout = tree<GoalNodeData>()
    .nodeSize([CARD_WIDTH + H_GAP, CARD_HEIGHT + V_GAP])
    .separation((a, b) => {
      const sameChoice =
        a.data.choiceGroupId &&
        a.data.choiceGroupId === b.data.choiceGroupId;
      const base = a.parent === b.parent ? 1 : 1.4;
      return sameChoice ? (CARD_WIDTH + CHOICE_GAP) / (CARD_WIDTH + H_GAP) : base;
    });

  const positionedHierarchy = layout(hierarchy);
  const points = positionedHierarchy.descendants() as HierarchyPointNode<GoalNodeData>[];

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const positioned: LayoutNode[] = points.map((p) => ({
    node: p.data,
    x: p.x - minX,
    y: p.y,
  }));

  const edges: LayoutEdge[] = points
    .filter((p) => p.parent)
    .map((p) => {
      const { done, total } = subtreeProgress(p.data.id, byId, childrenOf);
      return {
        id: `${p.parent!.data.id}-${p.data.id}`,
        source: p.parent!.data.id,
        target: p.data.id,
        isChoice: !!p.data.choiceGroupId,
        progress: total > 0 ? done / total : 0,
      };
    });

  // One "choose one path" label centered above each choice group.
  const choiceGroups = new Map<string, HierarchyPointNode<GoalNodeData>[]>();
  for (const p of points) {
    if (p.data.choiceGroupId) {
      const key = p.data.choiceGroupId;
      choiceGroups.set(key, [...(choiceGroups.get(key) ?? []), p]);
    }
  }
  const choiceLabels: ChoiceLabel[] = [...choiceGroups.entries()].map(
    ([groupId, members]) => {
      const xs = members.map((m) => m.x - minX);
      const y = members[0].y;
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y, groupId };
    }
  );

  return {
    positioned,
    edges,
    choiceLabels,
    width: maxX - minX + CARD_WIDTH,
    height: maxY + CARD_HEIGHT,
  };
}
