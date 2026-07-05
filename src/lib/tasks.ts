import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const MAX_TITLE_LEN = 120;
export const MAX_DESC_LEN = 2000;

export const taskWithSubtasks = {
  include: { subtasks: { orderBy: { orderIndex: "asc" as const } } },
} satisfies Prisma.TaskDefaultArgs;

export type TaskWithSubtasks = Prisma.TaskGetPayload<typeof taskWithSubtasks>;

export const taskWithStudy = {
  include: {
    subtasks: { orderBy: { orderIndex: "asc" as const } },
    resources: { orderBy: { orderIndex: "asc" as const } },
  },
} satisfies Prisma.TaskDefaultArgs;

export type TaskWithStudy = Prisma.TaskGetPayload<typeof taskWithStudy>;

// Sort by priority (HIGH first), then soonest deadline, undated last, then
// manual order — priority and deadline are entirely user-set, never
// algorithmically re-ranked beyond this.
export function sortOpenTasks(tasks: TaskWithSubtasks[]) {
  const weight = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  return [...tasks].sort((a, b) => {
    if (weight[a.priority] !== weight[b.priority]) {
      return weight[a.priority] - weight[b.priority];
    }
    const ad = a.deadline?.getTime() ?? Infinity;
    const bd = b.deadline?.getTime() ?? Infinity;
    if (ad !== bd) return ad - bd;
    return a.orderIndex - b.orderIndex;
  });
}

export async function ownedTask(userId: string, id: string) {
  const task = await prisma.task.findUnique({ where: { id }, ...taskWithSubtasks });
  return task && task.userId === userId ? task : null;
}
