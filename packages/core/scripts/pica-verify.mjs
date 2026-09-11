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
 *   --phase <name>   only this phase: intake, discover, research, analyse,
 *                    design, scope, close
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

/* Two layouts, and only one of them is the one users have.
 *
 * In the repository a package is packages/core, so the siblings are packages/.
 * Installed, a package is pica-core/<version>, so the siblings are one level ABOVE the
 * versioned parent. An earlier version of this walk stopped at the versioned parent and
 * found three checks instead of twenty-seven: it read only core's own manifest and
 * reported a clean run over a project it had barely looked at, which is the worst
 * possible failure for this file. */
let pkgRoot = null;
for (let d = here, i = 0; i < 4; i++, d = path.dirname(d))
  if (fs.existsSync(path.join(d, "package.json"))) { pkgRoot = d; break; }
let PKG = null;
if (pkgRoot) {
  const parent = path.dirname(pkgRoot);
  PKG = path.basename(parent) === "packages" ? parent : path.dirname(parent);
}
/* Whichever layout it is, it has to contain more than one pica package, or the walk
 * landed somewhere that merely looks right. */
const looksRight = (root) => {
  if (!root || !fs.existsSync(root)) return false;
  let n = 0;
  for (const e of fs.readdirSync(root)) {
    const dir = path.join(root, e);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.existsSync(path.join(dir, "package.json"))) { n++; continue; }
    if (fs.readdirSync(dir).some((v) => fs.existsSync(path.join(dir, v, "package.json")))) n++;
  }
  return n >= 2;
};
if (!looksRight(PKG)) PKG = null;

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
/* 2.0.0 deleted four: value, estimate, architect and build. A phase nothing can be in is a
 * lane --phase still accepts and a heading the table still prints empty, which reads as
 * "nothing to do here" rather than "this no longer exists". */
const PHASES = ["intake", "discover", "research", "analyse", "design", "scope", "close"];

/* ---- collect the checks the packages declare ---------------------------- */
const checks = [];
const missingPackages = [];
const unplaced = [];
const elsewhere = [];
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
    /* A declared check this cannot place is NAMED, never skipped in silence. Two of
     * pica's own checks are pasted into a use_figma call and run in Figma's plugin
     * runtime, so node cannot invoke them; three more had no args at all and this file
     * quietly ignored them, which is the same fail-open shape that made it report three
     * checks of twenty-seven. */
    if (c.runsIn && c.runsIn !== "node") { elsewhere.push(`${j.name}/${c.run} runs in ${c.runsIn}`); continue; }
    if (!c.args || !c.phase) { unplaced.push(`${j.name}/${c.run}`); continue; }
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
  "<tokens>": "tokens/tokens.json", "<review>": "html/review.html",
  /* Two checks declared placeholders this map never had. foundations-check was handed
   * the literal string "<designSystem>" as a path, could not read it, printed its own
   * "This is an abstention, not a pass", and exited 0 — which this runner rendered as
   * `pass`. Given its real arguments on the project that found this, it returns 111
   * findings. A placeholder with no substitution is a bug in THIS file, so `argsOf`
   * now refuses rather than passing the angle brackets through as a filename. */
  "<designSystem>": "html/design-system.html", "<structureDir>": "html" };
const unsubstituted = [];
const argsOf = (c) => c.args.split(/\s+/).map((a) => {
  if (/^<[^>]+>$/.test(a) && !(a in SUB)) { unsubstituted.push(`${c.pkg}/${c.run} needs ${a}`); return null; }
  return SUB[a] ?? a;
});

/* Matches the abstention notice the checks themselves emit. */
const ABSTAINED_RE = /\bthis is an abstention,? not a pass\b|\bNOT a pass\b|\bdid NOT run\b|\bcould not be (read|parsed)\b/i;
let internallyAbstained = 0;

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
  /* A check that could not read its input says so and exits 0, because exiting non-zero
   * would mean "ran and found defects". Deciding the verdict from the exit code alone
   * turned every such abstention into a green row. The checks already print the
   * sentence; this reads it. */
  if (r.code === 0 && ABSTAINED_RE.test(r.out)) { r.abstainedInternally = true; internallyAbstained++; }
  else if (r.code === 0) passed++; else failed++;
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
const mark = (code, row) => row && row.abstainedInternally ? "ABSTAIN"
  : code === null ? "abstain" : code === 0 ? "pass" : (code === 2 ? "no input" : "FAIL");
console.log("");
/* PHASES is a display order, not a filter. Three checks declared phases absent from it
 * ("build", and two with none at all) and were never printed — the same fail-open shape
 * as a capture that reports a total while hiding a per-source zero. Anything the list
 * does not name is printed after it, under its own heading. */
