#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = join(dirname(fileURLToPath(import.meta.url)), "../../frontend");

const env = {
  ...process.env,
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:5000/api",
  NEXT_PUBLIC_UPLOAD_BASE_URL: "http://127.0.0.1:5000",
  NEXT_PUBLIC_BACKEND_PORT: "5000",
};

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "build"], {
  cwd: frontendDir,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
