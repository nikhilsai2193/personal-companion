"use client";

export default function NotesPane({
  value,
  onChange,
  onEnter,
  onLeave,
  saveState,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  onLeave: () => void;
  saveState: "saved" | "saving" | "idle";
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="flex h-full flex-col bg-ink-2"
    >
      <div className="flex items-center justify-between border-b border-ink-3 px-6 py-3">
        <p className="text-eyebrow text-bone-muted">notes</p>
        <p className="text-[10px] tracking-[0.14em] text-bone-faint">
          {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved" : ""}
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="start taking notes — your video pauses while you're here"
        className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 text-sm leading-relaxed text-bone outline-none placeholder:text-bone-faint"
      />
    </div>
  );
}
