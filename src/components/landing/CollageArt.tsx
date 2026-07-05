// Abstract, flat illustrations for the landing collage — never real footage.
// Faces/likeness have no business as decorative filler on a page that can
// render for anyone hitting "/", signed in or not.

function Aperture() {
  return (
    <svg viewBox="0 0 100 100" className="h-1/2 w-1/2" aria-hidden="true">
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <circle cx="50" cy="50" r="7" fill="currentColor" />
    </svg>
  );
}

function Waveform() {
  const bars = [10, 22, 34, 20, 30, 14, 26, 18];
  return (
    <svg viewBox="0 0 100 100" className="h-1/2 w-1/2" aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={6 + i * 11.5}
          y={50 - h}
          width="6"
          height={h * 2}
          rx="3"
          fill="currentColor"
          opacity={i % 2 === 0 ? 0.85 : 0.5}
        />
      ))}
    </svg>
  );
}

function FilmStrip() {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden="true">
      <rect x="20" y="6" width="60" height="88" rx="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      {[16, 34, 52, 70].map((y) => (
        <rect key={y} x="34" y={y} width="32" height="10" rx="2" fill="currentColor" opacity="0.5" />
      ))}
      <rect x="10" y="16" width="8" height="8" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="10" y="76" width="8" height="8" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="82" y="16" width="8" height="8" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="82" y="76" width="8" height="8" rx="2" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function CalendarGrid() {
  const cells = Array.from({ length: 9 });
  return (
    <svg viewBox="0 0 100 100" className="h-1/2 w-1/2" aria-hidden="true">
      {cells.map((_, i) => {
        const x = 18 + (i % 3) * 24;
        const y = 18 + Math.floor(i / 3) * 24;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="16"
            height="16"
            rx="3"
            fill="currentColor"
            opacity={i === 4 ? 1 : 0.3}
          />
        );
      })}
    </svg>
  );
}

function PlayFrame() {
  return (
    <svg viewBox="0 0 100 100" className="h-1/2 w-1/2" aria-hidden="true">
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M42 34 L70 50 L42 66 Z" fill="currentColor" />
    </svg>
  );
}

export const COLLAGE_ART = [Aperture, Waveform, FilmStrip, CalendarGrid, PlayFrame];
