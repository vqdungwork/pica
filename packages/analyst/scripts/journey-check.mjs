/**
 * journey-check.mjs: the journey maps against the process model they are a view of.
 *
 * BPMN answers who does what and where it branches. A journey map answers where it hurts. They are
 * not two documents about the same thing, which is the trap: they are ONE model with two views, and
 * a journey map is that actor's lane unrolled in time with pain and opportunity layered on.
 *
 * That is why the stage axis is DERIVED from the lane and never hand-written. Two hand-written
 * accounts of one process disagree within a month, and the disagreement is discovered by a client
 * reading both.
 *
 * Four checks:
 *
 *   1. LANE COVERED   every actor with a lane in the process model has a journey. This is what stops
 *                     the Partner's view being quietly dropped for being less important than the
 *                     Client's: a lane means work, and work has an experience.
 *   2. STAGE DERIVED  every stage maps to an activity in that actor's lane. A stage that maps to
 *                     nothing is the second account starting to form.
 *   3. PAIN SOURCED   every pain carries a frequency and an evidence class traced to discovery.
 *                     "Most users find this frustrating" is not a finding; nOf [6, 7] is.
 *   4. DELTA STATED   the difference between current and future is written down. It is what is being
 *                     bought and the first thing shown at the confirmation.
 *
 * Usage: node journey-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) { console.error("usage: node journey-check.mjs <state.json>"); process.exit(2); }

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const journeys = state.journeys || [];
const model = (state.toBe && typeof state.toBe === "object") ? state.toBe
            : (state.asIs && typeof state.asIs === "object") ? state.asIs : null;

if (!journeys.length && !model) {
  console.log("NOT APPLICABLE  no journeys and no process model, so analysis has not reached them.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 8) => String(x || "").trim().length >= min;
const CLASSES = ["observed", "stated", "inferred"];

const lanes = model ? (model.lanes || []).map((l) => String(l.id ?? l)) : [];
const activityByLane = new Map(lanes.map((l) => [l, new Set()]));
for (const n of (model && model.nodes) || []) {
  const kind = String(n.kind || n.type || "activity").toLowerCase();
  if (kind !== "activity" || !n.lane) continue;
  if (!activityByLane.has(String(n.lane))) activityByLane.set(String(n.lane), new Set());
  activityByLane.get(String(n.lane)).add(String(n.id));
}

/* ---- 1. LANE COVERED ---- */
let laneBad = 0;
const journeyByActor = new Map(journeys.map((j) => [String(j.actor ?? j.lane ?? ""), j]));
for (const l of lanes) {
  if (journeyByActor.has(l)) continue;
  laneBad++;
  fail("lane-covered", `lane "${l}"`,
    "does the work and has no journey. A lane means somebody spends time in this product, and " +
    "whether that time hurts is not a question only the primary user gets asked.");
}

/* ---- 2, 3 ---- */
let stageBad = 0, painBad = 0, stages = 0, pains = 0;
for (const j of journeys) {
  const actor = String(j.actor ?? j.lane ?? "unnamed");
  const own = activityByLane.get(actor);
  for (const s of j.stages || []) {
    stages++;
    const nm = s.name || s.id || "unnamed";
    const from = [].concat(s.from || s.activities || []).map(String);
    if (!model) { /* nothing to derive against yet */ }
    else if (!from.length) {
      stageBad++;
      fail("stage-derived", `${actor}/${nm}`,
        "names no activity it comes from. The stage axis is derived from the lane, never written " +
        "by hand: two accounts of one process disagree within a month.");
    } else if (own) {
      for (const a of from) if (!own.has(a)) {
        stageBad++;
        fail("stage-derived", `${actor}/${nm} derives from "${a}"`,
          `which is not an activity in lane "${actor}".`);
      }
    }
    for (const p of [].concat(s.pain || [])) {
      pains++;
      const n = p.nOf;
      if (!Array.isArray(n) || n.length !== 2 || !Number.isFinite(n[0]) || !Number.isFinite(n[1])) {
        painBad++;
        fail("pain-sourced", `${actor}/${nm}: "${String(p.what ?? p).slice(0, 40)}"`,
          'carries no frequency. "Most users" is not a finding: nOf [6, 7] is, and without the ' +
          "denominator nobody can tell a pain point from the one interview that stuck.");
      }
      if (!CLASSES.includes(String(p.class || "").toLowerCase())) {
        painBad++;
        fail("pain-sourced", `${actor}/${nm}: "${String(p.what ?? p).slice(0, 40)}"`,
          `class "${p.class ?? "absent"}" is not one of ${CLASSES.join(", ")}. Discovery classifies ` +
          "its evidence and the journey inherits that; a pain invented here has no provenance at all.");
      }
    }
  }
}

/* ---- 4. DELTA STATED ---- */
let deltaBad = 0;
if (journeys.length && !said(state.delta, 20)) {
  deltaBad++;
  fail("delta-stated", "state.delta",
    "is absent or too thin. The delta is what is being bought and the first thing presented at the " +
    "confirmation; a journey pair with no delta stated leaves the client to work it out.");
}

const table = [
  ["lane-covered", laneBad, `${lanes.length} lane(s), ${journeys.length} journey(s)`],
  ["stage-derived", stageBad, model ? `${stages} stage(s)` : "no process model, so derivation was not checked"],
  ["pain-sourced", painBad, `${pains} pain point(s)`],
  ["delta-stated", deltaBad, said(state.delta, 20) ? "stated" : "absent"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
