#!/usr/bin/env node
/**
 * Stops desktop-managed backend/frontend processes.
 * Always frees ports 5000 / 3000 / 2785 so closing the app fully shuts services down.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveInstallRoot() {
  // Production: <install>/app/stop-services.mjs
  if (existsSync(join(__dirname, "backend")) && existsSync(join(__dirname, "frontend"))) {
    return resolve(__dirname, "..");
  }
  // Dev: <repo>/desktop/scripts/stop-services.mjs
  return resolve(__dirname, "../..");
}

const INSTALL_ROOT = resolveInstallRoot();
const PACKAGED =
  existsSync(join(INSTALL_ROOT, "app", "backend")) &&
  existsSync(join(INSTALL_ROOT, "app", "frontend"));

const BACKEND_PORT = process.env.SCHOOL_SMS_BACKEND_PORT || "5000";
const FRONTEND_PORT = process.env.SCHOOL_SMS_FRONTEND_PORT || "3000";
const OPENWA_PORT = process.env.SCHOOL_SMS_OPENWA_PORT || "2785";

function resolveDataDir() {
  const fromEnv = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  if (PACKAGED) return join(INSTALL_ROOT, "data");
  return join(INSTALL_ROOT, "desktop-data");
}

const DATA_DIR = resolveDataDir();
const PID_FILE = join(DATA_DIR, "desktop.pids.json");

function killPid(pid) {
  return new Promise((resolveDone) => {
    if (!pid) return resolveDone();
    if (process.platform === "win32") {
      const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      child.on("exit", () => resolveDone());
      return;
    }
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    resolveDone();
  });
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

async function main() {
  if (existsSync(PID_FILE)) {
    try {
      const data = JSON.parse(readFileSync(PID_FILE, "utf8"));
      for (const entry of data.pids || []) {
        console.log(`[desktop] Stopping ${entry.name} (pid ${entry.pid})`);
        await killPid(entry.pid);
      }
    } catch {
      console.log("[desktop] Invalid pid file — killing by port");
    }
    try {
      unlinkSync(PID_FILE);
    } catch {
      // ignore
    }
  }

  killPort(BACKEND_PORT);
  killPort(FRONTEND_PORT);
  killPort(OPENWA_PORT);
  console.log("[desktop] Stopped");
}

main();
