import { prisma } from "./db";

export const MY_DAY_TITLE = "My Day";
export const MAX_TITLE_LEN = 60;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isMyDayTitle(title: string) {
  return title.trim().toLowerCase() === MY_DAY_TITLE.toLowerCase();
}

// One My Day per calendar date, created on first use. Topics span days and
// are matched case-insensitively among in-progress projects, so choosing an
// existing title keeps appending to the same timeline.
export async function resolveMyDay(userId: string, dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return prisma.project.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, kind: "DAY", title: MY_DAY_TITLE },
    update: {},
  });
}

export async function resolveTopic(userId: string, rawTitle: string) {
  const title = rawTitle.trim().slice(0, MAX_TITLE_LEN);
  const existing = await prisma.project.findFirst({
    where: {
      userId,
      kind: "TOPIC",
      status: "DRAFT",
      title: { equals: title, mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return prisma.project.create({
    data: { userId, kind: "TOPIC", title, date: null },
  });
}

export async function ownedDraftProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.userId !== userId || project.status !== "DRAFT") {
    return null;
  }
  return project;
}
