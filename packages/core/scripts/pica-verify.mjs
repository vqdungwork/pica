/**
 * pica-verify.mjs: every applicable check, once, in phase order, in one table.
 *
 * Until this existed, verifying a pica project meant 28 separate node invocations and
 * assembling the picture yourself. Nothing ran the checks: `pica-status` says what CAN
 * run and this runs it. A check that is tedious to run is a check that gets skipped, and
 * a skipped check is not a pass.
 *
 * It carries no list of its own. Every check, its arguments, its phase and what it needs
 * are declared in the owning package's `package.json`, and this reads them there. A
 * second list of what to run is exactly the drift this project keeps finding in itself:
 * the copy is always the one nothing reads.
 *
 * Three verdicts, and the difference between the last two is the whole point:
 *
 *   pass     the check ran and found nothing
 *   FAIL     the check ran and found something
 *   abstain  the project does not carry what the check reads, so it did not run
 *
 * An abstention is never counted as a pass. It is counted, named, and told what would
 * make it run, which is also the adoption path for a project that predates a check.
 *
 * Usage:
 *   node pica-verify.mjs [state.json] [--phase <name>] [--adopt] [--evidence] [--json]
 *
 *   --phase <name>   only this phase: intake, discover, research, value, analyse,
 *                    design, scope, estimate, architect, build, close
 *   --adopt          print what a project would have to record to stop abstaining,
 *                    in the order the chain would ask for it
 *   --evidence       print every assertion that passed, not only the count. This is what
 *                    a client review quotes: a green run otherwise says "0 findings",
 *                    which is the least informative true thing available
 *   --json           machine-readable, for a pipeline
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const statePath = argv.find((a) => !a.startsWith("--") && a !== opt("--phase")) || ".pica/state.json";
const ONLY_PHASE = opt("--phase");
const ADOPT = flag("--adopt");
const EVIDENCE = flag("--evidence");
const JSON_OUT = flag("--json");

/* ---- find pica's own packages ------------------------------------------- *
 * Resolved by walking up from THIS script and validating, never by counting path
 * segments: the same reason pica-status does it this way. State belongs to the project,
 * packages belong to pica, and on a real project those are different trees. */
const here = path.dirname(fileURLToPath(import.meta.url));
let PKG = null;
for (let d = here, i = 0; i < 6; i++, d = path.dirname(d)) {
  const c = path.join(d, "packages");
  if (fs.existsSync(path.join(c, "core", "package.json"))) { PKG = c; break; }
  if (path.basename(d) === "scripts" && fs.existsSync(path.join(path.dirname(d), "package.json"))) {
    /* Installed layout: each package is its own tree, so the siblings are one level up
     * from the package directory rather than inside a packages/ folder. */
    const sib = path.dirname(path.dirname(d));
    if (fs.existsSync(sib)) { PKG = sib; }
  }
}
if (!PKG) {
  console.error("FAIL  could not locate pica's packages from " + here + ".");
  console.error("      Nothing was verified, and that is not a pass.");
  process.exit(2);
}

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  console.error("      Nothing was verified, and that is not a pass.");
  process.exit(2);
}

const PROJECT = path.dirname(path.dirname(path.resolve(statePath)));
const PHASES = ["intake", "discover", "research", "value", "analyse", "design",
  "scope", "estimate", "architect", "build", "close"];

/* ---- collect the checks the packages declare ---------------------------- */
const checks = [];
const missingPackages = [];
for (const entry of fs.readdirSync(PKG)) {
  const manifest = path.join(PKG, entry, "package.json");
  let dir = path.join(PKG, entry);
  if (!fs.existsSync(manifest)) {
    /* Installed layout: pica-html/1.0.3/package.json */
    const versions = fs.existsSync(dir) && fs.statSync(dir).isDirectory()
      ? fs.readdirSync(dir).filter((v) => fs.existsSync(path.join(dir, v, "package.json"))).sort()
      : [];
    if (!versions.length) continue;
    dir = path.join(dir, versions[versions.length - 1]);
  }
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")); } catch { continue; }
  for (const c of j.checks || []) {
    if (!c.args || !c.phase) continue;
    const script = path.join(dir, "scripts", c.run);
    if (!fs.existsSync(script)) { missingPackages.push(`${j.name}/${c.run}`); continue; }
    checks.push({ pkg: j.name, run: c.run, script, args: c.args, phase: c.phase,
      needs: c.needs || [], passes: c.passes || "0 findings" });
  }
}

/* ---- is a check applicable ---------------------------------------------- *
 * A `needs` entry is a state key, or an `@path` on disk, and `a|b` means either will do.
 * This is what separates an abstention from a failure, and getting it wrong in either
 * direction is the whole cost: too strict and a real gap reads as "not applicable", too
 * loose and a project that has not reached a phase reads as broken. */
const nonEmpty = (v) => v !== undefined && v !== null && v !== ""
  && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
const met = (term) => term.startsWith("@")
  ? fs.existsSync(path.resolve(PROJECT, term.slice(1)))
  : nonEmpty(state[term]);
const why = (needs) => needs.map((n) => n.split("|").map((t) => t.startsWith("@") ? t.slice(1) : `state.${t}`).join(" or ")).join(", ");
const applicable = (c) => c.needs.every((n) => n.split("|").some(met));

const SUB = { "<state>": path.relative(PROJECT, path.resolve(statePath)) || ".pica/state.json",
  "<ref>": ".audit/html-reference.json", "<src>": "src", "<repo>": ".",
  "<tokens>": "tokens/tokens.json", "<review>": "html/review.html" };
const argsOf = (c) => c.args.split(/\s+/).map((a) => SUB[a] ?? a);

