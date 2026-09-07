/**
 * mutate.mjs — this repository proving its own claim.
 *
 * The README says "every one has been seen to fail on the defect it was written for", and
 * until 0.9.5 that was true and unverifiable: the suites were run ad hoc in a scratch
 * directory and never committed, so the one claim that makes a check count for anything
 * rested on somebody's word.
 *
 * It runs against ANY pica project rather than a fixture committed here, because a
 * fixture in this repository would be somebody's project and this repository ships the
 * method and nothing else. `--fixture` generates a minimal generic one when you have no
 * project to hand.
 *
 * Two directions, and the second is the half people skip:
 *
 *   1. the defect is CAUGHT       reintroduce it, and the named check fires
 *   2. nothing else co-fires      and the unmutated project still passes clean
 *
 * A check that fires on everything is as useless as one that fires on nothing, and a
 * co-fire sends whoever reads the report to the wrong place.
 *
 * Usage:
 *   node scripts/mutate.mjs <project-dir>      run against a real pica project
 *   node scripts/mutate.mjs --fixture          generate a minimal one and run against it
 *   node scripts/mutate.mjs <dir> --only trace-check
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = path.join(ROOT, "packages");
const args = process.argv.slice(2);
const FIXTURE = args.includes("--fixture");
const onlyAt = args.indexOf("--only");
const ONLY = onlyAt >= 0 ? args[onlyAt + 1] : null;
let DIR = args.find((a) => !a.startsWith("--") && a !== ONLY);

/* ---- the fixture ---------------------------------------------------------- *
 * Deliberately thin and deliberately generic. It exists so this suite runs with no
 * project to hand, not so it stands in for one: a real project has screens, and the
 * checks that read a capture are skipped here and SAID to be skipped. */
function makeFixture() {
  const d = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "pica-mutate-"));
  fs.mkdirSync(path.join(d, ".pica"), { recursive: true });
  fs.mkdirSync(path.join(d, "tokens"), { recursive: true });
  const state = {
    field: "retail banking", industry: { key: "finance",
      conventions: ["colour", "style", "density", "typography", "tone"].map((about) => ({
        about, followed: true, note: `follows the sector convention on ${about}, recorded here so the decision is visible` })),
      forbiddenPrevented: [], departures: [] },
    stakeholders: [{ role: "customer", wants: "to see the balance", fears: "a transfer that silently failed", decides: false }],
    glossary: [{ term: "payment", means: "one instruction to move money", notOurTerm: ["transaction"] }],
    businessRules: [{ id: "BR-01", rule: "A payment above the limit needs a second approver.",
      enforcedBy: "an API guard on the server route", source: "the brief" }],
    useCases: [{ id: "UC-01", name: "Send a payment", tracesTo: ["BR-01"] }],
    domainModel: [{ entity: "payment", attributes: ["payment"] }],
    asIs: "Payments are approved by email and nobody can tell afterwards who approved which one.",
    toBe: "A payment above the limit is held until a second named approver releases it.",
    delta: "Approval moves from email to the product, so who approved what is recorded rather than remembered.",
    assumptions: [{ id: "AS-01", about: "limit", assumed: "The approval limit is a single figure rather than one per account.",
      confidence: "low", produced: ["the approval screen"], affects: ["BR-01", "UC-01"],
      correctBy: "the client has a limit per account, which changes the rule into a lookup" }],
    exclusions: [{ excluded: "Card issuing", why: "out of scope by the brief", source: "brief" }],
    exclusionsConfirmed: true,
  };
  fs.writeFileSync(path.join(d, ".pica", "state.json"), JSON.stringify(state, null, 2));
  fs.writeFileSync(path.join(d, "tokens", "tokens.json"),
    JSON.stringify({ "--s-1": "4px", "--s-2": "8px", "--s-3": "12px", "--s-4": "16px", "--s-5": "24px" }, null, 2));
  return d;
}

