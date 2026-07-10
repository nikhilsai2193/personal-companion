import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { groqStructuredCompletion } from "@/lib/groq";

export type RawCheckpoint = { id: string; title: string };

export type RawNode = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  choiceGroupId: string | null;
  obstacle: string | null;
  obstaclePlan: string | null;
  checkpoints: RawCheckpoint[];
};

type RawTree = { nodes: RawNode[] };

// Strict-mode JSON Schema — every property must be listed in `required`;
// optional fields are represented as nullable rather than absent, per
// Groq/OpenAI structured-output rules.
const nodeSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "short id, e.g. n1, n2" },
    parentId: { type: ["string", "null"], description: "id of the parent node, null for the root goal" },
    title: { type: "string", description: "short label for the card face — the WHAT" },
    description: { type: ["string", "null"] },
    targetDate: { type: ["string", "null"], description: "ISO date YYYY-MM-DD if the text implies one" },
    choiceGroupId: {
      type: ["string", "null"],
      description:
        "set to the same value on sibling nodes that are genuine alternatives (pick one), null otherwise",
    },
    obstacle: { type: ["string", "null"], description: "a likely obstacle, only if the text supports inferring one" },
    obstaclePlan: { type: ["string", "null"], description: "a concrete if/then plan for that obstacle" },
    checkpoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", description: "a concrete, doable action — not a restatement of the goal" },
        },
        required: ["id", "title"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "id",
    "parentId",
    "title",
    "description",
    "targetDate",
    "choiceGroupId",
    "obstacle",
    "obstaclePlan",
    "checkpoints",
  ],
  additionalProperties: false,
} as const;

const treeSchema = {
  type: "object",
  properties: { nodes: { type: "array", items: nodeSchema } },
  required: ["nodes"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You turn a person's free-form description of a long-term goal into a top-down tree that keeps them motivated and never loses the thread between "someday" and "today."

Rules:
1. Exactly one root node (parentId: null) — the overall goal itself.
2. Break it into the steps that actually have to happen, as child nodes. Order matters: if the text implies A must happen before B, A should be an ancestor or earlier sibling of B, not the reverse.
3. Every checkpoint must be a concrete, doable action ("email the department for the transcript deadline"), never a vague restatement of its parent node's title. This is deliberate — vague goals don't get done, concrete if/then-shaped actions do.
4. When the text describes genuine alternatives — either this path or that one, not both — give those sibling nodes the same choiceGroupId (any short string, unique per fork). Do NOT use choiceGroupId for steps that are simply parallel and both need doing.
5. Only fill obstacle/obstaclePlan when the text actually gives you something to work with (an expressed worry, a known risk, a hard deadline). Never invent a generic obstacle out of nothing — leave both null if there's no basis.
6. Keep node titles short (they're a card face); put any nuance in description.
7. Use short placeholder ids like n1, n2, c1, c2 — the caller replaces them with real ids.
8. If the text is thin, produce a small, honest tree rather than padding it with invented steps.`;

function buildFirstEntryUser(rawText: string) {
  return `Here is what the person wrote about their goal:\n\n"""\n${rawText}\n"""\n\nBuild the tree.`;
}

export async function extractFirstTree(rawText: string): Promise<RawNode[]> {
  const result = await groqStructuredCompletion<RawTree>({
    system: SYSTEM_PROMPT,
    user: buildFirstEntryUser(rawText),
    schemaName: "goal_tree",
    schema: treeSchema,
  });
  return result.nodes;
}

const MERGE_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

You are now UPDATING an existing tree with new information, not building from scratch. You'll be given the current tree (with its real ids) and new text the person just added.

Critical rules for updating:
9. Reuse a node or checkpoint's EXACT existing id whenever it still applies, even if you'd word it slightly differently — this is what preserves the person's progress. Only invent a new placeholder id (n1, c1, ...) for something genuinely new that the current tree doesn't already cover.
10. Do not restate the entire current tree just to be thorough — but you MUST include every existing node/checkpoint id that should still exist, or it will be treated as removed.
11. Only omit an existing id if the new text actually contradicts or replaces it (e.g. "actually I'm not doing X anymore"). Don't drop something just because the new text didn't happen to mention it again.
12. "completed" state is not yours to decide — it's shown to you only so you don't propose redundant checkpoints for things already marked done. Never include a completed field in your output.`;

function serializeCurrentTree(nodes: SerializableNode[]) {
  return JSON.stringify(
    nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      description: n.description,
      targetDate: n.targetDate,
      choiceGroupId: n.choiceGroupId,
      obstacle: n.obstacle,
      obstaclePlan: n.obstaclePlan,
      checkpoints: n.checkpoints.map((c) => ({
        id: c.id,
        title: c.title,
        completed: c.completed,
      })),
    }))
  );
}

