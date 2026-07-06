import { prisma } from "@/lib/db";
import { publicUser, type PublicUser } from "@/lib/social";

// The people you have an accepted connection with, in either direction —
// this is the "friends list" the threads page is built from. A thread with
// someone always exists once you're connected, even before any film has
// been sent — you can open it and be the first to send something.
export async function acceptedConnections(userId: string): Promise<PublicUser[]> {
  const follows = await prisma.follow.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ followerId: userId }, { followeeId: userId }],
    },
    include: {
      follower: { select: publicUser },
      followee: { select: publicUser },
    },
  });
  const byId = new Map<string, PublicUser>();
  for (const f of follows) {
    const other = f.followerId === userId ? f.followee : f.follower;
    byId.set(other.id, other);
  }
  return [...byId.values()];
}

export async function isConnected(userId: string, otherId: string) {
  const follow = await prisma.follow.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { followerId: userId, followeeId: otherId },
        { followerId: otherId, followeeId: userId },
      ],
    },
  });
  return !!follow;
}
