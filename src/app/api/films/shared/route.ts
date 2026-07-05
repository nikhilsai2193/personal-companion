import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { publicUser } from "@/lib/social";

export async function GET() {
  const me = await getCurrentUser();
  const shares = await prisma.share.findMany({
    where: { recipientId: me.id },
    include: {
      film: { include: { user: { select: publicUser } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const films = await Promise.all(
    shares.map(async ({ film }) => ({
      id: film.id,
      title: film.title,
      date: film.date,
      durationSec: film.durationSec,
      sizeBytes: film.sizeBytes,
      owner: film.user,
      url: await storage.getSignedUrl(film.storagePath),
      thumbUrl: film.thumbPath
        ? await storage.getSignedUrl(film.thumbPath)
        : null,
    }))
  );

  return Response.json({ films });
}
