/**
 * SchoolSMS Electron main process.
 * Desktop shell: unpack bundles, start local services, open the school UI.
 */
import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = resolve(__dirname, "..");

const FRONTEND_URL = "http://127.0.0.1:3000";
const BACKEND_HEALTH = "http://127.0.0.1:5000/health";

/** @type {import('node:child_process').ChildProcess | null} */
let launcherChild = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let startingServices = false;

function isPackaged() {
  return app.isPackaged;
}

function exeDir() {
  return dirname(app.getPath("exe"));
}

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readInstallConfig() {
  return readJsonFile(join(exeDir(), "schoolsms.config.json"));
}

function looksLikeAppRoot(p) {
  const packaged =
    existsSync(join(p, "app", "backend")) &&
    existsSync(join(p, "app", "frontend"));
  const legacy =
    existsSync(join(p, "backend")) && existsSync(join(p, "frontend"));
  return packaged || legacy;
}

function launchScript(root) {
  const packaged = join(root, "app", "launch-services.mjs");
  if (existsSync(packaged)) return packaged;
  return join(root, "desktop", "scripts", "launch-services.mjs");
}

function stopScript(root) {
  const packaged = join(root, "app", "stop-services.mjs");
  if (existsSync(packaged)) return packaged;
  return join(root, "desktop", "scripts", "stop-services.mjs");
}

function resolveAgainstExe(raw) {
  if (isAbsolute(raw)) return raw;
  return join(exeDir(), raw);
}

function repoRoot() {
  const dir = exeDir();
  if (looksLikeAppRoot(dir)) return dir;

  if (process.env.SCHOOL_SMS_HOME?.trim()) {
    const p = process.env.SCHOOL_SMS_HOME.trim();
    if (looksLikeAppRoot(p)) return p;
  }

  const cfg = readInstallConfig();
  const root = cfg?.appRoot;
  if (typeof root === "string" && root.trim()) {
    const p = resolveAgainstExe(root.trim());
    if (looksLikeAppRoot(p)) return p;
  }

  if (!isPackaged()) {
    const candidates = [
      DESKTOP_DIR,
      resolve(DESKTOP_DIR, ".."),
      resolve(__dirname, "../.."),
      resolve(__dirname, "../../.."),
    ];
    for (const c of candidates) {
      try {
        const canon = resolve(c);
        if (looksLikeAppRoot(canon)) return canon;
      } catch {
        /* ignore */
      }
    }
  } else {
    for (const c of [join(dir, ".."), join(dir, "../.."), join(dir, "../../..")]) {
      try {
        const canon = resolve(c);
        if (looksLikeAppRoot(canon)) return canon;
      } catch {
        /* ignore */
      }
    }
  }

  return resolve(DESKTOP_DIR, "..");
}

function dataDir() {
  if (process.env.SCHOOL_SMS_DATA_DIR?.trim()) {
    return resolveAgainstExe(process.env.SCHOOL_SMS_DATA_DIR.trim());
  }

  const cfg = readInstallConfig();
  if (typeof cfg?.dataDir === "string" && cfg.dataDir.trim()) {
    return resolveAgainstExe(cfg.dataDir.trim());
  }

  const dir = exeDir();
  const resourcesPath = process.resourcesPath || "";
  const looksInstalled =
    existsSync(join(dir, "schoolsms.config.json")) ||
    existsSync(join(dir, "resources", "app-payload.zip")) ||
    existsSync(join(resourcesPath, "app-payload.zip")) ||
    isPackaged();

  if (looksInstalled) return join(dir, "data");
  return join(repoRoot(), "desktop-data");
}

function findResourceFile(name) {
  const dir = exeDir();
  const resourcesPath = process.resourcesPath || "";
  const candidates = [
    join(dir, "resources", name),
    join(resourcesPath, name),
    join(dir, name),
    join(resourcesPath, "resources", name),
    join(DESKTOP_DIR, "resources", name),
  ];
  return candidates.find((p) => p && existsSync(p)) || null;
}

