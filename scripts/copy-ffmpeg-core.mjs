import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@ffmpeg/core/dist/umd");
const dest = join(root, "public/ffmpeg");

mkdirSync(dest, { recursive: true });
for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  copyFileSync(join(src, f), join(dest, f));
}
console.log("ffmpeg core copied to public/ffmpeg");
