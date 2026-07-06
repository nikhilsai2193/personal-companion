"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SendFilmPicker from "./SendFilmPicker";
import type { PublicUser } from "@/lib/social";

type ThreadFilm = {
  shareId: string;
  filmId: string;
  title: string;
  date: string;
  durationSec: number;
  createdAt: string;
  sentByMe: boolean;
  url: string;
  thumbUrl: string | null;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function initial(u: PublicUser) {
  return (u.name ?? u.email).slice(0, 1).toUpperCase();
}

export default function Thread({ userId }: { userId: string }) {
  const [person, setPerson] = useState<PublicUser | null>(null);
  const [films, setFilms] = useState<ThreadFilm[] | null>(null);
  const [watching, setWatching] = useState<ThreadFilm | null>(null);
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/threads/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setPerson(d.person);
        setFilms(d.films ?? []);
      })
      .catch(() => setNotFound(true));
  }, [userId]);

  useEffect(refresh, [refresh]);

  if (notFound) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-eyebrow text-ember">not connected</p>
        <h1 className="font-display text-3xl">NO THREAD HERE</h1>
        <Link
          href="/friends"
          className="text-xs tracking-[0.12em] text-bone-muted hover:text-bone"
        >
          back to friends
        </Link>
      </div>
    );
  }

  if (!person || !films) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">opening the thread…</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">
      <div className="flex items-center justify-between border-b border-ink-3 px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-3 text-xs tracking-widest text-bone">
            {initial(person)}
          </span>
          <h1 className="font-display text-xl">
            {person.name ?? person.email}
          </h1>
        </div>
        <Link
          href="/friends"
          className="text-xs tracking-[0.12em] text-bone-muted transition-colors duration-300 hover:text-bone"
        >
          back to friends
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
        {films.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <p className="text-sm text-bone-faint">
              nothing sent yet between you two.
            </p>
            <button
              onClick={() => setSending(true)}
              className="font-display rounded-full border border-ember px-6 py-3 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
            >
              SEND THE FIRST FILM
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {films.map((f) => (
              <motion.button
                key={f.shareId}
                layoutId={`thread-film-${f.shareId}`}
                onClick={() => setWatching(f)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-300 ${
                  f.sentByMe
                    ? "ml-auto flex-row-reverse border-ember/40 bg-ember/10"
                    : "border-ink-3 bg-ink-2"
                }`}
                style={{ maxWidth: "80%" }}
              >
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-ink-3">
                  {f.thumbUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={f.thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone">{f.title}</p>
                  <p className="mt-0.5 text-[10px] tracking-[0.1em] text-bone-muted">
                    {f.sentByMe ? "you sent" : "sent to you"} ·{" "}
                    {dayLabel(f.date)} · {fmt(f.durationSec)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {films.length > 0 && (
        <div className="flex justify-center border-t border-ink-3 px-6 py-4">
          <button
            onClick={() => setSending(true)}
            className="font-display rounded-full border border-ember px-6 py-2.5 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
          >
            SEND A FILM
          </button>
        </div>
      )}

      <AnimatePresence>
        {sending && (
          <SendFilmPicker
            recipientId={userId}
            onClose={() => setSending(false)}
            onSent={() => {
              setSending(false);
              refresh();
            }}
          />
        )}
      </AnimatePresence>

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
              layoutId={`thread-film-${watching.shareId}`}
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
                  <p className="font-display text-2xl">{watching.title}</p>
                  <p className="mt-0.5 text-[10px] tracking-[0.14em] text-bone-muted">
                    {watching.sentByMe ? "you sent" : "sent to you"} ·{" "}
                    {dayLabel(watching.date)}
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
