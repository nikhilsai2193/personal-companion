import type { GoalEntryData, GoalNodeData } from "@/components/goals/types";

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function planCompletion(nodes: GoalNodeData[]) {
  let done = 0;
  let total = 0;
  for (const n of nodes) {
    for (const c of n.checkpoints) {
      total++;
      if (c.completed) done++;
    }
  }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export type DayActivity = { date: string; count: number };

// Buckets every completed-checkpoint timestamp and every entry timestamp
// into local calendar days, returning the last `days` days ending today,
// oldest first — the raw material for both the heatmap and the streak.
export function activityByDay(
  nodes: GoalNodeData[],
  entries: GoalEntryData[],
  days: number,
  now: Date = new Date()
): DayActivity[] {
  const counts = new Map<string, number>();
  const bump = (iso: string | null) => {
    if (!iso) return;
    const key = localDateKey(new Date(iso));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const n of nodes) {
    for (const c of n.checkpoints) bump(c.completedAt);
  }
  for (const e of entries) bump(e.createdAt);

  const result: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({ date: localDateKey(d), count: counts.get(localDateKey(d)) ?? 0 });
  }
  return result;
}

// Consecutive days of activity ending at yesterday-or-today. An empty
// *today* doesn't break the streak by itself — it just hasn't extended it
// yet — so someone who hasn't opened the app yet this morning still sees
// their real streak, not "broken." It only breaks once a full day elapses
// with nothing.
export function currentStreak(activity: DayActivity[], now: Date = new Date()): number {
  if (activity.length === 0) return 0;
  const todayKey = localDateKey(now);
  let i = activity.length - 1;
  if (activity[i].date !== todayKey) return 0;

  let streak = 0;
  if (activity[i].count > 0) {
    streak++;
  }
  i--;
  while (i >= 0 && activity[i].count > 0) {
    streak++;
    i--;
  }
  return streak;
}
