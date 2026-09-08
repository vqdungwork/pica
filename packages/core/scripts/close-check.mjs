/**
 * close-check.mjs: the closeout gate, which did not exist until 1.0.0.
 *
 * pica-close.md has said since 0.3.0 to check that nothing excluded was built "by
 * comparing, not by trusting", and shipped nothing that compares. Closeout's only teeth
 * were effort-log inside estimate-check, behind a flag. Everything else the command asked
 * for was prose, and a rule stated in prose lasts about a day.
 *
 * The premise of the whole step is that closeout judges the delivery against what was
 * ORIGINALLY asked, not against what the contract was renegotiated into. So the first
 * check is about which file was read, and it is the one that matters most: a closeout that
 * reads the contract is grading the work against a document the work already negotiated,
 * and it always passes.
 *
 * Seven checks:
 *
 *   1. BRIEF COLD        read from briefPath, never from the contract. An absence may be
 *                        declared in briefAbsent; a brief that was recorded and lost may not.
 *   2. NOTHING EXCLUDED  compare shipped against the exclusions register.
 *   3. METRIC COMPARED   the number now, against the baseline taken at 1.2.
 *   4. COMMITTED SHIPPED every committed package shipped, or dropped with a reason.
 *   5. ASSUMPTION OUTCOME every assumption held or was wrong, and wrong ones cost something.
 *   6. EFFORT LOGGED     actuals against every estimated line.
 *   7. DELIVERED FROZEN  after delivery, nothing was modified.
 *
 * Usage: node close-check.mjs <state.json>
 */
