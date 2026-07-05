import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { publicUser } from "@/lib/social";

async function ownedFilm(userId: string, id: string) {
  const film = await prisma.film.findUnique({ where: { id } });
  return film && film.userId === userId ? film : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  const { id } = await params;
  const film = await ownedFilm(me.id, id);
  if (!film) return Response.json({ error: "Not found" }, { status: 404 });

  const shares = await prisma.share.findMany({
    where: { filmId: id },
    include: { recipient: { select: publicUser } },
  });
  return Response.json({ recipients: shares.map((s) => s.recipient) });
}

// Replace the film's recipient set. Recipients must be accepted followers —
// people who asked to see your films.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  const { id } = await params;
  const film = await ownedFilm(me.id, id);
  if (!film) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const recipientIds: string[] = Array.isArray(body?.recipientIds)
    ? [...new Set<string>(body.recipientIds.map((r: unknown) => String(r)))]
    : [];

  if (recipientIds.length > 0) {
    const followers = await prisma.follow.count({
      where: {
        followeeId: me.id,
        status: "ACCEPTED",
        followerId: { in: recipientIds },
      },
    });
    if (followers !== recipientIds.length) {
      return Response.json(
        { error: "Recipients must be accepted followers" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    prisma.share.deleteMany({ where: { filmId: id } }),
    ...(recipientIds.length
      ? [
          prisma.share.createMany({
            data: recipientIds.map((recipientId) => ({
              filmId: id,
              recipientId,
            })),
          }),
        ]
      : []),
  ]);

  return Response.json({ ok: true, count: recipientIds.length });
}
