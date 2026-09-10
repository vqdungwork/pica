/**
 * direction-spread-check.mjs — three directions that are actually three.
 *
 * proposals.md has required S1 to be "the same screen three times" since 0.9.1, and
 * proposal-check verifies that a slot was addressed, that an axis was named, that each option
 * carries provenance and that a choice was recorded. What nothing checked is whether the three
 * options are FAR APART.
 *
 * Three directions that differ only in accent colour are worse than two that differ in tradition:
 * they look like a choice, the client picks one in three seconds as instructed, and the decision
 * they were actually offered was nothing. The count was never the problem. 2.0.0 kept it at three
 * and added the spread requirement instead, because widening to five buys less than making the
 * three genuinely different and costs 67% more building.
 *
 * Four checks, all against S1 only — the other slots are single-axis by design:
 *
 *   1. THREE OFFERED    S1 carries exactly three options. proposals.md: "a slot with one option is
 *                       not a proposal", and four is a matrix rather than a comparison.
 *   2. TRADITIONS DIFFER each names a different tradition from design-vocabulary.md's ten.
 *   3. BASELINE PRESENT one of the three is the sector's own tradition. "Offering three departures
 *                       and no baseline makes the baseline unavailable, which is a choice made by
 *                       omission."
 *   4. NUMBERS DIFFER   the asserted numbers actually differ. A direction is written as numbers or
 *                       it is not written, and three sets of identical numbers are one direction
 *                       with three names.
 *
 * Usage: node direction-spread-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) { console.error("usage: node direction-spread-check.mjs <state.json>"); process.exit(2); }

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const TRADITIONS = ["flat", "material", "skeuomorphism", "neumorphism", "glassmorphism",
  "neobrutalism", "minimalism", "maximalism", "editorial", "international", "swiss"];

const s1 = (state.proposals || []).find((p) => String(p.slot || "").toUpperCase() === "S1");
if (!s1) {
  console.log("NOT APPLICABLE  no S1 proposal, so the direction has not been offered yet.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const options = s1.options || [];

/* ---- 1. THREE OFFERED ---- */
let countBad = 0;
if (options.length !== 3) {
  countBad++;
  fail("three-offered", `S1 has ${options.length} option(s)`,
    options.length < 2
      ? "A slot with one option is not a proposal, it is a decision being shown, and it should be reported as one."
      : options.length === 2
        ? "Two is the industry habit and it leaves the sector's own baseline unoffered unless one of the two is it."
        : "Above three the client stops comparing and starts picking whichever renders best, which is the failure the one-axis rule exists to prevent.");
}

/* ---- 2. TRADITIONS DIFFER & 3. BASELINE PRESENT ---- */
let tradBad = 0, baselineBad = 0;
const named = [];
for (const [i, o] of options.entries()) {
  const t = String(o.tradition || "").toLowerCase();
  const hit = TRADITIONS.find((x) => t.includes(x));
  if (!hit) {
    tradBad++;
    fail("traditions-differ", `S1 option ${i + 1}`,
      `names tradition "${o.tradition ?? "absent"}", which is none of the ten in design-vocabulary.md. ` +
      `"Instrument" is not checkable, disputable or researchable; "International Style discipline on ` +
      `the grid, with Material's elevation for the tables" is all three.`);
    continue;
  }
  if (named.includes(hit)) {
    tradBad++;
    fail("traditions-differ", `S1 option ${i + 1}`,
      `names "${hit}" and so does another option. Two options in one tradition differ on decoration, ` +
      "and the client is being shown one direction twice.");
  }
  named.push(hit);
}
if (options.length && !options.some((o) => o.isSectorBaseline === true)) {
  baselineBad++;
  fail("baseline-present", "S1",
    "offers no option marked isSectorBaseline. Offering three departures and no baseline makes the " +
    "baseline unavailable, which is a choice made by omission rather than by the client.");
}

/* ---- 4. NUMBERS DIFFER ---- */
const AXES = ["radius", "controlHeight", "hueCount", "spacingStep", "typeScale", "elevation"];
let numbersBad = 0;
const vectors = options.map((o) => o.asserts || o.numbers || {});
for (const axis of AXES) {
  const vals = vectors.map((v) => v[axis]).filter((x) => x !== undefined);
  if (vals.length < 2) continue;
  if (new Set(vals.map(String)).size > 1) continue;
  numbersBad++;
  fail("numbers-differ", `S1 · ${axis}`,
    `is ${vals[0]} in all ${vals.length} options that state it. Three sets of identical numbers are ` +
    "one direction with three names, and the difference the client is choosing between is invisible.");
}
if (options.length && vectors.every((v) => !Object.keys(v).length)) {
  numbersBad++;
  fail("numbers-differ", "S1",
    "no option asserts any numbers. A direction is written as numbers or it is not written, and " +
    "without them the spread cannot be measured and neither can the build.");
}

const table = [
  ["three-offered", countBad, `${options.length} option(s)`],
  ["traditions-differ", tradBad, named.length ? named.join(", ") : "none named"],
  ["baseline-present", baselineBad, options.some((o) => o.isSectorBaseline) ? "one option is the sector's own" : "none marked"],
  ["numbers-differ", numbersBad, `${AXES.filter((a) => vectors.some((v) => v[a] !== undefined)).length} axis(es) asserted`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(20)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
