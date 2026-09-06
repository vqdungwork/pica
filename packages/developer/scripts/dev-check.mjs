/**
 * dev-check.mjs — the engineering gate. Runs at 7.7, before impl-check.
 *
 * `impl-check` reads the repository: branches, pipeline, environments, secrets. This
 * reads the SOURCE, and it exists because the definition of done said nothing about how
 * the code gets written, so the craft between an approved design and a green pipeline was
 * left to whatever came out.
 *
 * Seven checks:
 *
 *   1. API CONTRACT   every endpoint the source calls appears in state.apiContract, and
 *                     every contract entry lists its errors.  PASS: 0.
 *   2. ERROR BRANCH   every fetch has a failure path, not a catch that logs.  PASS: 0.
 *   3. STATE STRATEGY declared, and its four placements decided.  PASS: declared.
 *   4. A11Y CODE      accessible names, no positive tabindex, labelled inputs, no
 *                     hover-only affordance.  PASS: 0.
 *   5. PERF BUDGET    every performance NFR has a budget with a condition and a
 *                     measurement.  PASS: 0 unbudgeted.
 *   6. SERVER GUARD   every business rule the interface enforces is named as enforced on
 *                     the server too.  PASS: 0 client-only rules.
 *   7. RETRY SAFETY   anything that changes data and offers retry carries an idempotency
 *                     key.  PASS: 0 unsafe retries.
 *
 * READS TEXT, DOES NOT PARSE, for the same reason code-tokens-check does: a front end can
 * be React, Vue, Svelte, styled-components or plain files, and a parser for one of those
 * silently returns zero for the rest. A regex that finds a fetch finds it in all of them.
 *
 * WHAT THIS CANNOT DO: judge whether the state placement is CORRECT, whether an error
 * branch does something useful, or whether a server guard is the right guard. Those are
 * judgement, and a check that pretended to make them would be worse than no check. It
 * finds the absences, which is the half a machine can see.
 *
 * Usage: node dev-check.mjs <src-dir> <state.json>
 */
import fs from "fs";
import path from "path";

const [, , srcDir, statePath] = process.argv;
if (!srcDir || !statePath) {
  console.error("usage: node dev-check.mjs <src-dir> <state.json>");
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
expectArray("apiContract");
expectArray("perfBudget");
expectArray("businessRules");
expectArray("nfr");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  process.exit(2);
}

const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "tbd", "todo",
  "unknown", "ok", "yes", "no", "done", "fine", "default", "standard", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

/* ---- collect source ------------------------------------------------------ */
const EXT = /\.(m?[jt]sx?|vue|svelte|astro|html|css|scss)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|out|coverage|\.git|vendor)(\/|$)/;
const files = [];
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (EXT.test(e.name)) files.push(p);
  }
})(srcDir);

if (!files.length) {
  console.error(`FAIL  no source files found under ${srcDir}. The path is wrong, and an empty scan is not a pass.`);
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const src = files.map((f) => ({ rel: path.relative(srcDir, f), text: fs.readFileSync(f, "utf8") }));

/* ---- 1. API contract ------------------------------------------------------ *
 * Endpoints are matched as path literals, which is what a text scan can see. A path
 * built entirely at runtime is invisible here, and the report says so rather than
 * implying the scan was exhaustive. */
const contract = state.apiContract || [];
const contractPaths = contract.map((c) => String(c.path || "").replace(/\{[^}]+\}/g, "*"));
const matchesContract = (p) =>
  contractPaths.some((cp) => {
    const re = new RegExp("^" + cp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, "[^/]+") + "$");
    return re.test(p);
  });

