#!/usr/bin/env node
/**
 * Starts OpenWA + backend + frontend for the School SMS desktop shell.
 *
 * Start order:
 *   1. OpenWA  (port 2785) - WhatsApp gateway
 *   2. Backend (port 5000) - Express API
 *   3. Frontend(port 3000) - Next.js UI
 *
 * Data directory: SCHOOL_SMS_DATA_DIR env var, or <repo-root>/desktop-data
 */
import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BACKEND_DIR = join(REPO_ROOT, "backend");
const FRONTEND_DIR = join(REPO_ROOT, "frontend");
const OPENWA_DIR = join(REPO_ROOT, "OpenWA");

const modeArg = process.argv.find((a) => a.startsWith("--mode="));
const MODE = modeArg?.split("=")[1] === "prod" ? "prod" : "dev";

// ── Data directory ────────────────────────────────────────────────────────────

function resolveDataDir() {
  const fromEnv = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (fromEnv) return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  return join(REPO_ROOT, "desktop-data");
}

const DATA_DIR = resolveDataDir();
const LOG_DIR  = join(DATA_DIR, "logs");
const PID_FILE = join(DATA_DIR, "desktop.pids.json");
const DB_FILE  = join(DATA_DIR, "school.db");
const UPLOAD_DIR = join(DATA_DIR, "uploads");

// ── Ports / URLs ──────────────────────────────────────────────────────────────

const BACKEND_PORT = process.env.SCHOOL_SMS_BACKEND_PORT || "5000";
const FRONTEND_PORT = process.env.SCHOOL_SMS_FRONTEND_PORT || "3000";
const OPENWA_PORT = process.env.SCHOOL_SMS_OPENWA_PORT || "2785";
const BACKEND_URL  = "http://127.0.0.1:" + BACKEND_PORT;
const FRONTEND_URL = "http://127.0.0.1:" + FRONTEND_PORT;
const OPENWA_URL   = "http://127.0.0.1:" + OPENWA_PORT;

// ── Helpers ───────────────────────────────────────────────────────────────────

function npmCmd() { return process.platform === "win32" ? "npm.cmd" : "npm"; }
function npxCmd() { return process.platform === "win32" ? "npx.cmd" : "npx"; }

function ensureDirs() {
  for (const d of [DATA_DIR, LOG_DIR, UPLOAD_DIR]) mkdirSync(d, { recursive: true });
}

/** sqlite URL for better-sqlite3 at runtime (spaces allowed). */
function sqliteRuntime(p) { return "file:" + p.replace(/\\/g, "/"); }

/** sqlite URL for Prisma CLI (spaces must be percent-encoded). */
function sqlitePrismaCli(p) { return "file:" + encodeURI(p.replace(/\\/g, "/")); }

/** Normalize a path for loose comparison (decode %20, unify slashes, lowercase). */
function normPath(p) {
  let s = String(p ?? "");
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  return s.replace(/^file:/i, "").replace(/\\/g, "/").toLowerCase();
}

function readJwtSecret() {
  if (process.env.JWT_SECRET?.trim()) return process.env.JWT_SECRET.trim();
  const envPath = join(BACKEND_DIR, ".env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^JWT_SECRET=(.+)$/m);
    if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "school-sms-desktop-dev-secret-change-me";
}

/** Read the live OpenWA API key written by OpenWA on startup. */
function readOpenWaApiKey() {
  const keyFile = join(OPENWA_DIR, "data", ".api-key");
  if (existsSync(keyFile)) return readFileSync(keyFile, "utf8").trim();
  return "";
}

/**
 * Spawn a process and pipe its stdout/stderr to a log file.
 * shell defaults to true on Windows for npm/npx commands, but MUST be false
 * when the command path contains spaces (e.g. node.exe in "C:\Program Files").
 * CMD splits on spaces and fails with "'C:\Program' is not recognized".
 */
function spawnLogged(name, command, args, cwd, env, opts) {
  const useShell = (opts && opts.shell !== undefined)
    ? opts.shell
    : process.platform === "win32";
  const logPath = join(LOG_DIR, name + ".log");
  const out = createWriteStream(logPath, { flags: "a" });
  out.write("\n===== " + new Date().toISOString() + " start " + name + " =====\n");

  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: useShell,
  });

  child.stdout?.pipe(out, { end: false });
  child.stderr?.pipe(out, { end: false });
  child.on("close", (code, signal) => {
    try { out.write("===== exit code=" + code + " signal=" + signal + " =====\n"); }
    finally { out.end(); }
  });

  return child;
}

/** Poll a URL until it responds (status < 500 counts as ready). */
async function waitForUrl(url, label, attempts, intervalMs) {
  attempts = attempts ?? 120;
  intervalMs = intervalMs ?? 1000;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) {
        console.log("[desktop] " + label + " ready (" + url + ")");
        return true;
      }
    } catch { /* retry */ }
    await delay(intervalMs);
  }
  throw new Error(label + " did not become ready: " + url);
}