const scoped = checks.filter((c) => !ONLY_PHASE || c.phase === ONLY_PHASE);
if (ONLY_PHASE && !PHASES.includes(ONLY_PHASE)) {
  console.error(`FAIL  "${ONLY_PHASE}" is not a phase. One of: ${PHASES.join(", ")}`);
  process.exit(2);
}

/* ---- run them, in parallel ---------------------------------------------- *
 * Sequentially this was 28 node processes each re-reading the same state and the same
 * capture, which was slow enough that people ran a subset instead. */
const run = (c) => new Promise((resolve) => {
  execFile("node", [c.script, ...argsOf(c)], { cwd: PROJECT, maxBuffer: 64 * 1024 * 1024 },
    (err, stdout, stderr) => {
      const out = (stdout || "") + (stderr || "");
      const code = err ? (typeof err.code === "number" ? err.code : 1) : 0;
      resolve({ ...c, code, out });
    });
});

const todo = scoped.filter(applicable);
const abstained = scoped.filter((c) => !applicable(c));
const results = await Promise.all(todo.map(run));

/* Each check prints its own table of `pass  <id>  N finding(s)   (scope)` rows. Those
 * rows are the assertions, and they are what a green run should be able to show. */
const ROW = /^(pass|FAIL)\s+([a-z][a-z0-9-]*)\s+(\d+)\s+finding/gm;
const assertionsOf = (out) => [...out.matchAll(ROW)].map((m) => ({ verdict: m[1], id: m[2], n: Number(m[3]) }));

let passed = 0, failed = 0, assertPass = 0, assertFail = 0;
const byPhase = new Map();
for (const r of results) {
  const a = assertionsOf(r.out);
  assertPass += a.filter((x) => x.verdict === "pass").length;
  assertFail += a.filter((x) => x.verdict === "FAIL").length;
  if (r.code === 0) passed++; else failed++;
  if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
  byPhase.get(r.phase).push({ ...r, assertions: a });
}
for (const c of abstained) {
  if (!byPhase.has(c.phase)) byPhase.set(c.phase, []);
  byPhase.get(c.phase).push({ ...c, code: null, out: "", assertions: [] });
}

if (JSON_OUT) {
  console.log(JSON.stringify({
    project: PROJECT, phase: ONLY_PHASE || "all",
    checks: { total: scoped.length, ran: results.length, passed, failed, abstained: abstained.length },
    assertions: { passed: assertPass, failed: assertFail },
    results: [...byPhase.entries()].map(([phase, rows]) => ({ phase, rows: rows.map((r) => ({
      pkg: r.pkg, run: r.run, verdict: r.code === null ? "abstain" : r.code === 0 ? "pass" : "fail",
      needs: r.needs, assertions: r.assertions })) })),
  }, null, 2));
  process.exit(failed ? 1 : 0);
}

/* ---- the table ---------------------------------------------------------- */
const mark = (code) => code === null ? "abstain" : code === 0 ? "pass" : (code === 2 ? "no input" : "FAIL");
console.log("");
for (const phase of PHASES) {
  const rows = byPhase.get(phase);
  if (!rows || !rows.length) continue;
  console.log(`${phase.toUpperCase()}`);
  for (const r of rows.sort((a, b) => a.run.localeCompare(b.run))) {
    const n = r.assertions.filter((x) => x.verdict === "FAIL").reduce((s, x) => s + x.n, 0);
    const detail = r.code === null
      ? `needs ${why(r.needs)}`
      : r.code === 2
        ? (r.out.trim().split("\n")[0] || "").replace(/^FAIL\s+/, "").slice(0, 62)
        : r.code === 0
          ? `${r.assertions.length} assertion(s)`
          : `${n} finding(s) across ${r.assertions.filter((x) => x.verdict === "FAIL").length} check(s)`;
    console.log(`  ${mark(r.code).padEnd(8)} ${r.run.replace(/\.mjs$/, "").padEnd(23)} ${detail}`);
    if (EVIDENCE && r.code === 0)
      for (const a of r.assertions) console.log(`             · ${a.id}`);
    if (r.code === 1)
      for (const a of r.assertions.filter((x) => x.verdict === "FAIL"))
        console.log(`             × ${a.id}: ${a.n} finding(s)`);
  }
  console.log("");
}

if (missingPackages.length) {
  console.log("NOT RUN, because the package does not ship the script here:");
  for (const m of missingPackages) console.log(`  ${m}`);
  console.log("  A check that cannot run is not a pass, and this is the shape that absence takes.\n");
}

if (ADOPT && abstained.length) {
  console.log("TO STOP ABSTAINING, in the order the chain asks for it:\n");
  const seen = new Set();
  for (const phase of PHASES)
    for (const c of abstained.filter((x) => x.phase === phase)) {
      const k = why(c.needs);
      if (seen.has(k)) continue; seen.add(k);
      console.log(`  ${phase.padEnd(10)} record ${k}`);
      console.log(`             then ${c.run.replace(/\.mjs$/, "")} runs\n`);
    }
  console.log("  Nothing here is a failure. A project that predates a check has not broken it, and");
  console.log("  the difference between those two is the only reason this command has three verdicts.\n");
}

const line = `${passed} passed, ${failed} failed, ${abstained.length} abstained`;
const asserts = `${assertPass} assertion(s) verified${assertFail ? `, ${assertFail} breached` : ""}`;
console.log(`${scoped.length} check(s)${ONLY_PHASE ? ` in phase ${ONLY_PHASE}` : ""}: ${line}.`);
console.log(`${asserts}.`);
if (abstained.length && !ADOPT)
  console.log(`Run with --adopt to see what ${abstained.length} abstention(s) would need. An abstention is not a pass.`);
if (!failed && !EVIDENCE && assertPass)
  console.log("Run with --evidence to list every assertion that passed, which is what a review quotes.");
process.exit(failed ? 1 : 0);
