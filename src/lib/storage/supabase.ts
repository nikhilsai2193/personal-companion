import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter } from "./types";

const BUCKET = process.env.SUPABASE_BUCKET ?? "media";

let client: SupabaseClient | undefined;

function supabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        "STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY"
      );
    }
    client = createClient(url, key);
  }
  return client;
}

export const supabaseAdapter: StorageAdapter = {
  async upload(p, data, contentType) {
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(p, data, { contentType, upsert: true });
    if (error) throw error;
  },

  async getSignedUrl(p, opts) {
    const { data, error } = await supabase()
      .storage.from(BUCKET)
      .createSignedUrl(p, 3600, opts?.download ? { download: opts.download } : undefined);
    if (error) throw error;
    return data.signedUrl;
  },

  async delete(p) {
    const { error } = await supabase().storage.from(BUCKET).remove([p]);
    if (error) throw error;
  },

  async createUploadUrl(p, contentType) {
    const { data, error } = await supabase()
      .storage.from(BUCKET)
      .createSignedUploadUrl(p, { upsert: true });
    if (error) throw error;
    return {
      url: data.signedUrl,
      method: "PUT",
      headers: { "Content-Type": contentType, "x-upsert": "true" },
    };
  },

  async stat(p) {
    const dir = p.split("/").slice(0, -1).join("/");
    const name = p.split("/").pop()!;
    const { data, error } = await supabase()
      .storage.from(BUCKET)
      .list(dir, { limit: 100, search: name });
    if (error) return null;
    const f = data?.find((f) => f.name === name);
    if (!f) return null;
    const meta = f.metadata as { size?: number } | null;
    return { size: meta?.size ?? 0 };
  },
};