/** Check that the backend is serving the data dir we expect (not a stale one). */
async function backendMatchesDataDir() {
  try {
    const res = await fetch(BACKEND_URL + "/health", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const json = await res.json();
    const conn = normPath(json?.data?.connection ?? "");
    return conn.includes(normPath(DB_FILE)) || conn.includes(normPath(DATA_DIR));
  } catch { return false; }
}

/** Kill any process listening on the given port. */
function killPort(port) {
  if (process.platform === "win32") {
    const r = spawnSync("cmd", ["/c", "netstat -ano | findstr :" + port],
      { encoding: "utf8", windowsHide: true });
    const pids = new Set();
    for (const line of (r.stdout || "").split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid > 0) pids.add(pid);
    }
    for (const pid of pids) {
      console.log("[desktop] Stopping PID " + pid + " on port " + port);
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true });
    }
    return;
  }
  spawnSync("sh", ["-c", "lsof -ti:" + port + " | xargs -r kill -9"], { stdio: "ignore" });
}

async function stopAllPorts() {
  console.log("[desktop] Freeing ports " + BACKEND_PORT + " / " + FRONTEND_PORT + " / " + OPENWA_PORT + "...");
  killPort(BACKEND_PORT);
  killPort(FRONTEND_PORT);
  killPort(OPENWA_PORT);
  await delay(1000);
}

