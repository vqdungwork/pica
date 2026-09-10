/**
 * problem-check.mjs: the number the project is judged by, and the decisions around it.
 *
 * Until 1.0.0 nothing in this repository read state.problem. `grep -rl 'state.problem'
 * packages/*\/scripts` returned nothing, which means a project could reach a released
 * product without ever having agreed what would move. /pica-analyse asked for the metric
 * at 1.2 and /pica-close read it back at 8.5, and between those two nothing checked that
 * it existed. A rule stated in prose lasts about a day; this is the file that makes it
 * last to package eleven.
 *
 * It also covers the freeze, a decision that belongs to a human and was therefore
 * unchecked. It does NOT check that an agent made it, because an agent must not. It
 * checks the decision was recorded and attributed, which is the only part a script can
 * know and exactly what was missing.
 *
 * 2.0.0 removed two of the ten. TRIGGER asked what changed and when the window closes;
 * intake no longer asks, because most briefs cannot answer it and discovery researches
 * the same thing better as "why buyers change". CONSTRAINT read commercialConstraint,
 * which left intake with input 3: only its disclosure half reached a client-facing
 * artefact, and that is enforced by disclosure-check instead. A check that outlives the
 * field it reads is the fail-open shape this file exists to argue against.
 *
 * Eight checks:
 *
 *   1. METRIC          one metric, named, with a unit, a statement and whose it is.
 *   2. TARGET          differs from the baseline, and the direction is stated.
 *   3. BASELINE        a figure, the system it came from, and the date it was taken.
 *   4. GUARDRAIL       at least one thing that must not get worse, with a threshold.
 *   5. COUNTER         what result would prove the problem is not real.
 *   6. HMW             a question that does not already name the answer.
 *   7. TIER            every work package is standard or complex.
 *   8. FREEZE          with --freeze: attributed, and over packages that were approved.
 *
 * Usage: node problem-check.mjs <state.json> [--freeze]
 */
import fs from "fs";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
const FREEZE = args.includes("--freeze");