function bundleManifest() {
  const path = findResourceFile("bundle-manifest.json");
  return path ? readJsonFile(path) : null;
}

function installedMarkerPath(dir) {
  return join(dir, ".schoolsms-installed.json");
}

function readInstalledMarker(dir) {
  return readJsonFile(installedMarkerPath(dir));
}

function writeInstalledMarker(dir, manifest) {
  const payload = {
    version: manifest?.version ?? null,
    nodeVersion: manifest?.nodeVersion ?? null,
    appSha256: manifest?.appSha256 ?? null,
    nodeSha256: manifest?.nodeSha256 ?? null,
    installedAt: String(Math.floor(Date.now() / 1000)),
    layout: {
      data: "data",
      runtime: "runtime",
      config: "schoolsms.config.json",
      backupHint:
        "Copy the whole SchoolSMS folder. Critical files live in data/.",
    },
  };
  writeFileSync(installedMarkerPath(dir), JSON.stringify(payload, null, 2));
}

function shaChanged(manifest, installed, key) {
  const newSha = manifest?.[key];
  if (typeof newSha !== "string") return true;
  if (!installed) return true;
  const oldSha = installed[key];
  if (typeof oldSha !== "string") return true;
  return oldSha !== newSha;
}

function shouldSkipZipEntry(relStr) {
  const n = relStr.replace(/\\/g, "/");
  return (
    n === "data" ||
    n.startsWith("data/") ||
    n === "schoolsms.config.json" ||
    n === ".schoolsms-installed.json" ||
    n === "BACKUP.txt"
  );
}

function shouldPreserveOpenWaSession(relStr, dest) {
  const n = relStr.replace(/\\/g, "/");
  if (
    (n.startsWith("OpenWA/data/") && n !== "OpenWA/data/sessions/.gitkeep") ||
    (n.startsWith("app/openwa/data/") &&
      n !== "app/openwa/data/sessions/.gitkeep")
  ) {
    return existsSync(join(dest, n));
  }
  return false;
}

function appPayloadComplete(dir) {
  const modules = join(dir, "app", "backend", "node_modules");
  return (
    existsSync(join(dir, "app", "launch-services.mjs")) &&
    existsSync(join(dir, "app", "backend", "dist", "index.js")) &&
    existsSync(join(modules, "better-sqlite3", "package.json")) &&
    existsSync(join(modules, "bcrypt", "package.json"))
  );
}

function noteUnpack(message) {
  try {
    const logDir = join(dataDir(), "logs");
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      join(logDir, "unpack.log"),
      `\n===== ${new Date().toISOString()} =====\n${message}\n`
    );
  } catch {
    /* ignore */
  }
}

function runProcessAsync(cmd, args, opts = {}) {
  return new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(cmd, args, {
      windowsHide: true,
      ...opts,
    });
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      resolveResult({ status: -1, stdout, stderr: err?.message || String(err) });
    });
    child.on("close", (code) => {
      resolveResult({ status: code ?? -1, stdout, stderr });
    });
  });
}

async function extractZipEntriesAsync(zipPath, dest) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const total = entries.length;
  let count = 0;
  for (const entry of entries) {
    const rel = entry.entryName.replace(/\\/g, "/");
    if (!rel || rel.includes("..")) continue;
    if (shouldSkipZipEntry(rel) || shouldPreserveOpenWaSession(rel, dest)) {
      continue;
    }
    const outPath = join(dest, ...rel.split("/").filter(Boolean));
    if (entry.isDirectory) {
      mkdirSync(outPath, { recursive: true });
      continue;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, entry.getData());
    count++;
    if (count % 250 === 0) {
      const pct = Math.round((count / total) * 100);
      writeStartupStatus("unpack", `Unpacking local app (${pct}%)…`);
      await delay(5); // Yield to event loop to keep splash screen responsive
    }
  }
}

