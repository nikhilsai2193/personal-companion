import type { GoalCheckpointData, GoalNodeData } from "@/components/goals/types";

export type NextMove = { node: GoalNodeData; checkpoint: GoalCheckpointData } | null;

function depthOf(nodeId: string, byId: Map<string, GoalNodeData>): number {
  let depth = 0;
  let current = byId.get(nodeId);
  while (current?.parentId) {
    depth++;
    current = byId.get(current.parentId);
  }
  return depth;
}

// Picks the single next actionable checkpoint — the goal-gradient effect
// only works if there's one obvious "next," not a tree to parse cold.
// Mirrors layoutGoalTree's precedence (choice-group clusters ranked by
// their earliest date, then each node's own date) so the spotlight and
// the canvas never imply two different answers to "what's next" — but
// falls back to depth (closest to root first) rather than pushing undated
// nodes to the very end, since a freshly extracted tree very plausibly
// has no dates yet and still needs a meaningful first move.
export function selectNextMove(nodes: GoalNodeData[]): NextMove {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dateValue = (d?: string | null) => (d ? new Date(d).getTime() : Infinity);

  const clusterMinDate = new Map<string, number>();
  for (const n of nodes) {
    const key = n.choiceGroupId ?? n.id;
    const prev = clusterMinDate.get(key) ?? Infinity;
    clusterMinDate.set(key, Math.min(prev, dateValue(n.targetDate)));
  }

  const candidates = nodes.filter(
    (n) => !n.completed && n.checkpoints.some((c) => !c.completed)
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const ka = clusterMinDate.get(a.choiceGroupId ?? a.id) ?? Infinity;
    const kb = clusterMinDate.get(b.choiceGroupId ?? b.id) ?? Infinity;
    if (ka !== kb) return ka - kb;
    const da = dateValue(a.targetDate);
    const db = dateValue(b.targetDate);
    if (da !== db) return da - db;
    const depthDiff = depthOf(a.id, byId) - depthOf(b.id, byId);
    if (depthDiff !== 0) return depthDiff;
    return a.id.localeCompare(b.id);
  });

  const node = candidates[0];
  const checkpoint = node.checkpoints.find((c) => !c.completed)!;
  return { node, checkpoint };
}
