import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { publicUser } from "@/lib/social";

export async function GET() {
  const me = await getCurrentUser();
  const [incoming, outgoing, followers, following] = await Promise.all([
    prisma.follow.findMany({
      where: { followeeId: me.id, status: "PENDING" },
      include: { follower: { select: publicUser } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: me.id, status: "PENDING" },
      include: { followee: { select: publicUser } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followeeId: me.id, status: "ACCEPTED" },
      include: { follower: { select: publicUser } },
    }),
    prisma.follow.findMany({
      where: { followerId: me.id, status: "ACCEPTED" },
      include: { followee: { select: publicUser } },
    }),
  ]);

  return Response.json({
    incoming: incoming.map((f) => f.follower),
    outgoing: outgoing.map((f) => f.followee),
    followers: followers.map((f) => f.follower),
    following: following.map((f) => f.followee),
  });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "");

  if (!userId || userId === me.id) {
    return Response.json({ error: "Invalid user" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followeeId: { followerId: me.id, followeeId: userId },
    },
  });
  if (existing) {
    return Response.json({ error: "Already requested" }, { status: 409 });
  }
  await prisma.follow.create({
    data: { followerId: me.id, followeeId: userId },
  });
  return Response.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  const action = body?.action;

  if (!userId || (action !== "accept" && action !== "decline")) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const pending = await prisma.follow.findUnique({
    where: {
      followerId_followeeId: { followerId: userId, followeeId: me.id },
    },
  });
  if (!pending || pending.status !== "PENDING") {
    return Response.json({ error: "No pending request" }, { status: 404 });
  }
  if (action === "accept") {
    await prisma.follow.update({
      where: {
        followerId_followeeId: { followerId: userId, followeeId: me.id },
      },
      data: { status: "ACCEPTED" },
    });
  } else {
    await prisma.follow.delete({
      where: {
        followerId_followeeId: { followerId: userId, followeeId: me.id },
      },
    });
  }
  return Response.json({ ok: true });
}
