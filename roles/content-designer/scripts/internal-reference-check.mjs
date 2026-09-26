#!/usr/bin/env node
/**
 * Fails when an internal requirement identifier appears in text a user will read.
 *
 * Analysis numbers its rules so the PRD can be argued about — BR-06, FR-16a, NFR-02, UC-08. Those
 * identifiers then travel into the build, because the person writing the screen is reading the
 * rule while they write the sentence, and the citation feels like provenance. On the screen it is
 * an artefact of how the document is filed: "Quản lý không thể tự sửa gì ở đây (BR-06)" tells a
 * director nothing they can act on, and tells them the thing they are looking at was assembled
 * from a document they have never seen.
 *
 * On one project four such strings shipped into a demo the client opened, across four screens,
 * each written months apart — which is the signature of a defect that needs a check rather than a
 * reviewer: nobody writes them all in one sitting, so nobody ever sees them together.
 *
 * Comments and props are NOT text: citing the rule beside the code that implements it is exactly
 * where the citation belongs, and this check must never push a team into deleting its provenance.
 * Only string content a user can read is examined.
 *
 *   node internal-reference-check.mjs <dir> [--prefixes BR,FR,NFR,UC,PP]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["internal-reference-check"];

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith("--")) || ".";
const prefixes = (args.includes("--prefixes") ? args[args.indexOf("--prefixes") + 1] : "BR,FR,NFR,UC,PP,US,AC")
  .split(",").map((s) => s.trim()).filter(Boolean);

const ID = new RegExp(`\\b(${prefixes.join("|")})-\\d+[a-z]?\\b`, "g");
const EXT = new Set([".jsx", ".tsx", ".html", ".vue", ".svelte"]);

/** Remove //, /* *​/ and {/* *​/} so a citation beside the code it explains is never a finding. */
function stripComments(src) {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Text nodes between tags, plus the string literals of attributes a user reads aloud. */
function userVisible(src) {
  const out = [];
  const code = stripComments(src);
  for (const m of code.matchAll(/>([^<>{}]*[^\s<>{}][^<>{}]*)</g)) out.push([m[1], m.index]);
  for (const m of code.matchAll(/\b(?:aria-label|title|placeholder|alt)\s*=\s*["']([^"']+)["']/g)) out.push([m[1], m.index]);
  for (const m of code.matchAll(/\{\s*["'`]([^"'`]{4,})["'`]\s*\}/g)) out.push([m[1], m.index]);
  return out;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXT.has(extname(p))) acc.push(p);
  }
  return acc;
}

const findings = [];
for (const file of walk(root)) {
  const src = readFileSync(file, "utf8");
  const lineOf = (text) => {
    const at = src.indexOf(text);
    return at === -1 ? 0 : src.slice(0, at).split("\n").length;
  };
  for (const [text] of userVisible(src)) {
    for (const m of text.matchAll(ID)) {
      findings.push({ file, line: lineOf(text), id: m[0], text: text.trim().slice(0, 90) });
    }
  }
}

if (findings.length === 0) {
  console.log(`internal-reference-check: 0 requirement identifiers in user-visible text (${prefixes.join(", ")})`);
  process.exit(0);
}
console.error(`internal-reference-check: ${findings.length} requirement identifier(s) in text a user reads\n`);
for (const f of findings) console.error(`FINDING  [${CHECKS[0]}] ${f.file}:${f.line}\n         ${f.id} appears in text a user reads: "${f.text}"`);
console.error(`\nThe rule belongs in the sentence; its identifier belongs in the PRD. Cite it in a comment instead.`);
process.exit(1);
