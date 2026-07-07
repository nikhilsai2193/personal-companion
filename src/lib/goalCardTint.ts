// A small curated palette of muted, gallery-wall-like hues — mixed at a low
// percentage into the existing ink tokens so every card reads as part of the
// same system in both themes, rather than introducing saturated colors that
// could fail contrast. Assignment is a deterministic hash of the node id, so
// a given step keeps its color across reloads instead of flickering.
const PALETTE = [
  "#2f5d55", // deep teal
  "#5b3a52", // muted plum
  "#565a2f", // olive
  "#384a63", // slate indigo
  "#7a4630", // terracotta
  "#6b5a2c", // ochre
];

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function cardTint(nodeId: string) {
  const hue = PALETTE[hash(nodeId) % PALETTE.length];
  return {
    background: `color-mix(in srgb, ${hue} var(--card-tint-strength), var(--color-ink-2))`,
    border: `color-mix(in srgb, ${hue} var(--card-border-strength), var(--color-ink-4))`,
    accent: `color-mix(in srgb, ${hue} 50%, var(--color-bone-muted))`,
  };
}
