import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedTask } from "@/lib/tasks";
import { resolveResource } from "@/lib/studyResources";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const task = await ownedTask(user.id, id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return Response.json({ error: "A link is required" }, { status: 400 });

  const resolved = await resolveResource(url);
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 400 });
  }

  const count = await prisma.studyResource.count({ where: { taskId: id } });
  const resource = await prisma.studyResource.create({
    data: { taskId: id, orderIndex: count, ...resolved },
  });

  return Response.json({ resource }, { status: 201 });
}
