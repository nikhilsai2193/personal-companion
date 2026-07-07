import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { MAX_TITLE_LEN } from "@/lib/goals";

export async function GET() {
  const user = await getCurrentUser();
  const plans = await prisma.goalPlan.findMany({
    where: { userId: user.id },
    include: {
      nodes: { include: { checkpoints: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({
    plans: plans.map((p) => {
      const checkpoints = p.nodes.flatMap((n) => n.checkpoints);
      return {
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt,
        nodeCount: p.nodes.length,
        checkpointTotal: checkpoints.length,
        checkpointDone: checkpoints.filter((c) => c.completed).length,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LEN) {
    return Response.json(
      { error: `Title is required, max ${MAX_TITLE_LEN} characters` },
      { status: 400 }
    );
  }

  const plan = await prisma.goalPlan.create({
    data: { userId: user.id, title },
  });
  return Response.json({ plan }, { status: 201 });
}
