/**
 * proposal-check.mjs — the proposal gate. Runs before each confirmation.
 *
 * pica decides well and, until 0.9.1, decided almost everything. A client saw the design
 * fully built, in one direction, with the taste question already answered by whoever
 * wrote it. Real users asked for a design system proposal, which is the visible half of a
 * larger gap: the flow had three stops and no offers.
 *
 * The slots are universal and what fills them is derived. That distinction is the whole
 * design and getting it backwards is the obvious mistake: a rule offering "streak, chain
 * or run" is a habit-tracker rule wearing a general one's clothes, and noise on a
 * payments product. So this checks the SHAPE of a proposal — that a slot was addressed,
 * that options carry provenance, that they differ on a stated axis, that a choice was
 * recorded — and never what the options were.
 *
 * Six checks:
 *
 *   1. SLOT ADDRESSED   every universal slot is presented or skipped WITH A REASON.
 *                       PASS: 0 unaddressed. A slot nobody asked and a slot with no
 *                       answer look identical afterwards.
 *   2. AXIS NAMED       every presented slot names the one axis its options differ on.
 *                       PASS: 0 unnamed. Options differing on everything are not
 *                       comparable, and the client picks what renders best.
 *   3. PROVENANCE       every option names where it came from.
 *                       PASS: 0 unsourced. An option with no source is a preference the
 *                       model had, dressed as a recommendation.
 *   4. REAL CHOICE      a presented slot offers two or more options.
 *                       PASS: 0 single-option slots. One option is a decision being
 *                       shown, and it should be reported as one.
 *   5. NOT FORBIDDEN    no option violates the sector's own forbidden list.
 *                       PASS: 0. Offering a defect and letting the client pick it
 *                       launders it through their approval.
 *   6. CHOICE RECORDED  every presented slot records a choice, who, when, and their
 *                       own words.  PASS: 0 incomplete.
 *
 * WHAT THIS CANNOT DO: tell you the options were worth choosing between. Three weak ones
 * produce a choice, a recorded decision, a clean check and a bad product. That judgement
 * is a human's, and the report says so on every run.
 *
 * Usage: node proposal-check.mjs <state.json> [--phase design|scope|release]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
const pAt = args.indexOf("--phase");
const PHASE = pAt >= 0 ? args[pAt + 1] : null;

if (!statePath) {
  console.error("usage: node proposal-check.mjs <state.json> [--phase design|scope|release]");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

/* ---- void detection ------------------------------------------------------ *
 * A field that has been EMPTIED reads exactly like a field that was answered. Every
 * other gate in this project learned that the same way, from a register defeated end to
 * end by writing "n/a" into every field it required.
 *
 * Duplicated rather than imported: these scripts run standalone from their own package
 * after a single-package install, where no sibling package's path exists. */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};
const NAMED = 2;   // a person or a source, not a sentence

/* ---- the slots ----------------------------------------------------------- *
 * Universal. `needs` says what material a project must have for the slot to apply, so a
 * skip can be judged rather than taken on trust: a slot skipped as "not applicable" on a
 * project that HAS the material is a slot someone decided not to ask. */
const SLOTS = [
  { id: "S1", name: "direction", phase: "design", always: true,
    needs: (s) => (s.measured || s.research || []).length >= 3,
    material: "three or more measured products" },
  { id: "S2", name: "default mode and density", phase: "design", always: true,
    needs: () => true, material: "the sector's colour and density conventions" },
  { id: "S3", name: "the sector's signature moment", phase: "design", always: false,
    needs: (s) => Boolean((s.stakeholders || []).some((x) => said(x.fears))),
    material: "a stakeholder whose fear names the moment the field designs badly" },
  { id: "S4", name: "the word the product turns on", phase: "design", always: false,
    needs: (s) => Boolean(String(s.delta || "").trim()) && (s.glossary || []).length > 0,
    material: "a delta and a glossary" },
  { id: "S5", name: "who sees what", phase: "design", always: false,
    needs: (s) => (s.stakeholders || []).filter((x) => !/regulator|standards|council|body/i.test(String(x.role || ""))).length >= 2,
    material: "two or more human actors" },
  { id: "S6", name: "what is in the first release", phase: "scope", always: true,
    needs: (s) => (s.useCases || []).length > 0, material: "use cases to price" },
  { id: "S7", name: "where it runs", phase: "scope", always: true,
    needs: () => true, material: "none — this one always applies" },
];

