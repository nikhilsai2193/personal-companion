import { bloomColor, type BloomStage } from "@/lib/goalBloom";

// One shared glyph, reused by both the compact canvas card and the detail
// overlay's front face — since the two share a layoutId flip transition,
// rendering different bloom art in each would visibly pop mid-flip.
export default function BloomBadge({ stage, size = 14 }: { stage: BloomStage; size?: number }) {
  const color = bloomColor(stage);

  if (stage === "bare") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="17" r="3" fill={color} />
      </svg>
    );
  }

  if (stage === "budding") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line x1="12" y1="21" x2="12" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="14.5" cy="9" r="2.4" fill={color} />
      </svg>
    );
  }

  if (stage === "blooming") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21C12 21 12 13 12 9C12 5 15 3 18 2C18 6 16 10 12 13C12 13 12 17 12 21Z"
          fill={color}
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z" fill={color} />
    </svg>
  );
}
