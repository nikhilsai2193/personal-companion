import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user";

// Server-side proxy so the API key never reaches the client. Free daily
// quota (10,000 units; a search costs 100) comfortably covers personal use.
export async function GET(req: NextRequest) {
  await getCurrentUser();
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return Response.json({ configured: false, results: [] });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return Response.json({ configured: true, results: [] });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("q", q);
  url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) {
    return Response.json({ configured: true, results: [], error: "Search failed" });
  }
  const data = await res.json();
  const results = (data.items ?? []).map(
    (item: {
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
    })
  );

  return Response.json({ configured: true, results });
}
