import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import {
  MAX_TITLE_LEN,
  MAX_DESC_LEN,
  ownedTask,
  taskWithSubtasks,
  taskWithStudy,
} from "@/lib/tasks";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES_LEN = 100_000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, ...taskWithStudy });
  if (!task || task.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const task = await ownedTask(user.id, id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > MAX_TITLE_LEN) {
      return Response.json({ error: "Invalid title" }, { status: 400 });
    }
    data.title = title;
  }
  if ("description" in (body ?? {})) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    data.description = d ? d.slice(0, MAX_DESC_LEN) : null;
  }
  if (body?.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) {
      return Response.json({ error: "Invalid priority" }, { status: 400 });
    }
    data.priority = body.priority;
  }
  if ("deadline" in (body ?? {})) {
    if (body.deadline === null) {
      data.deadline = null;
    } else if (typeof body.deadline === "string" && DATE_RE.test(body.deadline)) {
      data.deadline = new Date(`${body.deadline}T00:00:00.000Z`);
    } else {
      return Response.json({ error: "Invalid deadline" }, { status: 400 });
    }
  }
  if ("notes" in (body ?? {})) {
    const n = typeof body.notes === "string" ? body.notes : "";
    data.notes = n.slice(0, MAX_NOTES_LEN) || null;
  }
  if ("studyLayout" in (body ?? {})) {
    data.studyLayout =
      body.studyLayout && typeof body.studyLayout === "object"
        ? body.studyLayout
        : null;
  }
  if (body?.completed !== undefined) {
    if (task.subtasks.length > 0) {
      return Response.json(
        { error: "This task has subtasks — complete them instead" },
        { status: 400 }
      );
    }
    data.completed = !!body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    ...taskWithSubtasks,
  });
  return Response.json({ task: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const task = await ownedTask(user.id, id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
