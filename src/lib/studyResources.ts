import * as cheerio from "cheerio";
import { prisma } from "@/lib/db";

export const MAX_TITLE_LEN = 200;

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

export function extractYoutubeId(url: string): string | null {
  const m = url.match(YOUTUBE_RE);
  return m ? m[1] : null;
}

// A page is safe to iframe only if it doesn't actively forbid it — most
// sites do. We check once, on add, rather than pretending every link
// embeds and showing a broken frame.
//
// frame-ancestors takes a source list, not just the two literal keywords
// 'none'/'self' — e.g. W3Schools sends `'self' https://mycourses.w3schools.com
// https://pathfinder.w3schools.com`. Any such list names *specific* origins
// that are almost certainly not ours, so unless it contains a bare `*`
// (anyone may frame this), treat a present frame-ancestors directive as a
// block. Checking the two literal keywords alone let that case through
// silently as "embeddable" when the browser would actually render it blank.
function isEmbeddable(headers: Headers): boolean {
  const xfo = (headers.get("x-frame-options") ?? "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
  const csp = headers.get("content-security-policy") ?? "";
  const match = csp.match(/frame-ancestors\s+([^;]+)/i);
  if (match) {
    const sources = match[1].trim().split(/\s+/);
    if (!sources.includes("*")) return false;
  }
  return true;
}

async function fetchYoutubeMeta(videoId: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`
    );
    if (!res.ok) return { title: null, thumbnailUrl: null };
    const data = await res.json();
    return {
      title: typeof data.title === "string" ? data.title.slice(0, MAX_TITLE_LEN) : null,
      thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return { title: null, thumbnailUrl: null };
  }
}

async function fetchLinkMeta(url: string) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DAYFILM/1.0)" },
    });
    const embeddable = isEmbeddable(res.headers);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { title: null, thumbnailUrl: null, embeddable };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const title =
      $('meta[property="og:title"]').attr("content") ??
      $("title").text() ??
      null;
    const thumbnailUrl = $('meta[property="og:image"]').attr("content") ?? null;
    return {
      title: title ? title.trim().slice(0, MAX_TITLE_LEN) : null,
      thumbnailUrl: thumbnailUrl ?? null,
      embeddable,
    };
  } catch {
    return { title: null, thumbnailUrl: null, embeddable: false };
  }
}

export async function resolveResource(rawUrl: string) {
  const url = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return { error: "Enter a valid http(s) link" as const };
  }

  const videoId = extractYoutubeId(url);
  if (videoId) {
    const meta = await fetchYoutubeMeta(videoId);
    return {
      type: "YOUTUBE" as const,
      url,
      videoId,
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
      embeddable: true,
    };
  }

  const meta = await fetchLinkMeta(url);
  return {
    type: "LINK" as const,
    url,
    videoId: null,
    title: meta.title ?? parsed.hostname,
    thumbnailUrl: meta.thumbnailUrl,
    embeddable: meta.embeddable,
  };
}

export async function ownedResource(userId: string, id: string) {
  const resource = await prisma.studyResource.findUnique({
    where: { id },
    include: { task: true },
  });
  return resource && resource.task.userId === userId ? resource : null;
}
