import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedResource } from "@/lib/studyResources";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const resource = await ownedResource(user.id, id);
  if (!resource) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (Number.isInteger(body?.orderIndex)) data.orderIndex = body.orderIndex;
  // The embeddability pre-check is a plain HTTP fetch with no cookies and no
  // JS execution — it can't see a client-side redirect to a login/dashboard
  // page that only happens in a real, authenticated browser (exactly what
  // happens with mycourses.w3schools.com → profile.w3schools.com). When the
  // client actually hits that wall, it reports back here so future loads of
  // this resource skip straight to the honest fallback card.
  if (typeof body?.embeddable === "boolean") data.embeddable = body.embeddable;

  const updated = await prisma.studyResource.update({ where: { id }, data });
  return Response.json({ resource: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const resource = await ownedResource(user.id, id);
  if (!resource) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.studyResource.delete({ where: { id } });
  return Response.json({ ok: true });
}