/** Push the Prisma schema to the SQLite database (creates tables if missing). */
async function ensureSqliteSchema(env) {
  console.log("[desktop] Ensuring SQLite schema...");
  await new Promise((ok, fail) => {
    const prismaJs = join(BACKEND_DIR, "node_modules", "prisma", "build", "index.js");
    const child = existsSync(prismaJs)
      ? spawn(
          process.execPath,
          [prismaJs, "db", "push", "--schema=prisma/schema.sqlite.prisma", "--url", env.PRISMA_SQLITE_URL],
          { cwd: BACKEND_DIR, env, stdio: "inherit", shell: false, windowsHide: true }
        )
      : spawn(
          npxCmd(),
          ["prisma", "db", "push", "--schema=prisma/schema.sqlite.prisma", "--url", env.PRISMA_SQLITE_URL],
          { cwd: BACKEND_DIR, env, stdio: "inherit",
            shell: process.platform === "win32", windowsHide: true }
        );
    child.on("exit", (code) => (code === 0 ? ok() : fail(new Error("prisma db push failed: " + code))));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  const jwtSecret = readJwtSecret();

  // Prefer the Node binary that launched this script (bundled runtime on install PCs).
  const nodeBin = process.execPath;
  const nodeDir = dirname(nodeBin);
  const pathSep = process.platform === "win32" ? ";" : ":";
  const pathWithNode = nodeDir + pathSep + (process.env.PATH || "");

  // Environment shared by backend and frontend
  const commonEnv = {
    ...process.env,
    PATH: pathWithNode,
    MODE: "offline",
    NODE_ENV: MODE === "prod" ? "production" : "development",
    PORT: BACKEND_PORT,
    SQLITE_DATABASE_URL: sqliteRuntime(DB_FILE),
    PRISMA_SQLITE_URL: sqlitePrismaCli(DB_FILE),
    UPLOAD_DIR,
    PUBLIC_UPLOAD_BASE_URL: BACKEND_URL + "/uploads",
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
    SCHOOL_SMS_DATA_DIR: DATA_DIR,
    NEXT_PUBLIC_API_URL: BACKEND_URL + "/api",
    NEXT_PUBLIC_UPLOAD_BASE_URL: BACKEND_URL,
    NEXT_PUBLIC_BACKEND_PORT: BACKEND_PORT,
    OPENWA_URL,
  };

  // Write a human-readable summary of the current run config
  writeFileSync(
    join(DATA_DIR, "desktop.env.json"),
    JSON.stringify(
      { dataDir: DATA_DIR, dbFile: DB_FILE, uploadDir: UPLOAD_DIR,
        backendUrl: BACKEND_URL, frontendUrl: FRONTEND_URL,
        openwaUrl: OPENWA_URL, mode: MODE },
      null, 2
    )
  );

  await stopAllPorts();

  const children = [];
  const pids = { startedAt: new Date().toISOString(), mode: MODE, pids: [] };

  // ── 1. OpenWA ──────────────────────────────────────────────────────────────

  const openWaDist = join(OPENWA_DIR, "dist", "main.js");
  const hasBuild = existsSync(openWaDist);

  // Environment for OpenWA process — does NOT inherit backend DB settings
  const openwaEnv = {
    ...process.env,
    NODE_ENV: MODE === "prod" ? "production" : "development",
    PORT: OPENWA_PORT,
    SESSION_DATA_PATH: join(OPENWA_DIR, "data", "sessions"),
    DATABASE_TYPE: "sqlite",
    SERVE_DASHBOARD: "false",
    AUTO_START_SESSIONS: "false",
    PUPPETEER_HEADLESS: "true",
    PUPPETEER_ARGS: "--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu",
    PUPPETEER_EXECUTABLE_PATH:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  };

  const openwaEnvWithPath = { ...openwaEnv, PATH: pathWithNode };

  if (hasBuild) {
    console.log("[desktop] Starting OpenWA from dist/main.js...");
    // shell: false — node path may contain spaces ("C:\Program Files\...")
    const c = spawnLogged("openwa", nodeBin, [openWaDist], OPENWA_DIR, openwaEnvWithPath, { shell: false });
    children.push(c);
    if (c.pid) pids.pids.push({ name: "openwa", pid: c.pid });
  } else {
    console.log("[desktop] OpenWA dist not found -- starting in dev mode (slower first boot)...");
    const c = spawnLogged("openwa", npmCmd(), ["run", "start:dev"], OPENWA_DIR, openwaEnvWithPath, { shell: true });
    children.push(c);
    if (c.pid) pids.pids.push({ name: "openwa", pid: c.pid });
  }

  // OpenWA is ready when its API responds (even a 404 counts -- it's a JSON API)
  await waitForUrl(OPENWA_URL + "/api/health", "OpenWA", 120, 1000)
    .catch(() => waitForUrl(OPENWA_URL, "OpenWA", 60, 1000));

  // Inject the live API key that OpenWA just wrote to its data folder
  const apiKey = readOpenWaApiKey();
  if (apiKey) {
    commonEnv.OPENWA_API_KEY = apiKey;
    console.log("[desktop] OpenWA API key injected (" + apiKey.slice(0, 12) + "...)");
  } else {
    console.warn("[desktop] WARNING: OpenWA API key not found yet -- backend will read it from file");
  }

  // ── 2. Prisma schema push ──────────────────────────────────────────────────

  await ensureSqliteSchema(commonEnv);

  // ── 3. Backend ─────────────────────────────────────────────────────────────

  console.log("[desktop] Starting backend...");
  const tsxCli = join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  const backendChild = existsSync(tsxCli)
    ? spawnLogged("backend", nodeBin, [tsxCli, "src/index.ts"],
        BACKEND_DIR, commonEnv, { shell: false })
    : spawnLogged("backend", npxCmd(), ["tsx", "src/index.ts"],
        BACKEND_DIR, commonEnv, { shell: true });
  children.push(backendChild);
  if (backendChild.pid) pids.pids.push({ name: "backend", pid: backendChild.pid });
  await waitForUrl(BACKEND_URL + "/health", "backend");

  const dbOk = await backendMatchesDataDir();
  if (!dbOk) {
    throw new Error(
      "Backend started but is not using the expected DB: " + DB_FILE + "\n" +
      "Check: " + join(LOG_DIR, "backend.log")
    );
  }
  console.log("[desktop] DB      -> " + DB_FILE);
  console.log("[desktop] Uploads -> " + UPLOAD_DIR);

  // ── 4. Frontend ────────────────────────────────────────────────────────────

  console.log("[desktop] Starting frontend...");
  const hasFrontendBuild = MODE === "prod" && existsSync(join(FRONTEND_DIR, ".next"));
  const frontendChild = hasFrontendBuild
    ? spawnLogged("frontend", npmCmd(),
        ["run", "start", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
        FRONTEND_DIR, commonEnv, { shell: true })
    : spawnLogged("frontend", npmCmd(),
        ["run", "dev", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
        FRONTEND_DIR, commonEnv, { shell: true });
  children.push(frontendChild);
  if (frontendChild.pid) pids.pids.push({ name: "frontend", pid: frontendChild.pid });
  await waitForUrl(FRONTEND_URL, "frontend");

  // ── All ready ──────────────────────────────────────────────────────────────

  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));

  console.log("");
  console.log("[desktop] ============================================");
  console.log("[desktop]  All services ready");
  console.log("[desktop]  Frontend  -> " + FRONTEND_URL);
  console.log("[desktop]  Backend   -> " + BACKEND_URL);
  console.log("[desktop]  OpenWA    -> " + OPENWA_URL);
  console.log("[desktop]  Data dir  -> " + DATA_DIR);
  console.log("[desktop] ============================================");
  console.log("");

  // In keep-alive mode (launched by run-desktop.mjs) hold the process open
  // and handle signals to shut everything down cleanly.
  if (process.env.SCHOOL_SMS_KEEP_ALIVE === "1") {
    const stop = () => {
      console.log("[desktop] Shutting down services...");
      for (const child of children) {
        try {
          if (process.platform === "win32" && child.pid) {
            spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"],
              { stdio: "ignore", windowsHide: true });
          } else {
            child.kill("SIGTERM");
          }
        } catch { /* ignore */ }
      }
      killPort(BACKEND_PORT);
      killPort(FRONTEND_PORT);
      killPort(OPENWA_PORT);
      try { if (existsSync(PID_FILE)) writeFileSync(PID_FILE, "{}"); } catch { /* ignore */ }
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    await new Promise(() => {}); // hold forever until signal
  }

  // In fire-and-forget mode (stop-services handles shutdown separately)
  for (const child of children) child.unref?.();
  process.exit(0);
}

main().catch((err) => {
  console.error("[desktop] Failed to start services:", err);
  process.exit(1);
});
