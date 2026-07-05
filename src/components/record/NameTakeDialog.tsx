"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type ProjectSummary = {
  id: string;
  title: string;
  kind: "DAY" | "TOPIC";
  date: string | null;
  clipCount: number;
};

export type TakeDestination =
  | { kind: "myday" }
  | { kind: "new"; title: string }
  | { kind: "existing"; id: string; title: string };

// Shown right after a take finishes on the main record page: keep it in
// My Day, start a new topic, or append to an in-progress one.
export default function NameTakeDialog({
  existing,
  onChoose,
  onDiscard,
}: {
  existing: ProjectSummary[];
  onChoose: (dest: TakeDestination) => void;
  onDiscard: () => void;
}) {
  const [title, setTitle] = useState("");
  const topics = existing.filter((p) => p.kind === "TOPIC");

  const submitNew = () => {
    const t = title.trim();
    if (!t || t.toLowerCase() === "my day") {
      onChoose({ kind: "myday" });
      return;
    }
    const match = topics.find(
      (p) => p.title.toLowerCase() === t.toLowerCase()
    );
    if (match) onChoose({ kind: "existing", id: match.id, title: match.title });
    else onChoose({ kind: "new", title: t });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-6"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-lg border border-ink-3 bg-ink-2 p-6"
      >
        <p className="text-eyebrow text-ember">take saved — where to?</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNew();
          }}
          className="mt-5 flex gap-2"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="name a new project — e.g. Arrays"
            className="w-full rounded border border-ink-4 bg-ink px-4 py-3 text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
          />
          <button
            type="submit"
            className="font-display shrink-0 rounded border border-ember px-4 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
          >
            SAVE
          </button>
        </form>

        {topics.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] tracking-[0.14em] text-bone-muted">
              or add it to a project in progress
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    onChoose({ kind: "existing", id: p.id, title: p.title })
                  }
                  className="rounded-full border border-ink-4 px-4 py-2 text-xs tracking-[0.08em] text-bone transition-colors duration-300 hover:border-ember hover:text-ember"
                >
                  {p.title}
                  <span className="ml-2 text-bone-muted">{p.clipCount}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-ink-3 pt-4">
          <button
            onClick={() => onChoose({ kind: "myday" })}
            className="font-display text-xs tracking-[0.14em] text-bone transition-colors duration-300 hover:text-ember"
          >
            KEEP IN MY DAY
          </button>
          <button
            onClick={onDiscard}
            className="text-[10px] tracking-[0.12em] text-bone-faint transition-colors duration-300 hover:text-ember"
          >
            discard take
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
