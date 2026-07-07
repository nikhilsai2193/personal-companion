import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedNode, nodeWithCheckpoints, MAX_TITLE_LEN } from "@/lib/goals";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const node = await ownedNode(user.id, id);
  if (!node) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > MAX_TITLE_LEN) {
      return Response.json({ error: "Invalid title" }, { status: 400 });
    }
    data.title = title;
  }
  for (const field of ["description", "obstacle", "obstaclePlan"] as const) {
    if (field in (body ?? {})) {
      const v = typeof body[field] === "string" ? body[field].trim() : "";
      data[field] = v || null;
    }
  }
  if ("targetDate" in (body ?? {})) {
    if (body.targetDate === null) {
      data.targetDate = null;
    } else if (typeof body.targetDate === "string" && DATE_RE.test(body.targetDate)) {
      data.targetDate = new Date(`${body.targetDate}T00:00:00.000Z`);
    } else {
      return Response.json({ error: "Invalid date" }, { status: 400 });
    }
  }

  const updated = await prisma.goalNode.update({
    where: { id },
    data,
    ...nodeWithCheckpoints,
  });
  return Response.json({ node: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const node = await ownedNode(user.id, id);
  if (!node) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.goalNode.delete({ where: { id } });
  return Response.json({ ok: true });
}
