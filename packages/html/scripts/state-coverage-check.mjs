/**
 * state-coverage-check.mjs: every state, not every screen.
 *
 * coverage-check verifies use case × viewport and says so in its own header. Nothing verified
 * STATES. html-prototype.md names eight minimum states: default, loading, empty, error, disabled,
 * keyboard-open, focus, plus the video set, and calls writing the matrix first "the cheapest
 * possible way to avoid finding a missing state during handoff". No script read it. A happy-path
 * screen present at every viewport returned green with seven states missing.
 *
 * This was uncheckable before 2.0.0 for a real reason: there was no authoritative list of states.
 * The matrix was prose in the design phase, worked out by whoever was drawing. Now pica-modeller
 * produces `state.stateModel` in analysis, so `screens × viewports × states` is a number.
 *
 * REACT MAKES THIS MANDATORY RATHER THAN MERELY GOOD. In static HTML a missing state is a missing
 * file you can see in a directory listing. In a React demo it is a branch nobody wrote, and there
 * is nothing to look at. The capture reaches states by URL, so "not addressable" and "not built"
 * collapse into one finding: which is the right outcome.
 *
 * Four checks:
 *
 *   1. STATE CAPTURED   every entity lifecycle state appears at every declared viewport.
 *   2. EXCUSED NAMED    a state that does not apply is excused BY NAME with a reason.
 *                       An unasked question and an inapplicable one look identical otherwise.
 *   3. MINIMUM PRESENT  the eight the rule names appear somewhere, or are excused project-wide.
 *   4. STALE EXEMPTION  no exemption for a state the model no longer has, or a viewport nobody declares.
 *
 * Usage: node state-coverage-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node state-coverage-check.mjs <html-reference.json> <state.json>");
  process.exit(2);
}

let ref, state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (!fs.existsSync(refPath)) {
  console.log(`NOT APPLICABLE  ${refPath} does not exist, so nothing has been captured.`);
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}
try { ref = JSON.parse(fs.readFileSync(refPath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${refPath} could not be parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

/* The eight html-prototype.md names, and the ones it says are most often missing. */
const MINIMUM = ["default", "loading", "empty", "error", "disabled", "keyboard-open", "focus"];

const modelStates = new Set();
for (const e of state.stateModel || [])
  for (const s of e.states || []) modelStates.add(String(s.name ?? s));
if (!modelStates.size) {
  console.log("NOT APPLICABLE  state.stateModel is absent, so there is no authoritative list of states.");
  console.log("                pica-modeller produces it in analysis. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 10) => String(x || "").trim().length >= min;

/* `frames` is an object keyed by source file, each value an array of frames. And the identity is
   not the file: the capture's own comment settles it, "a screen and its empty state serve the same
   use case at the same size… the identity is uc + state + viewport". Keying on the file would make
   approvals-empty.html a different SCREEN rather than a different STATE, which is exactly the
   pairing bug that comment records. */
const frames = [];
for (const arr of Object.values(ref.frames || {})) for (const f of arr || []) frames.push(f);

const viewports = (state.viewports || []).map((v) => String(v.name ?? v));
const screens = [...new Set((state.useCases || []).map((u) => String(u.id || "")).filter(Boolean))];

const captured = new Set();
for (const f of frames) {
  const vp = String(f.viewport ?? f.vp ?? "");
  const st = String(f.state ?? "default");
  for (const uc of f.uc && f.uc.length ? f.uc : [null])
    if (uc) captured.add(`${uc}|${vp}|${st}`);
}

/* Exemptions: { state, viewport, why } scoped to a viewport, or { state, why } project-wide. */
const ex = state.stateExemptions || [];

let capturedBad = 0, excusedBad = 0, minimumBad = 0, staleBad = 0, cells = 0;

/* ---- 1. STATE CAPTURED & 2. EXCUSED NAMED -------------------------------- *
 * Two different axes, and conflating them was wrong. An entity's LIFECYCLE states: draft,
 * held, approved: each need a screen that shows one, at every declared viewport, because
 * viewport parity is a separate promise. They do not need to appear on every screen: not
 * every use case shows a payment in every state, and demanding screens × viewports × states
 * would ask for cells the product has no reason to contain.
 *
 * The eight UI states are the other axis and are checked below, project-wide. */
const capturedStateVp = new Set([...captured].map((k) => {
  const [, vp, st] = k.split("|");
  return `${vp}|${st}`;
}));
for (const st of modelStates) {
  for (const vp of viewports) {
    cells++;
    if (capturedStateVp.has(`${vp}|${st}`)) continue;
    const hit = ex.find((x) => String(x.state) === st && (!x.viewport || String(x.viewport) === vp));
    if (!hit) {
      capturedBad++;
      fail("state-captured", `${st} · ${vp}`,
        "no captured frame shows this lifecycle state at this viewport, and it is not excused. " +
        "In a React demo a state nobody built is a branch nobody wrote: there is no missing file " +
        "to notice, so this is the only thing that will say so.");
    } else if (!said(hit.why, 10)) {
      excusedBad++;
      fail("excused-named", `${st} · ${vp}`,
        "is excused with no reason. An unasked question and an inapplicable state look identical, " +
        "and only one of them is safe.");
    }
  }
}

/* ---- 3. MINIMUM PRESENT ---- */
const anywhere = new Set([...captured].map((k) => k.split("|")[2]));
for (const st of MINIMUM) {
  if (anywhere.has(st) || ex.some((x) => !x.viewport && String(x.state) === st)) continue;
  minimumBad++;
  fail("minimum-present", `state "${st}"`,
    "appears on no captured frame anywhere and is not excused project-wide. html-prototype.md names " +
    "it as one of the minimum eight and as one of the ones most often missing.");
}

/* ---- 4. STALE EXEMPTION ---- */
for (const x of ex) {
  const st = String(x.state);
  if (!modelStates.has(st) && !MINIMUM.includes(st)) {
    staleBad++;
    fail("stale-exemption", `exemption for "${st}"`,
      "excuses a state the model does not have. A stale exemption is how a state quietly stops being " +
      "checked, and it reads exactly like a considered decision.");
  }
  if (x.viewport && !viewports.includes(String(x.viewport))) {
    staleBad++;
    fail("stale-exemption", `exemption for viewport "${x.viewport}"`,
      "names a viewport the project does not declare.");
  }
}

const table = [
  ["state-captured", capturedBad, `${cells} cell(s): ${modelStates.size} lifecycle state(s) × ${viewports.length} viewport(s)`],
  ["excused-named", excusedBad, `${ex.length} exemption(s)`],
  ["minimum-present", minimumBad, `${MINIMUM.length} minimum state(s)`],
  ["stale-exemption", staleBad, `${ex.length} exemption(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
