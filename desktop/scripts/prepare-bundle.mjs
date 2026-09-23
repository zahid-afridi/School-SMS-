#!/usr/bin/env node
/**
 * Builds a self-contained install payload for SchoolSMS:
 *   - Portable Node.js runtime zip
 *   - App zip (backend + frontend + OpenWA + desktop scripts)
 *
 * Output (consumed by Tauri bundle.resources):
 *   src-tauri/resources/node-runtime.zip
 *   src-tauri/resources/app-payload.zip
 *
 * After install, the desktop shell extracts these next to the .exe so the
 * target PC does not need Node.js or a manual appRoot path.
 */
import { createWriteStream, existsSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
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

const SKIP = new Set([
  "node_modules/.cache",
  ".git",
  ".next/cache",
  "src-tauri/target",
  "desktop-data",
  ".bundle-stage",
]);

function log(msg) {
  console.log(`[prepare-bundle] ${msg}`);
}

function shouldSkip(rel) {
  const n = rel.replace(/\\/g, "/");
  if (n.includes("/.git/") || n.startsWith(".git/")) return true;
  if (n.includes("/src-tauri/target/") || n.includes("src-tauri/target/")) return true;
  if (n.includes("/.next/cache/")) return true;
  if (n.includes("/desktop-data/")) return true;
  if (n.includes("/.bundle-stage/")) return true;
  for (const s of SKIP) {
    if (n === s || n.startsWith(s + "/")) return true;
  }
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
        bundledAt: new Date().toISOString(),
        nodeVersion: NODE_VERSION,
        repo: "School (SmS)",
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
  log("Preparing self-contained Windows install payload...");
  requireBuiltArtifacts();
  mkdirSync(RESOURCES_DIR, { recursive: true });
  ensureEmptyDir(STAGE_DIR);

  const nodeZip = await prepareNodeRuntime();
  const appZip = prepareAppPayload();
  const vcRedist = await prepareVcRedist();

  const manifest = {
    nodeVersion: NODE_VERSION,
    nodeRuntimeZip: "node-runtime.zip",
    appPayloadZip: "app-payload.zip",
    vcRedist: "vc_redist.x64.exe",
    nodeSha256: sha256File(nodeZip),
    appSha256: sha256File(appZip),
    vcRedistSha256: sha256File(vcRedist),
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(RESOURCES_DIR, "bundle-manifest.json"), JSON.stringify(manifest, null, 2));
  log("Done. Resources ready for Tauri NSIS bundle.");
  log("Install PC will not need a system Node.js install.");
  log("Installer will also install VC++ Redistributable for CRT DLLs.");
}

main().catch((err) => {
  console.error("[prepare-bundle] FAILED:", err);
  process.exit(1);
});
