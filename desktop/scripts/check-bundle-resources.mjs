#!/usr/bin/env node
/** Fail fast if prepare:bundle has not produced installer resources. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const resources = join(dirname(fileURLToPath(import.meta.url)), "..", "resources");

/** Large binary payloads */
const largeRequired = [
  { name: "app-payload.zip", minBytes: 100_000 },
  { name: "node-runtime.zip", minBytes: 100_000 },
  { name: "vc_redist.x64.exe", minBytes: 1_000_000 },
];

for (const { name, minBytes } of largeRequired) {
  const p = join(resources, name);
  if (!existsSync(p) || statSync(p).size < minBytes) {
    console.error(
      `[check-bundle] Missing or tiny resource: ${name}\n` +
        `Run: npm run prepare:bundle  (or desktop\\build.bat)`
    );
    process.exit(1);
  }
  console.log(`[check-bundle] OK ${name} (${statSync(p).size} bytes)`);
}

const manifestPath = join(resources, "bundle-manifest.json");
if (!existsSync(manifestPath)) {
  console.error(
    "[check-bundle] Missing bundle-manifest.json\n" +
      "Run: npm run prepare:bundle  (or desktop\\build.bat)"
  );
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (err) {
  console.error("[check-bundle] bundle-manifest.json is not valid JSON:", err);
  process.exit(1);
}

if (manifest.placeholder === true) {
  console.error("[check-bundle] bundle-manifest.json is still a placeholder");
  process.exit(1);
}

if (!manifest.appSha256 || !manifest.nodeSha256) {
  console.error(
    "[check-bundle] bundle-manifest.json missing appSha256/nodeSha256 — re-run prepare:bundle"
  );
  process.exit(1);
}

console.log(
  `[check-bundle] OK bundle-manifest.json v${manifest.version || "?"} (${statSync(manifestPath).size} bytes)`
);
console.log("[check-bundle] Installer resources OK");
