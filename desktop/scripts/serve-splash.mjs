#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.env.SCHOOL_SMS_SPLASH_PORT || 1420);

spawnSync(process.execPath, [join(root, "scripts/copy-splash.mjs")], {
  stdio: "inherit",
  windowsHide: true,
});

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const filePath = join(dist, urlPath === "/" ? "index.html" : urlPath);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
  });
  res.end(readFileSync(filePath));
}).listen(port, "127.0.0.1", () => {
  console.log(`[desktop] Splash server http://127.0.0.1:${port}`);
});
