#!/usr/bin/env node
/**
 * Builds a self-contained Windows install payload for SchoolSMS:
 *   - Portable Node.js runtime zip
 *   - App zip (backend + frontend + OpenWA + desktop scripts)
 *
 * Output (consumed by Tauri bundle.resources):
 *   src-tauri/resources/node-runtime.zip
 *   src-tauri/resources/app-payload.zip
 *   src-tauri/resources/bundle-manifest.json
 *   src-tauri/resources/vc_redist.x64.exe
 *
 * After install, the desktop shell extracts these next to the .exe so the
 * target PC does not need Node.js or a manual appRoot path.
 *
 * Never ships .env / local DB / WhatsApp session data.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(DESKTOP_DIR, "..");
const RESOURCES_DIR = join(DESKTOP_DIR, "src-tauri", "resources");
const STAGE_DIR = join(DESKTOP_DIR, ".bundle-stage");

const NODE_VERSION = process.env.SCHOOL_SMS_BUNDLE_NODE || "20.18.1";
const NODE_ZIP_NAME = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP_NAME}`;

const APP_VERSION = JSON.parse(
  readFileSync(join(DESKTOP_DIR, "package.json"), "utf8")
).version;

function log(msg) {
  console.log(`[prepare-bundle] ${msg}`);
}

/** Paths that must never enter the school installer. */
function shouldSkip(rel) {
  const n = rel.replace(/\\/g, "/");
  const lower = n.toLowerCase();
  const base = n.split("/").pop() || n;

  // Secrets — never ship build-machine credentials
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base === "credentials.json" || base === "service-account.json") return true;

  // User / runtime data — must stay only on the install PC
  if (
    n === "OpenWA/data" ||
    n.startsWith("OpenWA/data/") ||
    n.includes("/OpenWA/data/")
  ) {
    return true;
  }
  if (
    n === "desktop-data" ||
    n.startsWith("desktop-data/") ||
    n.includes("/desktop-data/")
  ) {
    return true;
  }
  if (
    lower.endsWith(".db") ||
    lower.endsWith(".db-journal") ||
    lower.endsWith(".db-wal") ||
    lower.endsWith(".db-shm")
  ) {
    return true;
  }

  // VCS / build caches / logs
  if (n === ".git" || n.startsWith(".git/") || n.includes("/.git/")) return true;
  if (n.includes("/src-tauri/target/") || n.startsWith("src-tauri/target/")) {
    return true;
  }
  if (n.includes("/.next/cache/") || n.includes("node_modules/.cache/")) {
    return true;
  }
  if (
    n === ".bundle-stage" ||
    n.startsWith(".bundle-stage/") ||
    n.includes("/.bundle-stage/")
  ) {
    return true;
  }
  if (lower.endsWith(".log") || base === "npm-debug.log") return true;
  if (base === ".DS_Store" || base === "Thumbs.db") return true;
  if (n.includes("/coverage/") || n.includes("/.nyc_output/")) return true;
  if (n.includes("/.turbo/")) return true;

  return false;
}

function ensureEmptyDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function copyFiltered(src, dest, relBase = "") {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (shouldSkip(rel)) continue;
    const st = statSync(from);
    const to = join(dest, name);
    if (st.isDirectory()) {
      copyFiltered(from, to, rel);
    } else {
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    }
  }
}

async function download(url, dest) {
  log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`Command failed (${r.status}): ${cmd} ${args.join(" ")}`);
  }
}

function zipFolderWindows(folder, zipPath) {
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  // tar.exe (Windows 10+) handles large node_modules better than Compress-Archive
  const tar = spawnSync(
    "tar",
    ["-a", "-c", "-f", zipPath, "-C", folder, "."],
    { stdio: "inherit", windowsHide: true }
  );
  if (tar.status === 0 && existsSync(zipPath)) return;

  log("tar zip failed; falling back to PowerShell Compress-Archive...");
  const ps = [
    "Compress-Archive",
    "-Path",
    `"${folder}\\*"`,
    "-DestinationPath",
    `"${zipPath}"`,
    "-CompressionLevel",
    "Optimal",
  ].join(" ");
  run("powershell", ["-NoProfile", "-Command", ps]);
}

function zipFolderUnix(folder, zipPath) {
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  run("bash", ["-lc", `cd "${folder}" && zip -r -q "${zipPath}" .`]);
}

function zipFolder(folder, zipPath) {
  mkdirSync(dirname(zipPath), { recursive: true });
  if (process.platform === "win32") zipFolderWindows(folder, zipPath);
  else zipFolderUnix(folder, zipPath);
}

function sha256File(path) {
  const h = createHash("sha256");
  h.update(readFileSync(path));
  return h.digest("hex");
}

function requireBuiltArtifacts() {
  const checks = [
    join(REPO_ROOT, "frontend", ".next"),
    join(REPO_ROOT, "OpenWA", "dist", "main.js"),
    join(REPO_ROOT, "backend", "node_modules"),
    join(REPO_ROOT, "frontend", "node_modules"),
    join(REPO_ROOT, "OpenWA", "node_modules"),
  ];
  for (const p of checks) {
    if (!existsSync(p)) {
      throw new Error(
        `Missing build artifact: ${p}\nRun build.bat (or prepare frontend/OpenWA/backend) before prepare-bundle.`
      );
    }
  }
}

