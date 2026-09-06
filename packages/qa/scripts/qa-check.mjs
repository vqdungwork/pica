/**
 * qa-check.mjs — the testing gate. Runs at 7.8, after the build and before release.
 *
 * `evaluation.md` evaluates a DESIGN. This tests a RUNNING PRODUCT, and until 0.9.0 pica
 * had nothing for it: `impl-check` asked only whether a test names each use case, which is
 * a trace and not a strategy.
 *
 * Seven checks:
 *
 *   1. PYRAMID       the suite's shape is declared and not inverted.  PASS: declared, e2e
 *                    is not the largest layer.
 *   2. UC COVERED    one end-to-end test per use case, named with its id.  PASS: 0 missing.
 *   3. RULE ASSERTED one assertion per business rule, named with its id.  PASS: 0 missing.
 *   4. REGRESSION    every recorded defect names a test, and the test failed first.
 *                    PASS: 0 unproven.
 *   5. SEVERITY      severities are used as a scale, not as a word.  PASS: not all one level.
 *   6. TEST DATA     provenance recorded, no real records, edge cases present.  PASS: 0.
 *   7. RELEASE       a named smoke suite runs in CI, and the rollback was executed once.
 *                    PASS: both.
 *
 * WHAT THIS CANNOT DO: tell you the product is right. It can only tell you it does what
 * somebody said. A green suite on a product nobody wants is a green suite, which is why
 * this step sits after evaluation and after a human has used the build.
 *
 * Usage: node qa-check.mjs <repo-dir> <state.json>
 */
import fs from "fs";
import path from "path";

const [, , repoDir, statePath] = process.argv;
if (!repoDir || !statePath) {
  console.error("usage: node qa-check.mjs <repo-dir> <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const shapeErrors = [];
const expectArray = (key) => {
  const v = state[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    const holes = v.filter((x) => x === null || x === undefined).length;
    if (holes) shapeErrors.push(`state.${key} has ${holes} null entr${holes === 1 ? "y" : "ies"}`);
    return v;
  }
  shapeErrors.push(`state.${key} is ${typeof v}, and this reads it as an array`);
  return [];
};
expectArray("useCases"); expectArray("businessRules");
expectArray("defects"); expectArray("exploratory");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  process.exit(2);
}

const VOID = new RegExp("^\\s*(" + ["n/?a","none","nil","null","not applicable","tbd","todo",
  "unknown","ok","yes","no","done","fine","\\.+","-+"].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

/* ---- read the suite ------------------------------------------------------- */
const SKIP = /(^|\/)(node_modules|dist|build|\.next|out|coverage|\.git)(\/|$)/;
const TESTFILE = /\.(test|spec|e2e|cy)\.[jt]sx?$|(^|\/)(tests?|__tests__|e2e|cypress|playwright)\//i;
const tests = [];
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.[jt]sx?$/.test(e.name) && TESTFILE.test(p)) tests.push(p);
  }
})(repoDir);

if (!tests.length) {
  console.error(`FAIL  no test files found under ${repoDir}. An empty suite is not a passing suite.`);
  process.exit(2);
}
const suite = tests.map((f) => ({ rel: path.relative(repoDir, f), text: fs.readFileSync(f, "utf8") }));
const allTests = suite.map((s) => s.text).join("\n");

let wfText = "";
const wfDir = path.join(repoDir, ".github", "workflows");
try { for (const f of fs.readdirSync(wfDir)) wfText += fs.readFileSync(path.join(wfDir, f), "utf8") + "\n"; } catch {}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- 1. pyramid ----------------------------------------------------------- */
let pyramid = 0;
const strat = state.testStrategy || {};
const shape = strat.shape || {};
const levels = ["unit", "integration", "e2e"];
if (!levels.every((l) => typeof shape[l] === "number")) {
  pyramid++;
  fail("pyramid", "state.testStrategy.shape",
    "the suite has no declared shape. A suite with no declared shape drifts toward whatever was easiest to write last, which is end-to-end, and an inverted suite fails in a way that looks like flakiness");
} else {
  if (shape.e2e >= shape.unit) {
    pyramid++;
    fail("pyramid", "shape",
      `end-to-end is ${shape.e2e} and unit is ${shape.unit}. An inverted suite is slow, brittle against any layout change, and its failures name a screen rather than a cause`);
  }
  for (const l of levels)
    if (!said(strat.owner?.[l], 4)) {
      pyramid++;
      fail("pyramid", `owner.${l}`, "nobody is named as owning this level, and the three levels are not written by the same person");
    }
}

/* ---- 2 and 3. traceability ------------------------------------------------ */
let uncovered = 0, unasserted = 0;
for (const u of state.useCases || []) {
  const id = String(u.id || "");
  if (!id) continue;
  if (!new RegExp(`\\b${id}\\b`).test(allTests)) {
    uncovered++;
    fail("uc-covered", `${id} ${u.name || ""}`.trim(),
      "no test names this use case. A screen can be perfect and the task still impossible, and that is exactly what a use-case test catches");
  }
}
for (const r of state.businessRules || []) {
  const id = String(r.id || "");
  if (!id) continue;
  if (!new RegExp(`\\b${id}\\b`).test(allTests)) {
    unasserted++;
    fail("rule-asserted", `${id}`,
      `no assertion names this rule. A rule enforced in code and named in no test is a rule the next refactor removes silently`);
  }
}

