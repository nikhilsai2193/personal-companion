import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";

// Only computed on click (not preloaded for every film in a list) since a
// signed download URL costs a real request against the storage backend.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const film = await prisma.film.findUnique({ where: { id } });
  if (!film || film.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const dateStr = film.date.toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(film.title)} - ${dateStr}.mp4`;
  const url = await storage.getSignedUrl(film.storagePath, { download: filename });

  return Response.redirect(new URL(url, req.url), 302);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim() || "film";
}
