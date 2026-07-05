"use client";

import { motion } from "framer-motion";
import Checkbox from "./Checkbox";
import type { TaskData } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Shares layoutId with TaskCard — when a task's `completed` flag flips,
// React moves it from the open list's .map() to this one in the same
// render, and Framer Motion's automatic shared-layout projection carries
// it across as a physical FLIP (same technique as the Archive's
// card-to-player expansion).
export default function CompletedTaskRow({
  task,
  onToggleTask,
}: {
  task: TaskData;
  onToggleTask: (completed: boolean) => void;
}) {
  // A task with subtasks can only reopen via unchecking a subtask (the API
  // rejects a direct toggle there) — the checkbox here is just a settled
  // indicator in that case, not a control.
  const canReopenDirectly = task.subtasks.length === 0;
  return (
    <motion.div
      layoutId={`task-${task.id}`}
      layout
      transition={{ duration: 0.5, ease: EASE }}
      className="flex items-center gap-3 rounded-lg border border-ink-3 bg-ink-2/60 p-4"
    >
      <Checkbox
        checked
        onToggle={canReopenDirectly ? () => onToggleTask(false) : () => {}}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-bone-faint line-through">
          {task.title}
        </p>
        {task.subtasks.length > 0 && (
          <p className="mt-0.5 text-[10px] tracking-[0.1em] text-bone-faint">
            {task.subtasks.length} subtasks done
          </p>
        )}
      </div>
    </motion.div>
  );
}
