import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedGoalPlan, nodesWithCheckpoints } from "@/lib/goals";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const plan = await ownedGoalPlan(user.id, id);
  if (!plan) return Response.json({ error: "Not found" }, { status: 404 });

  const [nodes, entries] = await Promise.all([
    prisma.goalNode.findMany({ where: { goalPlanId: id }, ...nodesWithCheckpoints }),
    prisma.goalEntry.findMany({
      where: { goalPlanId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return Response.json({ plan, nodes, entries });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const plan = await ownedGoalPlan(user.id, id);
  if (!plan) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.goalPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
