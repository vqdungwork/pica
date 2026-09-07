/**
 * trace-check.mjs — the analysis gate. Runs at the end of /pica-analyse, before the
 * Product Designer is allowed to start.
 *
 * Analysis produces prose, and prose is where requirements go to die quietly: a rule
 * nobody enforces, a use case tracing to nothing, a term the interface invented. None
 * of it fails at the time. It fails at test, or at handover, or in a regulatory review.
 *
 * Six checks, each with a stated pass criterion:
 *
 *   1. GLOSSARY CLOSURE   no rule or use case uses a word the glossary DECLARES is the
 *                         wrong one, and the glossary is not empty.  PASS: 0.
 *
 *                         This header said "every term used in a rule exists in the
 *                         glossary" for six releases and the code never did that, because
 *                         flagging every unknown word reports the whole English language.
 *                         The code was right and the header oversold it, which is the same
 *                         failure as a check reporting a pass it did not earn: whoever read
 *                         the header trusted a guarantee nobody had written.
 *   2. RULE ENFORCEMENT   every business rule names something that enforces it.
 *                         PASS: 0 rules with nothing behind them.
 *   3. USE CASE TRACE     every use case traces to a rule or to the delta.
 *                         PASS: 0 orphans.
 *   4. ENTITY TERMS       every entity and field name resolves to a glossary term.
 *                         PASS: 0 invented names.
 *   5. AS-IS PRESENT      a TO-BE with no AS-IS cannot show what changed.
 *                         PASS: both present, or neither.
 *   6. ASSUMPTION RADIUS  every assumption records what it produced and what it
 *                         affects.  PASS: 0 assumptions with no blast radius.
 *   7. EXCLUSIONS ASKED  the scope question was asked, and the answer recorded.
 *                        PASS: exclusionsConfirmed is true.
 *
 *
 * Exit 0 only when every check passes. A check that could not run is a failure, not a
 * pass — see the "green check" rule in core's review-discipline.md.
 *
 * Usage: node trace-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) {
  console.error("usage: node trace-check.mjs <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const glossary = state.glossary || [];
const rules = state.businessRules || [];
const useCases = state.useCases || [];
const entities = state.domainModel || [];
const assumptions = state.assumptions || [];

/* Nothing to analyse is not a pass. An empty state at this gate means the command did
 * not run, and reporting "0 findings" on it would be the silence-reads-as-success
 * failure this project has a rule against. */
if (!glossary.length && !rules.length && !useCases.length) {
  console.error("FAIL  state carries no glossary, no rules and no use cases. Analysis did not run.");
  process.exit(2);
}

/* ---- void detection ------------------------------------------------------ *
 * A field that has been EMPTIED reads exactly like a field that was answered. An early
 * revision of industry-check was defeated end to end by writing "n/a" into every field it
 * required, and the same hole was then found here: a business rule whose source read "n/a" passed the same way
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
expectArray("glossary");
expectArray("businessRules");
expectArray("useCases");
expectArray("domainModel");
expectArray("assumptions");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* Terms are matched case-insensitively on whole words. Matching substrings would let
 * "order" satisfy "reorder", which is exactly the collision the glossary exists to
 * prevent. */
const known = new Set(glossary.map((g) => String(g.term || "").toLowerCase().trim()).filter(Boolean));
const notOurs = new Map();
for (const g of glossary)
  for (const n of g.notOurTerm || [])
    notOurs.set(String(n).toLowerCase().trim(), g.term);

const words = (s) => String(s || "").toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];

/* ---- 1. glossary closure ------------------------------------------------ *
 * Only flags a word that the glossary itself declares is the wrong word for
 * something. Flagging every unknown word would report the whole English language;
 * flagging a declared synonym reports the actual defect: two words for one thing. */
