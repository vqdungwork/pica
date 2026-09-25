/**
 * audience-check.mjs: the second knowledge axis, resolved rather than asserted.
 *
 * industries.json answered one question for eight versions, what field is this, and it was
 * never the only one that shapes a screen. healthcare for clinicians and healthcare for older
 * patients are not the same product: the sector says what red means, the audience says how big
 * the text has to be before anyone can read it.
 *
 * The audience is RESEARCHED, not declared at intake. Most briefs cannot answer it, and a guessed
 * band silently removes the floors that exist to protect the people who need them. So this runs in
 * the discover phase, against what discovery found.
 *
 * Five checks:
 *
 *   1. RESOLVED        every selected value is a real key in audiences.json.
 *   2. DIMENSIONS      every dimension has a selection, or a recorded reason it does not apply.
 *   3. FLOORS          the merged floors are computed and recorded, so design has numbers to hold
 *                      to rather than an adjective.
 *   4. EVIDENCE        each selection carries how it was found. An audience nobody researched and
 *                      an audience nobody could research look identical otherwise, and only one of
 *                      them is a finding.
 *   5. AMBIGUOUS       a word the register refuses is refused here too, and it says what it could
 *                      have meant.
 *
 * Floors merge by MAXIMUM. That is the whole mechanism behind "audience floors override sector
 * density": a floor is not a preference to be balanced against one, and a sector that wants to go
 * under one has to say so as a deviation with a reason.
 *
 * Usage: node audience-check.mjs <state.json>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const [, , statePath] = process.argv;
if (!statePath) {
  console.error("usage: node audience-check.mjs <state.json>");
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(here, "..", "data", "audiences.json");

let state, data;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  console.error("      Nothing was checked, and that is not a pass.");
  process.exit(2);
}
try { data = JSON.parse(fs.readFileSync(dataPath, "utf8")); }
catch (e) {
  console.error(`FAIL  audiences.json could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}

/* Not applicable is a real answer, and a different one from "nobody looked". A project that has
   not reached discovery is not a project with a broken audience. */
const aud = state.audience;
if (!aud || (typeof aud === "object" && !Object.keys(aud).length)) {
  console.log("NOT APPLICABLE  state.audience is absent, so discovery has not run yet.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const dims = data.dimensions;
const said = (x, min = 8) => String(x || "").trim().length >= min;

/* The selection shape: { age: {value, evidence}, conditions: {values:[...], evidence} } and a
   dimension may be answered `{ notApplicable: "reason" }`. */
const sel = aud.dimensions || aud;

/* ---- 1. RESOLVED & 5. AMBIGUOUS ------------------------------------------ */
let resolvedBad = 0, ambiguousBad = 0, selected = 0;
for (const [dk, entry] of Object.entries(sel)) {
  if (!dims[dk]) {
    resolvedBad++;
    fail("audience-resolved", `dimension "${dk}"`,
      `is not a dimension in audiences.json. The five are: ${Object.keys(dims).join(", ")}.`);
    continue;
  }
  if (entry && entry.notApplicable) continue;
  const values = entry && Array.isArray(entry.values) ? entry.values
    : entry && entry.value !== undefined ? [entry.value]
    : typeof entry === "string" ? [entry] : [];
  if (!values.length) continue;
  for (const v of values) {
    selected++;
    const bare = String(v).includes(":") ? String(v).split(":")[1] : String(v);
    if (dims[dk].values[bare]) continue;
    const amb = data.ambiguous || {};
    const key = String(v).toLowerCase();
    if (amb[key]) {
      ambiguousBad++;
      fail("audience-ambiguous", `${dk} = "${v}"`,
        `is refused as ambiguous: it could mean ${amb[key].join(" or ")}. Say which, or say why neither.`);
    } else {
      resolvedBad++;
      fail("audience-resolved", `${dk} = "${v}"`,
        `is not a value of "${dk}". Known: ${Object.keys(dims[dk].values).join(", ")}.`);
    }
  }
  if (values.length > 1 && !dims[dk].multiple) {
    resolvedBad++;
    fail("audience-resolved", `${dk} has ${values.length} values`,
      `but "${dk}" takes one. Only a dimension marked multiple accepts several.`);
  }
}

/* ---- 2. DIMENSIONS ------------------------------------------------------- */
let dimBad = 0;
for (const dk of Object.keys(dims)) {
  const entry = sel[dk];
  if (entry && (entry.notApplicable || entry.value !== undefined
      || (Array.isArray(entry.values) && entry.values.length) || typeof entry === "string")) continue;
  dimBad++;
  fail("audience-dimensions", `${dk}`,
    "has no selection and no recorded reason it does not apply. An unasked dimension and an " +
    "inapplicable one look identical, and the floors it would have set are silently gone.");
}

/* ---- 3. FLOORS ----------------------------------------------------------- */
const expected = {};
for (const [dk, entry] of Object.entries(sel)) {
  if (!dims[dk] || (entry && entry.notApplicable)) continue;
  const values = entry && Array.isArray(entry.values) ? entry.values
    : entry && entry.value !== undefined ? [entry.value]
    : typeof entry === "string" ? [entry] : [];
  for (const v of values) {
    const bare = String(v).includes(":") ? String(v).split(":")[1] : String(v);
    const f = dims[dk].values[bare] && dims[dk].values[bare].floors;
    for (const [k, n] of Object.entries(f || {}))
      expected[k] = Math.max(expected[k] ?? -Infinity, n);
  }
}
let floorBad = 0;
const got = aud.floors || {};
for (const [k, n] of Object.entries(expected)) {
  if (got[k] === n) continue;
  floorBad++;
  fail("audience-floors", `floors.${k}`,
    got[k] === undefined
      ? `is absent. The selected values require ${k} ${n}, and design cannot hold to a floor nobody wrote down.`
      : `records ${got[k]} where the selected values merge to ${n}. Floors merge by maximum, and the lower one is the one that fails a real user.`);
}

/* ---- 4. EVIDENCE --------------------------------------------------------- */
let evidenceBad = 0;
for (const [dk, entry] of Object.entries(sel)) {
  if (!dims[dk]) continue;
  if (entry && entry.notApplicable) {
    if (!said(entry.notApplicable, 10)) {
      evidenceBad++;
      fail("audience-evidence", `${dk}.notApplicable`,
        "gives no reason. A dimension dismissed without one is a dimension nobody considered.");
    }
    continue;
  }
  if (typeof entry === "string" || !said(entry && entry.evidence, 10)) {
    evidenceBad++;
    fail("audience-evidence", `${dk}.evidence`,
      "does not say how this was found. Discovery researches the audience; a value with no " +
      "provenance is a guess wearing a key.");
  }
}

/* ---- report -------------------------------------------------------------- */
const table = [
  ["audience-resolved", resolvedBad, `${selected} value(s) selected`],
  ["audience-dimensions", dimBad, `${Object.keys(dims).length} dimension(s) in the register`],
  ["audience-floors", floorBad, Object.keys(expected).length
    ? Object.entries(expected).map(([k, n]) => `${k} ${n}`).join(", ") : "no floors from these values"],
  ["audience-evidence", evidenceBad, "every selection says how it was found"],
  ["audience-ambiguous", ambiguousBad, `${Object.keys(data.ambiguous || {}).length} refused word(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(20)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
