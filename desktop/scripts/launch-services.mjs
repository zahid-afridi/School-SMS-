#!/usr/bin/env node
/**
 * Starts School backend + frontend for the Tauri desktop shell.
 * Data dir: SCHOOL_SMS_DATA_DIR (set by Tauri) → install folder /data.
 *
 * Never reuses a stale backend that points at AppData / another folder.
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

const modeArg = process.argv.find((a) => a.startsWith("--mode="));
const MODE = modeArg?.split("=")[1] === "prod" ? "prod" : "dev";

function resolveDataDir() {
  const fromEnv = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  return join(REPO_ROOT, "desktop-data");
}

const DATA_DIR = resolveDataDir();
const LOG_DIR = join(DATA_DIR, "logs");
const PID_FILE = join(DATA_DIR, "desktop.pids.json");
const DB_FILE = join(DATA_DIR, "school.db");
const UPLOAD_DIR = join(DATA_DIR, "uploads");

const BACKEND_PORT = process.env.SCHOOL_SMS_BACKEND_PORT || "5000";
const FRONTEND_PORT = process.env.SCHOOL_SMS_FRONTEND_PORT || "3000";
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

function ensureDirs() {
  for (const dir of [DATA_DIR, LOG_DIR, UPLOAD_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJwtSecret() {
  if (process.env.JWT_SECRET?.trim()) return process.env.JWT_SECRET.trim();
  const envPath = join(BACKEND_DIR, ".env");
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, "utf8").match(/^JWT_SECRET=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "school-sms-desktop-dev-secret-change-me";
}

/** SQLite file URL — must encode spaces or Prisma CLI truncates the path. */
function sqliteUrl(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return `file:${encodeURI(normalized)}`;
}

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCmd() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function spawnLogged(name, command, args, cwd, env) {
  const logPath = join(LOG_DIR, `${name}.log`);
  const out = createWriteStream(logPath, { flags: "a" });
  out.write(`\n===== ${new Date().toISOString()} start ${name} =====\n`);

  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: process.platform === "win32",
  });

  child.stdout?.pipe(out);
  child.stderr?.pipe(out);
  child.on("exit", (code, signal) => {
    out.write(`===== exit code=${code} signal=${signal} =====\n`);
  });

  return child;
}

async function waitForUrl(url, label, attempts = 90, intervalMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) {
        console.log(`[desktop] ${label} ready (${url})`);
        return true;
      }
    } catch {
      // retry
    }
    await delay(intervalMs);
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

async function backendMatchesDataDir() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const conn = String(json?.data?.connection ?? "")
      .replace(/\\/g, "/")
      .toLowerCase();
    const expectedDb = DB_FILE.replace(/\\/g, "/").toLowerCase();
    const expectedDir = DATA_DIR.replace(/\\/g, "/").toLowerCase();
    return conn.includes(expectedDb) || conn.includes(expectedDir);
  } catch {
    return false;
  }
}

function killPort(port) {
  if (process.platform === "win32") {
    const result = spawnSync(
      "cmd",
      ["/c", `netstat -ano | findstr :${port}`],
      { encoding: "utf8", windowsHide: true }
    );
    const text = result.stdout || "";
    const pids = new Set();
    for (const line of text.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid > 0) pids.add(pid);
    }
    for (const pid of pids) {
      console.log(`[desktop] Stopping PID ${pid} on port ${port}`);
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
    return;
  }

  spawnSync("sh", ["-c", `lsof -ti:${port} | xargs -r kill -9`], {
    stdio: "ignore",
  });
}

async function stopStaleServicesIfNeeded() {
  const matches = await backendMatchesDataDir();
  if (matches) {
    console.log(`[desktop] Backend already using data dir: ${DATA_DIR}`);
    return false; // keep running
  }
  console.log(
    `[desktop] Restarting services so DB/uploads use: ${DATA_DIR}`
  );
  killPort(BACKEND_PORT);
  killPort(FRONTEND_PORT);
  await delay(800);
  return true; // need start
}

