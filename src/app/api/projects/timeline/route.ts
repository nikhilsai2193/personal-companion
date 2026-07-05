import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import type { TimelineEntry } from "@/lib/timeline";
import { ownedDraftProject } from "@/lib/projects";

const MIN_SEGMENT_SEC = 0.2;

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const timeline = body?.timeline;

  if (!Array.isArray(timeline)) {
    return Response.json({ error: "Invalid timeline" }, { status: 400 });
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
  const clipsById = new Map(clips.map((c) => [c.id, c]));
  const clean: TimelineEntry[] = [];
  for (const e of timeline) {
    const clip = clipsById.get(e?.clipId);
    const inSec = Number(e?.inSec);
    const outSec = Number(e?.outSec);
    if (
      !clip ||
      !Number.isFinite(inSec) ||
      !Number.isFinite(outSec) ||
      inSec < 0 ||
      outSec > clip.durationSec + 0.5 ||
      outSec - inSec < MIN_SEGMENT_SEC
    ) {
      return Response.json(
        { error: "Invalid timeline entry" },
        { status: 400 }
      );
    }
    clean.push({ clipId: clip.id, inSec, outSec });
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { timeline: clean },
  });

  return Response.json({ ok: true, timeline: clean });
}
