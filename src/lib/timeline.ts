export type TimelineEntry = {
  clipId: string;
  inSec: number;
  outSec: number;
};

export function asTimeline(value: unknown): TimelineEntry[] {
  return Array.isArray(value) ? (value as TimelineEntry[]) : [];
}