async function extractZipAsync(zipPath, dest) {
  mkdirSync(dest, { recursive: true });
  if (process.platform === "win32") {
    // 1. Try tar
    const tar = await runProcessAsync("tar", ["-xf", zipPath, "-C", dest]);
    if (tar.status === 0) return;
    noteUnpack(
      `tar exit ${tar.status} for ${zipPath}\n${tar.stderr || tar.stdout || ""}`
    );

    // 2. Try PowerShell .NET ZipFile (fast, native)
    const psCmd = `[System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${dest.replace(/'/g, "''")}')`;
    const ps = await runProcessAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psCmd,
    ]);
    if (ps.status === 0) return;
    noteUnpack(
      `PowerShell ZipFile exit ${ps.status} for ${zipPath}\n${ps.stderr || ps.stdout || ""}`
    );

    // 3. Try Expand-Archive
    const eaCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`;
    const ea = await runProcessAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      eaCmd,
    ]);
    if (ea.status === 0) return;
    noteUnpack(
      `PowerShell Expand-Archive exit ${ea.status} for ${zipPath}\n${ea.stderr || ea.stdout || ""}`
    );
  }

  // 4. Fallback to JS AdmZip with periodic UI yields
  await extractZipEntriesAsync(zipPath, dest);
}

async function extractAppPayloadAsync(zipPath, dest) {
  mkdirSync(dest, { recursive: true });
  const sessions = join(dest, "app", "openwa", "data", "sessions");
  const sessionBackup = join(dest, "data", ".session-backup");
  if (existsSync(sessions)) {
    rmSync(sessionBackup, { recursive: true, force: true });
    cpSync(sessions, sessionBackup, { recursive: true });
  }

  if (process.platform === "win32") {
    // 1. Try tar
    const tar = await runProcessAsync("tar", ["-xf", zipPath, "-C", dest]);
    if (appPayloadComplete(dest)) {
      rmSync(sessionBackup, { recursive: true, force: true });
      return;
    }
    noteUnpack(
      `App tar extract incomplete (exit ${tar.status}). Trying PowerShell.\n${
        tar.stderr || tar.stdout || ""
      }`
    );

    // 2. Try PowerShell .NET ZipFile
    const psCmd = `[System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${dest.replace(/'/g, "''")}')`;
    const ps = await runProcessAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      psCmd,
    ]);
    if (appPayloadComplete(dest)) {
      rmSync(sessionBackup, { recursive: true, force: true });
      return;
    }
    noteUnpack(
      `App PowerShell ZipFile exit ${ps.status}.\n${ps.stderr || ps.stdout || ""}`
    );

    // 3. Try Expand-Archive
    const eaCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`;
    const ea = await runProcessAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      eaCmd,
    ]);
    if (appPayloadComplete(dest)) {
      rmSync(sessionBackup, { recursive: true, force: true });
      return;
    }
    noteUnpack(
      `App Expand-Archive exit ${ea.status}.\n${ea.stderr || ea.stdout || ""}`
    );
  }

  if (appPayloadComplete(dest)) {
    rmSync(sessionBackup, { recursive: true, force: true });
    return;
  }

  // A partial extract leaves launch-services.mjs without node_modules.
  rmSync(join(dest, "app"), { recursive: true, force: true });
  await extractZipEntriesAsync(zipPath, dest);
  if (existsSync(sessionBackup)) {
    mkdirSync(dirname(sessions), { recursive: true });
    cpSync(sessionBackup, sessions, { recursive: true });
    rmSync(sessionBackup, { recursive: true, force: true });
  }
}

function writeBackupGuide(dir) {
  const text = `SchoolSMS — Backup Guide
========================

Easy backup: copy this WHOLE SchoolSMS folder to a USB drive or another PC.

Critical school data (must keep):
  data\\school.db     database
  data\\uploads\\      photos and files
  data\\logs\\         app logs
  data\\.jwt-secret   local login signing key (keep with the DB)

App files (reinstallable):
  app\\          compiled backend / frontend / WhatsApp builds
  runtime\\      portable Node
  resources\\    installer payload

Uninstall keeps the data\\ folder so records are not deleted.
`;
  try {
    writeFileSync(join(dir, "BACKUP.txt"), text);
  } catch {
    /* ignore */
  }
}

