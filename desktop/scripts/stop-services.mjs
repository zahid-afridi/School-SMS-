#!/usr/bin/env node
/**
 * Stops desktop-managed backend/frontend processes.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");

function resolveDataDir() {
  const fromEnv = process.env.SCHOOL_SMS_DATA_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  return join(REPO_ROOT, "desktop-data");
}

const DATA_DIR = resolveDataDir();
const PID_FILE = join(DATA_DIR, "desktop.pids.json");

function killPid(pid) {
  return new Promise((resolve) => {
    if (!pid) return resolve();
    if (process.platform === "win32") {
      const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      child.on("exit", () => resolve());
      return;
    }
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
    resolve();
  });
}

async function main() {
  if (!existsSync(PID_FILE)) {
    console.log("[desktop] No pid file — nothing to stop");
    return;
  }

  let data;
  try {
    data = JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    console.log("[desktop] Invalid pid file");
    return;
  }

  for (const entry of data.pids || []) {
    console.log(`[desktop] Stopping ${entry.name} (pid ${entry.pid})`);
    await killPid(entry.pid);
  }

  try {
    unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
  console.log("[desktop] Stopped");
}

main();
