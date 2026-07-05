import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export type RenderPhase = {
  step: "engine" | "fetch" | "cut" | "join";
  detail: string;
  progress?: number;
};

export type RenderSegment = {
  clipId: string;
  url: string;
  inSec: number;
  outSec: number;
};

// Self-hosted (copied from @ffmpeg/core on install) — no third-party CDN wait.
const CORE = "/ffmpeg";

// Normalize every segment to the same format so concat can stream-copy:
// 720p letterboxed, 30fps, H.264 + AAC. Mixed camera/screen sources and
// webm/mp4 containers all come out identical.
const VF =
  "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export function destroyEngine() {
  ffmpeg?.terminate();
  ffmpeg = null;
  loading = null;
}

async function fetchWithProgress(
  url: string,
  mimeType: string,
  onProgress: (frac: number) => void
) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const total = Number(res.headers.get("Content-Length")) || 0;
  if (!res.body || !total) {
    return URL.createObjectURL(
      new Blob([await res.arrayBuffer()], { type: mimeType })
    );
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded / total);
  }
  return URL.createObjectURL(
    new Blob(chunks as BlobPart[], { type: mimeType })
  );
}

async function getEngine(onPhase: (p: RenderPhase) => void) {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loading) return loading;
  loading = (async () => {
    const ff = new FFmpeg();
    onPhase({ step: "engine", detail: "warming up the projector", progress: 0 });
    const [coreURL, wasmURL] = await Promise.all([
      fetchWithProgress(`${CORE}/ffmpeg-core.js`, "text/javascript", () => {}),
      fetchWithProgress(`${CORE}/ffmpeg-core.wasm`, "application/wasm", (p) =>
        onPhase({
          step: "engine",
          detail: "warming up the projector",
          progress: p,
        })
      ),
    ]);
    await ff.load({ coreURL, wasmURL });
    ffmpeg = ff;
    return ff;
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

// Load the engine ahead of time (e.g. when the editor opens) so pressing
// finalize starts cutting immediately.
export function warmupEngine() {
  getEngine(() => {}).catch(() => {});
}

export async function renderFilm({
  segments,
  onPhase,
}: {
  segments: RenderSegment[];
  onPhase: (p: RenderPhase) => void;
}): Promise<{ film: Blob; durationSec: number }> {
  const ff = await getEngine(onPhase);

  let logBuf = "";
  const onLog = ({ message }: { message: string }) => {
    logBuf += message + "\n";
  };
  ff.on("log", onLog);

  const written: string[] = [];
  try {
    const uniqueClips = [...new Set(segments.map((s) => s.clipId))];
    const inputName: Record<string, string> = {};
    for (let i = 0; i < uniqueClips.length; i++) {
      const clipId = uniqueClips[i];
      const url = segments.find((s) => s.clipId === clipId)!.url;
      onPhase({
        step: "fetch",
        detail: `loading take ${i + 1} of ${uniqueClips.length}`,
      });
      const ext = url.includes(".mp4") ? "mp4" : "webm";
      const name = `in_${i}.${ext}`;
      inputName[clipId] = name;
      await ff.writeFile(name, await fetchFile(url));
      written.push(name);
    }

    const hasAudio = async (name: string) => {
      logBuf = "";
      try {
        await ff.exec(["-hide_banner", "-i", name]);
      } catch {
        // ffmpeg exits non-zero when no output is given; we only want the log
      }
      return /Stream #\d+:\d+[^\n]*Audio:/.test(logBuf);
    };

    const listLines: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const detail = `cutting scene ${i + 1} of ${segments.length}`;
      onPhase({ step: "cut", detail });
      const onProgress = ({ progress }: { progress: number }) =>
        onPhase({ step: "cut", detail, progress });
      ff.on("progress", onProgress);

      const input = inputName[s.clipId];
      const dur = s.outSec - s.inSec;
      const audio = await hasAudio(input);
      const args = ["-ss", String(s.inSec), "-t", String(dur), "-i", input];
      if (!audio) {
        args.push(
          "-f", "lavfi", "-t", String(dur),
          "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-map", "0:v:0", "-map", "1:a:0", "-shortest"
        );
      }
      args.push(
        "-vf", VF,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        `seg_${i}.mp4`
      );
      await ff.exec(args);
      ff.off("progress", onProgress);
      written.push(`seg_${i}.mp4`);
      listLines.push(`file 'seg_${i}.mp4'`);
    }

    await ff.writeFile("concat.txt", listLines.join("\n"));
    written.push("concat.txt");
    onPhase({ step: "join", detail: "splicing the reel" });
    await ff.exec([
      "-f", "concat", "-safe", "0", "-i", "concat.txt",
      "-c", "copy", "film.mp4",
    ]);
    written.push("film.mp4");

    // Trust the rendered file over the recording timers.
    logBuf = "";
    try {
      await ff.exec(["-hide_banner", "-i", "film.mp4"]);
    } catch {
      // no output requested; we only want the log
    }
    const m = logBuf.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    const durationSec = m
      ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
      : segments.reduce((a, s) => a + (s.outSec - s.inSec), 0);

    // Poster art is generated separately (title typography on canvas), so no
    // frame grab here anymore.
    const filmData = await ff.readFile("film.mp4");

    const toBuf = (d: unknown) =>
      Uint8Array.from(d as Uint8Array).buffer as ArrayBuffer;
    return {
      film: new Blob([toBuf(filmData)], { type: "video/mp4" }),
      durationSec,
    };
  } finally {
    ff.off("log", onLog);
    for (const name of written) {
      try {
        await ff.deleteFile(name);
      } catch {
        // best-effort cleanup of the in-memory FS
      }
    }
  }
}
