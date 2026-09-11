/**
 * rule-coverage-check.mjs: which rules are enforced, and which are advice.
 *
 * pica's rules are written from real failures and they explain their reasoning. The
 * problem is not their quality. It is that roughly two thirds of them have no
 * executable behind them, and a reader cannot tell which third does — because the green
 * table looks identical either way. An operator follows all of them equally, and finds
 * out afterwards which ones the gate was actually holding.
 *
 * The fix is not to enforce everything. Some rules are genuinely judgement and should
 * stay judgement. The fix is to SAY WHICH, next to the rule, and to keep that honest as
 * the scripts change.
 *
 * Each `##` heading in a rules file carries one marker on the line beneath it:
 *
 *     <!-- enforced-by: overflow, tall-screen-pair -->
 *     <!-- enforced-by: none — judgement, not decidable by a script -->
 *
 * Three checks:
 *
 *   1. MARKED       every rule carries a marker. An unmarked rule is the status quo:
 *                   the reader cannot tell.
 *   2. ID EXISTS    every check id named actually exists in some script. A marker
 *                   pointing at a check that was renamed or deleted is worse than none,
 *                   because it claims cover that is gone.
 *   3. NOT ORPHANED every check id that exists is claimed by some rule, or the script
 *                   is enforcing something nobody wrote down.
 *
 * Usage: node rule-coverage-check.mjs [packagesDir]
 */
import fs from "fs";
import path from "path";

const ROOT = process.argv[2] || path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../");
if (!fs.existsSync(ROOT)) {
  console.error(`FAIL  no packages directory at ${ROOT}`);
  process.exit(2);
}

/* every check id any script can print */
const ids = new Map();
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git/.test(e.name)) walk(p); continue; }
    if (!e.name.endsWith(".mjs")) continue;
    const src = fs.readFileSync(p, "utf8");
    /* Checks announce an id four ways, and an extractor that knew only one reported
     * real ids as missing — which would have made a correct marker look like a stale
     * one, the exact failure this check exists to prevent. */
    for (const m of src.matchAll(/\b(?:fail|add)\(\s*["']([a-z][a-z0-9-]*)["']/g)) ids.set(m[1], e.name);
    for (const m of src.matchAll(/\[\s*["']([a-z][a-z0-9-]*)["']\s*,\s*[A-Za-z_$][\w$]*\s*,/g)) ids.set(m[1], e.name);
    /* a literal list of check names, as flow-check declares */
    for (const m of src.matchAll(/const\s+CHECKS\s*=\s*\[([\s\S]*?)\]/g))
      for (const q of m[1].matchAll(/["']([a-z][a-z0-9-]*)["']/g)) ids.set(q[1], e.name);
  }
};
walk(ROOT);

const ruleFiles = [];
const findRules = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git/.test(e.name)) findRules(p); continue; }
    if (e.name.endsWith(".md") && /\/rules\//.test(p)) ruleFiles.push(p);
  }
};
findRules(ROOT);

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const claimed = new Set();
let rules = 0, unmarked = 0, badId = 0, judgement = 0;

for (const f of ruleFiles) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const rel = path.relative(ROOT, f);
  for (let i = 0; i < lines.length; i++) {
    const h = /^## (.+)$/.exec(lines[i]);
    if (!h) continue;
    rules++;
    const marker = (lines.slice(i + 1, i + 4).join("\n")
      .match(/<!--\s*enforced-by:\s*([^>]*?)\s*-->/) || [])[1];
    if (!marker) {
      unmarked++;
      fail("marked", `${rel} :: ${h[1].slice(0, 58)}`,
        "carries no enforced-by marker, so a reader cannot tell whether a check holds it or whether " +
        "it is advice. Add `<!-- enforced-by: <ids> -->` or `<!-- enforced-by: none — <why> -->`");
      continue;
    }
    if (/^none\b/i.test(marker)) {
      judgement++;
      if (!/—|--|:/.test(marker))
        fail("marked", `${rel} :: ${h[1].slice(0, 58)}`,
          '"none" with no reason. A rule nobody enforces is advice, and saying why keeps it honest');
      continue;
    }
    for (const id of marker.split(/[,\s]+/).filter(Boolean)) {
      if (!ids.has(id)) {
        badId++;
        fail("id-exists", `${rel} :: ${h[1].slice(0, 44)}`,
          `names check "${id}", which no script prints. A marker pointing at a check that was renamed ` +
          "or removed claims cover that is gone, which is worse than claiming none");
      } else claimed.add(id);
    }
  }
}

const orphans = [...ids.keys()].filter((id) => !claimed.has(id)).sort();

console.log(`rule files:      ${ruleFiles.length}`);
console.log(`rules ("##"):    ${rules}`);
console.log(`check ids:       ${ids.size} across the scripts`);
console.log(`enforced:        ${rules - unmarked - judgement} rule(s) name a check`);
console.log(`judgement:       ${judgement} rule(s) say so explicitly`);
console.log("");
const table = [
  ["marked", unmarked, `${rules} rules`],
  ["id-exists", badId, `${claimed.size} id(s) named by a rule`],
  ["not-orphaned", orphans.length, `${ids.size} check id(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(14)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (orphans.length) {
  console.log("");
  console.log(`FINDING  [not-orphaned] ${orphans.length} check id(s) are enforced by a script and named by no rule:`);
  console.log(`         ${orphans.slice(0, 24).join(", ")}${orphans.length > 24 ? ", …" : ""}`);
  console.log("         A check with no rule behind it is a constraint nobody agreed to, and the");
  console.log("         operator meets it as a surprise at the gate.");
}
if (findings.length) {
  console.log("");
  for (const f of findings.slice(0, 25)) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
  if (findings.length > 25) console.log(`... and ${findings.length - 25} more`);
}
const total = findings.length + orphans.length;
console.log(`\n${total} finding(s). ${total ? "The rules and the scripts disagree about what is enforced." : "Every rule says whether it is enforced, and every check is named by a rule."}`);
process.exit(total ? 1 : 0);
