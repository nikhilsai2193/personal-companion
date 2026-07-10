export type BloomStage = "bare" | "budding" | "blooming" | "golden";

export function bloomStage(done: number, total: number): BloomStage {
  if (total === 0) return "bare";
  const ratio = done / total;
  if (ratio >= 1) return "golden";
  if (ratio >= 0.5) return "blooming";
  if (ratio > 0) return "budding";
  return "bare";
}

// A single accent (ember) carried through every stage rather than a
// separate green-to-gold botanical palette — progress in this app always
// reads through ember (dates, buttons, the streak flame, edge tinting), so
// growth stays consistent with that instead of introducing a new hue.
export function bloomColor(stage: BloomStage): string {
  switch (stage) {
    case "bare":
      return "var(--color-ink-4)";
    case "budding":
      return "color-mix(in srgb, var(--color-ember) 40%, var(--color-ink-4))";
    case "blooming":
      return "color-mix(in srgb, var(--color-ember) 75%, var(--color-ink-4))";
    case "golden":
      return "var(--color-ember)";
  }
}
