"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GoalEntryData } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PROMPTS = [
  "What do you actually want out of this?",
  "When does it start — when should it be done?",
  "What has to happen first, before anything else?",
  "What might get in the way, and what will you do about it?",
];

function entryDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// The single most important input surface in the whole feature — this text
// becomes the tree. Deliberately not a cramped textarea: generous type,
// soft WOOP-shaped scaffolding that disappears the moment you start typing,
// never a rigid form.
export default function GoalComposer({
  hasTree,
  entries,
  onSubmit,
  submitting,
  error,
}: {
  hasTree: boolean;
  entries: GoalEntryData[];
  onSubmit: (text: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [text, setText] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 md:px-0">
      <div className="relative">
        <AnimatePresence>
          {text.length === 0 && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2"
            >
              {PROMPTS.map((p, i) => (
                <motion.p
                  key={p}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: EASE }}
                  className="font-voice text-xl text-bone-faint md:text-2xl"
                >
                  {p}
                </motion.p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full resize-none bg-transparent text-lg leading-relaxed text-bone outline-none"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-ember">{error}</p>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-ink-3 pt-6">
        <p className="max-w-xs text-[11px] leading-relaxed tracking-[0.02em] text-bone-faint">
          write freely — whenever you have more to add, come back and add it.
          nothing here is final.
        </p>
        <button
          onClick={() => {
            if (!text.trim() || submitting) return;
            onSubmit(text.trim());
            setText("");
          }}
          disabled={submitting || !text.trim()}
          className="font-display shrink-0 rounded-full border border-ember px-8 py-3.5 text-xs tracking-[0.16em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep disabled:cursor-not-allowed disabled:border-ink-4 disabled:text-bone-faint disabled:hover:bg-transparent"
        >
          {submitting
            ? "READING…"
            : hasTree
              ? "ADD TO THE PLAN"
              : "MAP OUT THE PLAN"}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="mt-14">
          <p className="text-eyebrow text-bone-muted">what you've written</p>
          <div className="mt-4 flex flex-col gap-4">
            {entries.map((e) => (
              <div key={e.id} className="border-l border-ink-3 pl-4">
                <p className="text-[10px] tracking-[0.12em] text-bone-faint">
                  {entryDate(e.createdAt)}
                  {e.status === "FAILED" && (
                    <span className="ml-2 text-ember">
                      couldn&apos;t process — {e.error}
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-bone-muted">
                  {e.rawText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
