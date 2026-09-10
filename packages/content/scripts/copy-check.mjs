/**
 * copy-check.mjs: the words gate. Runs with the HTML gate, before approval.
 *
 * Copy fails in a way geometry never does: it looks finished. Lorem reads as text, a
 * wrong term reads as a word, and an error message that says nothing reads like an
 * error message. Every one of these passes a visual review and a screenshot.
 *
 * Five checks:
 *
 *   1. NO PLACEHOLDER   lorem ipsum, TODO, TBD, XXX, and empty labels.
 *                       PASS: 0.
 *   2. GLOSSARY TERMS   nothing the glossary declares in notOurTerm appears in the
 *                       interface.  PASS: 0 wrong terms.
 *   3. COPY RULES       every copyRule pattern returns its expected count, and every
 *                       `exactCase` rule is spelled the way it declares.
 *                       PASS: 0 violations.
 *   4. ERROR NEXT STEP  an error state must say what to do, not only what happened.
 *                       PASS: 0 dead ends.
 *   5. LENGTH REALISM   no text run is suspiciously uniform across a screen, which is
 *                       what generated filler looks like.  PASS: reported, not fatal.
 *
 * Reads the capture artefact rather than the DOM, for the same reason verify-html does:
 * verifying from what was captured cannot disagree with what was captured.
 *
 * Usage: node copy-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node copy-check.mjs <html-reference.json> <state.json>");
  process.exit(2);
}

let ref, state;
try {
  ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read or parse an input (${e.message}).`);
  process.exit(2);
}

const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {}))
  for (const fr of list) frames.push({ ...fr, pkg });

if (!frames.length) {
  console.error("FAIL  the capture contains no frames. The selectors matched nothing.");
  process.exit(2);
}

/* Text runs are [string, x, y, w, h, size, weight, ownerClass, align, colour, background,
 * ancestorClass]. Index 0 is the only field this check needs; index 7 attributes a finding
 * to a component and index 11 to the component that CONTAINS it, which is where an error
 * message's identity actually lives. */
const runs = [];
for (const f of frames)
  for (const t of f.texts || [])
    runs.push({ text: String(t[0] || ""), owner: String(t[7] || "") || String(t[11] || ""), where: `${f.pkg} :: ${f.cap}` });

if (!runs.length) {
  console.error("FAIL  the capture recorded no text runs. Copy cannot be checked, and that is not a pass.");
  process.exit(2);
}

/* ---- shape guard --------------------------------------------------------- *
 * Feeding these scripts a state file with the right field names and the wrong types made
 * six of them exit on an uncaught TypeError. They still failed closed, so no gate was let
 * through, but the person running one got a stack trace instead of a sentence naming the
 * field, and a tool that answers a bad input with a stack trace reads as a broken tool.
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
  shapeErrors.push(`state.${key} is ${typeof v}, and this reads it as an array`);
  return [];
};
expectArray("glossary");
expectArray("copyRules");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- 1. placeholders ---------------------------------------------------- */
const PLACEHOLDER = /\b(lorem|ipsum|dolor sit|todo|tbd|xxx+|placeholder|sample text|your text here)\b/i;
let placeholders = 0;
for (const r of runs) {
  if (PLACEHOLDER.test(r.text)) {
    placeholders++;
    fail("no-placeholder", r.where, `"${r.text.slice(0, 48)}" is placeholder text. It reads as finished and is not`);
  }
}

/* ---- 2. glossary terms -------------------------------------------------- *
 * Whole-word match. Substring matching would let "order" fire on "reorder", which is
 * the collision the glossary exists to prevent rather than create. */
const glossary = state.glossary || [];
const wrongTerm = new Map();
for (const g of glossary)
  for (const n of g.notOurTerm || [])
    wrongTerm.set(String(n).toLowerCase().trim(), g.term);

let wrongTerms = 0;
const seenTerm = new Set();
for (const r of runs) {
  for (const w of r.text.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []) {
    if (!wrongTerm.has(w)) continue;
    const key = `${w}|${r.where}`;
    if (seenTerm.has(key)) continue;
    seenTerm.add(key);
    wrongTerms++;
    fail("glossary-terms", r.where,
      `interface says "${w}", but the glossary declares the term is "${wrongTerm.get(w)}"`);
  }
}

