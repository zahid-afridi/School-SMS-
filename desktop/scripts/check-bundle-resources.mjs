#!/usr/bin/env node
/** Fail fast if prepare:bundle has not produced installer resources. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const resources = join(dirname(fileURLToPath(import.meta.url)), "..", "resources");
const required = [
  "app-payload.zip",
  "node-runtime.zip",
  "bundle-manifest.json",
  "vc_redist.x64.exe",
];

for (const name of required) {
  const p = join(resources, name);
  if (!existsSync(p) || statSync(p).size < 1000) {
    console.error(
      `[check-bundle] Missing or tiny resource: ${name}\n` +
        `Run: npm run prepare:bundle  (or desktop\\build.bat)`
    );
    process.exit(1);
  }
}

const manifest = JSON.parse(
  readFileSync(join(resources, "bundle-manifest.json"), "utf8")
);
if (manifest.placeholder === true) {
  console.error("[check-bundle] bundle-manifest.json is still a placeholder");
  process.exit(1);
}

console.log("[check-bundle] Installer resources OK");
