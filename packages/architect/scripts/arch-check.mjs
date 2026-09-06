/**
 * arch-check.mjs — the architecture gate. Runs at 1.8 for feasibility and at 6.1/6.4 for
 * the rest.
 *
 * `pica-architect` shipped with a twelve-item definition of done and NO EXECUTABLE, the
 * only package in this repository in that position. Seven of those twelve are decidable
 * from state, and leaving them to memory is this project's own definition of a preference.
 *
 * The five that are not decidable here stay human: whether a "not possible" reads plainly
 * to a non-technical reader, whether the C4 diagrams say anything useful, whether an ADR's
 * consequences are honest, whether a screen's named data source is real, and whether the
 * decisions were the right ones. Those are judgement, and a check that pretended to make
 * them would be worse than no check.
 *
 * Seven checks:
 *
 *   1. FEASIBILITY     every capability carries a verdict of possible, not-possible or
 *                      risky, and a reason.  PASS: 0 unjudged.
 *   2. RISK PRICED     every risky capability names what it affects, so 5.1 can move a
 *                      pessimistic figure against it.  PASS: 0 unpriced.
 *   3. NFR COMPLETE    every NFR carries a number, the condition it holds under, and how
 *                      it will be measured.  PASS: 0 incomplete.
 *   4. CONSTRAINT NFR  every domain constraint implying retention or an audit trail has
 *                      become an NFR.  PASS: 0 that did not.
 *   5. ADR COMPLETE    every ADR carries context, options, decision and consequences.
 *                      PASS: 0 missing a part.
 *   6. TECH HAS ADR    every technology in `stack` is named by some ADR.
 *                      PASS: 0 unexplained choices.
 *   7. MOBILE CUSTODY  a native target requires signing key custody and the rollback
 *                      asymmetry on the record.  PASS: recorded, or no native target.
 *
 * WHY CONSEQUENCES IS CHECKED AND THE OTHERS ARE NOT: architecture.md says it plainly.
 * "CONSEQUENCES is the part that gets skipped and the part that matters. A decision
 * recorded without its downside reads as a free choice, and the next person reverses it
 * having never seen the cost." Presence is checkable; honesty is not.
 *
 * Usage: node arch-check.mjs <state.json> [--feasibility]
 */
import fs from "fs";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
const FEAS_ONLY = args.includes("--feasibility");

if (!statePath) {
  console.error("usage: node arch-check.mjs <state.json> [--feasibility]");
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
 * Duplicated per script rather than imported: these run standalone from their own package
 * after a single-package install, where no sibling package's path exists. */
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
expectArray("risks");
expectArray("nfr");
expectArray("adr");
expectArray("domainConstraints");
expectArray("domainModel");
expectArray("targets");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}

const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};
/* A DECISION is legitimately one word. "React", "Node", "Postgres" are complete answers to
 * "what was chosen", and the eight-character floor reported all three as no decision at
 * all. The same mistake was made on `source` earlier in this release and fixed the same
 * way: the void list does the work, and the floor only separates a name from a sentence.
 * `context`, `options` and `consequences` are sentences and keep the higher floor. */
const NAMED = 2;

const risks = state.risks || [];
const nfrs = state.nfr || [];
const adrs = state.adr || [];
const constraints = state.domainConstraints || [];
const entities = state.domainModel || [];
const targets = state.targets || [];

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

if (!risks.length && !nfrs.length && !adrs.length) {
  console.error("FAIL  state carries no risks, no NFRs and no ADRs. Architecture did not run,");
  console.error("      and zero findings on an empty state would read as a pass.");
  process.exit(2);
}

/* ---- 1. feasibility ------------------------------------------------------ *
 * 1.8 is the only step whose job is to say no while saying no is still free. A
 * capability with no verdict is one nobody decided about. */
