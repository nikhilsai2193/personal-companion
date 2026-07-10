// Fresh start effect (Dai, Milkman & Riis, 2014): crossing a temporal
// landmark — a new week, a new month — measurably raises aspirational
// behavior. Re-entering after a gap that crossed one of those landmarks
// gets reframed as a new chapter rather than a guilt-inducing "you left
// this" callout.
export function isFreshStart(lastVisitISO: string | null, now: Date = new Date()): boolean {
  if (!lastVisitISO) return false;
  const last = new Date(lastVisitISO);

  const startOfWeek = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy.getTime();
  };

  const crossedWeek = startOfWeek(now) !== startOfWeek(last);
  const crossedMonth =
    now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth();

  return crossedWeek || crossedMonth;
}
