"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Priority } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type NewTask = {
  title: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  subtasks?: string[];
};

export default function AddTaskComposer({
  onAdd,
}: {
  onAdd: (task: NewTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDeadline("");
    setSubtasks([]);
    setSubtaskDraft("");
    setExpanded(false);
  };

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd({
      title: t,
      description: description.trim() || undefined,
      priority,
      deadline: deadline || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
    reset();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-lg border border-ink-3 bg-ink-2 p-4"
    >
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="add a task — e.g. learn numpy and pandas"
          className="flex-1 bg-transparent text-sm text-bone outline-none placeholder:text-bone-faint"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] tracking-[0.1em] text-bone-muted transition-colors duration-300 hover:text-bone"
        >
          {expanded ? "less —" : "details —"}
        </button>
        <button
          type="submit"
          className="font-display shrink-0 rounded border border-ember px-3 py-1.5 text-[10px] tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
        >
          ADD
        </button>
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
            <div className="mt-4 flex flex-col gap-3 border-t border-ink-3 pt-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="description (optional)"
                rows={2}
                className="w-full resize-none rounded border border-ink-4 bg-ink px-3 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
              />

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-1">
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`rounded-full border px-3 py-1 text-[10px] tracking-[0.1em] transition-colors duration-300 ${
                        priority === p
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
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded border border-ink-4 bg-ink px-3 py-1.5 text-xs text-bone outline-none focus:border-bone-muted"
                />
              </div>

              <div>
                {subtasks.length > 0 && (
                  <ul className="mb-2 flex flex-col gap-1">
                    {subtasks.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-xs text-bone-muted"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() =>
                            setSubtasks((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="text-bone-faint hover:text-ember"
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subtaskDraft.trim()) {
                      e.preventDefault();
                      setSubtasks((prev) => [...prev, subtaskDraft.trim()]);
                      setSubtaskDraft("");
                    }
                  }}
                  placeholder="add subtasks, press enter after each"
                  className="w-full rounded border border-ink-4 bg-ink px-3 py-2 text-xs text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
