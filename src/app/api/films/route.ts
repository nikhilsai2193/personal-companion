import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { DATE_RE, ownedDraftProject } from "@/lib/projects";

async function withUrls(film: {
  id: string;
  title: string;
  date: Date;
  durationSec: number;
  sizeBytes: number;
  storagePath: string;
  thumbPath: string | null;
  createdAt: Date;
}) {
  return {
    id: film.id,
    title: film.title,
    date: film.date,
    durationSec: film.durationSec,
    sizeBytes: film.sizeBytes,
    createdAt: film.createdAt,
    url: await storage.getSignedUrl(film.storagePath),
    thumbUrl: film.thumbPath ? await storage.getSignedUrl(film.thumbPath) : null,
  };
}

// Posts a project as today's film. The bytes were already PUT to storage via
// /api/uploads; the Film_userId_date unique index is the daily-quota gate.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);

  const filmPath = String(body?.path ?? "");
  const thumbCandidate = body?.thumbPath ? String(body.thumbPath) : null;
  const projectId = String(body?.projectId ?? "");
  const dateStr = body?.date;
  const durationSec = parseFloat(String(body?.durationSec));

  if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const prefix = `films/${user.id}/${dateStr}/`;
  if (!filmPath.startsWith(prefix) || !filmPath.endsWith(".mp4")) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }
  if (thumbCandidate && !thumbCandidate.startsWith(prefix)) {
    return Response.json({ error: "Invalid thumb path" }, { status: 400 });
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return Response.json({ error: "Invalid duration" }, { status: 400 });
  }

  const project = await ownedDraftProject(user.id, projectId);
  if (!project) {
    return Response.json(
      { error: "Unknown or already posted project" },
      { status: 404 }
    );
  }
  const clips = await prisma.clip.findMany({
    where: { projectId: project.id },
  });
  if (clips.length === 0) {
    return Response.json({ error: "Nothing to finalize" }, { status: 404 });
  }

  const stat = await storage.stat(filmPath);
  if (!stat || stat.size === 0) {
    return Response.json({ error: "Upload not found" }, { status: 400 });
  }
  const thumbPath =
    thumbCandidate && (await storage.stat(thumbCandidate))
      ? thumbCandidate
      : null;

  let film;
  try {
    film = await prisma.film.create({
      data: {
        projectId: project.id,
        userId: user.id,
        title: project.title,
        date: new Date(`${dateStr}T00:00:00.000Z`),
        durationSec,
        sizeBytes: stat.size,
        storagePath: filmPath,
        thumbPath,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      await storage.delete(filmPath);
      if (thumbPath) await storage.delete(thumbPath);
      return Response.json(
        {
          error:
            "Today's film is already posted — this project stays in progress. Come back tomorrow.",
        },
        { status: 409 }
      );
    }
    throw e;
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "FINALIZED" },
  });

  // The film is the artifact that lasts — raw takes free up storage now.
  for (const clip of clips) {
    await storage.delete(clip.storagePath);
  }
  await prisma.clip.deleteMany({ where: { projectId: project.id } });

  return Response.json({ film: await withUrls(film) }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const dateStr = req.nextUrl.searchParams.get("date");
  const projectId = req.nextUrl.searchParams.get("projectId");

  const films = await prisma.film.findMany({
    where: {
      userId: user.id,
      ...(projectId ? { projectId } : {}),
      ...(dateStr && DATE_RE.test(dateStr)
        ? { date: new Date(`${dateStr}T00:00:00.000Z`) }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  return Response.json({ films: await Promise.all(films.map(withUrls)) });
}