let uncontracted = 0, dynamicPaths = 0;
const seenPath = new Set();
for (const { rel, text } of src) {
  for (const m of text.matchAll(/["'`](\/(?:api\/)?[a-zA-Z0-9_\-/{}$.]{2,80})["'`]/g)) {
    const p = m[1];
    if (!/^\/(api|v\d|[a-z])/.test(p)) continue;
    if (/\$\{/.test(p)) { dynamicPaths++; continue; }
    if (matchesContract(p.replace(/\/\d+(?=\/|$)/g, "/*"))) continue;
    if (seenPath.has(p)) continue;
    seenPath.add(p);
    uncontracted++;
    fail("api-contract", `${rel}: ${p}`,
      contract.length
        ? "is called and appears in no apiContract entry. A front end that invents a response shape has committed the back end to it silently, and both sides discover the disagreement at integration"
        : "is called and state.apiContract is empty. The contract is settled at 6.3 and nothing is fetched before it exists");
  }
}
for (const c of contract) {
  const errs = c.errors;
  if (!Array.isArray(errs) || !errs.length) {
    uncontracted++;
    fail("api-contract", c.id || c.path || "(unnamed)",
      "lists no error responses. A contract carrying only the success shape is a contract for the happy path, and the happy path is not where products fail");
  }
}

/* ---- 2. error branch ------------------------------------------------------ */
let unhandled = 0;
for (const { rel, text } of src) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!/\b(fetch|axios|\.get\(|\.post\(|\.put\(|\.patch\(|\.delete\()/.test(line)) return;
    if (/\/\/|\/\*|\*/.test(line.trim().slice(0, 2))) return;
    /* A window rather than the line: the handler is rarely on the same one. */
    const win = lines.slice(Math.max(0, i - 4), i + 24).join("\n");
    const handled = /\.catch\(|catch\s*\(|onError|isError|error\s*[:=)]|status\s*[><=!]|\bok\b|rejected/.test(win);
    if (handled) return;
    unhandled++;
    fail("error-branch", `${rel}:${i + 1}`,
      "a request with no failure path within 24 lines. Four kinds of failure need different screens, and the copy step already wrote words for each: cannot reach, not allowed, not found, it broke");
  });
}

/* ---- 3. state strategy ---------------------------------------------------- */
let stateGaps = 0;
const strat = state.stateStrategy || {};
for (const place of ["server", "url", "client", "form"]) {
  if (!said(strat[place], 12)) {
    stateGaps++;
    fail("state-strategy", place,
      `no decision recorded for what lives in ${place} state. Most of the mess in a front end is not bad code, it is server data living in a client store because the first screen was easier that way`);
  }
}

/* ---- 4. accessibility in code --------------------------------------------- */
let a11y = 0;
const seenA11y = new Set();
const flagA11y = (key, rel, line, detail) => {
  const k = `${key}|${rel}|${line}`;
  if (seenA11y.has(k)) return;
  seenA11y.add(k);
  a11y++;
  fail("a11y-code", `${rel}:${line}`, detail);
};
for (const { rel, text } of src) {
  text.split("\n").forEach((line, i) => {
    const n = i + 1;
    if (/tabindex\s*=\s*["'{]?\s*[1-9]/i.test(line))
      flagA11y("tabindex", rel, n, "a positive tabindex. It reorders focus for the entire page, not just this element, and the next person cannot see why their control is unreachable");
    /* An icon-only button: a button element whose content is an element rather than text,
     * with no aria-label and no title. */
    if (/<button[^>]*>\s*<(svg|i|span[^>]*class=[^>]*icon)/i.test(line) &&
        !/aria-label|aria-labelledby|title=/i.test(line))
      flagA11y("name", rel, n, "an icon-only button with no accessible name. It announces itself as \"button\" and nothing else");
    if (/<img(?![^>]*\balt\s*=)[^>]*>/i.test(line))
      flagA11y("alt", rel, n, "an image with no alt attribute. Decorative images need alt=\"\", which is a decision; a missing attribute is not");
    if (/<input(?![^>]*\b(aria-label|aria-labelledby|id)\s*=)[^>]*placeholder\s*=/i.test(line))
      flagA11y("label", rel, n, "an input labelled only by its placeholder. A placeholder disappears exactly when a person needs it");
    if (/:hover[^{]*\{[^}]*(display\s*:\s*(?!none)|visibility\s*:\s*visible|opacity\s*:\s*1)/i.test(line))
      flagA11y("hover", rel, n, "an affordance revealed only on hover. There is no hover on a handheld, and the sector base says so for three of its fields");
  });
}

/* ---- 5. performance budget ------------------------------------------------ */
let unbudgeted = 0;
const budgets = state.perfBudget || [];
for (const n of state.nfr || []) {
  if (!/performance|latency|speed|load/i.test(String(n.kind || "") + String(n.requirement || ""))) continue;
  const b = budgets.find((x) => String(x.nfr || "") === String(n.id || ""));
  if (!b) {
    unbudgeted++;
    fail("perf-budget", n.id || "(unnamed NFR)",
      "is a performance requirement with no budget in the build. A number nothing enforces moves the first time a dependency is added");
    continue;
  }
  if (!said(b.condition)) {
    unbudgeted++;
    fail("perf-budget", `${n.id} budget`,
      "carries no condition. A budget measured on a developer's laptop over office wifi passes on hardware nobody in the product's audience owns");
  }
  if (!said(b.measuredBy)) {
    unbudgeted++;
    fail("perf-budget", `${n.id} budget`, "names nothing that measures it, so it is a number in a file");
  }
}

/* ---- 6. server guard ------------------------------------------------------ *
 * The rule's own `enforcedBy` is the register. A rule enforced only by a use case is
 * enforced only by the interface, which is one devtools panel from being edited. */
let clientOnly = 0;
let presentational = 0;
/* `enforcedBy` is a STRING in the documented shape (business-analysis.md) and in
 * trace-check, which has read it as one since 0.7.0. This read it as an array and
 * crashed with a TypeError on the first project that followed the documentation —
 * a check that answers correct input with a stack trace is a broken check, and this
 * repository has a rule about exactly that. Both shapes are accepted; the string is
 * the one to write. */
const asList = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]).map(String);
for (const r of state.businessRules || []) {
  const by = asList(r.enforcedBy);
  if (!by.length) continue;   // trace-check owns the empty case
  /* The vocabulary a person actually uses for a server-side mechanism. The first list
   * had nine words and missed "table", "grant" and "trigger", so a rule enforced by
   * revoking UPDATE on an append-only table — which is a stronger guarantee than any
   * route guard — was reported as client-only. A false positive here is worse than a
   * miss: it teaches people to stop reading this check. */
  const serverSide = by.some((x) => /server|api|backend|route|handler|guard|db|database|schema|table|column|grant|revoke|trigger|index|constraint|migration|transaction|repository|policy|API-\d/i.test(x));
  if (serverSide) continue;

  /* A PRESENTATIONAL rule has no server side and never will: "a drug name is never
   * truncated" is a rendering guarantee, and no API can hold it. Excusing it silently
   * would let any rule escape, so it is a register — declared, reasoned, and counted in
   * the report — for the same reason every other register in this project exists: a
   * deliberate exception has to be distinguishable from an oversight, including by the
   * person who wrote it a week later. */
  if (r.presentationOnly === true && said(r.presentationWhy, 12)) { presentational++; continue; }

  clientOnly++;
  fail("server-guard", r.id || "(unnamed rule)",
    r.presentationOnly === true
      ? `declares presentationOnly with no presentationWhy that says anything. A rule excused with an empty reason is a rule nobody excused`
      : `is enforced by ${by.join(", ")} and nothing on the server. The interface is a convenience, never a control: every rule it enforces is enforced again where the data lives, or it is not enforced. If it is a RENDERING guarantee no API could hold, say so with presentationOnly and presentationWhy`);
}

/* ---- 7. retry safety ------------------------------------------------------ */
let unsafeRetry = 0;
for (const { rel, text } of src) {
  if (!/\bretry\b|\bRetry\b/.test(text)) continue;
  const mutates = /method\s*:\s*["'](POST|PUT|PATCH|DELETE)["']|\.(post|put|patch|delete)\s*\(/i.test(text);
  if (!mutates) continue;
  if (/idempotenc|Idempotency-Key|requestId|clientToken|dedupe/i.test(text)) continue;
  unsafeRetry++;
  fail("retry-safety", rel,
    "offers a retry on a request that changes data, with no idempotency key anywhere in the file. A retry that repeats a request the server already accepted is a duplicate, not a retry");
}

/* ---- report --------------------------------------------------------------- */
console.log(`source files:  ${files.length}`);
console.log(`API contract:  ${contract.length} endpoint(s)`);
console.log(`business rules: ${(state.businessRules || []).length}`);
console.log("");

const table = [
  ["api-contract", uncontracted, `${contract.length} contracted`],
  ["error-branch", unhandled, `${files.length} files`],
  ["state-strategy", stateGaps, "4 placements"],
  ["a11y-code", a11y, `${files.length} files`],
  ["perf-budget", unbudgeted, `${budgets.length} budget(s)`],
  ["server-guard", clientOnly, `${(state.businessRules || []).length} rules`
     + (presentational ? `, ${presentational} declared presentational` : "")],
  ["retry-safety", unsafeRetry, `${files.length} files`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(15)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (dynamicPaths)
  console.log(`\nNOTE  ${dynamicPaths} request path(s) are built at runtime and could not be matched against the`
    + "\n      contract. They were not checked, which is not the same as passing.");

console.log("\nNOTE  this finds absences: a missing contract entry, a missing error branch, a missing");
console.log("      label. Whether a state placement is CORRECT, whether an error branch does anything");
console.log("      useful, and whether a server guard is the right guard are judgement, and a check");
console.log("      that pretended to make them would be worse than no check.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The build ${findings.length ? "is NOT ready for the implementation gate" : "passes the engineering gate"}.`);
process.exit(findings.length ? 1 : 0);