const proposals = state.proposals;
const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- shape guard --------------------------------------------------------- */
if (proposals === undefined) {
  console.error("FAIL  state carries no `proposals` register, so nothing records what the client was");
  console.error("      offered or what they chose. Every design decision in this project was made");
  console.error("      by whoever built it, and that is not the same as a client approving it.");
  console.error("      Zero findings here would be a lie, so this exits rather than reporting one.");
  process.exit(2);
}
if (!Array.isArray(proposals)) {
  console.error(`FAIL  state.proposals is ${typeof proposals}, and this reads it as an array.`);
  process.exit(2);
}

const byId = new Map();
for (const p of proposals) {
  if (!p || typeof p !== "object") continue;
  byId.set(String(p.slot || "").toUpperCase(), p);
}

/* ---- the sector's forbidden list, for check 5 ---------------------------- *
 * Read from the analyst package when it is installed. When it is not, check 5 cannot run
 * and says so rather than passing: that distinction is the one this project exists to
 * hold. */
let forbidden = [];
let forbiddenScope = "";
const key = String((state.industry || {}).key || "").toLowerCase().trim();
if (!key) {
  forbiddenScope = "no sector resolved, so nothing could be compared. NOT a pass";
} else {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "..", "..", "analyst", "data", "industries.json"),
    ...(() => {
      /* An install puts each package in pica-<name>/<version>/, so a sibling is two
       * levels up and one across — the layout that made every cross-package path in
       * this repository resolve to nothing until 0.9.0. */
      const cacheRoot = path.join(here, "..", "..", "..");
      try {
        return fs.readdirSync(cacheRoot)
          .filter((d) => d === "pica-analyst")
          .flatMap((d) => fs.readdirSync(path.join(cacheRoot, d))
            .map((v) => path.join(cacheRoot, d, v, "data", "industries.json")))
          .sort();
      } catch { return []; }
    })(),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    forbiddenScope = "pica-analyst is not installed, so the sector's forbidden list could not be read. NOT a pass";
  } else {
    try {
      const entry = JSON.parse(fs.readFileSync(found, "utf8")).industries[key];
      forbidden = (entry && entry.forbidden) || [];
      forbiddenScope = `${forbidden.length} sector defect(s) compared`;
    } catch (e) {
      forbiddenScope = `the sector base could not be read (${e.message}). NOT a pass`;
    }
  }
}

/* ---- 1. slot addressed ---------------------------------------------------- */
let unaddressed = 0;
const applicable = [];
for (const slot of SLOTS) {
  if (PHASE && slot.phase !== PHASE) continue;
  const applies = slot.always || slot.needs(state);
  const p = byId.get(slot.id);
  if (applies) applicable.push(slot);

  if (!p) {
    if (!applies) continue;   // does not apply and was not claimed: nothing to record
    unaddressed++;
    fail("slot-addressed", `${slot.id} ${slot.name}`,
      `applies to this project (it has ${slot.material}) and appears in no proposal register. ` +
      `The client was not offered it and nothing records why`);
    continue;
  }
  if (p.presented === true) continue;

  /* Skipped. A reason is required, and a skip on a slot whose material IS present is a
   * decision someone made rather than an absence. */
  if (!said(p.skipped, 12)) {
    unaddressed++;
    fail("slot-addressed", `${slot.id} ${slot.name}`,
      p.skipped === undefined
        ? "is neither presented nor skipped. A slot in the register with no verdict is a slot nobody decided"
        : `is skipped and the reason reads as "${String(p.skipped).slice(0, 30)}". Voiding the field is not a reason`);
  } else if (applies && slot.always) {
    unaddressed++;
    fail("slot-addressed", `${slot.id} ${slot.name}`,
      `is skipped with a reason, and this slot applies to every project. Skipping it is a decision ` +
      `to make the client's choice for them: "${String(p.skipped).slice(0, 60)}"`);
  }
}

/* ---- 2 to 6, over the presented slots ------------------------------------ */
let noAxis = 0, unsourced = 0, single = 0, offeredDefect = 0, unrecorded = 0;
const presented = proposals.filter((p) => p && p.presented === true);

