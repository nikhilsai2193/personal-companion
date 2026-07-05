"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Checkbox from "./Checkbox";
import SubtaskRow from "./SubtaskRow";
import type { Priority, TaskData } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRIORITY_DOT: Record<TaskData["priority"], string> = {
  HIGH: "bg-ember",
  MEDIUM: "bg-bone-muted",
  LOW: "bg-bone-faint",
};

export type TaskEdit = {
  title?: string;
  description?: string | null;
  priority?: Priority;
  deadline?: string | null;
};

function deadlineLabel(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(`${deadline.slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const label = d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  return d.getTime() < today.getTime()
    ? { text: `since ${label}`, quiet: true }
    : { text: `due ${label}`, quiet: false };
}

export default function TaskCard({
  task,
  onToggleTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onDeleteTask,
  onEditTask,
}: {
  task: TaskData;
  onToggleTask: (completed: boolean) => void;
  onToggleSubtask: (subtaskId: string, completed: boolean) => void;
  onAddSubtask: (title: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onDeleteTask: () => void;
  onEditTask: (patch: TaskEdit) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  // Drafts for the two free-text fields — they save on blur, not per
  // keystroke, so they need local state that survives unrelated task
  // refreshes (e.g. toggling a sibling subtask) without losing what the
  // user is mid-typing. Priority/deadline save immediately, so they just
  // read straight from `task`.
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descDraft, setDescDraft] = useState(task.description ?? "");

  const hasSubtasks = task.subtasks.length > 0;
  const doneCount = task.subtasks.filter((s) => s.completed).length;
  const deadline = deadlineLabel(task.deadline);

  const saveTitle = () => {
    const t = titleDraft.trim();
    if (!t) {
      setTitleDraft(task.title);
      return;
    }
    if (t !== task.title) onEditTask({ title: t });
  };
  const saveDescription = () => {
    const d = descDraft.trim();
    if (d !== (task.description ?? "")) onEditTask({ description: d || null });
  };

  return (
    <motion.div
      layoutId={`task-${task.id}`}
      layout
      transition={{ duration: 0.5, ease: EASE }}
      className="group rounded-lg border border-ink-3 bg-ink-2 p-4"
    >
      <div className="flex items-start gap-3">
        {hasSubtasks ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-4 text-[10px] text-bone-muted transition-colors duration-300 hover:border-bone-muted"
          >
            {doneCount}/{task.subtasks.length}
          </button>
        ) : (
          <div className="mt-0.5">
            <Checkbox checked={task.completed} onToggle={() => onToggleTask(!task.completed)} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            <button
              onClick={() => setExpanded((e) => !e)}
              className="truncate text-left text-sm text-bone"
            >
              {task.title}
            </button>
          </div>
          {task.description && !expanded && (
            <p className="mt-1 text-xs leading-relaxed text-bone-muted">
              {task.description}
            </p>
          )}
          {(deadline || hasSubtasks) && !expanded && (
            <div className="mt-2 flex items-center gap-3">
              {hasSubtasks && (
                <div className="h-px w-16 bg-ink-3">
                  <div
                    className="h-px bg-ember transition-all duration-500"
                    style={{
                      width: `${(doneCount / task.subtasks.length) * 100}%`,
                    }}
                  />
                </div>
              )}
              {deadline && (
                <span
                  className={`text-[10px] tracking-[0.1em] ${
                    deadline.quiet ? "text-bone-faint" : "text-bone-muted"
                  }`}
                >
                  {deadline.text}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/study/${task.id}`}
            className="text-[10px] tracking-[0.1em] text-ember transition-opacity duration-300 hover:opacity-80"
          >
            study space —
          </Link>
          <div className="flex items-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-[10px] tracking-[0.1em] text-bone-faint hover:text-bone"
            >
              {expanded ? "close" : "edit"}
            </button>
            <button
              onClick={onDeleteTask}
              className="text-[10px] tracking-[0.1em] text-bone-faint hover:text-ember"
            >
              delete
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="ml-8 mt-3 flex flex-col gap-3 border-t border-ink-3 pt-3">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                className="w-full bg-transparent text-sm text-bone outline-none"
              />
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={saveDescription}
                placeholder="description"
                rows={2}
                className="w-full resize-none rounded border border-ink-4 bg-ink px-3 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
              />

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-1">
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onEditTask({ priority: p })}
                      className={`rounded-full border px-3 py-1 text-[10px] tracking-[0.1em] transition-colors duration-300 ${
                        task.priority === p
                          ? "border-ember text-ember"
                          : "border-ink-4 text-bone-muted hover:text-bone"
                      }`}
                    >
                      {p.toLowerCase()}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={task.deadline ? task.deadline.slice(0, 10) : ""}
                  onChange={(e) =>
                    onEditTask({ deadline: e.target.value || null })
                  }
                  className="rounded border border-ink-4 bg-ink px-3 py-1.5 text-xs text-bone outline-none focus:border-bone-muted"
                />
                {task.deadline && (
                  <button
                    onClick={() => onEditTask({ deadline: null })}
                    className="text-[10px] tracking-[0.1em] text-bone-faint hover:text-ember"
                  >
                    clear date
                  </button>
                )}
              </div>

              {hasSubtasks && (
                <ul className="divide-y divide-ink-3/60 border-t border-ink-3 pt-1">
                  {task.subtasks.map((s) => (
                    <SubtaskRow
                      key={s.id}
                      subtask={s}
                      onToggle={() => onToggleSubtask(s.id, !s.completed)}
                      onDelete={() => onDeleteSubtask(s.id)}
                    />
                  ))}
                </ul>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = newSubtask.trim();
                  if (!t) return;
                  onAddSubtask(t);
                  setNewSubtask("");
                }}
              >
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="add a subtask"
                  className="w-full bg-transparent py-1.5 text-xs text-bone outline-none placeholder:text-bone-faint"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
