import StudySpace from "@/components/study/StudySpace";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudySpace taskId={id} />;
}