import fs from "fs";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
if (!statePath) {
  console.error("usage: node close-check.mjs <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

/* ---- void detection, taken from estimate-check --------------------------- */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

/* No closeout block means the project has not reached step 8, not that its closeout is
 * defective. It reported between four and twenty-two findings on all nine real projects,
 * none of which had closed out. */
if (!state.closeout || !Object.keys(state.closeout).length) {
  console.error("FAIL  state carries no closeout. Nothing to check, and findings against nothing would");
  console.error("      read as a failed handover rather than as one that has not happened. Run");
  console.error("      /pica-close when the work is delivered.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const co = state.closeout;

/* ---- 1. BRIEF COLD ------------------------------------------------------- *
 * The check this file exists for. The brief is the only artefact that cannot have moved,
 * because reference-discipline makes it read-only from the moment it arrives. Everything
 * else in the project has been negotiated by the project. */
let coldBad = 0;
const bp = String(state.briefPath || "");

/* A brief that was NEVER SUPPLIED is a different thing from one that was supplied and
 * lost, and the first version of this check could not tell them apart. Run against nine
 * real projects, eight had no brief on disk and one of those recorded the reason in its
 * contract as a standing caveat: "No original brief was supplied." Failing that closed
 * says nothing true about it.
 *
 * So an absence may be DECLARED, in `briefAbsent`, and the reason is the only thing
 * checked. It is the same shape as `saidNoWhyNone` and `constraintsNotApplicable`: a
 * declared absence is a decision, an undeclared one is an oversight, and afterwards
 * nobody can tell which happened. What is still refused is a brief that was recorded and
 * has since gone, because that one was supposed to survive the project. */
const declaredAbsent = said(state.briefAbsent, 20);

if (!said(bp, 6)) {
  if (!declaredAbsent) {
    coldBad++;
    fail("brief-cold", "briefPath",
      "absent, and `briefAbsent` does not say why. Either record where the verbatim brief went, or state that none was supplied and what that costs: an undeclared absence and a lost file look identical.");
  }
} else if (!fs.existsSync(bp)) {
  coldBad++;
  fail("brief-cold", `briefPath (${bp})`,
    "recorded and the file is gone. The brief is the one path that has to survive the whole project, and a declared absence cannot excuse one that was supplied and lost.");
} else if (String(co.briefReadFrom || "") !== bp) {
  coldBad++;
  fail("brief-cold", "closeout.briefReadFrom",
    `"${co.briefReadFrom ?? "absent"}" is not briefPath ("${bp}"). Reading the contract instead grades the work against a document it already renegotiated, so it always passes.`);
}

/* ---- 2. NOTHING EXCLUDED ------------------------------------------------- *
 * A screen the brief explicitly excluded got designed anyway, and it was caught two days
 * later only because a human re-read the brief. Compared, not trusted. */
let builtExcluded = 0;
const shipped = (Array.isArray(co.shipped) ? co.shipped : []).map((s) => String(s).toLowerCase().trim());
const exclusions = Array.isArray(state.exclusions) ? state.exclusions : [];
for (const x of exclusions) {
  const name = String(x.excluded ?? x ?? "").toLowerCase().trim();
  if (!name) continue;
  if (shipped.some((s) => s && (s.includes(name) || name.includes(s)))) {
    builtExcluded++;
    fail("nothing-excluded", `exclusions ("${x.excluded ?? x}")`,
      "appears in closeout.shipped. Something the brief ruled out was built, which is exactly what the register exists to catch.");
  }
}

/* ---- 3. METRIC COMPARED -------------------------------------------------- *
 * The loop back to 1.2, and the step almost universally skipped. Without it a team cannot
 * say whether its last release worked, only that it shipped. */
let metricBad = 0;
const p = state.problem || {};
if (!Number.isFinite(Number(co.metricNow))) {
  metricBad++;
  fail("metric-compared", "closeout.metricNow",
    "absent. The metric from 1.2 was never read back, so nothing says whether this worked.");
}
if (!Number.isFinite(Number(p.baseline))) {
  metricBad++;
  fail("metric-compared", "problem.baseline", "absent, so metricNow compares against nothing.");
}
if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(co.metricMeasuredOn || ""))) {
  metricBad++;
  fail("metric-compared", "closeout.metricMeasuredOn",
    "no date, so the figure cannot be placed against the baseline's.");
}

/* ---- 4. COMMITTED SHIPPED ------------------------------------------------ *
 * Every package committed at the freeze is accounted for. A package that quietly vanished
 * between the freeze and delivery is the shape scope reduction takes when nobody decided
 * to reduce it. */
let unaccounted = 0;
const dropped = Object.fromEntries(
  (Array.isArray(co.dropped) ? co.dropped : []).map((d) => [String(d.package ?? d).toLowerCase(), d.why]));
for (const name of Object.keys(state.workPackages || {})) {
  const n = name.toLowerCase();
  if (shipped.includes(n)) continue;
  if (n in dropped) {
    if (!said(dropped[n], 12)) {
      unaccounted++;
      fail("committed-shipped", `closeout.dropped (${name})`,
        "dropped with no reason, so a decision and an omission look identical.");
    }
    continue;
  }
  unaccounted++;
  fail("committed-shipped", `workPackages.${name}`,
    "neither shipped nor dropped. A committed package that vanished is scope reduction nobody decided on.");
}

/* ---- 5. ASSUMPTION OUTCOME ---------------------------------------------- *
 * The most valuable lines in the document. A wrong assumption that cost three weeks is
 * what makes the next project cheaper, and it is the first thing dropped when closeout is
 * done in a hurry. */
let outcomeBad = 0;
for (const [i, a] of (Array.isArray(state.assumptions) ? state.assumptions : []).entries()) {
  const oc = String(a.outcome || "").toLowerCase();
  if (!["held", "wrong"].includes(oc)) {
    outcomeBad++;
    fail("assumption-outcome", `assumptions[${i}] (${a.id || "unnamed"})`,
      `outcome "${a.outcome ?? "absent"}" is not "held" or "wrong". An assumption with no outcome was never tested against the delivery.`);
  } else if (oc === "wrong" && !said(a.cost, 10)) {
    outcomeBad++;
    fail("assumption-outcome", `assumptions[${i}] (${a.id || "unnamed"})`,
      "was wrong and no cost is recorded. What it cost is the whole value of having written it down.");
  }
}

/* ---- 6. EFFORT LOGGED --------------------------------------------------- *
 * Three-point estimation requires history from past projects, and this is the only place
 * that history is created. Skipping it means every future estimate is a first guess. */
let effortBad = 0;
const est = Object.entries(state.estimate || {})
  .filter(([k, v]) => !["for", "why"].includes(k) && v && v.o !== undefined);
const logged = new Set((Array.isArray(state.effortLog) ? state.effortLog : [])
  .map((e) => String(e.line || "").toLowerCase()));
if (String((state.estimate || {}).for || "") !== "skipped") {
  for (const [line] of est) {
    if (!logged.has(line.toLowerCase())) {
      effortBad++;
      fail("effort-logged", `effortLog (${line})`,
        "estimated and never logged. Without the actual, the next estimate for this line is a first guess again.");
    }
  }
}

/* ---- 7. DELIVERED FROZEN ------------------------------------------------ *
 * Rule 4: after handover the file is read-only. This cannot watch the filesystem, so it
 * checks the state for the shape a post-delivery edit leaves behind: an approval revoked,
 * or a package un-shipped, after delivered went true. */
let frozenBad = 0;
if (state.delivered) {
  for (const [name, w] of Object.entries(state.workPackages || {})) {
    if (!w.htmlApproved) {
      frozenBad++;
      fail("delivered-frozen", `workPackages.${name}.htmlApproved`,
        "false after delivered. Either it shipped unapproved, or an approval was revoked on a delivered artefact, and rule 4 forbids the second.");
    }
  }
}

/* ---- report -------------------------------------------------------------- */
const table = [
  ["brief-cold", coldBad, declaredAbsent && !said(bp, 6) ? "no brief was supplied, and that is declared"
    : (co.briefReadFrom ? `read from ${co.briefReadFrom}` : "no record of reading it")],
  ["nothing-excluded", builtExcluded, `${exclusions.length} exclusion(s) vs ${shipped.length} shipped`],
  ["metric-compared", metricBad,
    Number.isFinite(Number(co.metricNow)) ? `${p.baseline ?? "?"} to ${co.metricNow} ${p.unit || ""}`.trim() : "not compared"],
  ["committed-shipped", unaccounted, `${Object.keys(state.workPackages || {}).length} committed`],
  ["assumption-outcome", outcomeBad, `${(state.assumptions || []).length} assumption(s)`],
  ["effort-logged", effortBad, `${est.length} estimated line(s), ${logged.size} logged`],
  ["delivered-frozen", frozenBad, state.delivered ? "delivered, checked" : "not delivered yet, not checked"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(20)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Closeout ${findings.length ? "is NOT complete" : "is complete, and the delivery was judged against the original brief"}.`);
process.exit(findings.length ? 1 : 0);
