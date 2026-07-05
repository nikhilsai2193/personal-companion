"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FadeUp from "@/components/motion/FadeUp";
import ResourcePane from "./ResourcePane";
import NotesPane from "./NotesPane";
import type { ResourceData, StudyTask } from "./types";

const PRIORITY_DOT: Record<StudyTask["priority"], string> = {
  HIGH: "bg-ember",
  MEDIUM: "bg-bone-muted",
  LOW: "bg-bone-faint",
};

const DEFAULT_SPLIT = 62;
const MIN_SPLIT = 30;
const MAX_SPLIT = 78;

// Lightweight postMessage control of the YouTube embed — no need to load
// YouTube's full iframe_api script for a simple play/pause need. The player
// listens for this exact protocol once `enablejsapi=1` is set.
function sendPlayerCommand(iframe: HTMLIFrameElement | null, func: string) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "*"
  );
}

export default function StudySpace({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<StudyTask | null>(null);
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);
  const [pausedByNotes, setPausedByNotes] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const videoIframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedNotes = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d) => {
        setTask(d.task);
        setNotes(d.task.notes ?? "");
        setSplitPct(d.task.studyLayout?.splitPct ?? DEFAULT_SPLIT);
        setActiveId(d.task.resources[0]?.id ?? null);
        // Marks the load as done regardless of whether `notes` actually
        // changed value (empty-to-empty is a no-op state update, which
        // would otherwise never flip this guard — and the next effect run
        // would then wrongly treat the user's first real edit as the load).
        loadedNotes.current = true;
      })
      .catch(() => {});
  }, [taskId]);

  // Autosave notes, debounced — same pattern as the editor's timeline save.
  useEffect(() => {
    if (!task || !loadedNotes.current) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaveState(res.ok ? "saved" : "idle");
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const persistSplit = useCallback(
    (pct: number) => {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyLayout: { splitPct: pct } }),
      }).catch(() => {});
    },
    [taskId]
  );

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setSplitPct((current) => {
        persistSplit(current);
        return current;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addResource = useCallback(
    async (url: string) => {
      const res = await fetch(`/api/tasks/${taskId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't add that link");
      }
      const { resource } = (await res.json()) as { resource: ResourceData };
      setTask((prev) =>
        prev ? { ...prev, resources: [...prev.resources, resource] } : prev
      );
      setActiveId(resource.id);
    },
    [taskId]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
      setTask((prev) => {
        if (!prev) return prev;
        const resources = prev.resources.filter((r) => r.id !== id);
        if (activeId === id) setActiveId(resources[0]?.id ?? null);
        return { ...prev, resources };
      });
    },
    [activeId]
  );

  const markNotEmbeddable = useCallback(async (id: string) => {
    await fetch(`/api/resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeddable: false }),
    });
    setTask((prev) =>
      prev
        ? {
            ...prev,
            resources: prev.resources.map((r) =>
              r.id === id ? { ...r, embeddable: false } : r
            ),
          }
        : prev
    );
  }, []);

  const activeResource = task?.resources.find((r) => r.id === activeId);
  const isVideoActive = activeResource?.type === "YOUTUBE";

  const handleNotesEnter = () => {
    if (!isVideoActive) return;
    sendPlayerCommand(videoIframeRef.current, "pauseVideo");
    setPausedByNotes(true);
  };
  const handleNotesLeave = () => {
    if (!isVideoActive) return;
    sendPlayerCommand(videoIframeRef.current, "playVideo");
    setPausedByNotes(false);
  };

  if (!task) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">opening the study space…</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">
      <FadeUp className="flex items-center justify-between border-b border-ink-3 px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <div>
            <p className="text-eyebrow text-ember">study space</p>
            <h1 className="font-display text-xl md:text-2xl">
              {task.title}{" "}
              <span className="font-voice text-base text-bone-muted">
                stay focused
              </span>
            </h1>
          </div>
        </div>
        <Link
          href="/plan"
          className="text-xs tracking-[0.12em] text-bone-muted transition-colors duration-300 hover:text-bone"
        >
          back to plan
        </Link>
      </FadeUp>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col lg:flex-row"
      >
        <div
          className="min-h-0 shrink-0 lg:h-full"
          style={
            isDesktop
              ? { width: `${splitPct}%` }
              : { height: "48vh" }
          }
        >
          <ResourcePane
            resources={task.resources}
            activeId={activeId}
            onSelect={setActiveId}
            onAddUrl={addResource}
            onDelete={deleteResource}
            onMarkNotEmbeddable={markNotEmbeddable}
            videoIframeRef={videoIframeRef}
            pausedByNotes={pausedByNotes}
          />
        </div>

        {isDesktop && (
          <div
            onPointerDown={startDrag}
            className="group relative w-2 shrink-0 cursor-col-resize touch-none"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink-3 transition-colors duration-300 group-hover:bg-ember" />
          </div>
        )}

        <div className="min-h-0 flex-1">
          <NotesPane
            value={notes}
            onChange={setNotes}
            onEnter={handleNotesEnter}
            onLeave={handleNotesLeave}
            saveState={saveState}
          />
        </div>
      </div>
    </div>
  );
}
