"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicUser } from "@/lib/social";

export default function SharePicker({ filmId }: { filmId: string }) {
  const [followers, setFollowers] = useState<PublicUser[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/follows").then((r) => r.json()),
      fetch(`/api/films/${filmId}/shares`).then((r) => r.json()),
    ])
      .then(([f, s]) => {
        setFollowers(f.followers ?? []);
        setSelected(
          new Set((s.recipients ?? []).map((u: PublicUser) => u.id))
        );
      })
      .catch(() => setFollowers([]));
  }, [filmId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setState("idle");
  };

  const save = async () => {
    setState("saving");
    const res = await fetch(`/api/films/${filmId}/shares`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientIds: [...selected] }),
    });
    setState(res.ok ? "saved" : "error");
  };

  if (followers === null) return null;

  return (
    <div className="border-t border-ink-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-bone-muted">send to</p>
        <p className="text-[10px] tracking-[0.14em] text-bone-faint">
          {selected.size === 0
            ? "private — only you"
            : `${selected.size} ${selected.size === 1 ? "person" : "people"}`}
        </p>
      </div>

      {followers.length === 0 ? (
        <p className="mt-3 text-xs text-bone-faint">
          no followers yet —{" "}
          <Link
            href="/friends"
            className="text-bone-muted underline-offset-4 hover:underline"
          >
            find your people
          </Link>{" "}
          and your films stay private until then
        </p>
      ) : (
        <>
          <ul className="mt-3 flex max-h-40 flex-col gap-1 overflow-y-auto">
            {followers.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => toggle(u.id)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs transition-colors ${
                    selected.has(u.id)
                      ? "bg-ink-3 text-bone"
                      : "text-bone-muted hover:bg-ink-2 hover:text-bone"
                  }`}
                >
                  <span className="truncate">{u.name ?? u.email}</span>
                  <span
                    className={`ml-3 shrink-0 text-[10px] tracking-[0.14em] ${
                      selected.has(u.id) ? "text-ember" : "text-bone-faint"
                    }`}
                  >
                    {selected.has(u.id) ? "sending" : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-end gap-4">
            {state === "saved" && (
              <span className="text-[10px] tracking-[0.14em] text-bone-muted">
                sent
              </span>
            )}
            {state === "error" && (
              <span className="text-[10px] tracking-[0.14em] text-ember">
                couldn&apos;t save — try again
              </span>
            )}
            <button
              onClick={save}
              disabled={state === "saving"}
              className="font-display rounded-full border border-ink-4 px-5 py-2 text-[10px] tracking-[0.18em] text-bone-muted transition-colors duration-300 hover:border-ember hover:text-ember disabled:opacity-40"
            >
              {state === "saving" ? "SENDING…" : "UPDATE SHARING"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
