"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SharePicker from "@/components/SharePicker";
import type { FilmData } from "./FinalizeOverlay";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function FilmView({
  film,
  onDeleted,
}: {
  film: FilmData;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dateLabel = new Date(film.date)
    .toLocaleDateString("en-US", { month: "long", day: "2-digit", timeZone: "UTC" })
    .toUpperCase();

  const deleteFilm = async () => {
    setDeleting(true);
    const res = await fetch(`/api/films/${film.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else setDeleting(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-0">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <p className="text-eyebrow text-ember">posted — {dateLabel}</p>
        <h1 className="font-display mt-2 text-4xl md:text-6xl">
          {film.title.toUpperCase()}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.15, ease: EASE }}
        className="mt-6 overflow-hidden rounded-lg bg-ink-2"
      >
        <video
          src={film.url}
          poster={film.thumbUrl ?? undefined}
          controls
          playsInline
          className="aspect-video w-full object-contain"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.35 }}
        className="mt-4 rounded-lg bg-ink-2"
      >
        <SharePicker filmId={film.id} />
      </motion.div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs tracking-[0.12em] text-bone-muted">
          {fmt(film.durationSec)} — {(film.sizeBytes / 1024 / 1024).toFixed(1)} MB
        </p>
        {confirming ? (
          <span className="flex items-center gap-4 text-xs tracking-[0.12em]">
            <span className="text-bone-muted">delete this film forever?</span>
            <button
              onClick={deleteFilm}
              disabled={deleting}
              className="text-ember hover:underline disabled:opacity-40"
            >
              {deleting ? "deleting…" : "yes, delete"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-bone-muted hover:text-bone"
            >
              keep it
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs tracking-[0.12em] text-bone-faint transition-colors hover:text-ember"
          >
            delete film
          </button>
        )}
      </div>
    </div>
  );
}
