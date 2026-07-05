import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { publicUser } from "@/lib/social";

export type RelationStatus =
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "following"
  | "follows_you"
  | "mutual";

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: publicUser,
    take: 10,
  });
  const ids = users.map((u) => u.id);

  const rels = await prisma.follow.findMany({
    where: {
      OR: [
        { followerId: me.id, followeeId: { in: ids } },
        { followeeId: me.id, followerId: { in: ids } },
      ],
    },
  });

  const results = users.map((u) => {
    const out = rels.find(
      (r) => r.followerId === me.id && r.followeeId === u.id
    );
    const inc = rels.find(
      (r) => r.followerId === u.id && r.followeeId === me.id
    );
    let status: RelationStatus = "none";
    if (out?.status === "ACCEPTED" && inc?.status === "ACCEPTED")
      status = "mutual";
    else if (out?.status === "PENDING") status = "outgoing_pending";
    else if (inc?.status === "PENDING") status = "incoming_pending";
    else if (out?.status === "ACCEPTED") status = "following";
    else if (inc?.status === "ACCEPTED") status = "follows_you";
    return { ...u, status };
  });

  return Response.json({ users: results });
}
