export type GoalCheckpointData = {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
};

export type GoalNodeData = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  choiceGroupId: string | null;
  obstacle: string | null;
  obstaclePlan: string | null;
  completed: boolean;
  completedAt: string | null;
  checkpoints: GoalCheckpointData[];
};

export type GoalEntryData = {
  id: string;
  rawText: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  error: string | null;
  createdAt: string;
};

export type GoalPlanData = {
  id: string;
  title: string;
  updatedAt: string;
};
