"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MutableRefObject } from "react";
import type { ResourceData, YoutubeSearchResult } from "./types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function AddResourceForm({
  onAddUrl,
  autoFocus,
}: {
  onAddUrl: (url: string) => Promise<void>;
  autoFocus?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<YoutubeSearchResult[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const submitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!u) return;
    setAdding(true);
    setError(null);
    try {
      await onAddUrl(u);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that link");
    }
    setAdding(false);
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setConfigured(data.configured);
    setResults(data.results ?? []);
    setSearching(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submitUrl} className="flex gap-2">
        <input
          autoFocus={autoFocus}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="paste a link — youtube, an article, anything"
          className="flex-1 rounded border border-ink-4 bg-ink px-4 py-3 text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
        />
        <button
          type="submit"
          disabled={adding}
          className="font-display shrink-0 rounded border border-ember px-4 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep disabled:opacity-40"
        >
          {adding ? "…" : "ADD"}
        </button>
      </form>
      {error && <p className="text-xs text-ember">{error}</p>}

      <button
        onClick={() => setShowSearch((v) => !v)}
        className="self-start text-[10px] tracking-[0.1em] text-bone-muted transition-colors duration-300 hover:text-bone"
      >
        {showSearch ? "hide youtube search —" : "search youtube —"}
      </button>

      <AnimatePresence initial={false}>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <form onSubmit={runSearch} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. gilbert strang linear algebra"
                className="flex-1 rounded border border-ink-4 bg-ink px-4 py-2.5 text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
              />
              <button
                type="submit"
                disabled={searching}
                className="shrink-0 rounded border border-ink-4 px-3 text-xs tracking-[0.1em] text-bone-muted transition-colors duration-300 hover:border-bone-muted hover:text-bone"
              >
                {searching ? "…" : "search"}
              </button>
            </form>

            {results !== null && !configured && (
              <p className="mt-3 text-xs text-bone-faint">
                youtube search isn&apos;t configured yet — add YOUTUBE_API_KEY
                to enable it. pasting a youtube link above still works.
              </p>
            )}
            {results !== null && configured && results.length === 0 && (
              <p className="mt-3 text-xs text-bone-faint">no results</p>
            )}
            {results && results.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {results.map((r) => (
                  <button
                    key={r.videoId}
                    onClick={() =>
                      onAddUrl(`https://www.youtube.com/watch?v=${r.videoId}`)
                    }
                    className="group text-left"
                  >
                    <div className="aspect-video overflow-hidden rounded bg-ink-3">
                      {r.thumbnailUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={r.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-xs text-bone">{r.title}</p>
                    <p className="truncate text-[10px] text-bone-faint">
                      {r.channelTitle}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// The embeddability pre-check is a plain server-side fetch with no cookies
// and no JS execution — it can't see a page that only redirects to a
// frame-blocking login/dashboard once a real, authenticated browser loads
// it (e.g. mycourses.w3schools.com → profile.w3schools.com). So a live
// LINK iframe always keeps a manual escape hatch, and if it hasn't loaded
// within a few seconds we assume it's stuck and offer to fix it for next
// time too, not just this visit.
function EmbeddedLink({
  resource,
  onNotEmbeddable,
}: {
  resource: ResourceData;
  onNotEmbeddable: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoaded(false);
    setStalled(false);
    timer.current = setTimeout(() => setStalled(true), 4500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [resource.id]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-ink-3 bg-ink">
      <iframe
        key={resource.id}
        src={resource.url}
        title={resource.title ?? resource.url}
        onLoad={() => {
          setLoaded(true);
          if (timer.current) clearTimeout(timer.current);
        }}
        className="h-full w-full"
      />
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer"
        className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1.5 text-[10px] tracking-[0.1em] text-bone-muted transition-colors duration-300 hover:text-bone"
      >
        open in new tab ↗
      </a>
      <AnimatePresence>
        {stalled && !loaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-ink/90 px-4 py-3"
          >
            <p className="text-xs text-bone-muted">
              this doesn&apos;t seem to be loading —{" "}
              {hostname(resource.url)} may not actually allow embedding.
            </p>
            <button
              onClick={onNotEmbeddable}
              className="shrink-0 text-[10px] tracking-[0.1em] text-ember hover:underline"
            >
              switch to preview card
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResourcePane({
  resources,
  activeId,
  onSelect,
  onAddUrl,
  onDelete,
  onMarkNotEmbeddable,
  videoIframeRef,
  pausedByNotes,
}: {
  resources: ResourceData[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddUrl: (url: string) => Promise<void>;
  onDelete: (id: string) => void;
  onMarkNotEmbeddable: (id: string) => void;
  videoIframeRef: MutableRefObject<HTMLIFrameElement | null>;
  pausedByNotes: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const active = resources.find((r) => r.id === activeId) ?? null;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  if (resources.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 px-8 text-center">
        <div>
          <p className="text-eyebrow text-ember">nothing here yet</p>
          <h2 className="font-display mt-3 text-3xl">ADD A RESOURCE</h2>
        </div>
        <div className="w-full max-w-md">
          <AddResourceForm onAddUrl={onAddUrl} autoFocus />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-ink-3 px-4 py-2">
        {resources.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`group relative shrink-0 rounded-full border px-4 py-1.5 text-xs transition-colors duration-300 ${
              r.id === activeId
                ? "border-ember text-ember"
                : "border-ink-4 text-bone-muted hover:text-bone"
            }`}
          >
            <span className="max-w-[10rem] truncate">
              {r.title || hostname(r.url)}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDelete(r.id);
              }}
              className="ml-2 opacity-0 transition-opacity duration-300 hover:text-ember group-hover:opacity-100"
            >
              ×
            </span>
          </button>
        ))}
        <button
          onClick={() => setAdding((v) => !v)}
          aria-label="Add resource"
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 ${
            adding
              ? "border-bone-muted text-bone"
              : "border-ink-4 text-bone-muted hover:text-bone"
          }`}
        >
          +
        </button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-b border-ink-3"
          >
            <div className="p-4">
              <AddResourceForm
                onAddUrl={async (u) => {
                  await onAddUrl(u);
                  setAdding(false);
                }}
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden p-4">
        {active?.type === "YOUTUBE" && active.videoId && (
          <div className="relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-ink-3 bg-ink">
            <iframe
              key={active.id}
              ref={(el) => {
                videoIframeRef.current = el;
              }}
              src={`https://www.youtube.com/embed/${active.videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}`}
              title={active.title ?? "Video"}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="h-full w-full"
            />
            <AnimatePresence>
              {pausedByNotes && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1.5 text-[10px] tracking-[0.12em] text-bone-muted"
                >
                  paused — taking notes
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {active?.type === "LINK" && active.embeddable && (
          <EmbeddedLink
            resource={active}
            onNotEmbeddable={() => onMarkNotEmbeddable(active.id)}
          />
        )}

        {active?.type === "LINK" && !active.embeddable && (
          <div className="flex h-full flex-col items-center justify-center gap-5 rounded-lg border border-ink-3 bg-ink-2 p-8 text-center">
            {active.thumbnailUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={active.thumbnailUrl}
                alt=""
                className="max-h-48 rounded object-cover"
              />
            )}
            <div>
              <p className="font-display text-xl">
                {active.title || hostname(active.url)}
              </p>
              <p className="mt-1 text-xs tracking-[0.1em] text-bone-faint">
                {hostname(active.url)} doesn&apos;t allow embedding
              </p>
            </div>
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              className="font-display rounded-full border border-ember px-6 py-2.5 text-xs tracking-[0.14em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep"
            >
              OPEN IN NEW TAB
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
