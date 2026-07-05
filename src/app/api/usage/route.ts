import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const LIMIT_BYTES =
  (Number(process.env.STORAGE_LIMIT_MB) || 1024) * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  const [clips, films] = await Promise.all([
    prisma.clip.aggregate({
      where: { userId: user.id },
      _sum: { sizeBytes: true },
    }),
    prisma.film.aggregate({
      where: { userId: user.id },
      _sum: { sizeBytes: true },
    }),
  ]);
  return Response.json({
    usedBytes:
      (clips._sum.sizeBytes ?? 0) + (films._sum.sizeBytes ?? 0),
    limitBytes: LIMIT_BYTES,
  });
}
