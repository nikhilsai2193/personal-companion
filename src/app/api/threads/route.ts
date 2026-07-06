import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { acceptedConnections } from "@/lib/threads";

export async function GET() {
  const me = await getCurrentUser();
  const connections = await acceptedConnections(me.id);

  const threads = await Promise.all(
    connections.map(async (person) => {
      const latest = await prisma.share.findFirst({
        where: {
          OR: [
            { recipientId: person.id, film: { userId: me.id } },
            { recipientId: me.id, film: { userId: person.id } },
          ],
        },
        include: { film: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        person,
        latest: latest
          ? {
              filmId: latest.film.id,
              title: latest.film.title,
              date: latest.film.date,
              createdAt: latest.createdAt,
              sentByMe: latest.film.userId === me.id,
              thumbUrl: latest.film.thumbPath
                ? await storage.getSignedUrl(latest.film.thumbPath)
                : null,
            }
          : null,
      };
    })
  );

  threads.sort((a, b) => {
    const at = a.latest?.createdAt.getTime() ?? 0;
    const bt = b.latest?.createdAt.getTime() ?? 0;
    return bt - at;
  });

  return Response.json({ threads });
}
