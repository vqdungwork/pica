/**
 * pre-gate-lens-check.mjs: one evaluator ran BEFORE the package was approved.
 *
 * Evaluation runs after approval by construction. On the project this check came from it
 * found all eight blockers — after all seven packages were already marked htmlApproved —
 * and the full five-lens fan-out took seventeen minutes. Five of the eight shared one
 * cause, visible on a single screen.
 *
 * So the cheapest step in the whole flow was scheduled last, and everything it found had
 * to be re-opened through a gate that had already closed. That is not an evaluation
 * problem. It is an ordering problem, and the fix costs one lens.
 *
 * `/pica-wp` now runs ONE lens before GATE 5 and records it:
 *
 *     "workPackages": { "pos": {
 *       "htmlApproved": true,
 *       "approvedOn": "2026-09-11",
 *       "preGateLens": { "lens": "Error prevention, recovery, undo",
 *                        "on": "2026-09-10", "findings": 6,
 *                        "report": "docs/reviews/pos-pre-gate.md" } } }
 *
 * This check asserts three things about that record, and each one is a way the record
 * could be true and worthless:
 *
 *   1. PRESENT     an approved package has one. Without it the ordering is a habit.
 *   2. BEFORE      it is dated on or before the approval. A lens run afterwards is the
 *                  old ordering with a new key, and reads identically in the state file.
 *   3. REPORTED    it names a report that exists on disk. "findings: 0" with nothing
 *                  behind it is the pass-over-nothing this flow keeps producing; a lens
 *                  that found nothing still wrote down where it looked.
 *
 * It deliberately does NOT require findings > 0. An evaluator who finds nothing on a
 * genuinely clean package is the outcome we want, and a check that rewarded findings
 * would reward inventing them.
 *
 * Usage: node pre-gate-lens-check.mjs <state.json> [projectDir]
 */
import fs from "fs";
import path from "path";

const [, , statePath, projectArg] = process.argv;
if (!statePath) {
  console.error("usage: node pre-gate-lens-check.mjs <state.json> [projectDir]");
  process.exit(2);
}
let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  could not read ${statePath} (${e.message}).`);
  process.exit(2);
}
const PROJECT = projectArg || path.resolve(path.dirname(path.resolve(statePath)), "..");

const wps = Object.entries(state.workPackages || {});
const approved = wps.filter(([, w]) => w && w.htmlApproved);

/* A check that reports zero because there was nothing to check is the failure this whole
 * round of work exists to end, so say which it is. */
if (!wps.length) {
  console.log("work packages:   0 declared");
  console.log("\nABSTAIN  state.workPackages is empty, so no package could be checked.");
  console.log("         This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const day = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

let present = 0, ordered = 0, reported = 0;
for (const [name, w] of approved) {
  const g = w.preGateLens;
  if (!g || typeof g !== "object") {
    fail("pre-gate-lens", name,
      "was approved with no `preGateLens` record. One evaluator lens runs before the gate, not after: " +
      "on the project this came from, evaluation found all eight blockers once every package was " +
      "already approved, and five of them shared one cause visible on one screen");
    continue;
  }
  present++;

  const on = day(g.on), appr = day(w.approvedOn);
  if (!on) {
    fail("pre-gate-lens", `${name}.preGateLens.on`,
      `is ${JSON.stringify(g.on ?? null)}, not a date. Without one, "before the gate" is unverifiable ` +
      "and the record asserts only that somebody filled in a key");
  } else if (!appr) {
    fail("pre-gate-lens", `${name}.approvedOn`,
      "is missing, so the lens cannot be shown to have run before approval. Record the date the human " +
      "approved the package alongside the flag");
  } else if (on > appr) {
    fail("pre-gate-lens", name,
      `ran on ${on} and the package was approved on ${appr}. A lens run after the gate is the old ` +
      "ordering under a new key, and the two read identically in the state file");
  } else ordered++;

  if (typeof g.lens !== "string" || !g.lens.trim()) {
    fail("pre-gate-lens", `${name}.preGateLens.lens`,
      "does not name which lens ran. Five lenses look for different things and a record that omits " +
      "which one was used cannot tell you what was NOT looked for");
  }
  const rel = typeof g.report === "string" ? g.report.trim() : "";
  if (!rel) {
    fail("pre-gate-lens", `${name}.preGateLens.report`,
      "names no report. A lens that found nothing still wrote down where it looked, and a findings " +
      "count with nothing behind it is a number nobody can check");
  } else if (!fs.existsSync(path.resolve(PROJECT, rel))) {
    fail("pre-gate-lens", `${name}.preGateLens.report`,
      `names ${rel}, which does not exist under ${path.relative(process.cwd(), PROJECT) || "."}. ` +
      "A record pointing at a missing report claims an evaluation that cannot be read");
  } else reported++;
}

console.log(`work packages:   ${wps.length} declared, ${approved.length} approved`);
console.log(`pre-gate lens:   ${present} recorded, ${ordered} provably before the gate, ${reported} with a report on disk`);
if (!approved.length)
  console.log("                 (no package is approved yet, so nothing could have been gated early)");
console.log("");

const table = [["pre-gate-lens", findings.length, `${approved.length} approved package(s)`]];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(14)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) console.log("");
for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);

console.log(`\n${findings.length} finding(s). ${findings.length
  ? "A package was approved before anyone looked at it with an evaluator's eye."
  : approved.length
    ? "Every approved package was seen by one lens first."
    : "No package is approved yet."}`);
process.exit(findings.length ? 1 : 0);
