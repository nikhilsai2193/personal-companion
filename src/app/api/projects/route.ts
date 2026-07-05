import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { asTimeline } from "@/lib/timeline";
import {
  DATE_RE,
  MAX_TITLE_LEN,
  isMyDayTitle,
  resolveMyDay,
  resolveTopic,
} from "@/lib/projects";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const dateStr = req.nextUrl.searchParams.get("date");

  const drafts = await prisma.project.findMany({
    where: { userId: user.id, status: "DRAFT" },
    include: { clips: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });

  let postedToday = false;
  if (dateStr && DATE_RE.test(dateStr)) {
    postedToday = !!(await prisma.film.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: new Date(`${dateStr}T00:00:00.000Z`),
        },
      },
    }));
  }

  return Response.json({
    postedToday,
    projects: drafts.map((p) => ({
      id: p.id,
      title: p.title,
      kind: p.kind,
      date: p.date ? p.date.toISOString().slice(0, 10) : null,
      clipCount: p.clips.length,
      totalSec: asTimeline(p.timeline).reduce(
        (a, e) => a + (e.outSec - e.inSec),
        0
      ),
      updatedAt: p.updatedAt,
    })),
  });
}

// Resolve a recording destination: My Day for a date, or a named topic
// (joining the in-progress one if the title already exists).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";
  const dateStr = body?.date;

  if (!rawTitle || isMyDayTitle(rawTitle)) {
    if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
      return Response.json(
        { error: "My Day needs a date" },
        { status: 400 }
      );
    }
    const project = await resolveMyDay(user.id, dateStr);
    return Response.json({ project });
  }

  if (rawTitle.length > MAX_TITLE_LEN) {
    return Response.json(
      { error: `Titles max out at ${MAX_TITLE_LEN} characters` },
      { status: 400 }
    );
  }
  const project = await resolveTopic(user.id, rawTitle);
  return Response.json({ project });
}
