"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import FadeUp from "@/components/motion/FadeUp";
import TaskCard, { type TaskEdit } from "./TaskCard";
import CompletedTaskRow from "./CompletedTaskRow";
import AddTaskComposer, { type NewTask } from "./AddTaskComposer";
import type { TaskData } from "./types";

function todayLabel() {
  return new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "2-digit" })
    .toUpperCase();
}

function dayGroupLabel(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

export default function Plan() {
  const [open, setOpen] = useState<TaskData[] | null>(null);
  const [completed, setCompleted] = useState<TaskData[]>([]);

  const refresh = useCallback(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => {
        setOpen(d.open ?? []);
        setCompleted(d.completed ?? []);
      })
      .catch(() => setOpen([]));
  }, []);

  useEffect(refresh, [refresh]);

  // Every mutation replaces the single affected task in-place across
  // both lists — completion moves it between them, which is exactly the
  // transition TaskCard/CompletedTaskRow's shared layoutId animates.
  const applyTask = useCallback((task: TaskData) => {
    setOpen((prev) => (prev ? prev.filter((t) => t.id !== task.id) : prev));
    setCompleted((prev) => prev.filter((t) => t.id !== task.id));
    if (task.completed) {
      setCompleted((prev) => [task, ...prev]);
    } else {
      setOpen((prev) => (prev ? [...prev, task] : [task]));
    }
  }, []);

  const addTask = useCallback(
    async (input: NewTask) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) refresh();
    },
    [refresh]
  );

  const toggleTask = useCallback(
    async (id: string, completedNext: boolean) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: completedNext }),
      });
      if (res.ok) applyTask((await res.json()).task);
    },
    [applyTask]
  );

  const editTask = useCallback(
    async (id: string, patch: TaskEdit) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) applyTask((await res.json()).task);
    },
    [applyTask]
  );

  const toggleSubtask = useCallback(
    async (subtaskId: string, completedNext: boolean) => {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: completedNext }),
      });
      if (res.ok) applyTask((await res.json()).task);
    },
    [applyTask]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) applyTask((await res.json()).task);
    },
    [applyTask]
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      if (res.ok) applyTask((await res.json()).task);
    },
    [applyTask]
  );

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOpen((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      setCompleted((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return completed.filter(
      (t) => t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length;
  }, [completed]);

  const totalToday = (open?.length ?? 0) + completedToday;
  const progressPct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  const completedGroups = useMemo(() => {
    const groups = new Map<string, TaskData[]>();
    for (const t of completed) {
      const key = t.completedAt ? t.completedAt.slice(0, 10) : "unknown";
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    return [...groups.entries()];
  }, [completed]);

  if (open === null) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">loading your plan…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-10">
      <FadeUp>
        <p className="text-eyebrow text-ember">your plan</p>
      </FadeUp>
      <FadeUp delay={0.08}>
        <h1 className="font-display mt-4 text-5xl md:text-7xl">
          PLAN{" "}
          <span className="font-voice text-bone-muted">{todayLabel()}</span>
        </h1>
      </FadeUp>

      {totalToday > 0 && (
        <FadeUp delay={0.14}>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px w-40 bg-ink-3">
              <motion.div
                className="h-px bg-ember"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] tracking-[0.14em] text-bone-muted">
              {completedToday} of {totalToday} done today
            </span>
          </div>
        </FadeUp>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <p className="text-eyebrow text-bone-muted">open</p>
          <div className="mt-4 flex flex-col gap-3">
            <AddTaskComposer onAdd={addTask} />
            {open.length === 0 && (
              <p className="px-1 py-6 text-sm text-bone-faint">
                nothing on your plate — add something above.
              </p>
            )}
            {open.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleTask={(c) => toggleTask(task.id, c)}
                onToggleSubtask={toggleSubtask}
                onAddSubtask={(title) => addSubtask(task.id, title)}
                onDeleteSubtask={deleteSubtask}
                onDeleteTask={() => deleteTask(task.id)}
                onEditTask={(patch) => editTask(task.id, patch)}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="text-eyebrow text-bone-muted">completed</p>
          <div className="mt-4 flex flex-col gap-6">
            {completed.length === 0 ? (
              <p className="px-1 py-6 text-sm text-bone-faint">
                finished tasks land here — check something off to start.
              </p>
            ) : (
              completedGroups.map(([date, tasks]) => (
                <div key={date}>
                  <p className="text-[10px] tracking-[0.14em] text-bone-faint">
                    {date === "unknown" ? "" : dayGroupLabel(date)}
                  </p>
                  <div className="mt-2 flex flex-col gap-3">
                    {tasks.map((task) => (
                      <CompletedTaskRow
                        key={task.id}
                        task={task}
                        onToggleTask={(c) => toggleTask(task.id, c)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