async function prepareNodeRuntime() {
  const cacheDir = join(STAGE_DIR, "cache");
  mkdirSync(cacheDir, { recursive: true });
  const cachedZip = join(cacheDir, NODE_ZIP_NAME);
  if (!existsSync(cachedZip)) {
    await download(NODE_URL, cachedZip);
  } else {
    log(`Using cached ${NODE_ZIP_NAME}`);
  }

  const nodeStage = join(STAGE_DIR, "node-extract");
  ensureEmptyDir(nodeStage);

  if (process.platform === "win32") {
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path "${cachedZip}" -DestinationPath "${nodeStage}" -Force`,
    ]);
  } else {
    // Cross-build on Linux/macOS CI helpers: unzip Windows portable Node zip
    run("unzip", ["-q", "-o", cachedZip, "-d", nodeStage]);
  }

  const extracted = join(nodeStage, `node-v${NODE_VERSION}-win-x64`);
  if (!existsSync(join(extracted, "node.exe"))) {
    throw new Error(`Portable Node extract missing node.exe under ${extracted}`);
  }

  const runtimeOut = join(STAGE_DIR, "runtime-flat");
  ensureEmptyDir(runtimeOut);
  // Flatten so extract target is exe_dir/runtime/node.exe
  copyFiltered(extracted, runtimeOut);

  const outZip = join(RESOURCES_DIR, "node-runtime.zip");
  zipFolder(runtimeOut, outZip);
  log(`Wrote ${outZip}`);
  return outZip;
}

function prepareAppPayload() {
  const appStage = join(STAGE_DIR, "app");
  ensureEmptyDir(appStage);

  log("Staging backend...");
  copyFiltered(join(REPO_ROOT, "backend"), join(appStage, "backend"));

  log("Staging frontend...");
  copyFiltered(join(REPO_ROOT, "frontend"), join(appStage, "frontend"));

  log("Staging OpenWA...");
  copyFiltered(join(REPO_ROOT, "OpenWA"), join(appStage, "OpenWA"));
  // Ensure empty session dir exists at runtime (not shipped with sessions)
  mkdirSync(join(appStage, "OpenWA", "data", "sessions"), { recursive: true });
  writeFileSync(
    join(appStage, "OpenWA", "data", "sessions", ".gitkeep"),
    ""
  );

  log("Staging desktop scripts...");
  const scriptsDest = join(appStage, "desktop", "scripts");
  mkdirSync(scriptsDest, { recursive: true });
  for (const name of ["launch-services.mjs", "stop-services.mjs"]) {
    cpSync(join(DESKTOP_DIR, "scripts", name), join(scriptsDest, name));
  }

  // Marker so the shell knows this tree is an installed payload
  writeFileSync(
    join(appStage, ".schoolsms-bundle.json"),
    JSON.stringify(
      {
        version: APP_VERSION,
        bundledAt: new Date().toISOString(),
        nodeVersion: NODE_VERSION,
        repo: "School (SmS)",
        layout: {
          data: "data/",
          runtime: "runtime/",
          backup: "Copy the whole SchoolSMS folder (especially data/).",
        },
      },
      null,
      2
    )
  );

  const outZip = join(RESOURCES_DIR, "app-payload.zip");
  zipFolder(appStage, outZip);
  log(`Wrote ${outZip}`);
  return outZip;
}

async function prepareVcRedist() {
  const url = "https://aka.ms/vs/17/release/vc_redist.x64.exe";
  const dest = join(RESOURCES_DIR, "vc_redist.x64.exe");
  if (existsSync(dest) && statSync(dest).size > 1_000_000) {
    log(`Using existing ${dest}`);
    return dest;
  }
  await download(url, dest);
  if (!existsSync(dest) || statSync(dest).size < 1_000_000) {
    throw new Error("Failed to download vc_redist.x64.exe (file too small or missing)");
  }
  log(`Wrote ${dest} (${statSync(dest).size} bytes)`);
  return dest;
}

async function main() {
  log(`Preparing SchoolSMS v${APP_VERSION} Windows install payload...`);
  log(`Portable Node target: ${NODE_VERSION} (match CI / build machine Node major)`);
  requireBuiltArtifacts();
  mkdirSync(RESOURCES_DIR, { recursive: true });
  ensureEmptyDir(STAGE_DIR);

  const nodeZip = await prepareNodeRuntime();
  const appZip = prepareAppPayload();
  const vcRedist = await prepareVcRedist();

  const manifest = {
    version: APP_VERSION,
    nodeVersion: NODE_VERSION,
    nodeRuntimeZip: "node-runtime.zip",
    appPayloadZip: "app-payload.zip",
    vcRedist: "vc_redist.x64.exe",
    nodeSha256: sha256File(nodeZip),
    appSha256: sha256File(appZip),
    vcRedistSha256: sha256File(vcRedist),
    createdAt: new Date().toISOString(),
    installLayout: {
      exe: "school-sms-desktop.exe",
      config: "schoolsms.config.json",
      data: "data/  (school.db, uploads, logs — BACKUP THIS)",
      runtime: "runtime/  (portable Node, auto-unpacked)",
      app: "backend/, frontend/, OpenWA/, desktop/scripts/",
      resources: "resources/  (payload zips)",
    },
  };
  writeFileSync(
    join(RESOURCES_DIR, "bundle-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  log("Done. Resources ready for Tauri NSIS bundle.");
  log("Secrets (.env) and local DBs are excluded from the payload.");
  log("Install PC will not need a system Node.js install.");
}

main().catch((err) => {
  console.error("[prepare-bundle] FAILED:", err);
  process.exit(1);
});
