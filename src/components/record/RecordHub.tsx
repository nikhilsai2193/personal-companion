"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Recorder from "./Recorder";
import type { ProjectSummary } from "./NameTakeDialog";

type Film = {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  url: string;
  thumbUrl: string | null;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

export default function RecordHub() {
  const [projects, setProjects] = useState<
    (ProjectSummary & { totalSec: number })[]
  >([]);
  const [postedToday, setPostedToday] = useState(false);
  const [films, setFilms] = useState<Film[]>([]);
  const [watching, setWatching] = useState<Film | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/projects?date=${todayStr()}`)
      .then((r) => r.json())
      .then((d) => {
        setProjects(
          (d.projects ?? []).filter(
            (p: ProjectSummary & { clipCount: number }) => p.clipCount > 0
          )
        );
        setPostedToday(!!d.postedToday);
      })
      .catch(() => {});
    fetch("/api/films")
      .then((r) => r.json())
      .then((d) => setFilms(d.films ?? []))
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const completedGroups = films.reduce<Map<string, Film[]>>((map, f) => {
    const key = f.title;
    map.set(key, [...(map.get(key) ?? []), f]);
    return map;
  }, new Map());

  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col px-4 pb-16 pt-6 md:px-10">
      <Recorder onSaved={refresh} />

      <div className="mx-auto mt-12 w-full max-w-3xl">
        {postedToday && (
          <p className="mb-8 rounded border border-ink-3 bg-ink-2 px-4 py-3 text-xs leading-relaxed tracking-[0.06em] text-bone-muted">
            today&apos;s film is posted — keep recording all you like; the next
            post slot opens tomorrow.
          </p>
        )}

        <section>
          <p className="text-eyebrow text-ember">recordings in progress</p>
          {projects.length === 0 ? (
            <p className="mt-3 text-xs text-bone-faint">
              nothing on the bench — record a take and give it a name
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/studio/${p.id}`}
                  className="group rounded-lg border border-ink-3 bg-ink-2 p-4 transition-colors duration-300 hover:border-ember"
                >
                  <p className="font-display truncate text-lg text-bone group-hover:text-ember">
                    {p.kind === "DAY"
                      ? `MY DAY`
                      : p.title.toUpperCase()}
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.14em] text-bone-muted">
                    {p.kind === "DAY" && p.date ? `${dayLabel(p.date)} — ` : ""}
                    {p.clipCount} {p.clipCount === 1 ? "take" : "takes"} —{" "}
                    {fmt(p.totalSec)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <p className="text-eyebrow text-bone-muted">completed</p>
          {films.length === 0 ? (
            <p className="mt-3 text-xs text-bone-faint">
              posted films land here, one per day
            </p>
          ) : (
            <div className="mt-4 space-y-8">
              {[...completedGroups.entries()].map(([title, group]) => (
                <div key={title}>
                  <p className="font-display text-sm tracking-[0.08em] text-bone">
                    {title.toUpperCase()}
                    {group.length > 1 && (
                      <span className="ml-2 text-xs font-normal text-bone-muted">
                        {group.length} films
                      </span>
                    )}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {group.map((f) => (
                      <motion.button
                        key={f.id}
                        layoutId={`hub-${f.id}`}
                        onClick={() => setWatching(f)}
                        className="group block overflow-hidden rounded-lg bg-ink-2 text-left"
                      >
                        <div className="aspect-video overflow-hidden">
                          {f.thumbUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={f.thumbUrl}
                              alt={`${f.title} — ${dayLabel(String(f.date))}`}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-ink-3" />
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-[10px] tracking-[0.14em] text-bone-muted">
                            {dayLabel(String(f.date))} — {fmt(f.durationSec)}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {watching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWatching(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-4 md:px-10"
          >
            <motion.div
              layoutId={`hub-${watching.id}`}
              transition={{ duration: 0.5, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl overflow-hidden rounded-lg bg-ink-2"
            >
              <video
                src={watching.url}
                poster={watching.thumbUrl ?? undefined}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full object-contain"
              />
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-display text-2xl">
                    {watching.title.toUpperCase()}
                  </p>
                  <p className="mt-0.5 text-[10px] tracking-[0.14em] text-bone-muted">
                    {dayLabel(String(watching.date))} —{" "}
                    {fmt(watching.durationSec)}
                  </p>
                </div>
                <button
                  onClick={() => setWatching(null)}
                  className="text-xs tracking-[0.12em] text-bone-muted hover:text-bone"
                >
                  close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
