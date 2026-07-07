"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import FadeUp from "@/components/motion/FadeUp";
import type { MergeDiff } from "@/lib/goalDiff";

// The safety net for incremental input: nothing from a merge ever applies
// without landing here first. Removals with completed progress default
// UNCHECKED — the user has to actively opt in to lose something they've
// already done. Everything else (new steps, renames, harmless removals)
// just needs a glance.
export default function MergeReview({
  diff,
  onConfirm,
  onCancel,
  confirming,
}: {
  diff: MergeDiff;
  onConfirm: (confirmedRemovalIds: string[]) => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const riskyNodeRemovals = diff.removedNodes.filter((n) => n.hasProgress);
  const safeNodeRemovals = diff.removedNodes.filter((n) => !n.hasProgress);
  const riskyCheckpointRemovals = diff.removedCheckpoints.filter((c) => c.completed);
  const safeCheckpointRemovals = diff.removedCheckpoints.filter((c) => !c.completed);

  const [confirmedRisky, setConfirmedRisky] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setConfirmedRisky((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink px-6 py-16 md:px-10"
    >
      <div className="mx-auto max-w-2xl">
        <FadeUp>
          <p className="text-eyebrow text-ember">reviewing your update</p>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h1 className="font-display mt-4 text-4xl md:text-5xl">
            HERE&apos;S WHAT CHANGES
          </h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mt-4 text-sm leading-relaxed text-bone-muted">
            nothing applies until you say so. anything you&apos;ve already made
            progress on is kept unless you explicitly choose to remove it.
          </p>
        </FadeUp>

        <div className="mt-10 flex flex-col gap-8">
          {diff.addedNodes.length > 0 && (
            <section>
              <p className="text-eyebrow text-bone-muted">
                new steps — {diff.addedNodes.length}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {diff.addedNodes.map((n) => (
                  <li key={n.tempId} className="rounded border border-ink-3 bg-ink-2 px-4 py-3 text-sm">
                    <span className="text-bone">{n.title}</span>
                    <span className="ml-2 text-[10px] tracking-[0.1em] text-bone-faint">
                      under {n.parentTitle}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {diff.addedCheckpoints.length > 0 && (
            <section>
              <p className="text-eyebrow text-bone-muted">
                new checkpoints — {diff.addedCheckpoints.length}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {diff.addedCheckpoints.map((c, i) => (
                  <li key={i} className="rounded border border-ink-3 bg-ink-2 px-4 py-3 text-sm">
                    <span className="text-bone">{c.title}</span>
                    <span className="ml-2 text-[10px] tracking-[0.1em] text-bone-faint">
                      in {c.nodeTitle}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {diff.changedTitles.length > 0 && (
            <section>
              <p className="text-eyebrow text-bone-muted">
                renamed — {diff.changedTitles.length}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {diff.changedTitles.map((c) => (
                  <li key={c.id} className="rounded border border-ink-3 bg-ink-2 px-4 py-3 text-sm">
                    <span className="text-bone-faint line-through">{c.oldTitle}</span>
                    <span className="mx-2 text-bone-faint">→</span>
                    <span className="text-bone">{c.newTitle}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(safeNodeRemovals.length > 0 || safeCheckpointRemovals.length > 0) && (
            <section>
              <p className="text-eyebrow text-bone-muted">
                no longer needed — {safeNodeRemovals.length + safeCheckpointRemovals.length}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {safeNodeRemovals.map((n) => (
                  <li key={n.id} className="rounded border border-ink-3 bg-ink-2 px-4 py-3 text-sm text-bone-muted">
                    {n.title}
                  </li>
                ))}
                {safeCheckpointRemovals.map((c) => (
                  <li key={c.id} className="rounded border border-ink-3 bg-ink-2 px-4 py-3 text-sm text-bone-muted">
                    {c.title} <span className="text-[10px] tracking-[0.1em] text-bone-faint">in {c.nodeTitle}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(riskyNodeRemovals.length > 0 || riskyCheckpointRemovals.length > 0) && (
            <section>
              <p className="text-eyebrow text-ember">
                the new text suggests removing these — but you&apos;ve made progress
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {riskyNodeRemovals.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between gap-4 rounded border border-ember/40 bg-ember/10 px-4 py-3 text-sm"
                  >
                    <span className="text-bone">{n.title}</span>
                    <label className="flex shrink-0 items-center gap-2 text-[10px] tracking-[0.1em] text-bone-muted">
                      <input
                        type="checkbox"
                        checked={confirmedRisky.has(n.id)}
                        onChange={() => toggle(n.id)}
                      />
                      remove it anyway
                    </label>
                  </li>
                ))}
                {riskyCheckpointRemovals.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-4 rounded border border-ember/40 bg-ember/10 px-4 py-3 text-sm"
                  >
                    <span className="text-bone">
                      {c.title}{" "}
                      <span className="text-[10px] tracking-[0.1em] text-bone-faint">
                        in {c.nodeTitle} — already completed
                      </span>
                    </span>
                    <label className="flex shrink-0 items-center gap-2 text-[10px] tracking-[0.1em] text-bone-muted">
                      <input
                        type="checkbox"
                        checked={confirmedRisky.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      remove it anyway
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-ink-3 pt-6">
          <button
            onClick={onCancel}
            className="text-xs tracking-[0.12em] text-bone-muted hover:text-bone"
          >
            not now
          </button>
          <button
            onClick={() => onConfirm([...confirmedRisky])}
            disabled={confirming}
            className="font-display rounded-full border border-ember px-8 py-3.5 text-xs tracking-[0.16em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep disabled:opacity-40"
          >
            {confirming ? "UPDATING…" : "UPDATE MY PLAN"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
