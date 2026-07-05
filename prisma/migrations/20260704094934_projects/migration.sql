-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('DAY', 'TOPIC');

-- AlterTable
ALTER TABLE "Day" ADD COLUMN     "kind" "ProjectKind" NOT NULL DEFAULT 'DAY',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'My Day',
ALTER COLUMN "date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Film" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'My Day';

-- CreateIndex
CREATE UNIQUE INDEX "Film_userId_date_key" ON "Film"("userId", "date");

