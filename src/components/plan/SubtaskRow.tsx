"use client";

import Checkbox from "./Checkbox";
import type { SubtaskData } from "./types";

export default function SubtaskRow({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: SubtaskData;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 py-1.5">
      <Checkbox checked={subtask.completed} onToggle={onToggle} size={16} />
      <span
        className={`flex-1 text-sm transition-colors duration-300 ${
          subtask.completed ? "text-bone-faint line-through" : "text-bone"
        }`}
      >
        {subtask.title}
      </span>
      <button
        onClick={onDelete}
        className="text-[10px] tracking-[0.1em] text-bone-faint opacity-0 transition-opacity duration-300 hover:text-ember group-hover:opacity-100"
      >
        remove
      </button>
    </li>
  );
}