const VERDICT = new Set(["possible", "not-possible", "not possible", "risky"]);
let unjudged = 0;
for (const r of risks) {
  const id = r.id || r.risk || r.capability || "(unnamed)";
  const v = String(r.verdict || r.feasibility || "").toLowerCase().trim();
  if (!VERDICT.has(v)) {
    unjudged++;
    fail("feasibility", id,
      `carries no verdict. Every capability the brief implies is possible, not-possible or risky, ` +
      `and the one that is not judged is the one that surprises somebody in month three`);
    continue;
  }
  if (v.startsWith("not") && !said(r.why || r.reason, 20)) {
    unjudged++;
    fail("feasibility", id,
      `is not possible and carries no reason a non-technical reader could follow. The Account has to say ` +
      `this out loud to a client, and "technically infeasible" is not a sentence they can repeat`);
  }
}

/* ---- 2. risk priced ------------------------------------------------------ *
 * architecture.md: "A risk that changes no number at 5.1 was not a risk. It was an
 * observation." This cannot see the estimate, so it checks the half it can: that the risk
 * names what it affects, which is what 5.1 needs to move a figure against it. */
let unpriced = 0;
if (!FEAS_ONLY) {
  for (const r of risks) {
    if (String(r.verdict || r.feasibility || "").toLowerCase().trim() !== "risky") continue;
    const affects = r.affects || r.affected || [];
    if (!Array.isArray(affects) || !affects.length) {
      unpriced++;
      fail("risk-priced", r.id || r.risk || "(unnamed)",
        "is marked risky and names nothing it affects, so 5.1 has no figure to widen against it. " +
        "A risk that moves no pessimistic column was an observation");
    }
  }
}

/* ---- 3. NFR complete ----------------------------------------------------- */
let incomplete = 0;
if (!FEAS_ONLY) {
  for (const n of nfrs) {
    const id = n.id || n.kind || "(unnamed)";
    if (!/\d/.test(String(n.requirement || ""))) {
      incomplete++;
      fail("nfr-complete", id, `"${String(n.requirement || "").slice(0, 40)}" carries no number. "Fast" is not a requirement`);
    }
    if (!said(n.condition)) {
      incomplete++;
      fail("nfr-complete", id, "names no condition it holds under, so it is true at one user and false at a thousand");
    }
    if (!said(n.measuredBy)) {
      incomplete++;
      fail("nfr-complete", id, "says nothing about how it will be measured, so nobody can tell whether it was met");
    }
  }
}

/* ---- 4. constraint becomes NFR ------------------------------------------- *
 * architecture.md: "Retention and audit trail from domainConstraints become NFRs here, or
 * they become nothing." Nothing checked that until 0.8.0. */
let unturned = 0;
if (!FEAS_ONLY) {
  const nfrText = JSON.stringify(nfrs).toLowerCase();
  /* A sector requirement waived on the record in industry.constraintsNotApplicable does
   * not have to become an NFR: there is nothing to measure. Reading only domainConstraints
   * meant a signed waiver in one register was invisible to a check reading the other, and
   * the project was told to write an NFR for an obligation a named human had already
   * recorded as inapplicable. Two registers, one fact, and a check that saw half of it. */
  const waived = new Set((state.industry?.constraintsNotApplicable || [])
    .map((w) => String(w.category || "").toLowerCase()));
  for (const c of constraints) {
    const cat = String(c.category || "").toLowerCase();
    if (cat !== "retention" && cat !== "audit trail") continue;
    if (waived.has(cat)) continue;
    const text = String(c.constraint || "").trim();
    if (!said(text)) continue;   // a not-applicable constraint turns into nothing, correctly
    const word = cat === "retention" ? "retention" : "audit";
    if (!nfrText.includes(word)) {
      unturned++;
      fail("constraint-nfr", cat,
        `is recorded as a domain constraint and no NFR mentions it. A retention or audit obligation that ` +
        `does not become a measurable requirement becomes nothing at all`);
    }
  }
}

/* ---- 5. ADR complete ----------------------------------------------------- */
let partial = 0;
if (!FEAS_ONLY) {
  for (const a of adrs) {
    const id = a.id || a.title || a.decision || "(unnamed)";
    for (const part of ["context", "options", "decision", "consequences"]) {
      const v = a[part];
      const ok = Array.isArray(v) ? v.length > 0 : said(v, part === "decision" ? NAMED : 8);
      if (!ok) {
        partial++;
        fail("adr-complete", id,
          part === "consequences"
            ? "records no consequences, which is the part that gets skipped and the part that matters. " +
              "A decision recorded without its downside reads as a free choice, and the next person reverses it"
            : `records no ${part}`);
      }
    }
  }
}