function ensureInstallFolders(dir) {
  mkdirSync(join(dir, "data", "uploads"), { recursive: true });
  mkdirSync(join(dir, "data", "logs"), { recursive: true });
  mkdirSync(join(dir, "app", "openwa", "data", "sessions"), {
    recursive: true,
  });
  writeBackupGuide(dir);
}

function writeStartupStatus(step, message) {
  const dir = join(dataDir(), "logs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "startup-status.json"),
    JSON.stringify(
      {
        step,
        message,
        at: String(Math.floor(Date.now() / 1000)),
      },
      null,
      2
    )
  );
}

async function ensureBundledRuntime() {
  const dir = exeDir();
  const nodeZip = findResourceFile("node-runtime.zip");
  const appZip = findResourceFile("app-payload.zip");
  if (!nodeZip && !appZip) return;

  ensureInstallFolders(dir);

  const manifest = bundleManifest() || {};
  if (manifest.placeholder === true) {
    throw new Error(
      "Installer is incomplete (placeholder bundle manifest).\nRebuild with build.bat / CI so app-payload.zip is included."
    );
  }
  const installed = readInstalledMarker(dir);

  const runtimeMarker = join(dir, "runtime", "node.exe");
  const needNode =
    !existsSync(runtimeMarker) || shaChanged(manifest, installed, "nodeSha256");
  if (nodeZip && needNode) {
    writeStartupStatus("unpack", "Installing portable Node runtime…");
    rmSync(join(dir, "runtime"), { recursive: true, force: true });
    await extractZipAsync(nodeZip, join(dir, "runtime"));
  }

  const needApp =
    !appPayloadComplete(dir) || shaChanged(manifest, installed, "appSha256");
  if (appZip && needApp) {
    writeStartupStatus("unpack", "Unpacking local app (first launch)…");
    await extractAppPayloadAsync(appZip, dir);
  }

  if (appZip && !appPayloadComplete(dir)) {
    throw new Error(
      "SchoolSMS unpacked without the local database module (better-sqlite3).\n" +
        "Reinstall SchoolSMS. Details: " +
        join(dataDir(), "logs", "unpack.log")
    );
  }

  writeInstalledMarker(dir, manifest);
}


function nodeBin() {
  const dir = exeDir();
  const bundled =
    process.platform === "win32"
      ? join(dir, "runtime", "node.exe")
      : join(dir, "runtime", "node");
  if (existsSync(bundled)) return bundled;
  return process.platform === "win32" ? "node.exe" : "node";
}

function pathWithBundledNode() {
  const runtime = join(exeDir(), "runtime");
  if (!existsSync(runtime)) return null;
  const sep = process.platform === "win32" ? ";" : ":";
  return `${runtime}${sep}${process.env.PATH || ""}`;
}

async function ensureDataLayout() {
  await ensureBundledRuntime();

  const data = dataDir();
  mkdirSync(join(data, "uploads"), { recursive: true });
  mkdirSync(join(data, "logs"), { recursive: true });

  const dir = exeDir();
  const looksInstalled =
    isPackaged() ||
    existsSync(join(dir, "schoolsms.config.json")) ||
    Boolean(findResourceFile("app-payload.zip"));

  if (looksInstalled) {
    ensureInstallFolders(dir);

    const cfgPath = join(dir, "schoolsms.config.json");
    let cfg = readInstallConfig() || {};
    if (typeof cfg !== "object" || Array.isArray(cfg)) cfg = {};
    if (!Object.prototype.hasOwnProperty.call(cfg, "dataDir")) {
      cfg.dataDir = "data";
    }
    if (looksLikeAppRoot(dir)) {
      cfg.appRoot = ".";
    } else if (!Object.prototype.hasOwnProperty.call(cfg, "appRoot")) {
      const root = repoRoot();
      if (looksLikeAppRoot(root)) cfg.appRoot = root;
    }
    try {
      writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    } catch {
      /* ignore */
    }
  }

  const info = {
    dataDir: data,
    dbFile: join(data, "school.db"),
    uploadDir: join(data, "uploads"),
    backendUrl: "http://127.0.0.1:5000",
    frontendUrl: FRONTEND_URL,
    nodeBin: nodeBin(),
  };
  try {
    writeFileSync(join(data, "desktop.env.json"), JSON.stringify(info, null, 2));
  } catch {
    /* ignore */
  }

  return data;
}

