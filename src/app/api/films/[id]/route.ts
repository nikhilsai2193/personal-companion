import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const film = await prisma.film.findUnique({ where: { id } });
  if (!film || film.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await storage.delete(film.storagePath);
  if (film.thumbPath) await storage.delete(film.thumbPath);

  // Deleting the Project cascades the Film row (raw clips were already
  // removed at finalize), freeing that date's post slot again.
  await prisma.project.delete({ where: { id: film.projectId } });

  return Response.json({ ok: true });
}
