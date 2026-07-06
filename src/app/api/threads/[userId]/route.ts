import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { publicUser } from "@/lib/social";
import { isConnected } from "@/lib/threads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const me = await getCurrentUser();
  const { userId } = await params;

  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUser,
  });
  if (!person || !(await isConnected(me.id, userId))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const shares = await prisma.share.findMany({
    where: {
      OR: [
        { recipientId: userId, film: { userId: me.id } },
        { recipientId: me.id, film: { userId } },
      ],
    },
    include: { film: true },
    orderBy: { createdAt: "asc" },
  });

  const films = await Promise.all(
    shares.map(async (s) => ({
      shareId: `${s.filmId}-${s.recipientId}`,
      filmId: s.film.id,
      title: s.film.title,
      date: s.film.date,
      durationSec: s.film.durationSec,
      createdAt: s.createdAt,
      sentByMe: s.film.userId === me.id,
      url: await storage.getSignedUrl(s.film.storagePath),
      thumbUrl: s.film.thumbPath
        ? await storage.getSignedUrl(s.film.thumbPath)
        : null,
    }))
  );

  return Response.json({ person, films });
}