/* ---- 4. regression -------------------------------------------------------- */
let unproven = 0;
for (const d of state.defects || []) {
  const id = d.id || d.title || "(unnamed)";
  if (!said(d.test, 3)) {
    unproven++;
    fail("regression", id, "names no regression test. What a defect earns is a test");
    continue;
  }
  if (d.failedFirst !== true) {
    unproven++;
    fail("regression", id,
      "does not record that its test failed before the fix. A test written after the fix proves the fix compiles");
  }
  if (!new RegExp(String(d.test).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(allTests)) {
    unproven++;
    fail("regression", id, `names test "${d.test}", which appears in no test file`);
  }
}

/* ---- 5. severity ---------------------------------------------------------- */
let sev = 0;
const SEV = ["blocker", "major", "minor", "cosmetic"];
const used = new Set();
for (const d of state.defects || []) {
  const s = String(d.severity || "").toLowerCase().trim();
  if (!SEV.includes(s)) {
    sev++;
    fail("severity", d.id || "(unnamed)", `severity "${d.severity}" is not one of ${SEV.join(", ")}`);
  } else used.add(s);
}
if ((state.defects || []).length >= 4 && used.size === 1) {
  sev++;
  fail("severity", "state.defects",
    `every defect is "${[...used][0]}". If everything is critical, nothing is: a severity nobody can dispute is a severity nobody chose`);
}

/* ---- 6. test data --------------------------------------------------------- */
let data = 0;
const td = state.testData || {};
if (!["generated", "anonymised", "synthetic"].includes(String(td.provenance || "").toLowerCase())) {
  data++;
  fail("test-data", "state.testData.provenance",
    'must be generated, anonymised or synthetic. Real data in a test environment is a breach waiting for a screenshot, and "anonymised" without a method is a claim');
}
if (String(td.provenance || "").toLowerCase() === "anonymised" && !said(td.method, 12)) {
  data++;
  fail("test-data", "state.testData.method", "claims anonymisation and names no method");
}
const EDGE = ["longest", "empty", "duplicate", "apostrophe"];
const edges = (td.edgeCases || []).map((x) => String(x).toLowerCase()).join(" ");
for (const e of EDGE)
  if (!edges.includes(e)) {
    data++;
    fail("test-data", `edge case: ${e}`,
      "not present. Edge-case data is data, not an afterthought: the longest legal value, the empty set, the duplicate, and the one with an apostrophe in the name");
  }

/* ---- 7. release ----------------------------------------------------------- */
let rel = 0;
const smoke = strat.smoke;
if (!said(smoke, 3)) {
  rel++;
  fail("release", "state.testStrategy.smoke",
    "no smoke suite named. Running the full suite against a release candidate is how a release slips by a day; a smoke suite answers whether the build is worth testing further");
} else if (wfText && !new RegExp(String(smoke).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(wfText)) {
  rel++;
  fail("release", `smoke suite "${smoke}"`, "is named and no workflow runs it. A gate on paper only");
}
/* `true` is accepted and an object is better, the same way estimate-check reads
 * `scopeFrozen`: a bare boolean is a claim with nothing behind it, while {on, by, what}
 * records who ran it and what happened, which is what someone asks for six months later.
 * An object that says nothing is refused rather than counted, because a rollback
 * "recorded" as an empty object is the void-field failure in a new shape. */
const rb = state.rollbackExecuted;
const rbDetailed = rb && typeof rb === "object" && !Array.isArray(rb);
if (rb !== true && !(rbDetailed && said(rb.what, 12))) {
  rel++;
  fail("release", "state.rollbackExecuted",
    rbDetailed
      ? "records a rollback with no `what` saying what happened when it ran. A rollback nobody described is one nobody can tell was real"
      : "the rollback has not been executed. A rollback plan that has never been run is a paragraph, not a path");
}

/* ---- exploratory: reported, not failed ------------------------------------ */
const sessions = state.exploratory || [];
const weakSessions = sessions.filter((s) => !said(s.charter, 12) || typeof s.minutes !== "number");

/* ---- report --------------------------------------------------------------- */
console.log(`test files:    ${tests.length}`);
console.log(`use cases:     ${(state.useCases || []).length}`);
console.log(`rules:         ${(state.businessRules || []).length}`);
console.log(`defects:       ${(state.defects || []).length}`);
console.log(`exploratory:   ${sessions.length} session(s)`);
console.log("");

const table = [
  ["pyramid", pyramid, shape.unit ? `${shape.unit}/${shape.integration}/${shape.e2e}` : "not declared"],
  ["uc-covered", uncovered, `${(state.useCases || []).length} use cases`],
  ["rule-asserted", unasserted, `${(state.businessRules || []).length} rules`],
  ["regression", unproven, `${(state.defects || []).length} defects`],
  ["severity", sev, `${used.size} level(s) in use`],
  ["test-data", data, td.provenance ? String(td.provenance) : "no provenance"],
  ["release", rel, (wfText ? "workflow present" : "no workflow found")
     + (rbDetailed && said(rb.what, 12) ? `, rollback run ${rb.on || "(undated)"}` : rb === true ? ", rollback recorded as a bare true" : "")],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(14)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!sessions.length)
  console.log("\nNOTE  no exploratory session recorded. Scripted tests find what somebody already thought"
    + "\n      of; that is their definition, not a criticism. This is reported rather than failed,"
    + "\n      because a session is a person's time and a check cannot schedule it.");
else if (weakSessions.length)
  console.log(`\nNOTE  ${weakSessions.length} exploratory session(s) carry no charter or no time box. A session`
    + "\n      without a charter is a walk.");

console.log("\nNOTE  this cannot tell you the product is right, only that it does what somebody said.");
console.log("      A green suite on a product nobody wants is a green suite.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The suite ${findings.length ? "is NOT ready to gate a release" : "passes the testing gate"}.`);
process.exit(findings.length ? 1 : 0);
