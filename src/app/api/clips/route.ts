import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { asTimeline } from "@/lib/timeline";
import { ownedDraftProject } from "@/lib/projects";

// Registers a clip whose bytes were already PUT to storage via /api/uploads.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);

  const storagePath = String(body?.path ?? "");
  const projectId = String(body?.projectId ?? "");
  const durationSec = parseFloat(String(body?.durationSec));
  const source = body?.source === "SCREEN" ? "SCREEN" : "CAMERA";
  const mimeType = String(body?.mimeType || "video/webm");

  const project = await ownedDraftProject(user.id, projectId);
  if (!project) {
    return Response.json({ error: "Unknown project" }, { status: 400 });
  }
  if (!storagePath.startsWith(`clips/${user.id}/${project.id}/`)) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return Response.json({ error: "Invalid duration" }, { status: 400 });
  }
  const stat = await storage.stat(storagePath);
  if (!stat || stat.size === 0) {
    return Response.json({ error: "Upload not found" }, { status: 400 });
  }

  const orderIndex = await prisma.clip.count({
    where: { projectId: project.id },
  });
  const clip = await prisma.clip.create({
    data: {
      projectId: project.id,
      userId: user.id,
      orderIndex,
      durationSec,
      sizeBytes: stat.size,
      storagePath,
      mimeType,
      source,
    },
  });

  const timeline = asTimeline(project.timeline);
  timeline.push({ clipId: clip.id, inSec: 0, outSec: durationSec });
  await prisma.project.update({
    where: { id: project.id },
    data: { timeline },
  });

  return Response.json({ clip }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { clips: { orderBy: { orderIndex: "asc" } } },
  });
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const clips = await Promise.all(
    project.clips.map(async (c) => ({
      id: c.id,
      durationSec: c.durationSec,
      sizeBytes: c.sizeBytes,
      source: c.source,
      createdAt: c.createdAt,
      url: await storage.getSignedUrl(c.storagePath),
    }))
  );

  return Response.json({
    project: {
      id: project.id,
      title: project.title,
      kind: project.kind,
      status: project.status,
      timeline: project.timeline,
    },
    clips,
  });
}