function readLogTail(path, maxChars) {
  try {
    const text = readFileSync(path, "utf8").trim();
    if (!text) return "";
    if (text.length <= maxChars) return text;
    return text.slice(text.length - maxChars);
  } catch {
    return "";
  }
}

function readStartupStatusMessage() {
  const val = readJsonFile(join(dataDir(), "logs", "startup-status.json"));
  if (!val) return null;
  const step = typeof val.step === "string" ? val.step : "";
  const message = typeof val.message === "string" ? val.message : "";
  if (!message) return null;
  return step ? `[${step}] ${message}` : message;
}

function launcherFailedMessage(logPath) {
  const status = readStartupStatusMessage() || "";
  const launcher = readLogTail(logPath, 1200);
  const backend = readLogTail(join(dataDir(), "logs", "backend.log"), 800);
  const prisma = readLogTail(join(dataDir(), "logs", "prisma.log"), 800);

  const parts = ["Local services failed to start."];
  if (status) parts.push(status);
  if (prisma) parts.push(`--- prisma.log ---\n${prisma}`);
  if (backend) parts.push(`--- backend.log ---\n${backend}`);
  if (launcher) parts.push(`--- launcher.log ---\n${launcher}`);
  parts.push(`Full logs: ${join(dataDir(), "logs")}`);
  return parts.join("\n\n");
}

function tcpReachable(url, timeoutMs = 800) {
  try {
    const u = new URL(url);
    const host = u.hostname || "127.0.0.1";
    const port = Number(u.port || (u.protocol === "https:" ? 443 : 80));
    return new Promise((resolvePromise) => {
      const socket = createConnection({ host, port }, () => {
        socket.destroy();
        resolvePromise(true);
      });
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => {
        socket.destroy();
        resolvePromise(false);
      });
      socket.on("error", () => resolvePromise(false));
    });
  } catch {
    return Promise.resolve(false);
  }
}

function childExited() {
  if (!launcherChild) return null;
  if (launcherChild.exitCode != null) return `exit ${launcherChild.exitCode}`;
  if (launcherChild.signalCode) return `signal ${launcherChild.signalCode}`;
  return null;
}

async function waitHttpOk(url, attempts, logPath) {
  for (let i = 0; i < attempts; i++) {
    const exit = childExited();
    if (exit) {
      throw new Error(
        `Launcher stopped unexpectedly (${exit}).\n\n${launcherFailedMessage(logPath)}`
      );
    }
    if (await tcpReachable(url)) return;
    if (i + 1 === attempts) break;
    await delay(500);
  }
  throw new Error(
    `Timed out waiting for ${url}.\n\n${launcherFailedMessage(logPath)}`
  );
}