/* ---- 6. every technology has an ADR -------------------------------------- */
let unexplained = 0;
if (!FEAS_ONLY) {
  /* Punctuation and spacing are normalised on both sides. A stack declares
   * "github-actions" and the ADR that decides it is titled "GitHub Actions", which is the
   * same decision written the way a person writes it — and comparing the raw strings
   * reported the ADR as absent while it sat two lines above in the same file. A false
   * positive that survives writing the exact artefact it asked for is the kind people
   * route around. */
  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const adrText = flat(JSON.stringify(adrs));
  for (const [role, name] of Object.entries(state.stack || {})) {
    const n = String(name).toLowerCase().trim();
    if (!n) continue;
    if (!adrText.includes(flat(n))) {
      unexplained++;
      fail("tech-has-adr", `${role}: ${name}`,
        `is declared in the stack and no ADR names it. "We used ${name}" is a fact, not a decision`);
    }
  }
}

/* ---- 7. mobile custody --------------------------------------------------- */
let custody = 0;
if (!FEAS_ONLY) {
  const native = targets.filter((t) => /ios|android/i.test(String(t.kind || "")));
  if (native.length) {
    const all = JSON.stringify(adrs).toLowerCase() + JSON.stringify(state.releaseNotes || "").toLowerCase();
    if (!/signing key|keystore|signing certificate/.test(all)) {
      custody++;
      fail("mobile-custody", native.map((t) => t.kind).join(", "),
        "a native target ships and nothing records who holds the signing key. Losing the Android key means " +
        "the app can never be updated under the same listing again, which is architecture, not a checklist item");
    }
    if (!/staged rollout|percentage rollout|rollback|rollout/.test(all)) {
      custody++;
      fail("mobile-custody", native.map((t) => t.kind).join(", "),
        "nothing records the rollback asymmetry. Android supports a staged percentage rollout and iOS does " +
        "not, so a bad iOS release costs days rather than minutes, and 5.1 has to carry that");
    }
  }
}

/* ---- report -------------------------------------------------------------- */
console.log(`risks:       ${risks.length}`);
console.log(`NFRs:        ${nfrs.length}`);
console.log(`ADRs:        ${adrs.length}`);
console.log(`mode:        ${FEAS_ONLY ? "feasibility only (step 1.8)" : "full (steps 6.1 and 6.4)"}`);
console.log("");

const table = FEAS_ONLY
  ? [["feasibility", unjudged, `${risks.length} capabilities`]]
  : [
      ["feasibility", unjudged, `${risks.length} capabilities`],
      ["risk-priced", unpriced, `${risks.filter((r) => String(r.verdict || r.feasibility || "").toLowerCase() === "risky").length} risky`],
      ["nfr-complete", incomplete, `${nfrs.length} NFRs`],
      ["constraint-nfr", unturned, `${constraints.filter((c) => ["retention", "audit trail"].includes(String(c.category || "").toLowerCase())).length} retention or audit constraints`],
      ["adr-complete", partial, `${adrs.length} ADRs`],
      ["tech-has-adr", unexplained, `${Object.keys(state.stack || {}).length} technologies`],
      ["mobile-custody", custody, targets.some((t) => /ios|android/i.test(String(t.kind || ""))) ? "native target present" : "no native target, not checked"],
    ];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(15)} ${String(n).padStart(3)} finding(s)   (${scope})`);

console.log("\nNOTE  five items in this package's definition of done stay with a human: whether a");
console.log('      "not possible" reads plainly, whether the C4 diagrams say anything, whether an');
console.log("      ADR's consequences are honest, whether a screen's data source is real, and");
console.log("      whether the decisions were right. A check that pretended to judge those would");
console.log("      be worse than no check.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The architecture ${findings.length ? "is NOT ready to build from" : "passes the architecture gate"}.`);
process.exit(findings.length ? 1 : 0);
