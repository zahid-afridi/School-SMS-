#!/usr/bin/env node
/**
 * Lightweight desktop runner (no Electron binary required).
 * Starts backend + frontend, opens a dedicated app window (Edge/Chrome --app),
 * and stops services when you close this process (Ctrl+C).
 * Prefer `npm run desktop:dev` (Electron) for the full splash + shell.
 *
 * Usage:
 *   node desktop/scripts/run-desktop.mjs
 *   node desktop/scripts/run-desktop.mjs --mode=prod
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(DESKTOP_DIR, "..");
const LAUNCHER = join(DESKTOP_DIR, "scripts", "launch-services.mjs");
const STOPPER = join(DESKTOP_DIR, "scripts", "stop-services.mjs");

const modeArg = process.argv.find((a) => a.startsWith("--mode="));
const MODE = modeArg?.split("=")[1] === "prod" ? "prod" : "dev";
const FRONTEND_URL = process.env.SCHOOL_SMS_FRONTEND_URL || "http://127.0.0.1:3000";

function findBrowser() {
  const candidates = [
    process.env.SCHOOL_SMS_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

async function waitForFrontend(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await delay(1000);
  }
  throw new Error(`Frontend did not start: ${url}`);
}

function runNode(script, args = [], opts = {}) {
  return spawn(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    stdio: opts.stdio ?? "inherit",
    windowsHide: false,
    env: {
      ...process.env,
      SCHOOL_SMS_KEEP_ALIVE: opts.keepAlive ? "1" : process.env.SCHOOL_SMS_KEEP_ALIVE,
    },
  });
}

async function main() {
  console.log("══════════════════════════════════════");
  console.log("  School SmS Desktop");
  console.log("══════════════════════════════════════");
  console.log(`Mode: ${MODE}`);
  console.log(`UI:   ${FRONTEND_URL}`);
  console.log("");

  // Start services (blocking until ready, then keep-alive child)
  const services = runNode(LAUNCHER, [`--mode=${MODE}`], {
    keepAlive: true,
    stdio: "inherit",
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\n[desktop] Shutting down…");
    try {
      if (process.platform === "win32" && services.pid) {
        spawn("taskkill", ["/PID", String(services.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } else {
        services.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
    await new Promise((r) => {
      const child = runNode(STOPPER, [], { stdio: "inherit" });
      child.on("exit", () => r());
    });
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  await waitForFrontend(FRONTEND_URL);

  const browser = findBrowser();
  let browserProc = null;
  if (browser) {
    console.log(`[desktop] Opening app window via ${browser}`);
    browserProc = spawn(
      browser,
      [`--app=${FRONTEND_URL}`, `--user-data-dir=${join(
        process.env.LOCALAPPDATA || DESKTOP_DIR,
        "SchoolSmS",
        "browser-profile"
      )}`, "--new-window"],
      {
        stdio: "ignore",
        windowsHide: false,
        detached: false,
      }
    );
    browserProc.on("exit", () => {
      console.log("[desktop] App window closed");
      void shutdown();
    });
  } else {
    console.log(`[desktop] No Edge/Chrome found — open manually: ${FRONTEND_URL}`);
    if (process.platform === "win32") {
      spawn("cmd", ["/C", "start", "", FRONTEND_URL], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  }

  console.log("[desktop] Running. Close the app window or press Ctrl+C to stop.");
  await new Promise(() => {});
}

main().catch(async (err) => {
  console.error("[desktop] Failed:", err);
  try {
    runNode(STOPPER, [], { stdio: "inherit" });
  } catch {
    // ignore
  }
  process.exit(1);
});
