"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "@/components/motion/FadeUp";
import type { PublicUser } from "@/lib/social";

type SearchResult = PublicUser & { status: string };
type SharedFilm = {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  owner: PublicUser;
  url: string;
  thumbUrl: string | null;
};
type Lists = {
  incoming: PublicUser[];
  outgoing: PublicUser[];
  followers: PublicUser[];
  following: PublicUser[];
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function fmt(sec: number) {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function Row({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-ink-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-bone">{user.name ?? user.email}</p>
        {user.name && (
          <p className="truncate text-[10px] tracking-[0.1em] text-bone-faint">
            {user.email}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs tracking-[0.12em]">
        {children}
      </div>
    </li>
  );
}

export default function Friends() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [lists, setLists] = useState<Lists | null>(null);
  const [shared, setShared] = useState<SharedFilm[]>([]);
  const [watching, setWatching] = useState<SharedFilm | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/follows")
      .then((r) => r.json())
      .then(setLists)
      .catch(() => {});
    fetch("/api/films/shared")
      .then((r) => r.json())
      .then((d) => setShared(d.films ?? []))
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    debounce.current = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults(d.users ?? []))
        .catch(() => setResults([]));
    }, 300);
  }, [q]);

  const act = useCallback(
    async (fn: () => Promise<Response>) => {
      await fn().catch(() => {});
      refresh();
      if (q.trim().length >= 2) {
        const d = await fetch(
          `/api/users/search?q=${encodeURIComponent(q.trim())}`
        ).then((r) => r.json());
        setResults(d.users ?? []);
      }
    },
    [refresh, q]
  );

  const follow = (id: string) =>
    act(() =>
      fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      })
    );
  const decide = (id: string, action: "accept" | "decline") =>
    act(() =>
      fetch("/api/follows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, action }),
      })
    );
  const unfollow = (id: string) =>
    act(() => fetch(`/api/follows/${id}`, { method: "DELETE" }));

  const searchAction = (u: SearchResult) => {
    switch (u.status) {
      case "none":
      case "follows_you":
        return (
          <button
            onClick={() => follow(u.id)}
            className="text-ember hover:underline"
          >
            follow
          </button>
        );
      case "outgoing_pending":
        return (
          <button
            onClick={() => unfollow(u.id)}
            className="text-bone-faint hover:text-bone"
            title="Cancel request"
          >
            requested — cancel
          </button>
        );
      case "incoming_pending":
        return (
          <button
            onClick={() => decide(u.id, "accept")}
            className="text-ember hover:underline"
          >
            accept
          </button>
        );
      case "following":
        return <span className="text-bone-faint">following</span>;
      case "mutual":
        return <span className="text-bone-faint">mutual</span>;
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 md:px-0">
      <FadeUp>
        <p className="text-eyebrow text-ember">your people</p>
      </FadeUp>
      <FadeUp delay={0.1}>
        <h1 className="font-display mt-4 text-5xl md:text-7xl">FRIENDS</h1>
      </FadeUp>

      <FadeUp delay={0.2}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="find people by name or email"
          className="mt-10 w-full rounded border border-ink-4 bg-ink-2 px-4 py-3 text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
        />
      </FadeUp>

      {results !== null && (
        <ul className="mt-2">
          {results.length === 0 ? (
            <p className="py-3 text-xs text-bone-faint">nobody found</p>
          ) : (
            results.map((u) => (
              <Row key={u.id} user={u}>
                {u.status === "follows_you" && (
                  <span className="text-bone-faint">follows you</span>
                )}
                {searchAction(u)}
              </Row>
            ))
          )}
        </ul>
      )}

      {lists && lists.incoming.length > 0 && (
        <section className="mt-12">
          <p className="text-eyebrow text-ember">
            requests — {lists.incoming.length}
          </p>
          <ul className="mt-2">
            {lists.incoming.map((u) => (
              <Row key={u.id} user={u}>
                <button
                  onClick={() => decide(u.id, "accept")}
                  className="text-ember hover:underline"
                >
                  accept
                </button>
                <button
                  onClick={() => decide(u.id, "decline")}
                  className="text-bone-faint hover:text-bone"
                >
                  decline
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {lists && lists.outgoing.length > 0 && (
        <section className="mt-12">
          <p className="text-eyebrow text-bone-muted">sent — waiting</p>
          <ul className="mt-2">
            {lists.outgoing.map((u) => (
              <Row key={u.id} user={u}>
                <button
                  onClick={() => unfollow(u.id)}
                  className="text-bone-faint hover:text-bone"
                >
                  cancel
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {lists && (lists.followers.length > 0 || lists.following.length > 0) && (
        <section className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-eyebrow text-bone-muted">
              your followers — can receive your films
            </p>
            <ul className="mt-2">
              {lists.followers.length === 0 ? (
                <p className="py-3 text-xs text-bone-faint">nobody yet</p>
              ) : (
                lists.followers.map((u) => (
                  <Row key={u.id} user={u}>
                    <span className="text-bone-faint">follower</span>
                  </Row>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="text-eyebrow text-bone-muted">
              you follow — their films reach you
            </p>
            <ul className="mt-2">
              {lists.following.length === 0 ? (
                <p className="py-3 text-xs text-bone-faint">nobody yet</p>
              ) : (
                lists.following.map((u) => (
                  <Row key={u.id} user={u}>
                    <button
                      onClick={() => unfollow(u.id)}
                      className="text-bone-faint hover:text-bone"
                    >
                      unfollow
                    </button>
                  </Row>
                ))
              )}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-16">
        <p className="text-eyebrow text-ember">from friends</p>
        {shared.length === 0 ? (
          <p className="mt-3 text-xs text-bone-faint">
            films friends send you will play here
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {shared.map((f) => (
              <motion.button
                key={f.id}
                layoutId={`shared-${f.id}`}
                onClick={() => setWatching(f)}
                className="group block overflow-hidden rounded bg-ink-2 text-left"
              >
                <div className="aspect-video overflow-hidden">
                  {f.thumbUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={f.thumbUrl}
                      alt={`Film from ${f.owner.name ?? f.owner.email}`}
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
                  <p className="mt-0.5 truncate text-[10px] tracking-[0.14em] text-bone-muted">
                    {dayLabel(String(f.date))} — by{" "}
                    {f.owner.name ?? f.owner.email} — {fmt(f.durationSec)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

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
              layoutId={`shared-${watching.id}`}
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
                    {dayLabel(String(watching.date))} — a film by{" "}
                    {watching.owner.name ?? watching.owner.email}
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
