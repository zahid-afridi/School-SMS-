#!/usr/bin/env node
/**
 * Starts local SchoolSMS services for the desktop shell.
 *
 * Supports two layouts:
 *   1) Production install: <install>/app/{backend,frontend,openwa}/  (builds only)
 *   2) Dev repo:           <repo>/{backend,frontend,OpenWA}/
 *
 * Start order (local desktop app — UI must open even without WhatsApp):
 *   1. SQLite schema
 *   2. Backend (port 5000)
 *   3. Frontend (port 3000)  ← shell navigates here
 *   4. OpenWA (port 2785)    ← best-effort; never blocks the school app
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
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

const modeArg = process.argv.find((a) => a.startsWith("--mode="));
const MODE_ARG = modeArg?.split("=")[1] === "prod" ? "prod" : "dev";

function resolveLayout() {
  // Production payload: scripts live in <install>/app/launch-services.mjs
  if (
    existsSync(join(__dirname, "backend")) &&
    existsSync(join(__dirname, "frontend"))
  ) {
    const installRoot = resolve(__dirname, "..");
    return {
      packaged: true,
      installRoot,
      backendDir: join(__dirname, "backend"),
      frontendDir: join(__dirname, "frontend"),
      openwaDir: join(__dirname, "openwa"),
    };
  }

  // Dev / legacy: scripts live in <repo>/desktop/scripts/
  const repoRoot = resolve(__dirname, "../..");
  return {
    packaged: false,
    installRoot: repoRoot,
    backendDir: join(repoRoot, "backend"),
    frontendDir: join(repoRoot, "frontend"),
    openwaDir: join(repoRoot, "OpenWA"),
  };
}

const LAYOUT = resolveLayout();
const { packaged, installRoot, backendDir: BACKEND_DIR, frontendDir: FRONTEND_DIR, openwaDir: OPENWA_DIR } =
  LAYOUT;

// Packaged installs always run production builds.
const MODE = packaged ? "prod" : MODE_ARG;

function resolveDataDir() {
  const fromEnv = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (fromEnv) return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  if (packaged) return join(installRoot, "data");
  return join(installRoot, "desktop-data");
}

const DATA_DIR = resolveDataDir();
const LOG_DIR = join(DATA_DIR, "logs");
const PID_FILE = join(DATA_DIR, "desktop.pids.json");
const STATUS_FILE = join(LOG_DIR, "startup-status.json");
const DB_FILE = join(DATA_DIR, "school.db");
const UPLOAD_DIR = join(DATA_DIR, "uploads");

const BACKEND_PORT = process.env.SCHOOL_SMS_BACKEND_PORT || "5000";
const FRONTEND_PORT = process.env.SCHOOL_SMS_FRONTEND_PORT || "3000";
const OPENWA_PORT = process.env.SCHOOL_SMS_OPENWA_PORT || "2785";
const BACKEND_URL = "http://127.0.0.1:" + BACKEND_PORT;
const FRONTEND_URL = "http://127.0.0.1:" + FRONTEND_PORT;
const OPENWA_URL = "http://127.0.0.1:" + OPENWA_PORT;

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
function npxCmd() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function ensureDirs() {
  for (const d of [DATA_DIR, LOG_DIR, UPLOAD_DIR]) mkdirSync(d, { recursive: true });
}

function writeStatus(step, message, extra = {}) {
  try {
    writeFileSync(
      STATUS_FILE,
      JSON.stringify(
        {
          step,
          message,
          at: new Date().toISOString(),
          ...extra,
        },
        null,
        2
      )
    );
  } catch {
    /* ignore */
  }
  console.log("[desktop] " + message);
}

function sqliteRuntime(p) {
  return "file:" + p.replace(/\\/g, "/");
}

function sqlitePrismaCli(p) {
  return "file:" + encodeURI(p.replace(/\\/g, "/"));
}

function normPath(p) {
  let s = String(p ?? "");
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  return s.replace(/^file:/i, "").replace(/\\/g, "/").toLowerCase();
}

/**
 * Prefer a stable secret stored under data/ so upgrades keep logins working.
 * Never rely on shipping backend/.env inside the installer.
 */
