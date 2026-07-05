"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Recorder from "@/components/record/Recorder";
import Editor from "@/components/editor/Editor";

type Tab = "record" | "edit";

export default function Studio({ projectId }: { projectId: string }) {
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    search.get("tab") === "edit" ? "edit" : "record"
  );
  const [project, setProject] = useState<{
    id: string;
    title: string;
    kind: "DAY" | "TOPIC";
    status: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/clips?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setProject(d.project))
      .catch(() => setMissing(true));
  }, [projectId]);

  if (missing) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center px-6 text-center">
        <p className="text-eyebrow text-ember">nothing here</p>
        <h1 className="font-display mt-4 text-4xl md:text-6xl">
          PROJECT NOT FOUND
        </h1>
        <Link
          href="/record"
          className="mt-8 text-xs tracking-[0.12em] text-bone-muted hover:text-bone"
        >
          back to the record room —
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
        <p className="text-eyebrow text-bone-muted">opening the studio…</p>
      </div>
    );
  }

  // A posted project has no record tab — the editor view shows its film.
  if (project.status === "FINALIZED") {
    return <Editor projectId={projectId} />;
  }

  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col px-4 pb-16 pt-6 md:px-10">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow text-ember">studio</p>
          <h1 className="font-display mt-1 truncate text-2xl md:text-4xl">
            {project.title.toUpperCase()}
          </h1>
        </div>
        <div className="flex shrink-0 gap-1 text-xs tracking-[0.12em]">
          {(["record", "edit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 transition-colors duration-300 ${
                tab === t
                  ? "bg-ink-3 text-bone"
                  : "text-bone-muted hover:text-bone"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "record" ? (
          <Recorder project={{ id: project.id, title: project.title }} />
        ) : (
          <Editor projectId={projectId} embedded />
        )}
      </div>

      <Link
        href="/record"
        className="mx-auto mt-10 w-full max-w-3xl text-xs tracking-[0.12em] text-bone-faint transition-colors duration-300 hover:text-bone"
      >
        — all recordings
      </Link>
    </div>
  );
}
