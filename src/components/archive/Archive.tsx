"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "@/components/motion/FadeUp";
import SharePicker from "@/components/SharePicker";
import type { FilmData } from "@/components/editor/FinalizeOverlay";

type Draft = {
  id: string;
  title: string;
  kind: "DAY" | "TOPIC";
  date: string | null;
  clipCount: number;
  totalSec: number;
};
type Usage = { usedBytes: number; limitBytes: number };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function mb(bytes: number) {
  const m = bytes / 1048576;
  return m >= 1024 ? `${(m / 1024).toFixed(2)} GB` : `${m.toFixed(1)} MB`;
}

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function monthLabel(date: string) {
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "long" }).toUpperCase(),
    year: String(d.getFullYear()),
  };
}

export default function Archive() {
  const [films, setFilms] = useState<FilmData[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [active, setActive] = useState<FilmData | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/films")
      .then((r) => r.json())
      .then((d) => setFilms(d.films ?? []))
      .catch(() => setFilms([]));
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) =>
        setDrafts(
          (d.projects ?? []).filter((p: Draft) => p.clipCount > 0)
        )
      )
      .catch(() => {});
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  const close = useCallback(() => {
    setActive(null);
    setConfirming(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const deleteFilm = useCallback(async () => {
    if (!active) return;
    const res = await fetch(`/api/films/${active.id}`, { method: "DELETE" });
    if (res.ok) {
      setFilms((prev) =>
        prev ? prev.filter((f) => f.id !== active.id) : prev
      );
      fetch("/api/usage").then((r) => r.json()).then(setUsage).catch(() => {});
      close();
    }
  }, [active, close]);

  if (films === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">opening the vault…</p>
      </div>
    );
  }

  const groups: { key: string; month: string; year: string; films: FilmData[] }[] = [];
  for (const f of films) {
    const { month, year } = monthLabel(String(f.date));
    const key = `${month}-${year}`;
    const g = groups.find((g) => g.key === key);
    if (g) g.films.push(f);
    else groups.push({ key, month, year, films: [f] });
  }

  return (
    <div className="px-6 py-16 md:px-10">
      <FadeUp>
        <p className="text-eyebrow text-ember">
          your archive — {films.length} {films.length === 1 ? "film" : "films"}
        </p>
      </FadeUp>

      {drafts.length > 0 && (
        <FadeUp delay={0.08}>
          <div className="mt-8 flex flex-wrap gap-3">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/studio/${d.id}?tab=edit`}
                className="group border border-ink-3 px-5 py-4 transition-colors duration-300 hover:border-ember"
              >
                <p className="font-display text-lg">
                  {d.kind === "DAY" && d.date
                    ? `MY DAY — ${dayLabel(d.date)}`
                    : d.title.toUpperCase()}
                </p>
                <p className="mt-1 text-[10px] tracking-[0.14em] text-bone-muted">
                  in the cutting room — {d.clipCount}{" "}
                  {d.clipCount === 1 ? "take" : "takes"}, {fmt(d.totalSec)}
                  <span className="ml-2 text-ember opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    finish it —
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </FadeUp>
      )}

      {films.length === 0 ? (
        <>
          <FadeUp delay={0.12}>
            <h1 className="font-display mt-8 text-6xl md:text-8xl">
              NO FILMS
              <br />
              <span className="font-voice text-bone-muted">yet</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.24}>
            <p className="mt-10 max-w-sm text-sm text-bone-muted">
              Your first film starts with a single take.{" "}
              <Link
                href="/record"
                className="text-bone underline-offset-4 hover:underline"
              >
                Record something today
              </Link>
              , cut it, and finalize — it will live here.
            </p>
          </FadeUp>
        </>
      ) : (
        groups.map((g, gi) => (
          <section key={g.key} className="mt-14">
            <FadeUp delay={0.1 + gi * 0.05}>
              <h1 className="font-display text-5xl md:text-7xl">
                {g.month}{" "}
                <span className="font-voice text-bone-muted">{g.year}</span>
              </h1>
            </FadeUp>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {g.films.map((f, i) => (
                <FadeUp key={f.id} delay={0.15 + i * 0.06}>
                  <motion.button
                    layoutId={`film-${f.id}`}
                    onClick={() => setActive(f)}
                    onMouseEnter={() => setHovered(f.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="group block w-full overflow-hidden rounded bg-ink-2 text-left"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {hovered === f.id ? (
                        <video
                          src={f.url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : f.thumbUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={f.thumbUrl}
                          alt={`Film from ${dayLabel(String(f.date))}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-ink-3" />
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-display truncate text-lg">
                        {f.title.toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-[10px] tracking-[0.14em] text-bone-muted">
                        {dayLabel(String(f.date))} — {fmt(f.durationSec)} —{" "}
                        {mb(f.sizeBytes)}
                      </p>
                    </div>
                  </motion.button>
                </FadeUp>
              ))}
            </div>
          </section>
        ))
      )}

      {usage && (
        <FadeUp delay={0.3}>
          <div className="mt-20 max-w-md">
            <div className="flex justify-between text-[10px] tracking-[0.14em] text-bone-faint">
              <span>storage</span>
              <span>
                {mb(usage.usedBytes)} of {mb(usage.limitBytes)}
              </span>
            </div>
            <div className="mt-2 h-px bg-ink-3">
              <div
                className="h-px bg-ember"
                style={{
                  width: `${Math.min((usage.usedBytes / usage.limitBytes) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </FadeUp>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-4 md:px-10"
          >
            <motion.div
              layoutId={`film-${active.id}`}
              transition={{ duration: 0.5, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-ink-2"
            >
              <video
                src={active.url}
                poster={active.thumbUrl ?? undefined}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full object-contain"
              />
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-display text-2xl">
                    {active.title.toUpperCase()}
                    <span className="ml-3 text-sm font-normal tracking-[0.12em] text-bone-muted">
                      {dayLabel(String(active.date))}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] tracking-[0.14em] text-bone-muted">
                    {fmt(active.durationSec)} — {mb(active.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-5 text-xs tracking-[0.12em]">
                  {confirming ? (
                    <>
                      <span className="text-bone-muted">delete forever?</span>
                      <button
                        onClick={deleteFilm}
                        className="text-ember hover:underline"
                      >
                        yes, delete
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        className="text-bone-muted hover:text-bone"
                      >
                        keep it
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirming(true)}
                        className="text-bone-faint transition-colors hover:text-ember"
                      >
                        delete
                      </button>
                      <button
                        onClick={close}
                        className="text-bone-muted transition-colors hover:text-bone"
                      >
                        close
                      </button>
                    </>
                  )}
                </div>
              </div>
              <SharePicker filmId={active.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
