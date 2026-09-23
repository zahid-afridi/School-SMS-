#!/usr/bin/env node
/**
 * Starts OpenWA + backend + frontend for the School SMS desktop shell.
 *
 * Supports two layouts:
 *   1) Production install: <install>/app/{backend,frontend,openwa}/  (builds only)
 *   2) Dev repo:           <repo>/{backend,frontend,OpenWA}/
 *
 * Start order:
 *   1. OpenWA  (port 2785)
 *   2. Backend (port 5000)
 *   3. Frontend(port 3000)
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
  return candidates[0];
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
  attempts = attempts ?? 120;
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
  await delay(1000);
}

async function ensureSqliteSchema(env) {
  console.log("[desktop] Ensuring SQLite schema...");
  await new Promise((ok, fail) => {
    const prismaJs = join(
      BACKEND_DIR,
      "node_modules",
      "prisma",
      "build",
      "index.js"
    );
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
            stdio: "inherit",
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
            stdio: "inherit",
            shell: process.platform === "win32",
            windowsHide: true,
          }
        );
    child.on("exit", (code) =>
      code === 0 ? ok() : fail(new Error("prisma db push failed: " + code))
    );
  });
}

async function main() {
  ensureDirs();

  console.log(
    "[desktop] Layout: " +
      (packaged ? "production app/ (builds only)" : "dev repo") +
      " @ " +
      installRoot
  );

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

  // ── 1. OpenWA ──────────────────────────────────────────────────────────────
  const openWaDist = join(OPENWA_DIR, "dist", "main.js");
  const hasBuild = existsSync(openWaDist);

  const openwaEnv = {
    ...process.env,
    PATH: pathWithNode,
    NODE_ENV: MODE === "prod" ? "production" : "development",
    PORT: OPENWA_PORT,
    SESSION_DATA_PATH: join(OPENWA_DIR, "data", "sessions"),
    DATABASE_TYPE: "sqlite",
    SERVE_DASHBOARD: "false",
    AUTO_START_SESSIONS: "false",
    PUPPETEER_HEADLESS: "true",
    PUPPETEER_ARGS:
      "--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu",
    PUPPETEER_EXECUTABLE_PATH: findChromiumPath(),
  };

  if (hasBuild) {
    console.log("[desktop] Starting OpenWA from dist/main.js...");
    const c = spawnLogged(
      "openwa",
      nodeBin,
      [openWaDist],
      OPENWA_DIR,
      openwaEnv,
      { shell: false }
    );
    children.push(c);
    if (c.pid) pids.pids.push({ name: "openwa", pid: c.pid });
  } else if (!packaged) {
    console.log("[desktop] OpenWA dist not found — starting in dev mode...");
    const c = spawnLogged(
      "openwa",
      npmCmd(),
      ["run", "start:dev"],
      OPENWA_DIR,
      openwaEnv,
      { shell: true }
    );
    children.push(c);
    if (c.pid) pids.pids.push({ name: "openwa", pid: c.pid });
  } else {
    throw new Error("OpenWA production build missing: " + openWaDist);
  }

  await waitForUrl(OPENWA_URL + "/api/health", "OpenWA", 120, 1000).catch(() =>
    waitForUrl(OPENWA_URL, "OpenWA", 60, 1000)
  );

  const apiKey = readOpenWaApiKey();
  if (apiKey) {
    commonEnv.OPENWA_API_KEY = apiKey;
    console.log("[desktop] OpenWA API key injected (" + apiKey.slice(0, 12) + "...)");
  } else {
    console.warn(
      "[desktop] WARNING: OpenWA API key not found yet — backend will read it from file"
    );
  }

  // ── 2. Prisma schema push ──────────────────────────────────────────────────
  await ensureSqliteSchema(commonEnv);

  // ── 3. Backend ─────────────────────────────────────────────────────────────
  console.log("[desktop] Starting backend...");
  const backendDist = join(BACKEND_DIR, "dist", "index.js");
  const tsxCli = join(BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");

  let backendChild;
  if (existsSync(backendDist) && (packaged || MODE === "prod")) {
    backendChild = spawnLogged(
      "backend",
      nodeBin,
      [backendDist],
      BACKEND_DIR,
      commonEnv,
      { shell: false }
    );
  } else if (existsSync(tsxCli)) {
    backendChild = spawnLogged(
      "backend",
      nodeBin,
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
  await waitForUrl(BACKEND_URL + "/health", "backend");

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

  // ── 4. Frontend ────────────────────────────────────────────────────────────
  console.log("[desktop] Starting frontend...");
  const standaloneServer = join(FRONTEND_DIR, "server.js");
  const hasNextBuild = existsSync(join(FRONTEND_DIR, ".next"));

  const frontendEnv = {
    ...commonEnv,
    PORT: FRONTEND_PORT,
    HOSTNAME: "127.0.0.1",
  };

  let frontendChild;
  if (existsSync(standaloneServer) && (packaged || MODE === "prod")) {
    // Next.js standalone production server
    frontendChild = spawnLogged(
      "frontend",
      nodeBin,
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
  await waitForUrl(FRONTEND_URL, "frontend");

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
  console.error("[desktop] Failed to start services:", err);
  process.exit(1);
});