function readJwtSecret() {
  if (process.env.JWT_SECRET?.trim()) return process.env.JWT_SECRET.trim();

  const secretFile = join(DATA_DIR, ".jwt-secret");
  if (existsSync(secretFile)) {
    const fromFile = readFileSync(secretFile, "utf8").trim();
    if (fromFile) return fromFile;
  }

  // Dev-only fallback: local backend/.env (not present in polished installers)
  const envPath = join(BACKEND_DIR, ".env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^JWT_SECRET=(.+)$/m);
    if (m?.[1]?.trim()) {
      const fromEnv = m[1].trim().replace(/^["']|["']$/g, "");
      try {
        writeFileSync(secretFile, fromEnv, { encoding: "utf8" });
      } catch {
        /* ignore */
      }
      return fromEnv;
    }
  }

  const generated = randomBytes(32).toString("hex");
  try {
    writeFileSync(secretFile, generated, { encoding: "utf8" });
  } catch {
    /* ignore */
  }
  return generated;
}

/** Prefer Chrome, then Edge — school PCs often only have one browser. */
function findChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
    return process.env.PUPPETEER_EXECUTABLE_PATH.trim();
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

function readOpenWaApiKey() {
  const keyFile = join(OPENWA_DIR, "data", ".api-key");
  if (existsSync(keyFile)) return readFileSync(keyFile, "utf8").trim();
  return "";
}

function spawnLogged(name, command, args, cwd, env, opts) {
  const useShell =
    opts && opts.shell !== undefined ? opts.shell : process.platform === "win32";
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
    try {
      out.write("===== exit code=" + code + " signal=" + signal + " =====\n");
    } finally {
      out.end();
    }
  });

  return child;
}

async function waitForUrl(url, label, attempts, intervalMs) {
  attempts = attempts ?? 90;
  intervalMs = intervalMs ?? 1000;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) {
        console.log("[desktop] " + label + " ready (" + url + ")");
        return true;
      }
    } catch {
      /* retry */
    }
    await delay(intervalMs);
  }
  throw new Error(label + " did not become ready: " + url);
}

