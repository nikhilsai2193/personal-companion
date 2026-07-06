"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FadeUp from "@/components/motion/FadeUp";
import type { PublicUser } from "@/lib/social";

type ThreadRow = {
  person: PublicUser;
  latest: {
    filmId: string;
    title: string;
    date: string;
    createdAt: string;
    sentByMe: boolean;
    thumbUrl: string | null;
  } | null;
};

function dayLabel(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function initial(u: PublicUser) {
  return (u.name ?? u.email).slice(0, 1).toUpperCase();
}

export default function ThreadsList() {
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/threads")
      .then((r) => r.json())
      .then((d) => setThreads(d.threads ?? []))
      .catch(() => setThreads([]));
    fetch("/api/follows")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.incoming?.length ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 md:px-0">
      <div className="flex items-start justify-between">
        <div>
          <FadeUp>
            <p className="text-eyebrow text-ember">your people</p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h1 className="font-display mt-4 text-5xl md:text-7xl">
              FRIENDS{" "}
              {threads && threads.length > 0 && (
                <span className="font-voice text-3xl text-bone-muted md:text-4xl">
                  {threads.length}
                </span>
              )}
            </h1>
          </FadeUp>
        </div>
        <FadeUp delay={0.1}>
          <Link
            href="/friends/requests"
            className="relative flex items-center gap-2 rounded-full border border-ink-4 px-4 py-2 text-xs tracking-[0.1em] text-bone-muted transition-colors duration-300 hover:border-bone-muted hover:text-bone"
          >
            requests
            {pendingCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ember text-[9px] text-ember-deep">
                {pendingCount}
              </span>
            )}
          </Link>
        </FadeUp>
      </div>

      <div className="mt-12">
        {threads === null && (
          <p className="text-sm text-bone-faint">loading…</p>
        )}
        {threads?.length === 0 && (
          <div className="border-t border-ink-3 py-10">
            <p className="text-sm text-bone-muted">
              nobody here yet.{" "}
              <Link
                href="/friends/requests"
                className="text-bone underline-offset-4 hover:underline"
              >
                Find people
              </Link>{" "}
              to send your films to.
            </p>
          </div>
        )}
        {threads && threads.length > 0 && (
          <ul className="divide-y divide-ink-3 border-y border-ink-3">
            {threads.map((t, i) => (
              <FadeUp key={t.person.id} delay={0.04 * i}>
                <Link
                  href={`/friends/${t.person.id}`}
                  className="group flex items-center gap-4 py-4 transition-colors duration-300"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-3 text-sm tracking-widest text-bone">
                    {initial(t.person)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-bone group-hover:text-ember transition-colors duration-300">
                      {t.person.name ?? t.person.email}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] tracking-[0.05em] text-bone-muted">
                      {t.latest
                        ? `${t.latest.sentByMe ? "you sent" : "sent you"} · ${t.latest.title} · ${dayLabel(t.latest.date)}`
                        : "no films yet — say hi"}
                    </p>
                  </div>
                  {t.latest?.thumbUrl && (
                    <div className="h-11 w-16 shrink-0 overflow-hidden rounded bg-ink-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.latest.thumbUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </Link>
              </FadeUp>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
