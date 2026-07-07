"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FadeUp from "@/components/motion/FadeUp";

type GoalSummary = {
  id: string;
  title: string;
  updatedAt: string;
  nodeCount: number;
  checkpointTotal: number;
  checkpointDone: number;
};

export default function GoalsList() {
  const router = useRouter();
  const [plans, setPlans] = useState<GoalSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  const create = async () => {
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    const { plan } = await res.json();
    router.push(`/goals/${plan.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 md:px-0">
      <FadeUp>
        <p className="text-eyebrow text-ember">the big picture</p>
      </FadeUp>
      <FadeUp delay={0.08}>
        <h1 className="font-display mt-4 text-5xl md:text-7xl">GOALS</h1>
      </FadeUp>
      <FadeUp delay={0.14}>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-bone-muted">
          write down what you want, over whatever timeframe — a degree, a
          year, a life. DAYFILM maps it into a tree you can keep coming back to.
        </p>
      </FadeUp>

      <FadeUp delay={0.2}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="mt-10 flex gap-2"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="name this goal — e.g. MS in Computer Science"
            className="flex-1 rounded border border-ink-4 bg-ink-2 px-4 py-3 text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="font-display shrink-0 rounded border border-ember px-5 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep disabled:opacity-40"
          >
            START
          </button>
        </form>
      </FadeUp>

      <div className="mt-12">
        {plans === null && <p className="text-sm text-bone-faint">loading…</p>}
        {plans?.length === 0 && (
          <p className="text-sm text-bone-faint">
            no goals yet — name one above to start mapping it out.
          </p>
        )}
        {plans && plans.length > 0 && (
          <ul className="divide-y divide-ink-3 border-y border-ink-3">
            {plans.map((p, i) => (
              <FadeUp key={p.id} delay={0.04 * i}>
                <a
                  href={`/goals/${p.id}`}
                  className="group flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-bone transition-colors duration-300 group-hover:text-ember">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[11px] tracking-[0.05em] text-bone-muted">
                      {p.nodeCount === 0
                        ? "not mapped yet"
                        : `${p.checkpointDone}/${p.checkpointTotal} checkpoints done`}
                    </p>
                  </div>
                  {p.checkpointTotal > 0 && (
                    <div className="h-1 w-24 shrink-0 rounded-full bg-ink-3">
                      <div
                        className="h-1 rounded-full bg-ember"
                        style={{
                          width: `${(p.checkpointDone / p.checkpointTotal) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </a>
              </FadeUp>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
