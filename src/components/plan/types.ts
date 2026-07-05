export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type SubtaskData = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskData = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string | null;
  completed: boolean;
  completedAt: string | null;
  subtasks: SubtaskData[];
};