async function ensureSqliteSchema(env) {
  console.log("[desktop] Ensuring SQLite schema…");
  await new Promise((resolvePromise, reject) => {
    const child = spawn(
      npxCmd(),
      [
        "prisma",
        "db",
        "push",
        "--schema=prisma/schema.sqlite.prisma",
        "--url",
        env.SQLITE_DATABASE_URL,
      ],
      {
        cwd: BACKEND_DIR,
        env,
        stdio: "inherit",
        shell: process.platform === "win32",
        windowsHide: true,
      }
    );
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`prisma db push failed with code ${code}`));
    });
  });
}

async function main() {
  ensureDirs();

  const jwtSecret = readJwtSecret();
  const commonEnv = {
    ...process.env,
    MODE: "offline",
    NODE_ENV: MODE === "prod" ? "production" : "development",
    PORT: BACKEND_PORT,
    // Clear relative .env defaults; backend also keys off SCHOOL_SMS_DATA_DIR
    SQLITE_DATABASE_URL: sqliteUrl(DB_FILE),
    UPLOAD_DIR,
    PUBLIC_UPLOAD_BASE_URL: `${BACKEND_URL}/uploads`,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
    SCHOOL_SMS_DATA_DIR: DATA_DIR,
    NEXT_PUBLIC_API_URL: `${BACKEND_URL}/api`,
    NEXT_PUBLIC_UPLOAD_BASE_URL: BACKEND_URL,
    NEXT_PUBLIC_BACKEND_PORT: BACKEND_PORT,
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
        mode: MODE,
      },
      null,
      2
    )
  );

  const needStart = await stopStaleServicesIfNeeded();
  const children = [];
  const pids = { startedAt: new Date().toISOString(), mode: MODE, pids: [] };

  if (needStart || !(await backendMatchesDataDir())) {
    await ensureSqliteSchema(commonEnv);
    const backendChild = spawnLogged(
      "backend",
      npxCmd(),
      ["tsx", "src/index.ts"],
      BACKEND_DIR,
      commonEnv
    );
    children.push(backendChild);
    if (backendChild.pid) pids.pids.push({ name: "backend", pid: backendChild.pid });
    await waitForUrl(`${BACKEND_URL}/health`, "backend");

    const ok = await backendMatchesDataDir();
    if (!ok) {
      throw new Error(
        `Backend started but is not using expected DB:\n  expected: ${DB_FILE}\n  Check ${join(LOG_DIR, "backend.log")}`
      );
    }
    console.log(`[desktop] DB → ${DB_FILE}`);
  }

  let frontendUp = false;
  try {
    const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(1500) });
    frontendUp = res.ok || res.status < 500;
  } catch {
    frontendUp = false;
  }

  if (!frontendUp) {
    const frontendChild =
      MODE === "prod" && existsSync(join(FRONTEND_DIR, ".next"))
        ? spawnLogged(
            "frontend",
            npmCmd(),
            ["run", "start", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
            FRONTEND_DIR,
            commonEnv
          )
        : spawnLogged(
            "frontend",
            npmCmd(),
            ["run", "dev", "--", "-p", FRONTEND_PORT, "-H", "127.0.0.1"],
            FRONTEND_DIR,
            commonEnv
          );
    children.push(frontendChild);
    if (frontendChild.pid) {
      pids.pids.push({ name: "frontend", pid: frontendChild.pid });
    }
    await waitForUrl(FRONTEND_URL, "frontend");
  } else {
    console.log("[desktop] Frontend already running");
  }

  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
  console.log(`[desktop] Ready → ${FRONTEND_URL}`);
  console.log(`[desktop] Data → ${DATA_DIR}`);

  if (process.env.SCHOOL_SMS_KEEP_ALIVE === "1") {
    const stop = () => {
      for (const child of children) {
        try {
          if (process.platform === "win32" && child.pid) {
            spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
              stdio: "ignore",
              windowsHide: true,
            });
          } else {
            child.kill("SIGTERM");
          }
        } catch {
          // ignore
        }
      }
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    await new Promise(() => {});
  }

  for (const child of children) {
    child.unref?.();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[desktop] Failed to start services:", err);
  process.exit(1);
});
