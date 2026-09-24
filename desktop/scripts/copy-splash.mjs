#!/usr/bin/env node
/**
 * Ensures splash assets are present for Electron packaging.
 * (Kept as a no-op-ish step so build.bat / CI scripts stay stable.)
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const required = ["index.html", "splash.js", "electron/main.mjs", "electron/preload.cjs"];

for (const rel of required) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    throw new Error(`Missing desktop asset: ${rel}`);
  }
}

// Optional dist/ mirror for local splash preview (serve-splash.mjs)
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "splash.js"), join(dist, "splash.js"));
writeFileSync(join(dist, ".gitkeep"), "");
console.log("[desktop] Splash assets verified; mirrored to dist/");
