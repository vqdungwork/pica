/* The example's build: the interactive demo, as a directory a static host or a Claude Artifact can
 * serve. html/app-approvals.html becomes dist/index.html with the two files it loads.
 *
 * Node builtins only, like serve.mjs. It is a build rather than a copy command because it fails:
 * a missing source, or a page that references a file the build did not ship, exits non-zero, which
 * is the thing build-check is there to see.
 *
 * Usage: node scripts/build.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "html");
const OUT = path.join(ROOT, "dist");
const PAGES = { "app-approvals.html": "index.html" };
const ASSETS = ["shared.css", "proto.js"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [from, to] of Object.entries(PAGES)) fs.copyFileSync(path.join(SRC, from), path.join(OUT, to));
for (const a of ASSETS) fs.copyFileSync(path.join(SRC, a), path.join(OUT, a));

let missing = 0;
for (const page of Object.values(PAGES)) {
  const html = fs.readFileSync(path.join(OUT, page), "utf8");
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:?]+)"/g))
    if (!fs.existsSync(path.join(OUT, ref))) { console.error(`error: ${page} references ${ref}, which the build did not ship`); missing++; }
}
if (missing) process.exit(1);
console.log(`built ${Object.keys(PAGES).length} page(s) and ${ASSETS.length} asset(s) into dist/`);