/* ---- 3. copy rules ------------------------------------------------------ */
const copyRules = state.copyRules || [];
let ruleViolations = 0;
for (const cr of copyRules) {
  if (!cr.pattern) {
    ruleViolations++;
    fail("copy-rules", cr.rule || "(unnamed)",
      "has no pattern, so nothing enforces it. A copy rule without an executable lasts about a day");
    continue;
  }
  let re;
  try {
    re = new RegExp(cr.pattern, cr.flags || "g");
  } catch (e) {
    ruleViolations++;
    fail("copy-rules", cr.rule || "(unnamed)", `pattern is not a valid regex (${e.message})`);
    continue;
  }
  /* Two different kinds of rule share this shape, and defaulting `expect` to 0 collided
   * them. A BAN says "this must appear zero times". A SPELLING rule says "wherever this
   * appears, it is spelled this way", and it is expected to appear, often. With no
   * explicit expect, every correct occurrence of a wordmark was reported as a violation
   * of the rule protecting it.
   *
   * research.md gives exactly that rule as its worked example, so anyone following the
   * documentation hit this. A rule with `exactCase` and no stated `expect` is a spelling
   * rule and the count is not checked; state `expect` to make it a ban as well. */
  const isSpellingRule = cr.exactCase && typeof cr.expect !== "number";
  const expect = typeof cr.expect === "number" ? cr.expect : 0;
  let hits = 0;
  const where = new Set();
  for (const r of runs) {
    const m = r.text.match(re);
    if (m) { hits += m.length; where.add(r.where); }
  }
  if (!isSpellingRule && hits !== expect) {
    ruleViolations++;
    fail("copy-rules", cr.rule || cr.pattern,
      `matched ${hits} time(s), expected ${expect}. In: ${[...where].slice(0, 4).join(", ")}${where.size > 4 ? ` +${where.size - 4} more` : ""}`);
  }
  /* Exact-case rules are separate: a case-insensitive pattern finds the wordmark, and
   * this catches the ones spelled with the wrong capitals. */
  if (cr.exactCase) {
    for (const r of runs) {
      if (!re.test(r.text)) continue;
      if (!r.text.includes(cr.exactCase)) {
        ruleViolations++;
        fail("copy-rules", r.where, `"${r.text.slice(0, 40)}" does not use the exact form "${cr.exactCase}"`);
      }
    }
  }
}

/* ---- 4. error states say what to do ------------------------------------- *
 * Reported per frame whose caption marks it as an error state. An error that only
 * names the failure is a dead end: the user knows something broke and nothing else. */
/* An imperative verb anywhere in the error copy counts as a next step. The first
 * version of this list had fifteen verbs and flagged "Enter it as day, month, year, or
 * ask the receptionist to help" as a dead end, on a second project. That is a false
 * positive on copy that is doing exactly the right thing, and a false positive here is
 * worse than a miss: it teaches people to skip the check.
 *
 * The list is a heuristic and will never be complete. It errs toward passing, because
 * an error message with no next step is obvious to a human reading the report, while a
 * check that cries wolf gets turned off. */
const ACTION = new RegExp("\\b(" + [
  "try", "retry", "again", "check", "contact", "call", "email", "ask", "tell",
  "refresh", "reload", "restart", "sign in", "log in", "sign out",
  "add", "enter", "type", "fill", "choose", "select", "pick", "set",
  "go back", "return", "close", "cancel", "undo", "remove", "delete",
  "update", "change", "edit", "fix", "enable", "allow", "grant",
  "wait", "connect", "reconnect", "upload", "download", "save",
  "another", "someone else", "sign", "switch", "hand", "give",
].join("|") + ")\\b", "i");
let deadEnds = 0;
let errorFrames = 0;
let wholeFrameScoped = 0;

/* WHICH TEXT the next step has to be in. The first version joined every run on the
 * frame, and that made the check inert: a refusal reading only "This item cannot be
 * checked by this person" passed, because an unrelated card on the same screen was
 * titled "Check against the prescription" and "check" is in the list above.
 *
 * Verified by mutation: the dead end was introduced deliberately and the check still
 * reported "0 findings (2 error frames)", which is the silence-reads-as-success failure
 * this file argues against.
 *
 * So the scan narrows to the runs the error component owns, identified by the owning
 * element's class. When no run on an error frame is owned by anything error-shaped, the
 * scan falls back to the whole frame and SAYS SO in the report, because a narrowed scan
 * that silently matched nothing would be the same failure in a new place. */
