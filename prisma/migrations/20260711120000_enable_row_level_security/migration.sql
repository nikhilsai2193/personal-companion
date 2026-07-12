-- Enable Row Level Security on every table Supabase auto-exposes through
-- its PostgREST API. This app never queries Postgres that way — all data
-- access is server-side, through Prisma over a direct connection using a
-- role that bypasses RLS — so this doesn't restrict anything the app
-- itself does. Without it, anyone holding the project's anon/publishable
-- key (which Supabase treats as safe to expose, not a secret) could read
-- every row of every table with zero restriction, since RLS is the actual
-- security boundary Supabase relies on, not the key. No policies are
-- added, so enabling RLS alone makes every table deny-all by default for
-- the anon/authenticated roles — exactly right, since nothing should be
-- reading these tables except the app's own connection.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Day" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Clip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Film" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Share" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalNode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalCheckpoint" ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table — also public, also flagged by Supabase's
-- Advisor, and just as safe to lock down the same way.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
