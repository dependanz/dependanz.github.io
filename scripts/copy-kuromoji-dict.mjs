// Copies the kuromoji IPADIC dictionary from node_modules into public/kuromoji-dict so the
// /hippocampus card editor can generate Japanese readings fully offline. The dictionary is ~18 MB
// of .dat.gz files, so it is NOT committed to git — it is regenerated here on `npm ci`/`npm install`
// (postinstall) and before local dev/build. Idempotent: skips if the dictionary is already present.

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "kuromoji", "dict");
const dst = join(root, "public", "kuromoji-dict");

if (!existsSync(src)) {
  console.warn("[kuromoji-dict] node_modules/kuromoji/dict not found; skipping (is kuromoji installed?)");
  process.exit(0);
}

const files = readdirSync(src).filter((f) => f.endsWith(".dat.gz"));
const have = existsSync(dst) ? readdirSync(dst).filter((f) => f.endsWith(".dat.gz")).length : 0;
if (have >= files.length && files.length > 0) {
  console.log("[kuromoji-dict] already present, skipping");
  process.exit(0);
}

mkdirSync(dst, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(dst, f));
console.log(`[kuromoji-dict] copied ${files.length} dictionary files to public/kuromoji-dict`);
