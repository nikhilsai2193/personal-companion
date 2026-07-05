"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Reorder } from "framer-motion";
import FinalizeOverlay, { type FilmData } from "./FinalizeOverlay";
import FilmView from "./FilmView";

type Seg = { uid: string; clipId: string; inSec: number; outSec: number };
type ClipData = { id: string; durationSec: number; url: string; source: string };

const MIN_SEG = 0.2;

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

function TrimBar({
  clip,
  seg,
  onChange,
}: {
  clip: ClipData;
  seg: Seg;
  onChange: (inSec: number, outSec: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const startDrag = (which: "in" | "out") => (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = barRef.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const frac = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const t = frac * clip.durationSec;
      if (which === "in") {
        onChange(Math.min(t, seg.outSec - MIN_SEG), seg.outSec);
      } else {
        onChange(seg.inSec, Math.max(t, seg.inSec + MIN_SEG));
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const inPct = (seg.inSec / clip.durationSec) * 100;
  const outPct = (seg.outSec / clip.durationSec) * 100;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-[10px] tracking-[0.14em] text-bone-faint">
        <span>trim — full take {fmt(clip.durationSec)}</span>
        <span>
          {seg.inSec.toFixed(1)}s → {seg.outSec.toFixed(1)}s
        </span>
      </div>
      <div
        ref={barRef}
        className="relative mt-2 h-8 touch-none rounded bg-ink-3"
      >
        <div
          className="absolute inset-y-0 bg-ink-4"
          style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
        />
        <button
          onPointerDown={startDrag("in")}
          aria-label="Trim start"
          className="absolute inset-y-0 w-3 cursor-ew-resize rounded-l bg-ember"
          style={{ left: `calc(${inPct}% - 2px)` }}
        />
        <button
          onPointerDown={startDrag("out")}
          aria-label="Trim end"
          className="absolute inset-y-0 w-3 cursor-ew-resize rounded-r bg-ember"
          style={{ left: `calc(${outPct}% - 10px)` }}
        />
      </div>
    </div>
  );
}

export default function Editor({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const [segs, setSegs] = useState<Seg[] | null>(null);
  const [clips, setClips] = useState<Record<string, ClipData>>({});
  const [project, setProject] = useState<{
    title: string;
    kind: "DAY" | "TOPIC";
    status: string;
  } | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [film, setFilm] = useState<FilmData | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    uid: string;
  } | null>(null);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const rafRef = useRef(0);
  const loaded = useRef(false);
  const skimAt = useRef(0);
  const longPress = useRef<{
    timer: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
  } | null>(null);

  // Warm the render engine while the user edits so finalize starts instantly.
  useEffect(() => {
    const t = setTimeout(() => {
      import("@/lib/ffmpeg/render").then((m) => m.warmupEngine());
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch(`/api/clips?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, ClipData> = {};
        for (const c of data.clips ?? []) map[c.id] = c;
        setClips(map);
        setProject(data.project ?? null);
        const tl = (data.project?.timeline ?? []) as Omit<Seg, "uid">[];
        setSegs(
          tl
            .filter((e) => map[e.clipId])
            .map((e) => ({ ...e, uid: crypto.randomUUID() }))
        );
        if (data.project?.status === "FINALIZED") {
          fetch(`/api/films?projectId=${projectId}`)
            .then((r) => r.json())
            .then((d) => setFilm(d.films?.[0] ?? null))
            .catch(() => {});
        }
      })
      .catch(() => setSegs([]));
  }, [projectId]);

  useEffect(() => {
    if (!segs) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      const res = await fetch("/api/projects/timeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          timeline: segs.map(({ clipId, inSec, outSec }) => ({
            clipId,
            inSec,
            outSec,
          })),
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(t);
  }, [segs]);

  const durations = useMemo(
    () => (segs ?? []).map((s) => s.outSec - s.inSec),
    [segs]
  );
  const starts = useMemo(() => {
    let acc = 0;
    return durations.map((d) => {
      const s = acc;
      acc += d;
      return s;
    });
  }, [durations]);
  const total = useMemo(
    () => durations.reduce((a, b) => a + b, 0),
    [durations]
  );

  const segAt = useCallback(
    (t: number) => {
      if (!segs || segs.length === 0) return 0;
      for (let i = segs.length - 1; i >= 0; i--) {
        if (t >= starts[i]) return i;
      }
      return 0;
    },
    [segs, starts]
  );

  const pauseAll = useCallback(() => {
    Object.values(videoRefs.current).forEach((v) => v?.pause());
  }, []);

  const seekTo = useCallback(
    (t: number, andPlay: boolean) => {
      if (!segs || segs.length === 0) return;
      const idx = segAt(Math.min(t, total - 0.01));
      const seg = segs[idx];
      const v = videoRefs.current[seg.clipId];
      if (!v) return;
      pauseAll();
      v.currentTime = seg.inSec + Math.max(0, t - starts[idx]);
      setActiveIdx(idx);
      setPlayhead(t);
      if (andPlay) {
        v.play().catch(() => {});
        setPlaying(true);
      }
    },
    [segs, segAt, starts, total, pauseAll]
  );

  useEffect(() => {
    if (!playing || !segs || segs.length === 0) return;
    let idx = activeIdx;
    const tick = () => {
      const seg = segs[idx];
      if (!seg) {
        setPlaying(false);
        return;
      }
      const v = videoRefs.current[seg.clipId];
      if (v) {
        const t = v.currentTime;
        if (t >= seg.outSec - 0.04 || v.ended) {
          if (idx + 1 < segs.length) {
            const next = segs[idx + 1];
            const nv = videoRefs.current[next.clipId];
            v.pause();
            if (nv) {
              nv.currentTime = next.inSec;
              nv.play().catch(() => {});
            }
            idx += 1;
            setActiveIdx(idx);
          } else {
            v.pause();
            setPlaying(false);
            setPlayhead(0);
            return;
          }
        } else {
          setPlayhead(starts[idx] + (t - seg.inSec));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, segs, starts, activeIdx]);

  const togglePlay = useCallback(() => {
    if (playing) {
      pauseAll();
      setPlaying(false);
    } else {
      seekTo(playhead >= total - 0.05 ? 0 : playhead, true);
    }
  }, [playing, playhead, total, pauseAll, seekTo]);

  const updateSeg = useCallback((uid: string, inSec: number, outSec: number) => {
    setSegs((prev) =>
      prev
        ? prev.map((s) => (s.uid === uid ? { ...s, inSec, outSec } : s))
        : prev
    );
  }, []);

  const canSplitSeg = useCallback(
    (uid: string) => {
      if (!segs) return false;
      const idx = segs.findIndex((s) => s.uid === uid);
      if (idx < 0) return false;
      const seg = segs[idx];
      const local = seg.inSec + (playhead - starts[idx]);
      return local > seg.inSec + MIN_SEG && local < seg.outSec - MIN_SEG;
    },
    [segs, starts, playhead]
  );

  const splitSeg = useCallback(
    (uid: string) => {
      if (!segs || !canSplitSeg(uid)) return;
      const idx = segs.findIndex((s) => s.uid === uid);
      const seg = segs[idx];
      const local = seg.inSec + (playhead - starts[idx]);
      const a: Seg = { ...seg, uid: crypto.randomUUID(), outSec: local };
      const b: Seg = { ...seg, uid: crypto.randomUUID(), inSec: local };
      setSegs((prev) =>
        prev ? [...prev.slice(0, idx), a, b, ...prev.slice(idx + 1)] : prev
      );
      setSelectedUid(a.uid);
    },
    [segs, canSplitSeg, playhead, starts]
  );

  const splitAtPlayhead = useCallback(() => {
    if (!segs || segs.length === 0) return;
    splitSeg(segs[segAt(playhead)].uid);
  }, [segs, segAt, playhead, splitSeg]);

  // iMovie-style skimming: hovering a take scrubs the playhead and preview.
  const skimSeg = useCallback(
    (i: number) => (e: React.MouseEvent) => {
      if (playing || e.buttons !== 0) return;
      const now = performance.now();
      if (now - skimAt.current < 40) return;
      skimAt.current = now;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const frac = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / rect.width)
      );
      seekTo(starts[i] + frac * durations[i], false);
    },
    [playing, starts, durations, seekTo]
  );

  const removeSeg = useCallback(
    (uid: string) => {
      setSegs((prev) => (prev ? prev.filter((s) => s.uid !== uid) : prev));
      if (selectedUid === uid) setSelectedUid(null);
    },
    [selectedUid]
  );

  const heightClass = embedded ? "" : "min-h-[calc(100dvh-57px)]";

  if (segs === null) {
    return (
      <div className={`flex ${heightClass} items-center justify-center py-16`}>
        <p className="text-eyebrow text-bone-muted">loading the cut…</p>
      </div>
    );
  }

  if (project?.status === "FINALIZED") {
    if (film) {
      return (
        <FilmView
          film={film}
          onDeleted={() => {
            loaded.current = false;
            setFilm(null);
            setProject(null);
            setSegs([]);
            window.location.href = "/record";
          }}
        />
      );
    }
    return (
      <div className={`flex ${heightClass} items-center justify-center py-16`}>
        <p className="text-eyebrow text-bone-muted">fetching the film…</p>
      </div>
    );
  }

  if (segs.length === 0) {
    return (
      <div
        className={`flex ${heightClass} flex-col items-center justify-center px-6 py-16 text-center`}
      >
        <p className="text-eyebrow text-ember">nothing to cut yet</p>
        <h1 className="font-display mt-4 text-4xl md:text-6xl">NO TAKES</h1>
        <Link
          href="/record"
          className="mt-8 text-xs tracking-[0.12em] text-bone-muted transition-colors hover:text-bone"
        >
          go record something —
        </Link>
      </div>
    );
  }

  const selected = segs.find((s) => s.uid === selectedUid) ?? null;
  const activeClipId = segs[Math.min(activeIdx, segs.length - 1)]?.clipId;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-eyebrow text-ember">
            {project ? `the cut — ${project.title}` : "the cut"}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.1em] text-bone-faint">
            preview only — your {""}
            takes stay separate below until you finalize
          </p>
        </div>
        <p className="text-[10px] tracking-[0.14em] text-bone-faint">
          {saveState === "saving"
            ? "saving…"
            : saveState === "error"
              ? "save failed — retrying on next change"
              : "saved"}
        </p>
      </div>

      <div className="relative mx-auto mt-4 aspect-video w-full overflow-hidden rounded-lg bg-ink-2 md:h-[38vh] md:w-auto">
        {Object.values(clips).map((c) => (
          <video
            key={c.id}
            ref={(el) => {
              videoRefs.current[c.id] = el;
            }}
            src={c.url}
            preload="auto"
            playsInline
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ${
              c.id === activeClipId ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute left-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-[10px] tracking-[0.14em] text-bone-muted">
          take {Math.min(activeIdx, segs.length - 1) + 1} of {segs.length}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bone-faint text-bone transition-colors hover:border-bone"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(total, 0.1)}
          step={0.05}
          value={Math.min(playhead, total)}
          onChange={(e) => seekTo(parseFloat(e.target.value), playing)}
          className="w-full accent-[#d85a30]"
          aria-label="Timeline position"
        />
        <span className="shrink-0 text-xs tracking-[0.12em] text-bone-muted">
          {fmt(playhead)} / {fmt(total)}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-bone-muted">
            timeline — drag to reorder, right-click a take for options
          </p>
          <button
            onClick={splitAtPlayhead}
            className="text-xs tracking-[0.12em] text-bone-muted transition-colors hover:text-ember"
          >
            split at playhead
          </button>
        </div>
        <Reorder.Group
          axis="x"
          values={segs.map((s) => s.uid)}
          onReorder={(uids: string[]) => {
            pauseAll();
            setPlaying(false);
            setSegs((prev) =>
              prev
                ? (uids
                    .map((uid) => prev.find((s) => s.uid === uid))
                    .filter(Boolean) as Seg[])
                : prev
            );
          }}
          className="mt-3 flex gap-1.5"
        >
          {segs.map((s, i) => {
            const takeNo =
              Object.keys(clips).indexOf(s.clipId) + 1;
            return (
              <Reorder.Item
                key={s.uid}
                value={s.uid}
                style={{ flexGrow: s.outSec - s.inSec, flexBasis: 0 }}
                onClick={() => setSelectedUid(s.uid)}
                onMouseMove={skimSeg(i)}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setSelectedUid(s.uid);
                  setCtxMenu({ x: e.clientX, y: e.clientY, uid: s.uid });
                }}
                onTouchStart={(e: React.TouchEvent) => {
                  const t = e.touches[0];
                  if (!t) return;
                  const { clientX: x, clientY: y } = t;
                  longPress.current = {
                    x,
                    y,
                    timer: setTimeout(() => {
                      longPress.current = null;
                      setSelectedUid(s.uid);
                      setCtxMenu({ x, y, uid: s.uid });
                    }, 500),
                  };
                }}
                onTouchMove={(e: React.TouchEvent) => {
                  const lp = longPress.current;
                  const t = e.touches[0];
                  if (!lp || !t) return;
                  if (
                    Math.abs(t.clientX - lp.x) > 10 ||
                    Math.abs(t.clientY - lp.y) > 10
                  ) {
                    clearTimeout(lp.timer);
                    longPress.current = null;
                  }
                }}
                onTouchEnd={() => {
                  if (longPress.current) {
                    clearTimeout(longPress.current.timer);
                    longPress.current = null;
                  }
                }}
                className={`min-w-16 cursor-grab select-none rounded border px-2 py-3 active:cursor-grabbing ${
                  s.uid === selectedUid
                    ? "border-ember bg-ink-3"
                    : i === activeIdx
                      ? "border-bone-faint bg-ink-2"
                      : "border-ink-3 bg-ink-2"
                }`}
              >
                <p className="font-display text-xs text-bone">T{takeNo}</p>
                <p className="mt-1 text-[10px] tracking-[0.1em] text-bone-muted">
                  {fmt(s.outSec - s.inSec)}
                </p>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {selected && clips[selected.clipId] && (
          <div className="mt-2 rounded border border-ink-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-eyebrow text-bone-muted">selected segment</p>
              <button
                onClick={() => removeSeg(selected.uid)}
                className="text-xs tracking-[0.12em] text-bone-faint transition-colors hover:text-ember"
              >
                remove from timeline
              </button>
            </div>
            <TrimBar
              clip={clips[selected.clipId]}
              seg={selected}
              onChange={(inSec, outSec) =>
                updateSeg(selected.uid, inSec, outSec)
              }
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-ink-3 pt-5">
        <p className="text-xs text-bone-faint">
          finalize renders today&apos;s cut into one film and clears the raw
          takes
        </p>
        <button
          onClick={() => {
            pauseAll();
            setPlaying(false);
            setFinalizing(true);
          }}
          disabled={saveState !== "saved"}
          className="font-display shrink-0 rounded-full border border-ember px-6 py-3 text-xs tracking-[0.18em] text-ember transition-colors duration-300 hover:bg-ember hover:text-ember-deep disabled:cursor-not-allowed disabled:border-ink-4 disabled:text-bone-faint disabled:hover:bg-transparent"
        >
          FINALIZE
        </button>
      </div>

      {ctxMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setCtxMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setCtxMenu(null);
          }}
        >
          <div
            className="absolute z-50 min-w-48 rounded border border-ink-4 bg-ink-2 py-1 text-xs tracking-[0.1em]"
            style={{
              left: Math.min(ctxMenu.x, window.innerWidth - 210),
              top: Math.min(ctxMenu.y, window.innerHeight - 90),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={!canSplitSeg(ctxMenu.uid)}
              onClick={() => {
                splitSeg(ctxMenu.uid);
                setCtxMenu(null);
              }}
              className="block w-full px-4 py-2 text-left text-bone transition-colors hover:bg-ink-3 disabled:cursor-not-allowed disabled:text-bone-faint"
            >
              split at playhead
              {!canSplitSeg(ctxMenu.uid) && (
                <span className="mt-0.5 block text-[10px] text-bone-faint">
                  scrub the playhead into this take first
                </span>
              )}
            </button>
            <button
              onClick={() => {
                removeSeg(ctxMenu.uid);
                setCtxMenu(null);
              }}
              className="block w-full px-4 py-2 text-left text-bone transition-colors hover:bg-ink-3 hover:text-ember"
            >
              remove from timeline
            </button>
          </div>
        </div>
      )}

      {finalizing && project && (
        <FinalizeOverlay
          segments={segs.map((s) => ({
            clipId: s.clipId,
            url: clips[s.clipId].url,
            inSec: s.inSec,
            outSec: s.outSec,
          }))}
          projectId={projectId}
          title={project.title}
          kind={project.kind}
          dateStr={todayStr()}
          onDone={(saved) => {
            setFinalizing(false);
            setFilm(saved);
            setProject((p) => (p ? { ...p, status: "FINALIZED" } : p));
          }}
          onCancel={() => setFinalizing(false)}
        />
      )}
    </div>
  );
}
