import type { StorageAdapter } from "./types";
import { localAdapter } from "./local";
import { supabaseAdapter } from "./supabase";

export type { StorageAdapter };

export const storage: StorageAdapter =
  process.env.STORAGE_DRIVER === "supabase" ? supabaseAdapter : localAdapter;
