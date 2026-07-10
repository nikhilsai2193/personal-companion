"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { selectNextMove } from "@/lib/goalNextMove";
import type { GoalNodeData } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function NextMoveSpotlight({
  nodes,
  onToggleCheckpoint,
}: {
  nodes: GoalNodeData[];
  onToggleCheckpoint: (checkpointId: string, completed: boolean) => void;
}) {
  const move = useMemo(() => selectNextMove(nodes), [nodes]);

  return (
    <AnimatePresence mode="wait">
      {move ? (
        <motion.div
          key={move.checkpoint.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="rounded-lg border border-ember bg-ink-2 px-6 py-5"
        >
          <p className="text-eyebrow text-ember">today&apos;s move</p>
          <p className="font-voice mt-2 text-2xl italic leading-snug text-bone">
            {move.checkpoint.title}
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-[10px] tracking-[0.1em] text-bone-faint">
              part of — {move.node.title}
            </p>
            <button
              onClick={() => onToggleCheckpoint(move.checkpoint.id, true)}
              className="font-display shrink-0 rounded-full border border-ember px-6 py-2.5 text-[11px] tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
            >
              MARK IT DONE
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="all-done"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-ink-3 bg-ink-2 px-6 py-5 text-center"
        >
          <p className="font-voice text-xl italic text-bone">
            every step is checked off.
          </p>
          <p className="mt-1 text-[10px] tracking-[0.1em] text-bone-faint">
            write more whenever the next chapter starts
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
