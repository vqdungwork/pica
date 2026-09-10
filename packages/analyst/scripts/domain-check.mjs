/**
 * domain-check.mjs: makes domainConstraints a register instead of a note.
 *
 * This script exists because the register was added without a reader, which this
 * project has a rule against: a register nothing reads is noise, in the same way a
 * rule with no register is a preference. It was written down, six files referred to
 * it, and nothing would ever have noticed if it were empty.
 *
 * Five checks:
 *
 *   1. ALL CATEGORIES  every one of the eight answered, including "not applicable".
 *                      An unanswered category and an inapplicable one look identical
 *                      otherwise.  PASS: 0 unanswered.
 *   2. SOURCED         every entry names where the answer came from.
 *                      PASS: 0 unsourced.
 *   3. VERIFIED        every entry says whether a human or an agent established it.
 *                      PASS: 0 unmarked.
 *   4. AGENT CLAIMS    anything an agent inferred also exists as a low-confidence
 *                      assumption, so it reaches the client rather than being trusted.
 *                      PASS: 0 unsurfaced.
 *   5. AFFECTS         every applicable constraint names what it affects, so the
 *                      Architect and QA can act on it.  PASS: 0 dangling.
 *
 * Usage: node domain-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) {
  console.error("usage: node domain-check.mjs <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

/* ---- shape guard --------------------------------------------------------- *
 * Feeding these scripts a state file with the right field names and the wrong types made
 * six of them exit on an uncaught TypeError: "glossary.map is not a function". They still
 * failed closed, so no gate was let through, but the person running one got a stack trace
 * instead of a sentence naming the field. A tool that answers a bad input with a stack
 * trace reads as a broken tool, and the next thing that happens is somebody stops running
 * it.
 *
 * Duplicated per script rather than imported: these run standalone from their own package
 * after a single-package install, where no sibling package's path exists. */
const shapeErrors = [];
const expectArray = (key) => {
  const v = state[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    /* An array containing null is still the wrong shape: every consumer here reads
     * properties off its entries, and `[null]` throws exactly where `"a string"` does. */
    const holes = v.filter((x) => x === null || x === undefined).length;
    if (holes) shapeErrors.push(`state.${key} has ${holes} null entr${holes === 1 ? "y" : "ies"}`);
    return v;
  }
  shapeErrors.push(`state.${key} is ${Array.isArray(v) ? "an array" : typeof v}, and this reads it as an array`);
  return [];
};
expectArray("domainConstraints");
expectArray("assumptions");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}


const CATEGORIES = ["standard", "regulator", "data protection", "identity",
                    "retention", "audit trail", "restricted claims", "professional duty"];

const constraints = state.domainConstraints || [];
const assumptions = state.assumptions || [];

/* An empty register is the exact failure this check was written for. It is not a
 * clean run: it means nobody asked, and reporting zero findings on it would make the
 * silence read as a pass. */
if (!constraints.length) {
  console.error("FAIL  domainConstraints is empty. Eight questions were not asked, and an unasked");
  console.error('      question is indistinguishable from an answer of "nothing applies".');
  console.error("      Write every category, including the ones that are not applicable.");
  process.exit(1);
}

/* ---- void detection ------------------------------------------------------ *
 * A field that has been EMPTIED reads exactly like a field that was answered. An early
 * revision of industry-check was defeated end to end by writing "n/a" into every field it
 * required, and the same hole was then found here: a constraint whose source read "n/a" was traceable to nothing and passed the sourced check
 *
 * Length is the wrong instrument and was tried first. A twenty-character floor rejected
 * "Dark by default.", which is a real decision written by someone who writes well, and a
 * false positive is worse than a miss because it teaches people to skip the check. So the
 * void list does the work, and the floor only has to clear "x".
 *
 * Two floors, because two kinds of field: a SOURCE or a NAME is legitimately short
 * ("client", "brief", "ISO 20022"), while a REASON has to be a sentence. Anything present,
 * not a void phrase, and still too thin to be useful is a judgement call, and it belongs
 * to the human at the gate rather than to a character count.
 *
 * This helper is duplicated in every script that needs it rather than imported. These
 * scripts are standalone by design: each runs from its own package after a single-package
 * install, where no sibling package's path exists. */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};
const NAMED = 2;   // a source or a person, not a sentence. "PM", "BA" and "QA" are
                   // all real answers here, and "n/a" is caught by the void list rather
                   // than by length, which is the whole point of separating the two


const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const norm = (s) => String(s || "").toLowerCase().trim();
const answered = new Map();
for (const c of constraints) {
  const k = norm(c.category);
  if (!answered.has(k)) answered.set(k, []);
  answered.get(k).push(c);
}

