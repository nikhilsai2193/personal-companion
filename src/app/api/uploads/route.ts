import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { storage } from "@/lib/storage";
import { DATE_RE, ownedDraftProject } from "@/lib/projects";

const KINDS: Record<
  string,
  { prefix: "clips" | "films"; exts: string[]; types: string[] }
> = {
  clip: {
    prefix: "clips",
    exts: ["webm", "mp4"],
    types: ["video/webm", "video/mp4"],
  },
  film: { prefix: "films", exts: ["mp4"], types: ["video/mp4"] },
  thumb: { prefix: "films", exts: ["jpg"], types: ["image/jpeg"] },
};

// Issues a one-time direct-upload target. The server never proxies the file
// bytes — browsers PUT straight to storage (local route in dev, Supabase
// signed URL in prod), which keeps large films clear of serverless body caps.
// Clips are keyed by project; films/thumbs by their posting date.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const kindName = String(body?.kind);
  const kind = KINDS[kindName];
  const ext = String(body?.ext ?? "");
  const contentType = String(body?.contentType ?? "");

  if (!kind) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!kind.exts.includes(ext) || !kind.types.includes(contentType)) {
    return Response.json({ error: "Unsupported file type" }, { status: 400 });
  }

  let segment: string;
  if (kindName === "clip") {
    const project = await ownedDraftProject(user.id, String(body?.projectId));
    if (!project) {
      return Response.json({ error: "Unknown project" }, { status: 400 });
    }
    segment = project.id;
  } else {
    const dateStr = body?.date;
    if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
      return Response.json({ error: "Invalid date" }, { status: 400 });
    }
    segment = dateStr;
  }

  const path = `${kind.prefix}/${user.id}/${segment}/${crypto.randomUUID()}.${ext}`;
  const target = await storage.createUploadUrl(path, contentType);
  return Response.json({ path, ...target });
}