function killChildTree(child) {
  if (!child || child.killed) return;
  const pid = child.pid;
  if (process.platform === "win32" && pid) {
    try {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    }
  } else {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

function stopViaScript(root) {
  const script = stopScript(root);
  if (!existsSync(script)) return;
  const env = { ...process.env, SCHOOL_SMS_DATA_DIR: dataDir() };
  const pathExtra = pathWithBundledNode();
  if (pathExtra) env.PATH = pathExtra;
  try {
    spawnSync(nodeBin(), [script], {
      env,
      stdio: "ignore",
      windowsHide: true,
      timeout: 3500,
    });
  } catch {
    /* ignore */
  }
}

function cleanup() {
  if (launcherChild) {
    killChildTree(launcherChild);
    launcherChild = null;
  }
  try {
    stopViaScript(repoRoot());
  } catch {
    /* ignore */
  }
}

async function startServicesInner() {
  writeStartupStatus("prepare", "Preparing local data…");
  const data = await ensureDataLayout();
  await ensureBundledRuntime();

  if (launcherChild) {
    killChildTree(launcherChild);
    launcherChild = null;
  }
  stopViaScript(repoRoot());

  const root = repoRoot();
  const script = launchScript(root);
  if (!existsSync(script)) {
    throw new Error(
      `School app files not found.\n\nLooked for: ${script}\n\nIf this is a fresh install, wait for first-run unpack or reinstall.\nDev builds: set appRoot in schoolsms.config.json next to the .exe.`
    );
  }

  const logDir = join(data, "logs");
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, "launcher.log");
  const logFd = openSync(logPath, "a");

  const mode = isPackaged() ? "prod" : "dev";
  writeStartupStatus("launch", "Starting local backend & frontend…");

  const node = nodeBin();
  const env = {
    ...process.env,
    SCHOOL_SMS_DATA_DIR: data,
    SCHOOL_SMS_KEEP_ALIVE: "1",
  };
  const pathExtra = pathWithBundledNode();
  if (pathExtra) env.PATH = pathExtra;

  launcherChild = spawn(node, [script, `--mode=${mode}`], {
    cwd: root,
    env,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  launcherChild.on("error", (err) => {
    console.error("[SchoolSMS] launcher error:", err);
  });

  // Up to 180s (360 * 500ms) for low-spec dual-core school PCs running initial SQLite schema push
  await waitHttpOk(BACKEND_HEALTH, 360, logPath);
  await waitHttpOk(FRONTEND_URL, 360, logPath);

  writeStartupStatus("ready", "Opening SchoolSMS…");
}

async function startServices() {
  if (startingServices) return;
  startingServices = true;
  try {
    await startServicesInner();
  } finally {
    startingServices = false;
  }
}

async function openApp() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("Main window is not available");
  }
  await mainWindow.loadURL(FRONTEND_URL);
  mainWindow.setTitle("School SmS");
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const iconCandidates = [
    join(DESKTOP_DIR, "build", "icon.ico"),
    join(DESKTOP_DIR, "build", "icon.png"),
    join(exeDir(), "resources", "icon.ico"),
    join(process.resourcesPath || "", "icon.ico"),
  ];
  const iconPath = iconCandidates.find((p) => p && existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: "School SmS",
    show: false,
    backgroundColor: "#f0f9ff",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    ...(iconPath ? { icon: iconPath } : {}),
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.center();
  });

  mainWindow.on("close", () => {
    cleanup();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(FRONTEND_URL) && !url.startsWith("file:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const splashHtml = join(DESKTOP_DIR, "index.html");
  mainWindow.loadFile(
    existsSync(splashHtml) ? splashHtml : join(__dirname, "..", "index.html")
  );
}

function registerIpc() {
  ipcMain.handle("start_services", async () => {
    await startServices();
    return null;
  });
  ipcMain.handle("open_app", async () => {
    await openApp();
    return null;
  });
  ipcMain.handle("get_data_dir", async () => dataDir());
  ipcMain.handle("get_startup_status", async () =>
    readStartupStatusMessage() || "Starting local services…"
  );
  ipcMain.handle("open_logs_dir", async () => {
    const logs = join(dataDir(), "logs");
    mkdirSync(logs, { recursive: true });
    shell.openPath(logs);
    return null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpc();
    createWindow();
  });

  app.on("window-all-closed", () => {
    cleanup();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    cleanup();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
