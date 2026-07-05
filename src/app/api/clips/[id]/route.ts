import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { asTimeline } from "@/lib/timeline";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!clip || clip.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (clip.project.status === "FINALIZED") {
    return Response.json(
      { error: "This project is already posted" },
      { status: 409 }
    );
  }

  await storage.delete(clip.storagePath);
  await prisma.clip.delete({ where: { id } });

  const timeline = asTimeline(clip.project.timeline).filter(
    (e) => e.clipId !== id
  );
  await prisma.project.update({
    where: { id: clip.projectId },
    data: { timeline },
  });

  return Response.json({ ok: true });
}
