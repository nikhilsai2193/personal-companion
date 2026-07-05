import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

// Cancel an outgoing request or unfollow. Films they shared with me came
// through this follow, so their shares to me are revoked too.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const me = await getCurrentUser();
  const { userId } = await params;

  const deleted = await prisma.follow.deleteMany({
    where: { followerId: me.id, followeeId: userId },
  });
  if (deleted.count === 0) {
    return Response.json({ error: "Not following" }, { status: 404 });
  }
  await prisma.share.deleteMany({
    where: { recipientId: me.id, film: { userId } },
  });
  return Response.json({ ok: true });
}