/* ---- 1. all categories answered ----------------------------------------- */
let unanswered = 0;
for (const cat of CATEGORIES) {
  if (!answered.has(cat)) {
    unanswered++;
    fail("all-categories", cat,
      'not answered. Write it, including "not applicable" with a reason. An unasked question and a null answer look the same');
  }
}
for (const k of answered.keys()) {
  if (!CATEGORIES.includes(k)) {
    unanswered++;
    fail("all-categories", k,
      `is not one of the eight categories. Known: ${CATEGORIES.join(", ")}`);
  }
}

/* ---- 2. sourced --------------------------------------------------------- */
let unsourced = 0;
for (const c of constraints) {
  if (!said(c.source, NAMED)) {
    unsourced++;
    fail("sourced", c.category || "(no category)",
      `"${String(c.constraint || "").slice(0, 50)}" has no source. A legal constraint nobody can trace is one nobody can defend`);
  }
}

/* ---- 3. verified -------------------------------------------------------- */
let unmarked = 0;
for (const c of constraints) {
  const v = norm(c.verifiedBy);
  if (!v) {
    unmarked++;
    fail("verified", c.category || "(no category)",
      'no verifiedBy. Say "human" or "agent": the difference decides whether this is a fact or an assumption');
  } else if (v !== "human" && v !== "agent") {
    unmarked++;
    fail("verified", c.category || "(no category)",
      `verifiedBy is "${c.verifiedBy}", which is neither "human" nor "agent"`);
  }
}

/* ---- 4. agent claims are surfaced --------------------------------------- *
 * An agent inferring a retention period and nobody noticing is how a compliance
 * problem gets designed in. It must arrive at the client as a question. */
let unsurfaced = 0;
const assumptionText = assumptions
  .map((a) => `${a.about || ""} ${a.assumed || ""}`.toLowerCase())
  .join(" | ");
for (const c of constraints) {
  if (norm(c.verifiedBy) !== "agent") continue;
  const key = norm(c.category);
  const claim = norm(c.constraint).slice(0, 24);
  const surfaced = assumptionText.includes(key) || (claim && assumptionText.includes(claim));
  if (!surfaced) {
    unsurfaced++;
    fail("agent-claims", c.category,
      `established by an agent and not present in assumptions. It will be read as fact. Add it as a low-confidence assumption so the client sees it`);
  }
}

/* ---- 5. affects --------------------------------------------------------- *
 * "Not applicable" legitimately affects nothing.
 *
 * So does `regulator`, and running this across ten domains is what showed it: four of
 * them failed here on a category that answers "who supervises this sector", which is
 * CONTEXT, not a constraint. Naming the supervisor does not itself change a data model;
 * its consequences arrive as the other seven categories, and those name what they
 * touch. Demanding an `affects` here produced a made-up entry in four projects out of
 * ten, and a false positive is worse than a miss because it teaches people to skip the
 * check. */
const CONTEXT_ONLY = new Set(["regulator"]);
let dangling = 0;
for (const c of constraints) {
  const na = /not applicable|n\/a|none/i.test(String(c.constraint || ""));
  const context = CONTEXT_ONLY.has(norm(c.category));
  const affects = Array.isArray(c.affects) ? c.affects : [];
  if (!na && !context && !affects.length) {
    dangling++;
    fail("affects", c.category || "(no category)",
      "names nothing it affects. The Architect turns retention into an NFR and QA turns audit into a test, and neither can if it is not written");
  }
}

/* ---- report ------------------------------------------------------------- */
const byAgent = constraints.filter((c) => norm(c.verifiedBy) === "agent").length;
const naCount = constraints.filter((c) => /not applicable|n\/a|none/i.test(String(c.constraint || ""))).length;

console.log(`categories answered: ${answered.size} of ${CATEGORIES.length}`);
console.log(`constraints:         ${constraints.length}, of which ${naCount} not applicable`);
console.log(`established by agent: ${byAgent}${byAgent ? "  (each must appear as an assumption)" : ""}`);
console.log("");

const table = [
  ["all-categories", unanswered, `${CATEGORIES.length} required`],
  ["sourced", unsourced, `${constraints.length} entries`],
  ["verified", unmarked, `${constraints.length} entries`],
  ["agent-claims", unsurfaced, `${byAgent} agent-established`],
  ["affects", dangling, `${constraints.length - naCount} applicable, regulator excluded as context`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (byAgent && !unsurfaced)
  console.log(`\nNOTE  ${byAgent} constraint(s) were established by an agent rather than confirmed by a person.\n      They are surfaced as assumptions, which is correct, and they are still not facts.`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Domain knowledge ${findings.length ? "is NOT recorded well enough to build on" : "passes the domain gate"}.`);
process.exit(findings.length ? 1 : 0);
