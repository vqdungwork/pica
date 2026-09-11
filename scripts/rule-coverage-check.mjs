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
 * ## Why this ratchets instead of failing
 *
 * Marking 269 rules in one commit would be marking them carelessly, and a suite that is
 * red from the day it lands teaches everyone to ignore the red — which is the same defect
 * as a green tick over nothing, arrived at from the other side.
 *
 * So the backlog is recorded, per file, in `rule-coverage-baseline.json`, and only a
 * number that gets WORSE fails. A file already at zero is locked at zero; a rule file
 * added tomorrow starts at zero and must be marked. The backlog can only go down, and
 * lowering it is a one-line diff that is visible in review.
 *
 * `id-exists` is not in the ratchet and never will be. A marker naming a check that no
 * longer exists is an active false claim, not an unfinished one.
 *
 * Usage: node rule-coverage-check.mjs [packagesDir] [--update] [--accept-regression]
 */
import fs from "fs";
import path from "path";

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = argv.find((a) => !a.startsWith("--")) || path.resolve(HERE, "../packages");
const BASELINE = path.join(HERE, "rule-coverage-baseline.json");
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

/* ------------------------------------------------------------------ the ratchet */
const seeded = fs.existsSync(BASELINE);
const base = seeded
  ? JSON.parse(fs.readFileSync(BASELINE, "utf8"))
  : { unmarkedPerFile: {}, orphans: [] };

const current = { unmarkedPerFile: {}, orphans };
for (const f of ruleFiles) current.unmarkedPerFile[path.relative(ROOT, f)] = 0;
for (const f of findings) if (f.check === "marked") current.unmarkedPerFile[f.where.split(" :: ")[0]]++;

if (flag("--update")) {
  const raised = Object.entries(current.unmarkedPerFile)
    .filter(([f, n]) => n > (base.unmarkedPerFile[f] ?? 0));
  const newOrphans = orphans.filter((id) => !(base.orphans || []).includes(id));
  /* An absent baseline is the initial state, not a regression. Seeding records the
   * backlog as it stands; every later --update is held to the ratchet. */
  if (seeded && (raised.length || newOrphans.length) && !flag("--accept-regression")) {
    console.log("REFUSED  --update would RAISE the backlog, which is the one direction it may not go:");
    for (const [f, n] of raised) console.log(`         ${f}: ${base.unmarkedPerFile[f] ?? 0} -> ${n} unmarked`);
    if (newOrphans.length) console.log(`         new orphan check id(s): ${newOrphans.join(", ")}`);
    console.log("         Mark the rules, or pass --accept-regression and say why in the commit.");
    process.exit(2);
  }
  const before = Object.values(base.unmarkedPerFile || {}).reduce((a, b) => a + b, 0);
  const after = Object.values(current.unmarkedPerFile).reduce((a, b) => a + b, 0);
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
  console.log(seeded
    ? `baseline updated: ${before} -> ${after} unmarked, ` +
      `${(base.orphans || []).length} -> ${orphans.length} orphaned.`
    : `baseline seeded: ${after} unmarked rule(s), ${orphans.length} orphaned check id(s). ` +
      "This is today's backlog, recorded so it can only go down.");
  process.exit(0);
}

/* A finding counts only where it is worse than the recorded backlog. */
const regressions = [];
for (const [f, n] of Object.entries(current.unmarkedPerFile)) {
  const allowed = base.unmarkedPerFile[f] ?? 0;
  if (n > allowed) regressions.push(
    `${f}: ${n} unmarked rule(s), baseline allows ${allowed}. ` +
    (allowed === 0
      ? "This file was fully marked, or is new. Every rule in it needs a marker"
      : "Rules were added without markers, or markers were removed"));
}
const newOrphans = orphans.filter((id) => !(base.orphans || []).includes(id));
for (const id of newOrphans) regressions.push(
  `check "${id}" is new and no rule names it. Write the rule it enforces, or name it in an existing one`);

/* ------------------------------------------------------------------ report */
const backlogUnmarked = Object.values(base.unmarkedPerFile || {}).reduce((a, b) => a + b, 0);
console.log(`rule files:      ${ruleFiles.length}`);
console.log(`rules ("##"):    ${rules}`);
console.log(`check ids:       ${ids.size} across the scripts`);
console.log(`enforced:        ${rules - unmarked - judgement} rule(s) name a check`);
console.log(`judgement:       ${judgement} rule(s) say so explicitly`);
console.log(`backlog:         ${unmarked} unmarked, ${orphans.length} orphaned ` +
  `(baseline ${backlogUnmarked} / ${(base.orphans || []).length}, and may only go down)`);
console.log("");

const table = [
  ["id-exists", badId, `${claimed.size} id(s) named by a rule`, "not ratcheted: a marker naming a dead check is a false claim"],
  ["no-regression", regressions.length, `${ruleFiles.length} file(s) + ${ids.size} check id(s)`, "ratcheted against the baseline"],
];
for (const [n, c, scope, note] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(14)} ${String(c).padStart(3)} finding(s)   (${scope}) — ${note}`);

const hard = findings.filter((f) => f.check === "id-exists");
if (hard.length || regressions.length) console.log("");
for (const f of hard) console.log(`FINDING  [id-exists] ${f.where}\n         ${f.detail}`);
for (const r of regressions) console.log(`FINDING  [no-regression] ${r}`);

if (unmarked || orphans.length) {
  console.log("");
  console.log(`NOTE     ${unmarked} rule(s) still carry no marker and ${orphans.length} check id(s) are named`);
  console.log("         by no rule. Both are inside the baseline, so this is a tracked backlog rather");
  console.log("         than a pass: an operator reading those rules still cannot tell which hold.");
  console.log("         Run with --update after marking some to lower the number.");
}

const total = hard.length + regressions.length;
console.log(`\n${total} finding(s). ${total
  ? "The rules and the scripts disagree about what is enforced."
  : "Nothing regressed. Every marker names a check that exists."}`);
process.exit(total ? 1 : 0);
