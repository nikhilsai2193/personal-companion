import GoalPlanView from "@/components/goals/GoalPlanView";

export default async function GoalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoalPlanView planId={id} />;
}