let unglossed = 0;
for (const [label, items, field] of [
  ["rule", rules, "rule"],
  ["use case", useCases, "name"],
]) {
  for (const it of items) {
    for (const w of words(it[field])) {
      if (notOurs.has(w)) {
        unglossed++;
        fail("glossary-closure", `${label} ${it.id || "(unnamed)"}`,
          `uses "${w}", which the glossary declares is not the term. Use "${notOurs.get(w)}"`);
      }
    }
  }
}

/* An empty glossary passes every check below by construction: closure only flags a word the
 * glossary declares wrong, and there are none. An analysis with no ubiquitous language at
 * all reported "0 findings (4 items scanned)", which reads as clean. The glossary is what
 * the other three checks stand on, and its absence is the one thing they cannot see. */
if (!glossary.length && (rules.length || useCases.length || entities.length)) {
  findings.push({ check: "glossary-closure", where: "state.glossary",
    detail: `is empty while ${rules.length} rule(s), ${useCases.length} use case(s) and ${entities.length} ` +
            `entit(ies) are recorded. Every check below reads terms against it, so an empty glossary makes ` +
            `all of them pass by having nothing to compare against` });
}

/* ---- 2. rule enforcement ------------------------------------------------ */
let unenforced = 0;
for (const r of rules) {
  if (!r.enforcedBy || !String(r.enforcedBy).trim()) {
    unenforced++;
    fail("rule-enforcement", r.id || "(unnumbered)",
      `"${String(r.rule || "").slice(0, 60)}" names nothing that enforces it, so it is a preference`);
  }
  if (!said(r.source, NAMED)) {
    unenforced++;
    fail("rule-enforcement", r.id || "(unnumbered)", "has no source. An unsourced rule cannot be disputed");
  }
}

/* ---- 3. use case trace -------------------------------------------------- */
const ruleIds = new Set(rules.map((r) => r.id).filter(Boolean));
const hasDelta = Boolean(state.delta && String(state.delta).trim());
let orphans = 0;
for (const uc of useCases) {
  const t = uc.tracesTo;
  const list = Array.isArray(t) ? t : t ? [t] : [];
  const ok = list.some((x) => ruleIds.has(x) || (x === "delta" && hasDelta));
  if (!ok) {
    orphans++;
    /* Distinguish "you pointed at a delta that does not exist" from "you pointed at a
     * rule id that does not exist". Conflating them sends the reader hunting for a
     * missing rule when the real defect is an unrecorded delta. */
    if (list.includes("delta") && !hasDelta) {
      fail("use-case-trace", uc.id || "(unnumbered)",
        'traces to the delta, but state.delta is not recorded. Write the AS-IS to TO-BE delta at 2.5, or trace this to a rule');
    } else if (list.length) {
      fail("use-case-trace", uc.id || "(unnumbered)",
        `traces to ${list.join(", ")}, and no rule carries that id. Known ids: ${[...ruleIds].join(", ") || "(none)"}`);
    } else {
      fail("use-case-trace", uc.id || "(unnumbered)",
        "traces to nothing. It cannot be dropped safely because nobody knows what it was for");
    }
  }
}

/* ---- 4. entity terms ---------------------------------------------------- */
let invented = 0;
for (const e of entities) {
  /* `entity` or `name`. This read only `name`, no command documented either, and the shape
   * everything actually writes is `entity` — so the loop skipped every entry and reported
   * zero on a data model that had invented every word in it. */
  const name = String(e.entity || e.name || "").toLowerCase().trim();
  if (name && !known.has(name)) {
    invented++;
    fail("entity-terms", e.entity || e.name || "(unnamed)", "is not a glossary term. The data model invented a word");
  }
  for (const f of e.fields || e.attributes || []) {
    const fn = String(f).toLowerCase().trim();
    if (notOurs.has(fn)) {
      invented++;
      fail("entity-terms", `${e.entity || e.name}.${f}`, `uses "${f}", a declared non-term. Use "${notOurs.get(fn)}"`);
    }
  }
}

