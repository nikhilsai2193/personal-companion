"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Checkbox from "@/components/plan/Checkbox";
import { cardTint } from "@/lib/goalCardTint";
import type { GoalNodeData } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

export type NodeEdit = {
  title?: string;
  description?: string | null;
  obstacle?: string | null;
  obstaclePlan?: string | null;
  targetDate?: string | null;
};

export default function GoalCardDetail({
  node,
  isRoot,
  onClose,
  onToggleCheckpoint,
  onAddCheckpoint,
  onDeleteCheckpoint,
  onEdit,
  onDeleteNode,
}: {
  node: GoalNodeData;
  isRoot: boolean;
  onClose: () => void;
  onToggleCheckpoint: (checkpointId: string, completed: boolean) => void;
  onAddCheckpoint: (title: string) => void;
  onDeleteCheckpoint: (checkpointId: string) => void;
  onEdit: (patch: NodeEdit) => void;
  onDeleteNode: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  // Once the flip animation finishes, we drop the 3D transform scaffolding
  // entirely and render the back face as a plain, untransformed element.
  // Real form inputs living inside a `transform-style: preserve-3d` /
  // `backface-visibility: hidden` subtree turned out to be unreliable to
  // click into in practice — the element hit-tests correctly by every
  // synchronous check (elementFromPoint, computed pointer-events) but
  // clicks intermittently failed to move focus, a known class of browser
  // quirk around focus inside 3D-transformed ancestors. The transform is
  // only needed for the ~1.25s transition itself.
  const [settled, setSettled] = useState(false);
  const [closing, setClosing] = useState(false);
  const [newCheckpoint, setNewCheckpoint] = useState("");
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [descDraft, setDescDraft] = useState(node.description ?? "");
  const [obstacleDraft, setObstacleDraft] = useState(node.obstacle ?? "");
  const [planDraft, setPlanDraft] = useState(node.obstaclePlan ?? "");

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 550);
    const t2 = setTimeout(() => setSettled(true), 550 + 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const requestClose = () => {
    setClosing(true);
    setSettled(false);
    setFlipped(false);
    setTimeout(onClose, 650);
  };

  const total = node.checkpoints.length;
  const done = node.checkpoints.filter((c) => c.completed).length;
  const tint = cardTint(node.id);

  const backFaceBody = (
    <div className="flex max-h-[75vh] flex-col overflow-y-auto p-6">
      <div className="flex shrink-0 items-start justify-between gap-3">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  const t = titleDraft.trim();
                  if (t && t !== node.title) onEdit({ title: t });
                  else setTitleDraft(node.title);
                }}
                className="font-display flex-1 bg-transparent text-xl outline-none"
              />
              <button
                onClick={requestClose}
                className="shrink-0 text-xs tracking-[0.1em] text-bone-muted hover:text-bone"
              >
                close
              </button>
            </div>

            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={() => {
                const d = descDraft.trim();
                if (d !== (node.description ?? "")) onEdit({ description: d || null });
              }}
              placeholder="description"
              rows={2}
              className="mt-3 w-full shrink-0 resize-none rounded border border-ink-4 bg-ink px-3 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
            />

            <div className="mt-3 flex shrink-0 items-center gap-3">
              <input
                type="date"
                value={node.targetDate ? node.targetDate.slice(0, 10) : ""}
                onChange={(e) => onEdit({ targetDate: e.target.value || null })}
                className="rounded border border-ink-4 bg-ink px-3 py-1.5 text-xs text-bone outline-none focus:border-bone-muted"
              />
              {node.targetDate && (
                <button
                  onClick={() => onEdit({ targetDate: null })}
                  className="text-[10px] tracking-[0.1em] text-bone-faint hover:text-ember"
                >
                  clear date
                </button>
              )}
            </div>

            {total > 0 && (
              <div className="mt-4 h-px w-full shrink-0 bg-ink-3">
                <div
                  className="h-px bg-ember transition-all duration-500"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
            )}

            <ul className="mt-3 flex shrink-0 flex-col gap-1.5">
              {node.checkpoints.map((c) => (
                <li key={c.id} className="group flex items-center gap-3">
                  <Checkbox
                    checked={c.completed}
                    onToggle={() => onToggleCheckpoint(c.id, !c.completed)}
                    size={16}
                  />
                  <span
                    className={`flex-1 text-sm ${c.completed ? "text-bone-faint line-through" : "text-bone"}`}
                  >
                    {c.title}
                  </span>
                  <button
                    onClick={() => onDeleteCheckpoint(c.id)}
                    className="text-[10px] tracking-[0.1em] text-bone-faint opacity-0 transition-opacity duration-300 hover:text-ember group-hover:opacity-100"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = newCheckpoint.trim();
                if (!t) return;
                onAddCheckpoint(t);
                setNewCheckpoint("");
              }}
              className="mt-2 shrink-0"
            >
              <input
                value={newCheckpoint}
                onChange={(e) => setNewCheckpoint(e.target.value)}
                placeholder="add a checkpoint"
                className="w-full rounded border border-ink-3 bg-ink-2 px-2.5 py-1.5 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
              />
            </form>

            <div className="mt-4 flex shrink-0 flex-col gap-3 rounded border border-ink-4 bg-ink p-3">
              <div>
                <p className="text-[10px] tracking-[0.1em] text-bone-faint">
                  might get in the way
                </p>
                <textarea
                  value={obstacleDraft}
                  onChange={(e) => setObstacleDraft(e.target.value)}
                  onBlur={() => {
                    const v = obstacleDraft.trim();
                    if (v !== (node.obstacle ?? "")) onEdit({ obstacle: v || null });
                  }}
                  placeholder="what could get in the way?"
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded border border-ink-3 bg-ink-2 px-2.5 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
                />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.1em] text-bone-faint">
                  if that happens
                </p>
                <textarea
                  value={planDraft}
                  onChange={(e) => setPlanDraft(e.target.value)}
                  onBlur={() => {
                    const v = planDraft.trim();
                    if (v !== (node.obstaclePlan ?? "")) onEdit({ obstaclePlan: v || null });
                  }}
                  placeholder="then what will you do?"
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded border border-ink-3 bg-ink-2 px-2.5 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
                />
              </div>
            </div>

      {!isRoot && (
        <button
          onClick={onDeleteNode}
          className="mt-4 shrink-0 self-start text-[10px] tracking-[0.1em] text-bone-faint hover:text-ember"
        >
          delete this step
        </button>
      )}
    </div>
  );

  const backFaceClass = `rounded-lg border border-l-4 ${
    isRoot ? "border-ember bg-ink-2" : "border-ink-3 bg-ink-2"
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={requestClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-4 py-10 md:px-10"
    >
      <motion.div
        layoutId={`goal-card-${node.id}`}
        transition={{ duration: 0.55, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl"
        style={{ perspective: settled ? undefined : 1600 }}
      >
        {settled ? (
          // Flattened, fully-normal DOM once the flip has visually
          // finished — no 3D transform ancestor left for the real form
          // inputs to sit inside.
          <div
            style={{ borderLeftColor: isRoot ? "var(--color-ember)" : tint.border }}
            className={backFaceClass}
          >
            {backFaceBody}
          </div>
        ) : (
          /*
            Both faces occupy the same grid cell (rather than being
            absolutely positioned) so the container's height is the
            natural, in-flow content height of whichever face is tallest —
            absolute positioning inside a flex-col forced a fixed height,
            which then made flex children (like the description textarea)
            shrink to near-zero to fit, clipping their content.
          */
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ transformStyle: "preserve-3d", display: "grid" }}
          >
            {/* Front face */}
            <div
              style={{
                backfaceVisibility: "hidden",
                gridArea: "1 / 1",
                background: tint.background,
                borderColor: isRoot ? "var(--color-ember)" : tint.border,
                pointerEvents: flipped ? "none" : "auto",
              }}
              className="flex min-h-[20rem] flex-col items-center justify-center gap-5 rounded-lg border p-10 text-center"
            >
              <p
                className="text-eyebrow"
                style={{ color: isRoot ? "var(--color-ember)" : tint.accent }}
              >
                {isRoot ? "the goal" : "a step along the way"}
              </p>
              <h2 className="font-voice max-w-md text-4xl italic leading-tight text-bone">
                {node.title}
              </h2>
              {node.targetDate && (
                <p className="text-xs tracking-[0.14em] text-bone-muted">
                  {dayLabel(node.targetDate)}
                </p>
              )}
              {total > 0 && (
                <p className="text-xs tracking-[0.1em] text-bone-faint">
                  opening — {done}/{total} checkpoints
                </p>
              )}
            </div>

            {/* Back face — inert until settled takes over (see above) */}
            <div
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                gridArea: "1 / 1",
                borderLeftColor: isRoot ? "var(--color-ember)" : tint.border,
                pointerEvents: "none",
              }}
              className={backFaceClass}
            >
              {backFaceBody}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