const ERR_OWNER = /error|refus|warn|alert|fail|offline|denied|blocked|rejected|unavailable|danger|critical/i;

for (const f of frames) {
  if (!/\berror\b|\bfail(ed|ure)?\b|\boffline\b|\brefus(ed|al)\b|\bdenied\b|\bblocked\b|\brejected\b|\bunavailable\b/i.test(f.cap || "")) continue;
  errorFrames++;
  /* Index 7 is the run's own class and index 11 the nearest classed ancestor. A message
   * inside `<span class="refuse"><span>…</span></span>` has an empty index 7, so scoping
   * on it alone saw the label and not the sentence. */
  const owned = (f.texts || []).filter((t) => ERR_OWNER.test(String(t[7] || "")) || ERR_OWNER.test(String(t[11] || "")));
  const scoped = owned.length ? owned : (f.texts || []);
  if (!owned.length) wholeFrameScoped++;
  const text = scoped.map((t) => String(t[0] || "")).join(" ");
  if (!text.trim()) continue;
  if (!ACTION.test(text)) {
    deadEnds++;
    fail("error-next-step", `${f.pkg} :: ${f.cap}`,
      owned.length
        ? "the error message names what happened but nothing the user can do. An error with no next step is a dead end"
        : "no run on this frame is owned by an error-shaped class, so the whole frame was scanned, and even then " +
          "nothing tells the user what to do. Give the error component a class the scan can find");
  }
}

/* ---- 5. length realism -------------------------------------------------- *
 * Generated filler is uniformly medium-length, which is exactly what makes every
 * layout look fine. Reported rather than failed: a real product can legitimately have
 * uniform labels, and a false fail here would train people to ignore the check. */
let uniform = 0;
for (const f of frames) {
  const lens = (f.texts || []).map((t) => String(t[0] || "").length).filter((n) => n > 3);
  if (lens.length < 6) continue;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  if (mean > 8 && sd / mean < 0.25) {
    uniform++;
    fail("length-realism", `${f.pkg} :: ${f.cap}`,
      `${lens.length} text runs with almost no length variation (mean ${mean.toFixed(0)}, sd ${sd.toFixed(0)}). ` +
      "Real copy varies. This is what generated filler looks like, and it makes a fragile layout look safe");
  }
}

/* ---- report ------------------------------------------------------------- */
console.log(`frames:        ${frames.length}`);
console.log(`text runs:     ${runs.length}`);
console.log(`glossary:      ${glossary.length} term(s), ${wrongTerm.size} declared non-term(s)`);
console.log(`copy rules:    ${copyRules.length}`);
console.log("");

const table = [
  ["no-placeholder", placeholders, `${runs.length} runs`],
  ["glossary-terms", wrongTerms, wrongTerm.size ? `${wrongTerm.size} non-terms declared` : "no non-terms declared"],
  ["copy-rules", ruleViolations, `${copyRules.length} rules`],
  ["error-next-step", deadEnds, `${errorFrames} error, refusal or offline frame(s)`
     + (wholeFrameScoped ? `, ${wholeFrameScoped} scanned whole because no run is owned by an error-shaped class` : "")],
  ["length-realism", uniform, `${frames.length} frames`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(17)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!glossary.length)
  console.log("\nNOTE  no glossary in state. Term checking did not run; that is not the same as passing it.");
if (!copyRules.length)
  console.log("NOTE  no copyRules declared. Any house rule stated in conversation is not being enforced.");
if (wholeFrameScoped)
  console.log(`NOTE  ${wholeFrameScoped} error frame(s) have no run owned by an error-shaped class, so the next-step\n` +
              "      scan fell back to the whole frame. An imperative anywhere on the screen then counts, which\n" +
              "      is weaker than it looks. Give the error component a class carrying error, warning or refused.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Copy ${findings.length ? "is NOT ready for approval" : "passes the words gate"}.`);
process.exit(findings.length ? 1 : 0);
