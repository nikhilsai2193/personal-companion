"use client";

import { motion } from "framer-motion";
import { Handle, Position } from "@xyflow/react";
import { CARD_WIDTH, CARD_HEIGHT } from "@/lib/goalLayout";
import { cardTint } from "@/lib/goalCardTint";
import { bloomColor, bloomStage } from "@/lib/goalBloom";
import BloomBadge from "./BloomBadge";
import type { GoalNodeData } from "./types";

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// The compact face rendered on the canvas — React Flow positions this via
// absolute coordinates from the d3 layout. Clicking it hands off to a
// shared layoutId overlay (GoalCardDetail) for the book-page flip open;
// this component itself never grows, so the tree layout never has to
// reflow when a card opens.
export default function GoalCard({
  data,
}: {
  data: { node: GoalNodeData; isRoot: boolean; onOpen: () => void };
}) {
  const { node, isRoot, onOpen } = data;
  const total = node.checkpoints.length;
  const done = node.checkpoints.filter((c) => c.completed).length;
  const pct = total > 0 ? (done / total) * 100 : node.completed ? 100 : 0;
  const tint = cardTint(node.id);
  const stage = bloomStage(done, total);

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <motion.button
        layoutId={`goal-card-${node.id}`}
        onClick={onOpen}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          background: tint.background,
          borderColor: isRoot ? "var(--color-ember)" : tint.border,
        }}
        className="flex flex-col justify-between rounded-lg border p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-transform duration-300 hover:-translate-y-0.5"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-voice line-clamp-2 text-lg italic leading-snug text-bone">
              {node.title}
            </p>
            <BloomBadge stage={stage} />
          </div>
          {node.targetDate && (
            <p
              className="mt-1.5 text-[9px] tracking-[0.16em]"
              style={{ color: tint.accent }}
            >
              {dayLabel(node.targetDate)}
            </p>
          )}
        </div>
        <div>
          {total > 0 ? (
            <>
              <div className="h-[3px] w-full rounded-full bg-black/15">
                <div
                  className="h-[3px] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: bloomColor(stage) }}
                />
              </div>
              <p className="mt-1 text-[9px] tracking-[0.1em] text-bone-muted">
                {done}/{total} done
              </p>
            </>
          ) : (
            <p className="text-[9px] tracking-[0.1em] text-bone-faint">
              no checkpoints yet
            </p>
          )}
        </div>
      </motion.button>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