const EXTRA_PHASES = [...byPhase.keys()].filter((p) => !PHASES.includes(p)).sort();
let rowsPrinted = 0;
for (const phase of [...PHASES, ...EXTRA_PHASES]) {
  const rows = byPhase.get(phase);
  if (!rows || !rows.length) continue;
  console.log(`${phase.toUpperCase()}`);
  for (const r of rows.sort((a, b) => a.run.localeCompare(b.run))) {
    const n = r.assertions.filter((x) => x.verdict === "FAIL").reduce((s, x) => s + x.n, 0);
    const detail = r.code === null
      ? `needs ${why(r.needs)}`
      : r.code === 2
        ? (r.out.trim().split("\n")[0] || "").replace(/^FAIL\s+/, "").slice(0, 62)
        : r.abstainedInternally
          ? ((r.out.split("\n").find((l) => ABSTAINED_RE.test(l)) || "could not read its input").trim().slice(0, 62))
        : r.code === 0
          ? `${r.assertions.length} assertion(s)`
          : `${n} finding(s) across ${r.assertions.filter((x) => x.verdict === "FAIL").length} check(s)`;
    rowsPrinted++;
    console.log(`  ${mark(r.code, r).padEnd(8)} ${r.run.replace(/\.mjs$/, "").padEnd(23)} ${detail}`);
    if (EVIDENCE && r.code === 0)
      for (const a of r.assertions) console.log(`             · ${a.id}`);
    if (r.code === 1)
      for (const a of r.assertions.filter((x) => x.verdict === "FAIL"))
        console.log(`             × ${a.id}: ${a.n} finding(s)`);
  }
  console.log("");
}

if (missingPackages.length || unplaced.length || elsewhere.length) {
  console.log("NOT RUN BY THIS COMMAND, and named rather than left silent:");
  for (const m of missingPackages) console.log(`  ${m}  the package does not ship the script here`);
  for (const m of unplaced) console.log(`  ${m}  declared with no args or phase, so nothing could place it`);
  for (const m of elsewhere) console.log(`  ${m}`);
  console.log("  A check that cannot run is not a pass. The ones above are not counted in either");
  console.log("  direction, and a runner that hid them would be reporting a fraction as a whole.\n");
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

/* Three assertions about the RUN, not about the project. Each was a silent failure:
 * a placeholder passed through as a filename, a check that abstained and read as green,
 * and rows that were never printed at all. A runner that cannot be trusted to report a
 * failure cannot be used to verify a fix to itself. */
const runFaults = [];
if (unsubstituted.length)
  runFaults.push(`${unsubstituted.length} check(s) declare a placeholder this runner cannot substitute: ${unsubstituted.join("; ")}`);
/* A check that failed and whose output this could not parse is a DIALECT MISMATCH, and
 * it erases the contents of a real failure: flow-check printed "  ok  <id>  N" and was
 * aggregated as "FAIL flow-check 0 finding(s) across 0 check(s)". Detecting it costs
 * nothing and catches any future check that drifts from the row format. */
const mute = results.filter((r) => r.code === 1 && !r.abstainedInternally && !assertionsOf(r.out).length);
if (mute.length)
  runFaults.push(`${mute.length} check(s) failed and printed no row this runner could parse, so their `
    + `findings are reported as zero: ${mute.map((r) => r.run.replace(/\.mjs$/, "")).join(", ")}. `
    + `Every check prints \`pass|FAIL  <id>  N finding(s)   (scope)\``);
if (rowsPrinted !== results.length + abstained.length)
  runFaults.push(`${results.length + abstained.length} check(s) resolved and ${rowsPrinted} row(s) printed. A check that is registered and never shown is indistinguishable from one that passed`);

const line = `${passed} passed, ${failed} failed, ${abstained.length + internallyAbstained} abstained`;
const asserts = `${assertPass} assertion(s) verified${assertFail ? `, ${assertFail} breached` : ""}`;
console.log(`${scoped.length} check(s)${ONLY_PHASE ? ` in phase ${ONLY_PHASE}` : ""}: ${line}.`);
console.log(`${asserts}.`);
if (internallyAbstained)
  console.log(`${internallyAbstained} check(s) ran, could not read their input, and said so. Shown as ABSTAIN, never as pass.`);
if (abstained.length && !ADOPT)
  console.log(`Run with --adopt to see what ${abstained.length} abstention(s) would need. An abstention is not a pass.`);
if (!failed && !EVIDENCE && assertPass)
  console.log("Run with --evidence to list every assertion that passed, which is what a review quotes.");

if (runFaults.length) {
  console.log("\nTHIS RUNNER IS NOT REPORTING HONESTLY:");
  for (const f of runFaults) console.log(`  ${f}`);
  console.log("  Fix the runner before reading anything above as a result.");
}
process.exit(failed || runFaults.length ? 1 : 0);
