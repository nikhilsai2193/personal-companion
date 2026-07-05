import { promises as fs } from "fs";
import path from "path";
import type { StorageAdapter } from "./types";

function uploadsDir() {
  return path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
}

function safeJoin(p: string) {
  const full = path.resolve(uploadsDir(), p);
  if (!full.startsWith(uploadsDir() + path.sep)) {
    throw new Error(`Invalid storage path: ${p}`);
  }
  return full;
}

export const localAdapter: StorageAdapter = {
  async upload(p, data) {
    const full = safeJoin(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },

  async getSignedUrl(p) {
    safeJoin(p);
    return `/api/media/${p}`;
  },

  async delete(p) {
    await fs.rm(safeJoin(p), { force: true });
  },

  async createUploadUrl(p, contentType) {
    safeJoin(p);
    return {
      url: `/api/media-upload/${p}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
    };
  },

  async stat(p) {
    try {
      const s = await fs.stat(safeJoin(p));
      return { size: s.size };
    } catch {
      return null;
    }
  },
};
