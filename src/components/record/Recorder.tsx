"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import NameTakeDialog, {
  type ProjectSummary,
  type TakeDestination,
} from "./NameTakeDialog";

type Source = "CAMERA" | "SCREEN";
type Phase = "idle" | "recording" | "naming" | "saving";

type ClipItem = {
  id: string;
  durationSec: number;
  source: Source;
  createdAt: string;
};

type PendingTake = { blob: Blob; durationSec: number; source: Source };

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function fmt(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Two modes: with a `project` prop (inside a studio) every take lands there
// directly; without one (the main record page) each take opens the naming
// dialog — new topic, existing topic, or the default My Day.
export default function Recorder({
  project,
  onSaved,
}: {
  project?: { id: string; title: string } | null;
  onSaved?: (destTitle: string) => void;
}) {
  const [source, setSource] = useState<Source>("CAMERA");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [pending, setPending] = useState<PendingTake | null>(null);
  const [inProgress, setInProgress] = useState<ProjectSummary[]>([]);
  const [lastSavedTo, setLastSavedTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenSupported, setScreenSupported] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  // null = system default ("auto"). Loaded synchronously so it's already
  // correct on the very first getUserMedia call, not one render late.
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("dayfilm-audio-device")
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // getUserMedia is async and outlives a fast tab switch — without this,
  // a stream that resolves after the component has already unmounted gets
  // assigned to streamRef with nothing left around to ever stop it,
  // leaving the camera on indefinitely.
  const mountedRef = useRef(true);
  // React Strict Mode (on by default with the App Router since Next
  // 13.5.1, and not overridden here) runs every effect's setup → cleanup
  // → setup once in dev — so this effect fires startCameraPreview twice
  // on mount, kicking off two real getUserMedia requests. Whichever one
  // resolves first was, until this guard existed, unconditionally
  // overwritten by the second — orphaning its stream with nothing left
  // to ever call .stop() on. requestIdRef lets a resolving call recognize
  // it's been superseded and stop itself instead.
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopTracks = useCallback(() => {
    requestIdRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Device labels are only populated by the browser once permission has
  // been granted at least once — called after every successful stream
  // grant, and again on devicechange so a newly plugged-in mic shows up
  // in the picker without needing a reload.
  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
    } catch {
      // Device list just won't refresh — not worth surfacing as an error.
    }
  }, []);

  const selectAudioDevice = useCallback((id: string | null) => {
    setAudioDeviceId(id);
    if (id) localStorage.setItem("dayfilm-audio-device", id);
    else localStorage.removeItem("dayfilm-audio-device");
  }, []);

  const startCameraPreview = useCallback(async () => {
    stopTracks();
    const requestId = ++requestIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      });
      if (!mountedRef.current || requestIdRef.current !== requestId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
      refreshAudioDevices();
    } catch (err) {
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      // The device the user had picked was unplugged — fall back to the
      // system default instead of getting stuck pointed at nothing.
      if (audioDeviceId && err instanceof DOMException && err.name === "OverconstrainedError") {
        selectAudioDevice(null);
        return;
      }
      setError("Camera or microphone access was denied.");
    }
  }, [stopTracks, audioDeviceId, refreshAudioDevices, selectAudioDevice]);

  useEffect(() => {
    refreshAudioDevices();
    const handleDeviceChange = () => {
      refreshAudioDevices();
      // A live stream stays bound to whatever device was default when it
      // was created — the browser won't hot-swap it just because the OS
      // default changed. Re-requesting picks up the new default (e.g. a
      // just-connected pair of earphones) instead of silently sticking
      // with the built-in mic. Only in "auto" mode — an explicit pick
      // should stay put through unrelated device changes.
      if (!audioDeviceId && source === "CAMERA" && streamRef.current) {
        startCameraPreview();
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [audioDeviceId, source, startCameraPreview, refreshAudioDevices]);

  useEffect(() => {
    setScreenSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getDisplayMedia
    );
    if (project) {
      fetch(`/api/clips?projectId=${project.id}`)
        .then((r) => r.json())
        .then((data) => setClips(data.clips ?? []))
        .catch(() => {});
    }
  }, [project]);

  useEffect(() => {
    if (source === "CAMERA") startCameraPreview();
    else stopTracks();
    return stopTracks;
  }, [source, startCameraPreview, stopTracks]);

  const uploadTo = useCallback(
    async (projectId: string, take: PendingTake) => {
      const mimeType = take.blob.type || "video/webm";
      const contentType = mimeType.includes("mp4")
        ? "video/mp4"
        : "video/webm";
      const issue = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "clip",
          projectId,
          ext: contentType === "video/mp4" ? "mp4" : "webm",
          contentType,
        }),
      });
      if (!issue.ok) throw new Error("Couldn't start upload");
      const target = await issue.json();
      const put = await fetch(target.url, {
        method: target.method,
        headers: target.headers,
        body: take.blob,
      });
      if (!put.ok) throw new Error("Upload failed");
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: target.path,
          projectId,
          durationSec: take.durationSec,
          source: take.source,
          mimeType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }
      return res.json();
    },
    []
  );

  const resolveDestination = useCallback(
    async (dest: TakeDestination): Promise<{ id: string; title: string }> => {
      if (dest.kind === "existing") return { id: dest.id, title: dest.title };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          dest.kind === "myday"
            ? { date: todayStr() }
            : { title: dest.title }
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't create project");
      }
      const { project: p } = await res.json();
      return { id: p.id, title: p.title };
    },
    []
  );

  const saveTake = useCallback(
    async (dest: TakeDestination) => {
      if (!pending) return;
      setPhase("saving");
      try {
        const target = await resolveDestination(dest);
        const { clip } = await uploadTo(target.id, pending);
        if (project) {
          setClips((prev) => [
            ...prev,
            {
              id: clip.id,
              durationSec: clip.durationSec,
              source: clip.source,
              createdAt: clip.createdAt,
            },
          ]);
        }
        setLastSavedTo(target.title);
        onSaved?.(target.title);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
      setPending(null);
      setPhase("idle");
    },
    [pending, project, resolveDestination, uploadTo, onSaved]
  );

  const beginRecording = useCallback(
    (stream: MediaStream, src: Source) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      setError(null);
      setLastSavedTo(null);

      timerRef.current = setInterval(
        () => setElapsed((Date.now() - startedAtRef.current) / 1000),
        250
      );

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const durationSec = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const take: PendingTake = { blob, durationSec, source: src };
        if (src === "SCREEN") {
          stopTracks();
          startCameraPreview();
          setSource("CAMERA");
        }
        if (project) {
          setPending(take);
          setPhase("saving");
          try {
            const { clip } = await uploadTo(project.id, take);
            setClips((prev) => [
              ...prev,
              {
                id: clip.id,
                durationSec: clip.durationSec,
                source: clip.source,
                createdAt: clip.createdAt,
              },
            ]);
            setLastSavedTo(project.title);
            onSaved?.(project.title);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
          }
          setPending(null);
          setPhase("idle");
        } else {
          // Fetch in-progress projects while the user decides where it goes.
          setPending(take);
          setPhase("naming");
          fetch(`/api/projects?date=${todayStr()}`)
            .then((r) => r.json())
            .then((d) =>
              setInProgress(
                (d.projects ?? []).filter(
                  (p: ProjectSummary & { clipCount: number }) =>
                    p.clipCount > 0 || p.kind === "TOPIC"
                )
              )
            )
            .catch(() => setInProgress([]));
        }
      };

      // If the user ends screen share from the browser's own UI, stop cleanly.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state === "recording") recorder.stop();
      });

      recorder.start(1000);
    },
    [project, startCameraPreview, stopTracks, uploadTo, onSaved]
  );

  const startRecording = useCallback(async () => {
    if (source === "CAMERA") {
      if (!streamRef.current) await startCameraPreview();
      if (streamRef.current) beginRecording(streamRef.current, "CAMERA");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
        });
      } catch {
        setError("Recording screen without mic — audio access was denied.");
      }
      if (!mountedRef.current) {
        display.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        return;
      }
      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...(mic ? mic.getAudioTracks() : []),
      ]);
      beginRecording(combined, "SCREEN");
    } catch {
      // User dismissed the screen picker — not an error.
    }
  }, [source, beginRecording, startCameraPreview, audioDeviceId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const deleteClip = useCallback(async (id: string) => {
    const res = await fetch(`/api/clips/${id}`, { method: "DELETE" });
    if (res.ok) setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const recording = phase === "recording";

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <p className="text-eyebrow text-ember">
          {recording
            ? "recording"
            : phase === "saving"
              ? "saving take"
              : phase === "naming"
                ? "take ready"
                : project
                  ? `recording into ${project.title}`
                  : "ready"}
        </p>
        {screenSupported && (
          <div className="flex gap-1 text-xs tracking-[0.12em]">
            {(["CAMERA", "SCREEN"] as const).map((s) => (
              <button
                key={s}
                onClick={() => !recording && phase === "idle" && setSource(s)}
                className={`px-3 py-1.5 transition-colors duration-300 ${
                  source === s
                    ? "bg-ink-3 text-bone"
                    : "text-bone-muted hover:text-bone"
                }`}
              >
                {s.toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {audioDevices.length > 1 && (
        <div className="mx-auto mt-3 flex w-full max-w-3xl items-center justify-end gap-2 text-[10px] tracking-[0.1em]">
          <label htmlFor="mic-select" className="text-bone-faint">
            mic
          </label>
          <select
            id="mic-select"
            value={audioDeviceId ?? ""}
            disabled={recording || phase !== "idle"}
            onChange={(e) => selectAudioDevice(e.target.value || null)}
            className="rounded border border-ink-3 bg-ink-2 px-2 py-1 text-bone-muted outline-none disabled:opacity-40"
          >
            <option value="">auto (system default)</option>
            {audioDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `microphone ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mx-auto mt-4 w-full max-w-3xl">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-ink-2">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${
              source === "CAMERA" ? "-scale-x-100" : ""
            }`}
          />
          {source === "SCREEN" && !recording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs text-center text-sm text-bone-muted">
                Press record — you&apos;ll pick a screen or window, and your mic
                narrates over it.
              </p>
            </div>
          )}
          {recording && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/70 px-3 py-1.5 text-xs tracking-[0.12em]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ember" />
              {fmt(elapsed)}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={phase === "saving" || phase === "naming"}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className="group flex h-16 w-16 items-center justify-center rounded-full border border-bone-faint transition-colors duration-300 hover:border-bone disabled:opacity-40"
          >
            <span
              className={`bg-ember transition-all duration-300 ${
                recording
                  ? "h-5 w-5 rounded-sm"
                  : "h-12 w-12 rounded-full group-hover:scale-90"
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-ember">{error}</p>
        )}
        {lastSavedTo && !error && (
          <p className="mt-4 text-center text-xs tracking-[0.12em] text-bone-muted">
            take saved to <span className="text-bone">{lastSavedTo}</span>
          </p>
        )}

        {project && (
          <div className="mt-8">
            <p className="text-eyebrow text-bone-muted">
              {project.title} — {clips.length}{" "}
              {clips.length === 1 ? "take" : "takes"}
            </p>
            {clips.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-3 border-y border-ink-3">
                {clips.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="font-display text-bone">
                      TAKE {i + 1}
                      <span className="ml-3 text-xs font-normal tracking-[0.12em] text-bone-muted">
                        {c.source.toLowerCase()} — {fmt(c.durationSec)}
                      </span>
                    </span>
                    <button
                      onClick={() => deleteClip(c.id)}
                      className="text-xs tracking-[0.12em] text-bone-faint transition-colors duration-300 hover:text-ember"
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {clips.length > 0 && (
              <Link
                href={`/studio/${project.id}?tab=edit`}
                className="mt-4 inline-block text-xs tracking-[0.12em] text-bone-muted transition-colors duration-300 hover:text-ember"
              >
                cut this film —
              </Link>
            )}
          </div>
        )}
      </div>

      {phase === "naming" && pending && (
        <NameTakeDialog
          existing={inProgress}
          onChoose={saveTake}
          onDiscard={() => {
            setPending(null);
            setPhase("idle");
          }}
        />
      )}
    </div>
  );
}
