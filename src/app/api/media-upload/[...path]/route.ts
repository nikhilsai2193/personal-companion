import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";

// Direct-upload sink for the local storage driver (Supabase uploads go to
// its signed URL instead). Only paths under the session user's own prefix
// are writable.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getCurrentUser();
  const { path: parts } = await params;
  const p = parts.join("/");

  const allowed =
    p.startsWith(`clips/${user.id}/`) || p.startsWith(`films/${user.id}/`);
  if (!allowed) {
    return Response.json({ error: "Forbidden path" }, { status: 403 });
  }

  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0) {
    return Response.json({ error: "Empty upload" }, { status: 400 });
  }
  await storage.upload(
    p,
    bytes,
    req.headers.get("content-type") ?? "application/octet-stream"
  );
  return Response.json({ ok: true, size: bytes.length });
}
