#!/usr/bin/env node
/**
 * Builds a self-contained Windows install payload with PRODUCTION BUILDS ONLY.
 *
 * Layout inside app-payload.zip (extracted next to the .exe):
 *   app/
 *     backend/     compiled dist/ + production node_modules + prisma schemas
 *     frontend/    Next.js standalone server (no source)
 *     openwa/      dist/ + production node_modules (no TypeScript source)
 *     launch-services.mjs
 *     stop-services.mjs
 *
 * Does NOT ship: src/, .ts sources, full monorepo, .env, local DBs, sessions.
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

const NODE_VERSION = process.env.SCHOOL_SMS_BUNDLE_NODE || "22.19.0";
const NODE_ZIP_NAME = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP_NAME}`;

const APP_VERSION = JSON.parse(
  readFileSync(join(DESKTOP_DIR, "package.json"), "utf8")
).version;

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function log(msg) {
  console.log(`[prepare-bundle] ${msg}`);
}

function ensureEmptyDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function copyFiltered(src, dest, shouldSkip) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const rel = name;
    if (shouldSkip?.(rel, from)) continue;
    const st = statSync(from);
    const to = join(dest, name);
    if (st.isDirectory()) {
      copyFiltered(from, to, (childRel, childFrom) =>
        shouldSkip?.(`${rel}/${childRel}`, childFrom)
      );
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
    join(REPO_ROOT, "backend", "dist", "index.js"),
    join(REPO_ROOT, "frontend", ".next", "standalone"),
    join(REPO_ROOT, "OpenWA", "dist", "main.js"),
  ];
  for (const p of checks) {
    if (!existsSync(p)) {
      throw new Error(
        `Missing production build: ${p}\n` +
          `Run build.bat (backend build + frontend standalone + OpenWA build) first.`
      );
    }
  }
}

function findStandaloneRoot() {
  const base = join(REPO_ROOT, "frontend", ".next", "standalone");
  if (existsSync(join(base, "server.js"))) return base;
  // Monorepo-style nest: standalone/frontend/server.js
  const nested = join(base, "frontend");
  if (existsSync(join(nested, "server.js"))) return nested;
  // Walk one level for server.js
  for (const name of readdirSync(base)) {
    const cand = join(base, name);
    if (existsSync(join(cand, "server.js"))) return cand;
  }
  throw new Error(
    `Next standalone server.js not found under ${base}. Ensure next.config has output: "standalone".`
  );
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
  copyFiltered(extracted, runtimeOut);

  const outZip = join(RESOURCES_DIR, "node-runtime.zip");
  zipFolder(runtimeOut, outZip);
  log(`Wrote ${outZip}`);
  return outZip;
}

function installProdDeps(cwd, extraPkgs = [], opts = {}) {
  const ignoreScripts = opts.ignoreScripts === true;
  const scriptArgs = ignoreScripts ? ["--ignore-scripts"] : [];
  const hasLock = existsSync(join(cwd, "package-lock.json"));
  if (hasLock) {
    log(`npm ci --omit=dev${ignoreScripts ? " --ignore-scripts" : ""} in ${cwd}`);
    run(npmCmd, ["ci", "--omit=dev", "--no-audit", "--no-fund", ...scriptArgs], {
      cwd,
    });
  } else {
    log(`npm install --omit=dev${ignoreScripts ? " --ignore-scripts" : ""} in ${cwd}`);
    run(
      npmCmd,
      ["install", "--omit=dev", "--no-audit", "--no-fund", ...scriptArgs],
      { cwd }
    );
  }
  if (extraPkgs.length) {
    log(`Adding runtime tools: ${extraPkgs.join(", ")}`);
    run(
      npmCmd,
      [
        "install",
        ...extraPkgs,
        "--no-audit",
        "--no-fund",
        "--no-save",
        ...scriptArgs,
      ],
      { cwd }
    );
  }
}

function stageBackend(appStage) {
  const dest = join(appStage, "backend");
  ensureEmptyDir(dest);
  const src = join(REPO_ROOT, "backend");

  log("Staging backend production build (dist only, no src/)...");
  cpSync(join(src, "dist"), join(dest, "dist"), { recursive: true });
  cpSync(join(src, "prisma"), join(dest, "prisma"), { recursive: true });
  cpSync(join(src, "package.json"), join(dest, "package.json"));
  if (existsSync(join(src, "package-lock.json"))) {
    cpSync(join(src, "package-lock.json"), join(dest, "package-lock.json"));
  }
  if (existsSync(join(src, "prisma.config.ts"))) {
    cpSync(join(src, "prisma.config.ts"), join(dest, "prisma.config.ts"));
  }

  // Production deps + prisma CLI (needed for first-run db push on school PCs)
  // ignore-scripts avoids any unexpected prepare hooks; we generate Prisma explicitly next.
  installProdDeps(dest, ["prisma@7.8.0"], { ignoreScripts: true });
  run(npmCmd, ["exec", "--", "prisma", "generate", "--schema=prisma/schema.sqlite.prisma"], {
    cwd: dest,
  });

  // Prisma outputs to src/generated; compiled dist imports ../generated from dist/*
  const genSrc = join(dest, "src", "generated");
  const genDist = join(dest, "dist", "generated");
  if (existsSync(genSrc)) {
    mkdirSync(dirname(genDist), { recursive: true });
    cpSync(genSrc, genDist, { recursive: true });
    log("Copied Prisma client → dist/generated/");
  } else {
    throw new Error("Prisma generate did not create src/generated — backend stage incomplete");
  }

  // Strip source / junk (keep dist + prisma + node_modules only)
  for (const junk of ["README.md", "src", "tsconfig.json"]) {
    const p = join(dest, junk);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
}

function stageFrontend(appStage) {
  const dest = join(appStage, "frontend");
  ensureEmptyDir(dest);
  const standalone = findStandaloneRoot();
  const frontendRoot = join(REPO_ROOT, "frontend");

  log(`Staging frontend standalone from ${standalone}...`);
  cpSync(standalone, dest, { recursive: true });

  // static assets required by Next standalone
  const staticSrc = join(frontendRoot, ".next", "static");
  const staticDest = join(dest, ".next", "static");
  if (existsSync(staticSrc)) {
    mkdirSync(join(dest, ".next"), { recursive: true });
    cpSync(staticSrc, staticDest, { recursive: true });
  }

  const publicSrc = join(frontendRoot, "public");
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, join(dest, "public"), { recursive: true });
  }

  if (!existsSync(join(dest, "server.js"))) {
    throw new Error("Frontend stage missing server.js after standalone copy");
  }
}

function stageOpenWa(appStage) {
  const dest = join(appStage, "openwa");
  ensureEmptyDir(dest);
  const src = join(REPO_ROOT, "OpenWA");

  if (!existsSync(join(src, "dist", "main.js"))) {
    throw new Error("OpenWA dist/main.js missing — run OpenWA build first");
  }
  if (!existsSync(join(src, "node_modules"))) {
    throw new Error(
      "OpenWA node_modules missing — run npm ci in OpenWA first (CI installs it before prepare:bundle)"
    );
  }

  log("Staging OpenWA production build (dist + already-installed node_modules)...");
  log("Skipping npm ci/postinstall here — that script fails in the slim stage and is already done.");

  cpSync(join(src, "dist"), join(dest, "dist"), { recursive: true });

  // Strip lifecycle hooks so nothing re-runs postinstall on school PCs
  const pkg = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  if (pkg.scripts && typeof pkg.scripts === "object") {
    delete pkg.scripts.postinstall;
    delete pkg.scripts.prepare;
    delete pkg.scripts.prepublishOnly;
  }
  writeFileSync(join(dest, "package.json"), JSON.stringify(pkg, null, 2));

  if (existsSync(join(src, "package-lock.json"))) {
    cpSync(join(src, "package-lock.json"), join(dest, "package-lock.json"));
  }

  log("Copying OpenWA/node_modules (includes postinstall patches from earlier CI step)...");
  cpSync(join(src, "node_modules"), join(dest, "node_modules"), { recursive: true });

  mkdirSync(join(dest, "data", "sessions"), { recursive: true });
  writeFileSync(join(dest, "data", "sessions", ".gitkeep"), "");

  // Never ship source / dashboard / patch scripts
  for (const junk of ["src", "dashboard", "test", "docs", ".git", "scripts"]) {
    const p = join(dest, junk);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }

  if (!existsSync(join(dest, "dist", "main.js"))) {
    throw new Error("OpenWA stage missing dist/main.js");
  }
  if (!existsSync(join(dest, "node_modules"))) {
    throw new Error("OpenWA stage missing node_modules");
  }
}

function stageLauncherScripts(appStage) {
  for (const name of ["launch-services.mjs", "stop-services.mjs"]) {
    cpSync(join(DESKTOP_DIR, "scripts", name), join(appStage, name));
  }
}

function prepareAppPayload() {
  const appStage = join(STAGE_DIR, "payload");
  ensureEmptyDir(appStage);
  const appDir = join(appStage, "app");
  mkdirSync(appDir, { recursive: true });

  stageBackend(appDir);
  stageFrontend(appDir);
  stageOpenWa(appDir);
  stageLauncherScripts(appDir);

  writeFileSync(
    join(appStage, ".schoolsms-bundle.json"),
    JSON.stringify(
      {
        version: APP_VERSION,
        kind: "production-builds-only",
        bundledAt: new Date().toISOString(),
        nodeVersion: NODE_VERSION,
        layout: {
          app: "app/ (backend dist, frontend standalone, openwa dist)",
          data: "data/",
          runtime: "runtime/",
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
  log(`Preparing SchoolSMS v${APP_VERSION} PRODUCTION-ONLY Windows payload...`);
  log(`Portable Node: ${NODE_VERSION}`);
  requireBuiltArtifacts();
  mkdirSync(RESOURCES_DIR, { recursive: true });
  ensureEmptyDir(STAGE_DIR);

  const nodeZip = await prepareNodeRuntime();
  const appZip = prepareAppPayload();
  const vcRedist = await prepareVcRedist();

  // Refuse to ship incomplete installers (empty/placeholder resources break school PCs).
  for (const [label, path] of [
    ["node-runtime.zip", nodeZip],
    ["app-payload.zip", appZip],
    ["vc_redist.x64.exe", vcRedist],
  ]) {
    if (!existsSync(path) || statSync(path).size < 100_000) {
      throw new Error(`Bundle resource too small or missing: ${label} (${path})`);
    }
  }

  const manifest = {
    version: APP_VERSION,
    kind: "production-builds-only",
    placeholder: false,
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
      app: "app/backend, app/frontend, app/openwa (builds only — no source)",
      data: "data/ (school.db, uploads, logs)",
      runtime: "runtime/node.exe",
    },
  };
  writeFileSync(
    join(RESOURCES_DIR, "bundle-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  log("Done. Installer will ship compiled builds under app/, not the Git source tree.");
}

main().catch((err) => {
  console.error("[prepare-bundle] FAILED:", err);
  process.exit(1);
});