if (!statePath) {
  console.error("usage: node problem-check.mjs <state.json> [--freeze]");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

/* ---- void detection, taken from estimate-check --------------------------- *
 * An emptied field reads exactly like an answered one, and length alone is the wrong
 * instrument: "PM" is a real answer and "n/a" is not, and they are the same length. An
 * early revision of industry-check was defeated end to end by writing "n/a" into every
 * field it required. */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

/* Nothing this file covers exists means the project predates all of it, and eighteen
 * findings is a worse answer than one sentence. It reported exactly that on eight of nine
 * real projects. If ANY of the four blocks is present, check them all properly: a
 * half-recorded problem statement is the thing worth finding. */
if (!state.problem && !Object.keys(state.workPackages || {}).length) {
  console.error("FAIL  state carries no problem and no workPackages.");
  console.error("      Nothing to check, and a list of findings against nothing would say the project");
  console.error("      is broken when it has simply not reached 1.2 yet. Run /pica then /pica-analyse.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const p = state.problem || {};

/* ---- 1. METRIC ----------------------------------------------------------- *
 * One metric, not two. Two primary metrics means the team optimises whichever is easier
 * and reports that one. The unit is separate because "conversion: 40" is three different
 * claims depending on whether that is percent, per day, or a count. */
let metricBad = 0;
if (!said(p.metric, 10)) {
  metricBad++;
  fail("metric", "problem.metric",
    "absent or void. Without it the project has no definition of done and will not finish, only be abandoned.");
}
if (!said(p.unit, 2)) {
  metricBad++;
  fail("metric", "problem.unit", "absent. A bare figure is three different claims depending on the unit.");
}
if (!said(p.statement, 25)) {
  metricBad++;
  fail("metric", "problem.statement", "absent. State the problem in one sentence, in the user's language.");
}
if (!said(p.whose, 4)) {
  metricBad++;
  fail("metric", "problem.whose",
    '"Users" is not a segment, and a problem belonging to nobody in particular belongs to nobody.');
}

/* ---- 2. TARGET ----------------------------------------------------------- *
 * A target equal to the baseline is a project that has already succeeded, which is how a
 * metric gets chosen to be safe rather than to be true. */
let targetBad = 0;
const base = Number(p.baseline);
const targ = Number(p.target);
if (!Number.isFinite(targ)) {
  targetBad++;
  fail("target", "problem.target", `"${p.target ?? "absent"}" is not a number.`);
} else if (Number.isFinite(base) && targ === base) {
  targetBad++;
  fail("target", "problem.target",
    `${targ} equals the baseline. Either the metric was chosen to be safe, or the target was never set.`);
}
if (!["up", "down"].includes(String(p.direction || "").toLowerCase())) {
  targetBad++;
  fail("target", "problem.direction",
    'not "up" or "down". Which way is better has to be explicit for 8.5 to judge it.');
}

/* ---- 3. BASELINE --------------------------------------------------------- *
 * The one figure that is unrecoverable later. After launch there is no way back to what
 * the number was before, so a project without a baseline will argue about whether it
 * worked using the same data either way. The system and the date matter because a
 * baseline nobody can re-derive is a number somebody remembered. */
let baselineBad = 0;
if (!Number.isFinite(base)) {
  baselineBad++;
  fail("baseline", "problem.baseline",
    "not a number. Take it before you build; afterwards it cannot be recovered.");
}
if (!said(p.baselineMeasuredBy, 12)) {
  baselineBad++;
  fail("baseline", "problem.baselineMeasuredBy",
    "no system named. A baseline nobody can re-derive is a number somebody remembered.");
}
if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(p.baselineMeasuredOn || ""))) {
  baselineBad++;
  fail("baseline", "problem.baselineMeasuredOn",
    `"${p.baselineMeasuredOn ?? "absent"}" is not a date. A baseline with no date drifts into whatever the number is now.`);
}

/* ---- 4. GUARDRAIL -------------------------------------------------------- *
 * A single metric with nothing beside it invites the team to move it at the expense of
 * something nobody named. One guardrail is the floor, and a guardrail with no number on
 * it cannot be breached, so it guards nothing. */
let guardBad = 0;
const guards = Array.isArray(p.guardrails) ? p.guardrails : [];
if (!guards.length) {
  guardBad++;
  fail("guardrail", "problem.guardrails",
    "empty. Name at least one thing that must not get worse, or the metric can be moved by breaking something else.");
}
for (const [i, g] of guards.entries()) {
  if (!said(g.metric, 8) || !said(g.unit, 2)) {
    guardBad++;
    fail("guardrail", `problem.guardrails[${i}]`, "needs a metric and a unit.");
  }
  if (!Number.isFinite(Number(g.mustNotExceed ?? g.mustNotFallBelow))) {
    guardBad++;
    fail("guardrail", `problem.guardrails[${i}] (${g.metric || "unnamed"})`,
      "no threshold. A guardrail with no number on it cannot be breached, so it guards nothing.");
  }
}

/* ---- 5. COUNTER-EVIDENCE ------------------------------------------------- *
 * The question nobody asks about their own project. Stating in advance what would prove
 * the problem is not real is the only thing that makes it falsifiable, and an
 * unfalsifiable problem statement survives any amount of contrary evidence. */
let counterBad = 0;
if (!said(p.counterEvidence, 25)) {
  counterBad++;
  fail("counter-evidence", "problem.counterEvidence",
    "absent or void. State what result would prove this problem is not real, or nothing can.");
}

/* ---- 6. HMW -------------------------------------------------------------- *
 * The metric says whether you won. The question says what to widen against at 3.1, and
 * they are different objects: a metric is judgeable, a question is generative.
 *
 * The check is not that it ends in a question mark. It is that it does not already name
 * the answer. "How might we build a dashboard" is a solution wearing a question mark,
 * and three concepts diverged against it come back as three versions of one idea. */
const SOLUTION_WORDS = /\b(dashboards?|apps?|screens?|pages?|buttons?|portals?|widgets?|modals?|forms?|websites?|platforms?|chatbots?|wizards?|tabs?|menus?|reports?)\b/i;
let hmwBad = 0;
const hmw = String(p.hmw || "").trim();
if (!said(hmw, 20)) {
  hmwBad++;
  fail("hmw-generative", "problem.hmw",
    "absent. Without it 3.1 widens against nothing, and the first concept becomes the only concept.");
} else {
  if (!hmw.includes("?")) {
    hmwBad++;
    fail("hmw-generative", "problem.hmw",
      "not phrased as a question, so it reads as a statement of intent rather than an opening.");
  }
  const hit = hmw.match(SOLUTION_WORDS);
  if (hit) {
    hmwBad++;
    fail("hmw-generative", "problem.hmw",
      `names "${hit[0]}", which is an answer rather than a question. Restate it as the outcome and let 3.1 decide whether a ${hit[0]} is the right shape.`);
  }
}

/* ---- 9. TIER ------------------------------------------------------------- *
 * estimate-check's tier-spread compares complex against standard and reports when every
 * package is one tier. It cannot see a package with NO tier, which then silently joins
 * whichever group the default puts it in and is priced as if it were the easy kind. */
let tierBad = 0;
const wps = Object.entries(state.workPackages || {});
for (const [name, w] of wps) {
  if (!["standard", "complex"].includes(String(w.tier || "").toLowerCase())) {
    tierBad++;
    fail("tier-declared", `workPackages.${name}.tier`,
      `"${w.tier ?? "absent"}" is not standard or complex. An untiered package is priced as whatever the default is.`);
  }
}

/* ---- 10. FREEZE ---------------------------------------------------------- *
 * Only at --freeze. Step 10 is a human act and this does not pretend otherwise: it
 * checks the act left a record. A freeze over a package nobody approved is the whole
 * reason law 2 exists, and change control agreed after the first change request is
 * agreed during an argument. */
let freezeBad = 0;
if (FREEZE) {
  if (!state.scopeFrozen) {
    freezeBad++;
    fail("freeze-attributed", "scopeFrozen", "not set, and --freeze was passed.");
  }
  if (!said(state.frozenBy, 4)) {
    freezeBad++;
    fail("freeze-attributed", "frozenBy",
      "nobody named. Sign-off from someone who cannot approve is not sign-off, and afterwards nobody can say who did.");
  }
  const unapproved = wps.filter(([, w]) => !w.htmlApproved).map(([n]) => n);
  if (unapproved.length) {
    freezeBad++;
    fail("freeze-attributed", "workPackages",
      `${unapproved.join(", ")} frozen without htmlApproved. Scope can only be frozen against something the decider clicked.`);
  }
  if (!said(state.changeControl, 20)) {
    freezeBad++;
    fail("freeze-attributed", "changeControl",
      "absent. Agree who approves a change, what it costs and how the date moves now, while nobody is angry.");
  }
}

/* ---- report -------------------------------------------------------------- */
const table = [
  ["metric", metricBad, said(p.metric, 10) ? `"${String(p.metric).slice(0, 38)}"` : "absent"],
  ["target", targetBad, `${p.baseline ?? "?"} to ${p.target ?? "?"} ${p.unit || ""}`.trim()],
  ["baseline", baselineBad, Number.isFinite(base) ? `${base} on ${p.baselineMeasuredOn || "no date"}` : "absent"],
  ["guardrail", guardBad, `${guards.length} guardrail(s)`],
  ["counter-evidence", counterBad, said(p.counterEvidence, 25) ? "stated" : "absent"],
  ["hmw-generative", hmwBad, hmw ? `"${hmw.slice(0, 38)}${hmw.length > 38 ? "..." : ""}"` : "absent"],
  ["tier-declared", tierBad, `${wps.length} package(s)`],
  ["freeze-attributed", freezeBad, FREEZE ? (state.frozenBy || "unattributed") : "not checked, run with --freeze"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(20)} ${String(n).padStart(3)} finding(s)   (${scope})`);

/* Eighteen findings against a problem statement nobody has written yet is eighteen true
 * things where one would do. The findings stay, because each names a field somebody has
 * to fill, but the reader is told which situation they are in first: seven of nine real
 * projects hit exactly this, and a list that long reads as a broken artefact rather than
 * as an absent one. */
if (!state.problem) {
  console.log("");
  console.log("NOTE  no problem statement exists. The findings below are not");
  console.log("      eighteen separate defects, they are one absence itemised: this project has never");
  console.log("      recorded what number would move if it worked. Run /pica intake and /pica-analyse 1.2.");
}

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The problem statement ${findings.length ? "is NOT agreed" : "is agreed and judgeable"}.`);
process.exit(findings.length ? 1 : 0);
