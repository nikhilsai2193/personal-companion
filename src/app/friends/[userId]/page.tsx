import Thread from "@/components/friends/Thread";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <Thread userId={userId} />;
}
