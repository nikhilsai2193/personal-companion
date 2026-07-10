"use client";

import { useMemo } from "react";
import { activityByDay, currentStreak, planCompletion } from "@/lib/goalProgress";
import type { GoalEntryData, GoalNodeData } from "./types";

const HEATMAP_DAYS = 14;
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function GoalProgressHeader({
  nodes,
  entries,
}: {
  nodes: GoalNodeData[];
  entries: GoalEntryData[];
}) {
  const { pct } = useMemo(() => planCompletion(nodes), [nodes]);
  const activity = useMemo(() => activityByDay(nodes, entries, HEATMAP_DAYS), [nodes, entries]);
  const streak = useMemo(() => currentStreak(activity), [activity]);
  const today = activity[activity.length - 1];
  const streakAtRisk = streak > 0 && today.count === 0;

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-1.5">
        {activity.map((day) => (
          <div
            key={day.date}
            title={day.date}
            className="h-4 w-4 rounded-sm"
            style={{
              background:
                day.count > 0
                  ? `color-mix(in srgb, var(--color-ember) ${Math.min(day.count, 4) * 25}%, var(--color-ink-3))`
                  : "var(--color-ink-3)",
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-5">
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-ember)">
              <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-1.5-1-2 2 1 3 3.5 3 5.5A5 5 0 0 1 7 13.5C7 8 12 6 12 2z" />
            </svg>
            <span className="font-display text-sm text-bone">{streak}</span>
            {streakAtRisk && (
              <span className="text-[9px] tracking-[0.1em] text-bone-faint">
                do one thing today
              </span>
            )}
          </div>
        )}

        <div className="relative h-11 w-11 shrink-0">
          <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
            <circle
              cx="22"
              cy="22"
              r={RADIUS}
              fill="none"
              stroke="var(--color-ink-3)"
              strokeWidth="4"
            />
            <circle
              cx="22"
              cy="22"
              r={RADIUS}
              fill="none"
              stroke="var(--color-ember)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-bone">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