/* ---- 5. as-is present --------------------------------------------------- *
 * A TO-BE alone is unfalsifiable: it describes a future nobody can compare against
 * anything, so an improvement and a lateral move look identical. */
let asIsMissing = 0;
const asIs = Boolean(state.asIs && String(state.asIs).trim());
const toBe = Boolean(state.toBe && String(state.toBe).trim());
if (toBe && !asIs) {
  asIsMissing = 1;
  fail("as-is-present", "state.asIs",
    "a TO-BE exists with no AS-IS. Nothing can show what changed, and the delta cannot be defended");
}
if (asIs && toBe && !hasDelta) {
  asIsMissing++;
  fail("as-is-present", "state.delta",
    "both processes exist but the delta is not stated. The thing being bought is left to be inferred");
}

/* ---- 6. assumption blast radius ----------------------------------------- *
 * Without a radius, correcting one assumption re-runs the whole chain, and by review
 * round three nobody will tolerate that. */
let noRadius = 0;
for (const a of assumptions) {
  const produced = Array.isArray(a.produced) ? a.produced : [];
  const affects = Array.isArray(a.affects) ? a.affects : [];
  if (!produced.length || !affects.length) {
    noRadius++;
    fail("assumption-radius", a.id || "(unnumbered)",
      "records no blast radius, so correcting it means rebuilding everything");
  }
  if (!a.confidence) {
    noRadius++;
    fail("assumption-radius", a.id || "(unnumbered)",
      "has no confidence, so nobody knows which questions to put to the client first");
  }
}

/* ---- 7. exclusions asked ------------------------------------------------- *
 * `exclusionsConfirmed` had a register, a command that says "refuse to pass GATE 1 while
 * it is false", and a definition-of-done line requiring it. Nothing read it. That makes
 * it a preference held by whoever remembers, and it is the register with the least room
 * for that: an empty `exclusions` means either nobody was asked or there is genuinely
 * nothing to exclude, and in week three nobody can tell which.
 *
 * Checked here rather than in a hook because a hook cannot know a human was asked; it can
 * only know the answer was written down, which is exactly what this reads. */
let unasked = 0;
if (state.exclusionsConfirmed !== true) {
  unasked++;
  findings.push({ check: "exclusions-asked", where: "state.exclusionsConfirmed",
    detail: (state.exclusions || []).length
      ? `${(state.exclusions || []).length} exclusion(s) recorded but the ask was never confirmed. ` +
        "The list may be what the brief happened to say rather than what the client was asked"
      : "no exclusions and no record of asking. An empty list means nobody was asked or there is " +
        "genuinely nothing, and those are different facts with the same shape" });
}

/* ---- report ------------------------------------------------------------- */
console.log(`glossary terms:   ${glossary.length}`);
console.log(`business rules:   ${rules.length}`);
console.log(`use cases:        ${useCases.length}`);
console.log(`entities:         ${entities.length}`);
console.log(`assumptions:      ${assumptions.length}` +
  (assumptions.length ? `  (${assumptions.filter((a) => a.confidence === "low").length} low confidence)` : ""));
console.log("");

const table = [
  ["glossary-closure", unglossed, `${rules.length + useCases.length} items scanned`],
  ["rule-enforcement", unenforced, `${rules.length} rules`],
  ["use-case-trace", orphans, `${useCases.length} use cases`],
  ["entity-terms", invented, `${entities.length} entities`],
  ["as-is-present", asIsMissing, asIs ? "AS-IS present" : "no AS-IS recorded"],
  ["assumption-radius", noRadius, `${assumptions.length} assumptions`],
  ["exclusions-asked", unasked, state.exclusionsConfirmed === true ? "confirmed" : "NOT confirmed"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(18)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Analysis ${findings.length ? "is NOT ready to hand to design" : "passes the trace gate"}.`);
process.exit(findings.length ? 1 : 0);