type SerializableNode = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  targetDate: Date | null;
  choiceGroupId: string | null;
  obstacle: string | null;
  obstaclePlan: string | null;
  checkpoints: { id: string; title: string; completed: boolean }[];
};

function buildMergeUser(currentNodes: SerializableNode[], rawText: string) {
  return `Current tree:\n${serializeCurrentTree(currentNodes)}\n\nNew text the person just added:\n"""\n${rawText}\n"""\n\nReturn the complete updated tree.`;
}

export async function extractMergeTree(
  currentNodes: SerializableNode[],
  rawText: string
): Promise<RawNode[]> {
  const result = await groqStructuredCompletion<RawTree>({
    system: MERGE_SYSTEM_PROMPT,
    user: buildMergeUser(currentNodes, rawText),
    schemaName: "goal_tree",
    schema: treeSchema,
  });
  return result.nodes;
}

// Creates the whole tree from a first entry. Parents are inserted before
// children (nodes may arrive from the model in any order) and everything
// commits in one transaction so a mid-tree failure never leaves a partial,
// broken plan behind.
export async function persistFirstTree(goalPlanId: string, nodes: RawNode[]) {
  const nodeIdMap = new Map<string, string>();
  for (const n of nodes) nodeIdMap.set(n.id, randomUUID());

  const resolveParent = (placeholderParentId: string | null) => {
    if (!placeholderParentId) return null;
    return nodeIdMap.get(placeholderParentId) ?? null;
  };

  // Repeated passes so nodes can arrive in any order — a node is only
  // created once its parent (if any) already exists.
  const remaining = [...nodes];
  const created = new Set<string>();
  const ops: Array<() => ReturnType<typeof prisma.goalNode.create>> = [];

  while (remaining.length > 0) {
    const before = remaining.length;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const n = remaining[i];
      const parentReal = resolveParent(n.parentId);
      const parentReady = !n.parentId || created.has(n.parentId);
      if (!parentReady) continue;

      const realId = nodeIdMap.get(n.id)!;
      created.add(n.id);
      remaining.splice(i, 1);
      ops.push(() =>
        prisma.goalNode.create({
          data: {
            id: realId,
            goalPlanId,
            parentId: parentReal,
            title: n.title,
            description: n.description,
            targetDate: n.targetDate ? new Date(`${n.targetDate}T00:00:00.000Z`) : null,
            choiceGroupId: n.choiceGroupId,
            obstacle: n.obstacle,
            obstaclePlan: n.obstaclePlan,
            checkpoints: {
              // Endowed progress: the root starts with one step already
              // taken, so the very first render shows real (if small)
              // progress instead of a blank 0% — people given a head
              // start finish at a higher rate than people starting from
              // zero, even at equal remaining distance (Nunes & Drèze).
              // Root-only, not per-node, so it doesn't dilute every
              // subtree's own percentage.
              create: [
                ...(n.parentId === null
                  ? [
                      {
                        id: randomUUID(),
                        title: "committed to this",
                        completed: true,
                        completedAt: new Date(),
                        orderIndex: -1,
                      },
                    ]
                  : []),
                ...n.checkpoints.map((c, i) => ({
                  id: randomUUID(),
                  title: c.title,
                  orderIndex: i,
                })),
              ],
            },
          },
        })
      );
    }
    if (remaining.length === before) {
      // A parentId that doesn't resolve to any node in this batch — treat
      // whatever's left as additional roots rather than dropping them.
      for (const n of remaining) n.parentId = null;
    }
  }

  await prisma.$transaction(ops.map((op) => op()));
}
