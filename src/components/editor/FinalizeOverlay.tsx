"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  renderFilm,
  destroyEngine,
  type RenderPhase,
  type RenderSegment,
} from "@/lib/ffmpeg/render";
import { makeTitleArt } from "@/lib/thumbArt";

export type FilmData = {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  sizeBytes: number;
  url: string;
  thumbUrl: string | null;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Weighted by real cost: cutting dominates, join/poster are near-instant.
const STEPS: { key: string; weight: number }[] = [
  { key: "engine", weight: 0.15 },
  { key: "fetch", weight: 0.1 },
  { key: "cut", weight: 0.6 },
  { key: "join", weight: 0.05 },
  { key: "upload", weight: 0.1 },
];

export default function FinalizeOverlay({
  segments,
  projectId,
  title,
  kind,
  dateStr,
  onDone,
  onCancel,
}: {
  segments: RenderSegment[];
  projectId: string;
  title: string;
  kind: "DAY" | "TOPIC";
  dateStr: string;
  onDone: (film: FilmData) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<RenderPhase | { step: "upload"; detail: string; progress?: number }>({
    step: "engine",
    detail: "warming up the projector",
  });
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const dateLabel = new Date(`${dateStr}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const { film, durationSec } = await renderFilm({
          segments,
          onPhase: setPhase,
        });
        const thumb = await makeTitleArt({ title, kind, dateStr });
        setPhase({ step: "upload", detail: "shipping to the archive" });
        const issue = async (kind: string, ext: string, contentType: string) => {
          const r = await fetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, date: dateStr, ext, contentType }),
          });
          if (!r.ok) throw new Error("Couldn't start upload");
          return r.json();
        };
        const putTo = async (
          target: { url: string; method: string; headers: Record<string, string> },
          blob: Blob
        ) => {
          const r = await fetch(target.url, {
            method: target.method,
            headers: target.headers,
            body: blob,
          });
          if (!r.ok) throw new Error("Upload failed");
        };
        const filmTarget = await issue("film", "mp4", "video/mp4");
        await putTo(filmTarget, film);
        setPhase({ step: "upload", detail: "shipping to the archive", progress: 0.7 });
        const thumbTarget = await issue("thumb", "jpg", "image/jpeg");
        await putTo(thumbTarget, thumb);
        const res = await fetch("/api/films", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filmTarget.path,
            thumbPath: thumbTarget.path,
            projectId,
            date: dateStr,
            durationSec,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload failed");
        }
        const { film: saved } = await res.json();
        onDone(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Render failed");
      }
    })();
  }, [segments, projectId, title, kind, dateStr, onDone]);

  const stepIdx = STEPS.findIndex((s) => s.key === phase.step);
  const sub =
    "progress" in phase && phase.progress ? Math.min(phase.progress, 1) : 0;
  const done = STEPS.slice(0, Math.max(stepIdx, 0)).reduce(
    (a, s) => a + s.weight,
    0
  );
  const overall = Math.min(
    (done + (STEPS[stepIdx]?.weight ?? 0) * sub) * 100,
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink px-6"
    >
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="text-eyebrow text-ember"
      >
        {error
          ? "the reel jammed"
          : kind === "DAY"
            ? "making today's film"
            : `posting today's film — ${dateLabel}`}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1, ease: EASE }}
        className="font-display mt-4 max-w-5xl text-center text-[14vw] leading-none md:text-8xl"
      >
        {kind === "DAY" ? dateLabel : title.toUpperCase()}
      </motion.h1>

      {error ? (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="max-w-sm text-center text-sm text-bone-muted">{error}</p>
          <button
            onClick={() => {
              destroyEngine();
              onCancel();
            }}
            className="text-xs tracking-[0.14em] text-bone underline-offset-4 hover:underline"
          >
            back to the cutting room
          </button>
        </div>
      ) : (
        <>
          <div className="mt-12 h-px w-full max-w-md bg-ink-3">
            <motion.div
              className="h-px bg-ember"
              animate={{ width: `${overall}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
          </div>
          <div className="mt-4 flex w-full max-w-md items-baseline justify-between">
            <AnimatePresence mode="wait">
              <motion.p
                key={phase.detail}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-xs tracking-[0.14em] text-bone-muted"
              >
                {phase.detail}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs tracking-[0.14em] text-ember">
              {Math.round(overall)}%
            </p>
          </div>
          <p className="mt-10 text-[10px] tracking-[0.14em] text-bone-faint">
            keep this tab open — the film is rendered right here in your browser
          </p>
        </>
      )}
    </motion.div>
  );
}
