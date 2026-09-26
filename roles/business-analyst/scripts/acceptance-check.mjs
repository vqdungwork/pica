#!/usr/bin/env node
// A requirement nobody can test is a wish. Top-tier BA practice attaches acceptance criteria to
// every functional requirement — the condition under which a reviewer says "this is done".
//
// This ratchets rather than gates: a project that already has requirements without criteria is
// not broken retroactively, but it may never grow a new one. The baseline is the count on the
// day the check was adopted, and the only legal direction is down.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const statePath = process.argv[2] ?? ".pica/state.json";
const S = JSON.parse(readFileSync(statePath, "utf8"));
const basePath = join(dirname(statePath), "acceptance-baseline.json");
const CHECKS = ["acceptance-coverage-regressed", "acceptance-restates-the-requirement", "acceptance-too-thin"];
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

const reqs = Array.isArray(S.requirements) ? S.requirements : [];
// non-functional requirements state a number and are their own criterion; functional ones are not
const testable = reqs.filter((r) => r.class !== "nonFunctional" && !/^NF/.test(String(r.id ?? "")));
const missing = testable.filter((r) => {
  const ac = r.acceptanceCriteria ?? r.acceptance;
  return !Array.isArray(ac) || ac.length === 0;
});

// shape, for the ones that do have criteria: a criterion is a condition, not a restatement
for (const r of testable) {
  for (const c of r.acceptanceCriteria ?? r.acceptance ?? []) {
    const t = typeof c === "string" ? c : `${c.given ?? ""} ${c.when ?? ""} ${c.then ?? ""}`;
    if (t.trim().length < 12) fail("acceptance-too-thin", `${r.id}: "${String(t).trim()}" says nothing a reviewer could check`);
    if (/^(the system|hệ thống)?\s*(must|should|phải|nên)\b/i.test(t.trim()))
      fail("acceptance-restates-the-requirement", `${r.id}: "${String(t).trim().slice(0, 60)}…" repeats the requirement instead of naming the condition that proves it`);
  }
}

/* A check writes nothing unless it is asked to. The first version adopted its own baseline on
 * sight, which meant running it left the project changed — and the mutation suite, which restores
 * every file it touched and compares, reported the check as having dirtied the fixture. A check
 * that edits the thing it is checking cannot be run twice and mean the same thing both times. */
const ADOPT = process.argv.includes("--adopt") || process.argv.includes("--update");
const write = (n) => writeFileSync(basePath, JSON.stringify({ missing: n, adopted: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
const baseline = existsSync(basePath) ? JSON.parse(readFileSync(basePath, "utf8")).missing : null;
if (baseline === null) {
  if (ADOPT) { write(missing.length); console.log(`acceptance-check: baseline adopted at ${missing.length}`); }
  else console.log(`acceptance-check: no baseline yet — ${missing.length} of ${testable.length} functional requirement(s) carry no acceptance criteria. Run with --adopt to freeze that as the ceiling.`);
} else if (missing.length > baseline) {
  fail("acceptance-coverage-regressed",
    `${missing.length} functional requirement(s) have no acceptance criteria, up from the baseline of ${baseline}: ${missing.slice(0, 6).map((r) => r.id).join(", ")}`);
} else if (missing.length < baseline) {
  if (ADOPT) { write(missing.length); console.log(`acceptance-check: baseline tightened ${baseline} → ${missing.length}`); }
  else console.log(`acceptance-check: ${baseline - missing.length} requirement(s) became testable since the baseline. Run with --adopt to lower it to ${missing.length}.`);
}

/* The runner's row contract: one `pass|FAIL  <id>  N finding(s)   (scope)` per assertion, so
 * pica-verify counts what was verified rather than reporting a clean run as "0 assertion(s)". */
for (const id of CHECKS) {
  const n = fails.filter((x) => x.startsWith(`  [${id}]`)).length;
  console.log(`${n ? "FAIL" : "pass"}  ${id.padEnd(28)} ${String(n).padStart(3)} finding(s)   (${`${testable.length} functional requirement(s)`})`);
}
if (fails.length) {
  console.error("acceptance-check FAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`acceptance-check: ${testable.length - missing.length}/${testable.length} functional requirement(s) are testable`);
