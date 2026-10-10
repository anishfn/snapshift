// Snapshots this app's own source into public/demo/codebase.json, for the "Codebase demo": a chat holding every
// source file at once (about 135k tokens), to show Snap deciding over a context that size.
// Run after the code changes: node scripts/codebase-demo.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const files = walk(join(root, "src"))
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .sort()
  .map((f) => ({ name: relative(root, f), text: readFileSync(f, "utf8") }));
writeFileSync(join(root, "public/demo/codebase.json"), JSON.stringify(files));
const chars = files.reduce((n, f) => n + f.text.length, 0);
console.log(`${files.length} files, ${Math.round(chars / 1000)}k characters`);
