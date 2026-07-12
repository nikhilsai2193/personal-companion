import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import type { NextRequest } from "next/server";

const MIME: Record<string, string> = {
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
  const filePath = path.resolve(uploadsDir, ...parts);
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");

  const downloadName = req.nextUrl.searchParams.get("download");
  const disposition: Record<string, string> = downloadName
    ? { "Content-Disposition": `attachment; filename="${sanitizeFilename(downloadName)}"` }
    : {};

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size || start > end) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }
    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end })
    ) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        ...disposition,
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      ...disposition,
    },
  });
}

// Strips characters that could break out of the quoted Content-Disposition
// filename (or inject header fields via CRLF) — belt-and-suspenders since
// the value only ever comes from our own generated download links today.
function sanitizeFilename(name: string) {
  return name.replace(/[\r\n"]/g, "").slice(0, 200);
}
