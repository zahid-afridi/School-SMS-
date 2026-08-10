#!/usr/bin/env node
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "main.js"), join(dist, "main.js"));
writeFileSync(join(dist, ".gitkeep"), "");
console.log("[desktop] Splash copied to dist/");
