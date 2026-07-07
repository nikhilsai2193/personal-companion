"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { layoutGoalTree, CARD_WIDTH } from "@/lib/goalLayout";
import GoalCard from "./GoalCard";
import GoalCardDetail, { type NodeEdit } from "./GoalCardDetail";
import type { GoalNodeData } from "./types";

const NODE_TYPES = { goalCard: GoalCard, choiceLabel: ChoiceLabelNode };

function ChoiceLabelNode({ data }: { data: { text: string } }) {
  return (
    <div
      style={{ width: 160 }}
      className="pointer-events-none -translate-x-1/2 text-center text-[10px] tracking-[0.14em] text-ember"
    >
      {data.text}
    </div>
  );
}

export default function GoalCanvas({
  nodes,
  onToggleCheckpoint,
  onAddCheckpoint,
  onDeleteCheckpoint,
  onEditNode,
  onDeleteNode,
}: {
  nodes: GoalNodeData[];
  onToggleCheckpoint: (checkpointId: string, completed: boolean) => void;
  onAddCheckpoint: (nodeId: string, title: string) => void;
  onDeleteCheckpoint: (checkpointId: string) => void;
  onEditNode: (nodeId: string, patch: NodeEdit) => void;
  onDeleteNode: (nodeId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootId = nodes.find((n) => n.parentId === null)?.id;

  const { positioned, edges, choiceLabels } = useMemo(
    () => layoutGoalTree(nodes),
    [nodes]
  );

  const flowNodes: Node[] = useMemo(() => {
    const cards: Node[] = positioned.map(({ node, x, y }) => ({
      id: node.id,
      type: "goalCard",
      position: { x, y },
      draggable: false,
      selectable: false,
      data: { node, isRoot: node.id === rootId, onOpen: () => setOpenId(node.id) },
    }));
    const labels: Node[] = choiceLabels.map((l) => ({
      id: `label-${l.groupId}`,
      type: "choiceLabel",
      position: { x: l.x + CARD_WIDTH / 2, y: l.y - 34 },
      draggable: false,
      selectable: false,
      data: { text: "choose one path" },
    }));
    return [...cards, ...labels];
  }, [positioned, choiceLabels, rootId]);

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const hue = Math.round(e.progress * 100);
        // Interpolate muted ink-4 → ember as the subtree beneath this edge
        // completes, so overall progress reads without opening every card.
        const color =
          e.progress === 0
            ? "var(--color-ink-4)"
            : `color-mix(in srgb, var(--color-ember) ${hue}%, var(--color-ink-4))`;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: e.isChoice ? "6 4" : undefined,
          },
        };
      }),
    [edges]
  );

  const openNode = nodes.find((n) => n.id === openId) ?? null;

  return (
    <div className="relative h-[calc(100dvh-57px)] w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_, n) => setOpenId(n.id)}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.5} color="var(--color-ink-3)" />
      </ReactFlow>

      <AnimatePresence>
        {openNode && (
          <GoalCardDetail
            node={openNode}
            isRoot={openNode.id === rootId}
            onClose={() => setOpenId(null)}
            onToggleCheckpoint={onToggleCheckpoint}
            onAddCheckpoint={(title) => onAddCheckpoint(openNode.id, title)}
            onDeleteCheckpoint={onDeleteCheckpoint}
            onEdit={(patch) => onEditNode(openNode.id, patch)}
            onDeleteNode={() => {
              onDeleteNode(openNode.id);
              setOpenId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