if (FIXTURE || !DIR) {
  if (!FIXTURE && !DIR) console.log("no project given, generating a fixture. Pass a project directory to run against a real one.\n");
  DIR = makeFixture();
}
const S = path.join(DIR, ".pica", "state.json");
if (!fs.existsSync(S)) {
  console.error(`FAIL  ${S} does not exist. Point this at a pica project, or pass --fixture.`);
  process.exit(2);
}
const REF = path.join(DIR, ".audit", "html-reference.json");
const hasCapture = fs.existsSync(REF);

const run = (script, argv) => {
  try { execFileSync("node", [path.join(PKG, script), ...argv], { encoding: "utf8", cwd: DIR }); return ""; }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

/* ---- the mutations -------------------------------------------------------- *
 * `check` is the id the named script must report. `needs` says what the project has to
 * carry for the mutation to be meaningful, so a thin fixture reports SKIPPED rather than
 * a pass it did not earn. */
const M = [
  // trace-check
    /* The check flags a word the glossary DECLARES is wrong, not any unknown word: flagging
   * every unknown word would report the whole English language. So the mutation declares a
   * non-term and then uses it, which is the defect the check actually guarantees against.
   *
   * Two earlier versions of this mutation tested the guarantee the file's HEADER claimed
   * rather than the one its code held, and both silently caught nothing. */
  ["glossary-closure", "analyst/scripts/trace-check.mjs", [S], "glossary", (s) => {
    s.glossary[0].notOurTerm = [...(s.glossary[0].notOurTerm || []), "flange"];
    s.businessRules[0].rule = "Every flange must be recorded before dispatch.";
  }],
  ["rule-enforcement", "analyst/scripts/trace-check.mjs", [S], "businessRules", (s) => delete s.businessRules[0].enforcedBy],
  ["use-case-trace",   "analyst/scripts/trace-check.mjs", [S], "useCases", (s) => delete s.useCases[0].tracesTo],
  ["entity-terms",     "analyst/scripts/trace-check.mjs", [S], "domainModel", (s) => s.domainModel.push({ entity: "widget", attributes: [] })],
  ["as-is-present",    "analyst/scripts/trace-check.mjs", [S], "asIs", (s) => delete s.asIs],
  ["assumption-radius","analyst/scripts/trace-check.mjs", [S], "assumptions", (s) => delete s.assumptions[0].affects],
  ["exclusions-asked", "analyst/scripts/trace-check.mjs", [S], null, (s) => s.exclusionsConfirmed = false],
  // industry-check
  ["industry-known",   "analyst/scripts/industry-check.mjs", [S], null, (s) => { s.field = "assorted things"; delete s.industry.key; }],
  ["conventions",      "analyst/scripts/industry-check.mjs", [S], "industry", (s) => s.industry.conventions.pop()],
  ["stakeholders",     "analyst/scripts/industry-check.mjs", [S], "stakeholders", (s) => s.stakeholders = []],
  // domain-check
  ["all-categories",   "analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints = (s.domainConstraints || []).slice(1)],
  ["sourced",          "analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints[0].source = "n/a"],
  // schema-check
  ["sample-size",      "research/scripts/schema-check.mjs", [S], "measured", (s) => s.measured = s.measured.slice(0, 2)],
  ["provenance",       "research/scripts/schema-check.mjs", [S], "measured", (s) => delete s.measured[0].method],
  // arch-check
  ["feasibility",      "architect/scripts/arch-check.mjs", [S, "--feasibility"], "risks", (s) => delete s.risks[0].verdict],
  ["nfr-complete",     "architect/scripts/arch-check.mjs", [S], "nfr", (s) => delete s.nfr[0].measuredBy],
  ["adr-complete",     "architect/scripts/arch-check.mjs", [S], "adr", (s) => delete s.adr[0].consequences],
  ["tech-has-adr",     "architect/scripts/arch-check.mjs", [S], "adr", (s) => s.stack = { ...(s.stack || {}), cache: "Memcached" }],
  // estimate-check
  ["preconditions",    "estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { delete s.scopeFrozen; s.estimate.for = "client"; }],
  ["estimated-by-doer","estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { for (const v of Object.values(s.estimate)) if (v && v.o !== undefined) delete v.by; }],
  ["three-points",     "estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { const k = Object.keys(s.estimate).find((x) => s.estimate[x] && s.estimate[x].o !== undefined); s.estimate[k] = { o: 1, m: 1, p: 1, by: s.estimate[k].by }; }],
  // proposal-check
  ["slot-addressed",   "core/scripts/proposal-check.mjs", [S], "proposals", (s) => s.proposals = s.proposals.filter((p) => p.slot !== "S1")],
  ["axis-named",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.axis],
  ["provenance",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.options[0].from],
  ["choice-recorded",  "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.by],
  // dev-check
  ["api-contract",     "developer/scripts/dev-check.mjs", ["src", S], "apiContract", (s) => delete s.apiContract[0].errors],
  ["state-strategy",   "developer/scripts/dev-check.mjs", ["src", S], "stateStrategy", (s) => delete s.stateStrategy.url],
  ["server-guard",     "developer/scripts/dev-check.mjs", ["src", S], "businessRules", (s) => s.businessRules[0].enforcedBy = "the button is hidden in the interface"],
  // qa-check
  ["pyramid",          "qa/scripts/qa-check.mjs", [".", S], "testStrategy", (s) => s.testStrategy.shape = { unit: 4, integration: 9, e2e: 60 }],
  ["regression",       "qa/scripts/qa-check.mjs", [".", S], "defects", (s) => s.defects[0].failedFirst = false],
  ["test-data",        "qa/scripts/qa-check.mjs", [".", S], "testData", (s) => s.testData.provenance = "production export"],
  ["release",          "qa/scripts/qa-check.mjs", [".", S], "rollbackExecuted", (s) => delete s.rollbackExecuted],
  // impl-check
  ["nfr-measured",     "impl/scripts/impl-check.mjs", [".", S], "nfr", (s) => delete s.nfr[0].measuredBy],
  ["stack-declared",   "impl/scripts/impl-check.mjs", [".", S], "stack", (s) => s.stack = { ...s.stack, search: "Elasticsearch" }],
  // capture-reading checks
  ["direction",        "html/scripts/verify-html.mjs", [REF, S], "capture+direction", (s) => s.direction.assert["type.roles.max"] = 1],
  ["exemption-used",   "html/scripts/contrast-check.mjs", [REF, S], "capture", (s) => s.contrastExemptions = [{ where: "nothing here", why: "a stale exemption nobody removed", by: "somebody" }]],
  ["uc-covered",       "html/scripts/coverage-check.mjs", [REF, S], "capture", (s) => s.useCases.push({ id: "UC-99", name: "A use case nobody built", tracesTo: ["BR-01"] })],
    /* spacing-check reads the TOKEN FILE first and falls back to state.spacingScale, so
   * mutating the fallback did nothing on any project that has tokens. Redirect the path
   * at a scale on which no real gap lands. */
  ["off-scale",        "html/scripts/spacing-check.mjs", [REF, S], "capture", (s) => {
    s.tokensPath = ".pica/mutant-tokens.json";
    fs.writeFileSync(path.join(DIR, ".pica", "mutant-tokens.json"), JSON.stringify({ "--s-1": "7px" }));
  }],
];

const results = [];
let caught = 0, missed = 0, skipped = 0;
const base = fs.readFileSync(S, "utf8");
const baseState = JSON.parse(base);

/* ---- the baseline first, and it is not optional -------------------------- *
 * Every "caught" below is meaningless if the project was already failing: a check firing
 * on a project that is broken proves nothing about the mutation. An interrupted earlier
 * run left a mutated state on disk and the next run read it as the baseline, so 38
 * mutations "passed" against a project carrying four real defects. Establish it first,
 * refuse if it is dirty, and say what is wrong. */
{
  const seen = new Set(); const bad = [];
  for (const [, script, argv] of M) {
    const key = script + argv.join(" ");
    if (seen.has(key)) continue; seen.add(key);
    const out = run(script, argv);
    if (out && !/^0 finding|^PASS:/m.test(out))
      bad.push([path.basename(script), out.trim().split("\n").slice(-1)[0]]);
  }
  if (bad.length) {
    console.error(`FAIL  the project is not clean before any mutation, so nothing below would mean`);
    console.error(`      anything. ${bad.length} script(s) already report findings:\n`);
    for (const [n, line] of bad) console.error(`      ${n.padEnd(22)} ${line}`);
    console.error(`\n      Fix the project, or point this at one that passes. A mutation suite run over a`);
    console.error(`      failing baseline reports every check as working and proves none of them.`);
    process.exit(2);
  }
}

const have = (need) => {
  if (!need) return true;
  if (need === "capture") return hasCapture;
  if (need === "capture+direction") return hasCapture && baseState.direction && baseState.direction.assert;
  const v = baseState[need];
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null;
};

for (const [check, script, argv, need, mutate] of M) {
  if (ONLY && !script.includes(ONLY)) continue;
  const name = `${path.basename(script, ".mjs")} · ${check}`;
  if (!have(need)) {
    skipped++;
    results.push(["skip", name, `the project carries no ${need}, so this mutation has nothing to break`]);
    continue;
  }
  const s = JSON.parse(base);
  try { mutate(s); } catch { skipped++; results.push(["skip", name, "the mutation did not apply to this project's shape"]); continue; }
  fs.writeFileSync(S, JSON.stringify(s, null, 2));
  const out = run(script, argv);
  const fired = new RegExp(`\\[${check}\\]|^FAIL\\s+${check}\\b`, "m").test(out);
  const others = [...out.matchAll(/^FAIL\s+([a-z-]+)/gm)].map((m) => m[1]).filter((c) => c !== check);
  if (fired) { caught++; results.push(["caught", name, others.length ? `also fired: ${[...new Set(others)].join(", ")}` : ""]); }
  else { missed++; results.push(["MISSED", name, out.trim().split("\n").slice(-1)[0] || "(no output)"]); }
}
fs.writeFileSync(S, base);

/* ---- and it is still clean afterwards ------------------------------------ *
 * The baseline was established before the first mutation. This confirms the suite put
 * everything back: a run that leaves the project mutated poisons the NEXT run's baseline,
 * which is how 38 mutations came to pass over a project carrying four real defects. */
const clean = [];
for (const [, script, argv] of M) {
  const key = script + argv.join(" ");
  if (clean.some(([k]) => k === key)) continue;
  clean.push([key, script, argv, run(script, argv)]);
}
const dirty = clean.filter(([, , , out]) => out && !/^0 finding|^PASS:/m.test(out));

console.log("");
for (const [verdict, name, note] of results) {
  const mark = verdict === "caught" ? "  caught " : verdict === "skip" ? "  skip   " : "  MISSED ";
  console.log(`${mark}${name.padEnd(38)}${note ? "  " + note.slice(0, 60) : ""}`);
}
console.log(`\n  ${caught} caught · ${missed} missed · ${skipped} skipped (the project has no material for them)`);
console.log(`  restored afterwards:   ${dirty.length ? `${dirty.length} script(s) left dirty. The suite did not put everything back` : "clean on every script exercised"}`);
for (const [, script, argv, out] of dirty)
  console.log(`    ${path.basename(script)} ${argv.join(" ")}
      ${out.trim().split("\n").slice(-1)[0]}`);

if (skipped)
  console.log("\nNOTE  a skipped mutation is not a passed one. Run this against a project that carries\n" +
              "      the material, or the claim it proves is smaller than it looks.");
console.log("\nNOTE  this proves a check FIRES on a defect. Whether the defect it fires on is the one\n" +
            "      worth catching is a judgement, and nothing here can make it.");

process.exit(missed || dirty.length ? 1 : 0);
