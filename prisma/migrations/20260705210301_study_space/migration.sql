-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('YOUTUBE', 'LINK');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "studyLayout" JSONB;

-- CreateTable
CREATE TABLE "StudyResource" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "videoId" TEXT,
    "title" TEXT,
    "thumbnailUrl" TEXT,
    "embeddable" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyResource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

