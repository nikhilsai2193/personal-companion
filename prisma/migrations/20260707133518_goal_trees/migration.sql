-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "goalCheckpointId" TEXT;

-- CreateTable
CREATE TABLE "GoalPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalEntry" (
    "id" TEXT NOT NULL,
    "goalPlanId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalNode" (
    "id" TEXT NOT NULL,
    "goalPlanId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATE,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "choiceGroupId" TEXT,
    "obstacle" TEXT,
    "obstaclePlan" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCheckpoint" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_goalCheckpointId_key" ON "Task"("goalCheckpointId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalCheckpointId_fkey" FOREIGN KEY ("goalCheckpointId") REFERENCES "GoalCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalPlan" ADD CONSTRAINT "GoalPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_goalPlanId_fkey" FOREIGN KEY ("goalPlanId") REFERENCES "GoalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalNode" ADD CONSTRAINT "GoalNode_goalPlanId_fkey" FOREIGN KEY ("goalPlanId") REFERENCES "GoalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalNode" ADD CONSTRAINT "GoalNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GoalNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCheckpoint" ADD CONSTRAINT "GoalCheckpoint_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GoalNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

