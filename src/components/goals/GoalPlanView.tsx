"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import GoalComposer from "./GoalComposer";
import ProcessingOverlay from "./ProcessingOverlay";
import GoalCanvas from "./GoalCanvas";
import MergeReview from "./MergeReview";
import type { NodeEdit } from "./GoalCardDetail";
import type { GoalEntryData, GoalNodeData, GoalPlanData } from "./types";
import type { MergeDiff } from "@/lib/goalDiff";

export default function GoalPlanView({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<GoalPlanData | null>(null);
  const [nodes, setNodes] = useState<GoalNodeData[] | null>(null);
  const [entries, setEntries] = useState<GoalEntryData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingMore, setAddingMore] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<{ entryId: string; diff: MergeDiff } | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/goals/${planId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setPlan(d.plan);
        setNodes(d.nodes);
        setEntries(d.entries);
      })
      .catch(() => {});
  }, [planId]);

  useEffect(refresh, [refresh]);

  const submitEntry = useCallback(
    async (text: string) => {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/goals/${planId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      if (body.merge) {
        setAddingMore(false);
        setPendingDiff({ entryId: body.entryId, diff: body.diff });
        return;
      }
      refresh();
    },
    [planId, refresh]
  );

  const confirmMerge = useCallback(
    async (confirmedRemovalIds: string[]) => {
      if (!pendingDiff) return;
      setConfirming(true);
      const res = await fetch(`/api/goals/${planId}/diff/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: pendingDiff.entryId, confirmedRemovalIds }),
      });
      setConfirming(false);
      if (res.ok) {
        setPendingDiff(null);
        refresh();
      }
    },
    [pendingDiff, planId, refresh]
  );

  const toggleCheckpoint = useCallback(
    async (checkpointId: string, completed: boolean) => {
      const res = await fetch(`/api/goal-checkpoints/${checkpointId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) return;
      const { node } = await res.json();
      setNodes((prev) =>
        prev ? prev.map((n) => (n.id === node.id ? node : n)) : prev
      );
    },
    []
  );

  const addCheckpoint = useCallback(async (nodeId: string, title: string) => {
    const res = await fetch(`/api/goal-nodes/${nodeId}/checkpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    const { node } = await res.json();
    setNodes((prev) => (prev ? prev.map((n) => (n.id === node.id ? node : n)) : prev));
  }, []);

  const deleteCheckpoint = useCallback(async (checkpointId: string) => {
    const res = await fetch(`/api/goal-checkpoints/${checkpointId}`, { method: "DELETE" });
    if (!res.ok) return;
    const { node } = await res.json();
    setNodes((prev) => (prev ? prev.map((n) => (n.id === node.id ? node : n)) : prev));
  }, []);

  const editNode = useCallback(async (nodeId: string, patch: NodeEdit) => {
    const res = await fetch(`/api/goal-nodes/${nodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const { node } = await res.json();
    setNodes((prev) => (prev ? prev.map((n) => (n.id === node.id ? node : n)) : prev));
  }, []);

  const deleteNode = useCallback(async (nodeId: string) => {
    const res = await fetch(`/api/goal-nodes/${nodeId}`, { method: "DELETE" });
    if (!res.ok) return;
    setNodes((prev) => (prev ? prev.filter((n) => n.id !== nodeId) : prev));
  }, []);

  if (!plan || nodes === null) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">opening your plan…</p>
      </div>
    );
  }

  const hasTree = nodes.length > 0;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/goals"
          className="pointer-events-auto text-[10px] tracking-[0.12em] text-bone-muted transition-colors duration-300 hover:text-bone"
        >
          ← all goals
        </Link>
        <div className="pointer-events-auto flex items-center gap-4">
          {hasTree && !addingMore && (
            <button
              onClick={() => setAddingMore(true)}
              className="text-[10px] tracking-[0.12em] text-ember hover:opacity-80"
            >
              add more —
            </button>
          )}
          <p className="text-[10px] tracking-[0.12em] text-bone-faint">{plan.title}</p>
        </div>
      </div>

      {hasTree && !addingMore ? (
        <GoalCanvas
          nodes={nodes}
          onToggleCheckpoint={toggleCheckpoint}
          onAddCheckpoint={addCheckpoint}
          onDeleteCheckpoint={deleteCheckpoint}
          onEditNode={editNode}
          onDeleteNode={deleteNode}
        />
      ) : (
        <div className="pt-14">
          {addingMore && (
            <div className="mx-auto w-full max-w-2xl px-6 md:px-0">
              <button
                onClick={() => setAddingMore(false)}
                className="text-[10px] tracking-[0.12em] text-bone-muted hover:text-bone"
              >
                ← back to the tree
              </button>
            </div>
          )}
          <GoalComposer
            hasTree={hasTree}
            entries={entries}
            onSubmit={submitEntry}
            submitting={submitting}
            error={error}
          />
        </div>
      )}

      {submitting && <ProcessingOverlay title={plan.title} />}

      <AnimatePresence>
        {pendingDiff && (
          <MergeReview
            diff={pendingDiff.diff}
            confirming={confirming}
            onConfirm={confirmMerge}
            onCancel={() => setPendingDiff(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