async function backendMatchesDataDir() {
  try {
    const res = await fetch(BACKEND_URL + "/health", {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const conn = normPath(json?.data?.connection ?? "");
    return conn.includes(normPath(DB_FILE)) || conn.includes(normPath(DATA_DIR));
  } catch {
    return false;
  }
}

function killPort(port) {
  if (process.platform === "win32") {
    const r = spawnSync("cmd", ["/c", "netstat -ano | findstr :" + port], {
      encoding: "utf8",
      windowsHide: true,
    });
    const pids = new Set();
    for (const line of (r.stdout || "").split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid > 0) pids.add(pid);
    }
    for (const pid of pids) {
      console.log("[desktop] Stopping PID " + pid + " on port " + port);
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
    return;
  }
  spawnSync("sh", ["-c", "lsof -ti:" + port + " | xargs -r kill -9"], {
    stdio: "ignore",
  });
}

async function stopAllPorts() {
  console.log(
    "[desktop] Freeing ports " +
      BACKEND_PORT +
      " / " +
      FRONTEND_PORT +
      " / " +
      OPENWA_PORT +
      "..."
  );
  killPort(BACKEND_PORT);
  killPort(FRONTEND_PORT);
  killPort(OPENWA_PORT);
  await delay(800);
}

async function ensureSqliteSchema(env) {
  writeStatus("schema", "Preparing local database…");
  await new Promise((ok, fail) => {
    const prismaJs = join(
      BACKEND_DIR,
      "node_modules",
      "prisma",
      "build",
      "index.js"
    );
    const logPath = join(LOG_DIR, "prisma.log");
    const out = createWriteStream(logPath, { flags: "a" });
    out.write("\n===== " + new Date().toISOString() + " prisma db push =====\n");

    const child = existsSync(prismaJs)
      ? spawn(
          process.execPath,
          [
            prismaJs,
            "db",
            "push",
            "--schema=prisma/schema.sqlite.prisma",
            "--url",
            env.PRISMA_SQLITE_URL,
          ],
          {
            cwd: BACKEND_DIR,
            env,
            stdio: ["ignore", "pipe", "pipe"],
            shell: false,
            windowsHide: true,
          }
        )
      : spawn(
          npxCmd(),
          [
            "prisma",
            "db",
            "push",
            "--schema=prisma/schema.sqlite.prisma",
            "--url",
            env.PRISMA_SQLITE_URL,
          ],
          {
            cwd: BACKEND_DIR,
            env,
            stdio: ["ignore", "pipe", "pipe"],
            shell: process.platform === "win32",
            windowsHide: true,
          }
        );

    child.stdout?.pipe(out, { end: false });
    child.stderr?.pipe(out, { end: false });
    child.on("exit", (code) => {
      try {
        out.write("===== exit code=" + code + " =====\n");
      } finally {
        out.end();
      }
      code === 0
        ? ok()
        : fail(
            new Error(
              "Database setup failed (prisma db push exit " +
                code +
                "). See " +
                logPath
            )
          );
    });
  });
}

function startBackend(commonEnv, children, pids) {
  writeStatus("backend", "Starting local backend…");
  const backendDist = join(BACKEND_DIR, "dist", "index.js");
  const tsxCli = join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");

  let backendChild;
  if (existsSync(backendDist) && (packaged || MODE === "prod")) {
    backendChild = spawnLogged(
      "backend",
      process.execPath,
      [backendDist],
      BACKEND_DIR,
      commonEnv,
      { shell: false }
    );
  } else if (existsSync(tsxCli)) {
    backendChild = spawnLogged(
      "backend",
      process.execPath,
      [tsxCli, "src/index.ts"],
      BACKEND_DIR,
      commonEnv,
      { shell: false }
    );
  } else {
    backendChild = spawnLogged(
      "backend",
      npxCmd(),
      ["tsx", "src/index.ts"],
      BACKEND_DIR,
      commonEnv,
      { shell: true }
    );
  }
  children.push(backendChild);
  if (backendChild.pid) pids.pids.push({ name: "backend", pid: backendChild.pid });
  return backendChild;
}

function startFrontend(commonEnv, children, pids) {
  writeStatus("frontend", "Starting local frontend…");
  const standaloneServer = join(FRONTEND_DIR, "server.js");
  const hasNextBuild = existsSync(join(FRONTEND_DIR, ".next"));

  const frontendEnv = {
    ...commonEnv,
    PORT: FRONTEND_PORT,
    HOSTNAME: "127.0.0.1",
  };

  let frontendChild;
  if (existsSync(standaloneServer) && (packaged || MODE === "prod")) {
    frontendChild = spawnLogged(
      "frontend",
      process.execPath,
      [standaloneServer],
      FRONTEND_DIR,
      frontendEnv,
      { shell: false }
    );
  } else if (MODE === "prod" && hasNextBuild) {
    frontendChild = spawnLogged(
      "frontend",
      npmCmd(),
      ["run", "start", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
      FRONTEND_DIR,
      frontendEnv,
      { shell: true }
    );
  } else {
    frontendChild = spawnLogged(
      "frontend",
      npmCmd(),
      ["run", "dev", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
      FRONTEND_DIR,
      frontendEnv,
      { shell: true }
    );
  }
  children.push(frontendChild);
  if (frontendChild.pid) pids.pids.push({ name: "frontend", pid: frontendChild.pid });
  return frontendChild;
}

/**
 * WhatsApp bridge — optional. School UI must work without Chrome/Edge.
 * Spawns in the background; never blocks opening the local app.
 */
function startOpenWaBackground(children, pids, commonEnv) {
  const openWaDist = join(OPENWA_DIR, "dist", "main.js");
  const hasBuild = existsSync(openWaDist);
  const chromium = findChromiumPath();

  if (!hasBuild && packaged) {
    writeStatus("openwa", "WhatsApp bridge not bundled — skipping", {
      openwa: "missing",
      coreReady: true,
    });
    return;
  }

  if (!chromium && packaged) {
    console.warn(
      "[desktop] Chrome/Edge not found — WhatsApp may fail; school app still works"
    );
  }

  const openwaEnv = {
    ...process.env,
    PATH: commonEnv.PATH,
    NODE_ENV: MODE === "prod" ? "production" : "development",
    PORT: OPENWA_PORT,
    SESSION_DATA_PATH: join(OPENWA_DIR, "data", "sessions"),
    DATABASE_TYPE: "sqlite",
    SERVE_DASHBOARD: "false",
    AUTO_START_SESSIONS: "false",
    PUPPETEER_HEADLESS: "true",
    PUPPETEER_ARGS:
      "--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu",
  };
  if (chromium) {
    openwaEnv.PUPPETEER_EXECUTABLE_PATH = chromium;
  }

  console.log("[desktop] Starting WhatsApp bridge in background (optional)…");

  try {
    let child;
    if (hasBuild) {
      child = spawnLogged(
        "openwa",
        process.execPath,
        [openWaDist],
        OPENWA_DIR,
        openwaEnv,
        { shell: false }
      );
    } else {
      child = spawnLogged(
        "openwa",
        npmCmd(),
        ["run", "start:dev"],
        OPENWA_DIR,
        openwaEnv,
        { shell: true }
      );
    }
    children.push(child);
    if (child.pid) pids.pids.push({ name: "openwa", pid: child.pid });

    // Non-blocking readiness probe — updates status / API key when available.
    void (async () => {
      try {
        await waitForUrl(OPENWA_URL + "/api/health", "OpenWA", 90, 1000).catch(() =>
          waitForUrl(OPENWA_URL, "OpenWA", 30, 1000)
        );
        const apiKey = readOpenWaApiKey();
        if (apiKey) {
          commonEnv.OPENWA_API_KEY = apiKey;
          console.log(
            "[desktop] OpenWA API key ready (" + apiKey.slice(0, 12) + "...)"
          );
        }
        writeStatus("ready", "Local app ready (WhatsApp online)", {
          openwa: "ready",
          coreReady: true,
        });
      } catch (err) {
        console.warn(
          "[desktop] OpenWA not ready — WhatsApp features offline:",
          err?.message || err
        );
        writeStatus("ready", "Local app ready (WhatsApp offline)", {
          openwa: "failed",
          coreReady: true,
        });
      }
    })();
  } catch (err) {
    console.warn("[desktop] Could not spawn OpenWA:", err?.message || err);
    writeStatus("ready", "Local app ready (WhatsApp unavailable)", {
      openwa: "error",
      coreReady: true,
    });
  }
}

async function main() {
  ensureDirs();
  writeStatus("init", "Preparing SchoolSMS…");

  console.log(
    "[desktop] Layout: " +
      (packaged ? "production app/ (builds only)" : "dev repo") +
      " @ " +
      installRoot
  );

  if (!existsSync(BACKEND_DIR)) {
    throw new Error("Backend folder missing: " + BACKEND_DIR);
  }
  if (!existsSync(FRONTEND_DIR)) {
    throw new Error("Frontend folder missing: " + FRONTEND_DIR);
  }

  const jwtSecret = readJwtSecret();
  const nodeBin = process.execPath;
  const nodeDir = dirname(nodeBin);
  const pathSep = process.platform === "win32" ? ";" : ":";
  const pathWithNode = nodeDir + pathSep + (process.env.PATH || "");

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

  // Prefer packaged path for live key reads by backend
  const packagedKey = join(OPENWA_DIR, "data", ".api-key");
  if (existsSync(packagedKey)) {
    commonEnv.OPENWA_API_KEY = readFileSync(packagedKey, "utf8").trim();
  }

  writeFileSync(
    join(DATA_DIR, "desktop.env.json"),
    JSON.stringify(
      {
        dataDir: DATA_DIR,
        dbFile: DB_FILE,
        uploadDir: UPLOAD_DIR,
        backendUrl: BACKEND_URL,
        frontendUrl: FRONTEND_URL,
        openwaUrl: OPENWA_URL,
        mode: MODE,
        packaged,
      },
      null,
      2
    )
  );

  await stopAllPorts();

  const children = [];
  const pids = { startedAt: new Date().toISOString(), mode: MODE, packaged, pids: [] };

  // ── 1. Database ────────────────────────────────────────────────────────────
  await ensureSqliteSchema(commonEnv);

  // ── 2. Backend (required) ──────────────────────────────────────────────────
  startBackend(commonEnv, children, pids);
  await waitForUrl(BACKEND_URL + "/health", "backend", 90, 1000);

  const dbOk = await backendMatchesDataDir();
  if (!dbOk) {
    throw new Error(
      "Backend started but is not using the expected DB: " +
        DB_FILE +
        "\nCheck: " +
        join(LOG_DIR, "backend.log")
    );
  }
  console.log("[desktop] DB      -> " + DB_FILE);
  console.log("[desktop] Uploads -> " + UPLOAD_DIR);

  // ── 3. Frontend (required — opens the desktop UI) ──────────────────────────
  startFrontend(commonEnv, children, pids);
  await waitForUrl(FRONTEND_URL, "frontend", 90, 1000);

  writeStatus("ready", "Local app ready", {
    backendUrl: BACKEND_URL,
    frontendUrl: FRONTEND_URL,
    coreReady: true,
  });

  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));

  console.log("");
  console.log("[desktop] ============================================");
  console.log("[desktop]  Core services ready (opening app)");
  console.log("[desktop]  Frontend  -> " + FRONTEND_URL);
  console.log("[desktop]  Backend   -> " + BACKEND_URL);
  console.log("[desktop]  Data dir  -> " + DATA_DIR);
  console.log("[desktop] ============================================");
  console.log("");

  // ── 4. OpenWA (optional background — never blocks UI) ──────────────────────
  startOpenWaBackground(children, pids, commonEnv);
  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));

  if (process.env.SCHOOL_SMS_KEEP_ALIVE === "1") {
    const stop = () => {
      console.log("[desktop] Shutting down services...");
      for (const child of children) {
        try {
          if (process.platform === "win32" && child.pid) {
            spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
              stdio: "ignore",
              windowsHide: true,
            });
          } else {
            child.kill("SIGTERM");
          }
        } catch {
          /* ignore */
        }
      }
      killPort(BACKEND_PORT);
      killPort(FRONTEND_PORT);
      killPort(OPENWA_PORT);
      try {
        if (existsSync(PID_FILE)) writeFileSync(PID_FILE, "{}");
      } catch {
        /* ignore */
      }
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    await new Promise(() => {});
  }

  for (const child of children) child.unref?.();
  process.exit(0);
}

main().catch((err) => {
  const msg = err?.stack || err?.message || String(err);
  console.error("[desktop] Failed to start services:", msg);
  writeStatus("error", String(err?.message || err), { error: msg });
  process.exit(1);
});