for (const p of presented) {
  const id = String(p.slot || "(unnumbered)");
  const opts = Array.isArray(p.options) ? p.options : [];

  /* ---- 2. axis named ---- */
  if (!said(p.axis, 8)) {
    noAxis++;
    fail("axis-named", id,
      "names no axis its options differ on. Options that differ on everything are not comparable, " +
      "and the client picks the one that renders best rather than the one that fits");
  }

  /* ---- 4. a real choice ---- */
  if (opts.length < 2) {
    single++;
    fail("real-choice", id,
      `offers ${opts.length} option(s). One option is a decision being shown, and presenting it as a ` +
      "choice makes the client's approval read as a preference they expressed");
  }

  /* ---- 3. provenance ---- */
  for (const [i, o] of opts.entries()) {
    const label = (o && (o.id || o.names)) || `option ${i + 1}`;
    if (!said((o || {}).from, 12)) {
      unsourced++;
      fail("provenance", `${id} / ${label}`,
        "names no source. An option with no provenance is a preference the model had, dressed as a " +
        "recommendation, and it does not become a choice by having two siblings");
    }
    /* ---- 5. not forbidden ---- *
     * Matched on the sector's own wording so the comparison cannot drift into a
     * paraphrase that no longer names the same pattern. */
    const text = `${(o || {}).names || ""} ${(o || {}).costs || ""} ${(o || {}).from || ""} ${(o || {}).behaviour || ""}`.toLowerCase();
    for (const f of forbidden) {
      const stem = String(f).toLowerCase().replace(/^(a|an|the)\s+/, "").slice(0, 34);
      if (stem.length > 12 && text.includes(stem)) {
        offeredDefect++;
        fail("not-forbidden", `${id} / ${label}`,
          `describes "${stem}", which this sector treats as a defect. Offering it and letting the ` +
          "client pick it launders a defect through their approval");
      }
    }
  }

  /* ---- 6. choice recorded ---- */
  const chosen = p.chosen;
  const ids = new Set(opts.map((o, i) => String((o && o.id) || i + 1)));
  if (chosen === undefined || chosen === null || String(chosen).trim() === "") {
    unrecorded++;
    fail("choice-recorded", id, "was presented and no choice is recorded. An offer with no answer is an open question, not a decision");
  } else if (opts.length && !ids.has(String(chosen))) {
    unrecorded++;
    fail("choice-recorded", id, `records chosen "${chosen}", which is not one of the options offered (${[...ids].join(", ")})`);
  }
  if (!said(p.by, NAMED)) {
    unrecorded++;
    fail("choice-recorded", id, "records no `by`. A choice nobody is attributed to cannot be defended in review round three");
  }
  if (!said(p.on, 6)) {
    unrecorded++;
    fail("choice-recorded", id, "records no `on`. Without a date, a later disagreement cannot be placed against what was known at the time");
  }
  if (!said(p.why, 12)) {
    unrecorded++;
    fail("choice-recorded", id,
      "records no `why` in the client's own words. A paraphrase is a second decision wearing the " +
      "first one's authority, and nobody can later tell which of the two is being defended");
  }
}

/* ---- report -------------------------------------------------------------- */
console.log(`slots applicable:  ${applicable.length}${PHASE ? ` (phase: ${PHASE})` : ""}`);
console.log(`presented:         ${presented.length}`);
console.log(`skipped:           ${proposals.filter((p) => p && p.presented !== true).length}`);
console.log(`options offered:   ${presented.reduce((a, p) => a + (Array.isArray(p.options) ? p.options.length : 0), 0)}`);
console.log("");

const table = [
  ["slot-addressed", unaddressed, `${applicable.length} applicable`],
  ["axis-named", noAxis, `${presented.length} presented`],
  ["provenance", unsourced, `${presented.reduce((a, p) => a + (p.options || []).length, 0)} options`],
  ["real-choice", single, `${presented.length} presented`],
  ["not-forbidden", offeredDefect, forbiddenScope],
  ["choice-recorded", unrecorded, `${presented.length} presented`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!forbidden.length && key)
  console.log(`\nNOTE  ${forbiddenScope}`);

console.log("\nNOTE  this cannot tell you the options were worth choosing between. Three weak ones");
console.log("      produce a choice, a recorded decision, a clean check and a bad product. Whether");
console.log("      the set was worth offering is a human's judgement, and nothing here can make it.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The client ${findings.length ? "has NOT been offered the decisions that are theirs" : "was offered every decision that is theirs"}.`);
process.exit(findings.length ? 1 : 0);
