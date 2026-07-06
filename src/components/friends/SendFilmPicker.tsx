"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type MyFilm = {
  id: string;
  title: string;
  date: string;
  thumbUrl: string | null;
};

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// Sends one of the signed-in user's own finalized films to a specific
// person — a thin wrapper over the same PUT /api/films/[id]/shares the
// Finalize/Archive share picker uses, just pre-targeted at one recipient.
export default function SendFilmPicker({
  recipientId,
  onSent,
  onClose,
}: {
  recipientId: string;
  onSent: () => void;
  onClose: () => void;
}) {
  const [films, setFilms] = useState<MyFilm[] | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/films")
      .then((r) => r.json())
      .then((d) => setFilms(d.films ?? []))
      .catch(() => setFilms([]));
  }, []);

  const send = async (filmId: string) => {
    setSendingId(filmId);
    setError(null);
    try {
      const current = await fetch(`/api/films/${filmId}/shares`).then((r) =>
        r.json()
      );
      const ids = new Set<string>(
        (current.recipients ?? []).map((r: { id: string }) => r.id)
      );
      ids.add(recipientId);
      const res = await fetch(`/api/films/${filmId}/shares`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: [...ids] }),
      });
      if (!res.ok) throw new Error("Couldn't send");
      onSent();
    } catch {
      setError("Couldn't send that film — try again");
    }
    setSendingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/90 md:items-center"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-ink-3 bg-ink-2 p-6 md:rounded-lg"
      >
        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-ember">send a film</p>
          <button
            onClick={onClose}
            className="text-xs tracking-[0.1em] text-bone-muted hover:text-bone"
          >
            close
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-ember">{error}</p>}

        {films === null && (
          <p className="mt-6 text-sm text-bone-faint">loading your films…</p>
        )}
        {films?.length === 0 && (
          <p className="mt-6 text-sm text-bone-faint">
            finalize a film first — then you can send it here.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {films?.map((f) => (
            <button
              key={f.id}
              onClick={() => send(f.id)}
              disabled={sendingId !== null}
              className="group text-left disabled:opacity-40"
            >
              <div className="relative aspect-video overflow-hidden rounded bg-ink-3">
                {f.thumbUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={f.thumbUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {sendingId === f.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/70 text-[10px] tracking-[0.1em] text-bone">
                    sending…
                  </div>
                )}
              </div>
              <p className="mt-1.5 truncate text-xs text-bone">{f.title}</p>
              <p className="text-[10px] text-bone-faint">{dayLabel(f.date)}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
