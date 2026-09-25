#!/usr/bin/env node
/**
 * Prisma's generated client emits extensionless relative imports
 * (e.g. from "./internal/class"). Node ESM cannot resolve those.
 * This rewrites all .js files under dist/generated so node dist/index.js works.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TARGET =
  process.argv[2] && !process.argv[2].startsWith("-")
    ? resolve(process.argv[2])
    : join(ROOT, "dist", "generated");

function walkJs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJs(p, out);
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

function rewrite(code) {
  // from './x' | from "./x" | export ... from './x' | import('./x')
  return code.replace(
    /(\bfrom\s+|\bimport\s*\(\s*)(['"])(\.[^'"]+)\2/g,
    (full, prefix, quote, spec) => {
      if (/\.(js|mjs|cjs|json|node)$/i.test(spec)) return full;
      return `${prefix}${quote}${spec}.js${quote}`;
    }
  );
}

if (!existsSync(TARGET)) {
  console.error(`[fix-prisma-esm] Missing: ${TARGET}`);
  process.exit(1);
}

const files = walkJs(TARGET);
let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  const after = rewrite(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
  }
}

const mustExist = [
  join(TARGET, "prisma-sqlite", "client.js"),
  join(TARGET, "prisma-sqlite", "internal", "class.js"),
];
for (const p of mustExist) {
  if (!existsSync(p)) {
    console.error(`[fix-prisma-esm] Required file missing: ${p}`);
    process.exit(1);
  }
}

console.log(
  `[fix-prisma-esm] Rewrote ${changed}/${files.length} files under ${TARGET}`
);
