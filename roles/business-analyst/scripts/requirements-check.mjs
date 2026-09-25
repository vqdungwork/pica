/**
 * requirements-check.mjs: NFRs as numbers, requirements as classes, states as a list design can be
 * held to. Three things analysis owes and none of which pica checked.
 *
 * NFRs came from the architect package, which 2.0.0 deleted. They are requirements, and requirements
 * are analysis: "the queue renders in 800ms at p95 with 500 rows" shapes a design, and "fast" does
 * not. Deleting the package would otherwise have deleted the only thing asking for the number.
 *
 * The classification is BABOK's and pica had none: everything was a business rule or a use case.
 * Business, stakeholder and solution, and solution splits into functional, non-functional and
 * TRANSITION. That last one is the one worth having: a transition requirement exists only to get
 * from the current state to the future one and is never needed again. An Excel import that gets a
 * year of history in is not a feature, and designed as one it becomes a permanent screen nobody
 * wanted.
 *
 * Four checks:
 *
 *   1. NFR MEASURED     every NFR is a number with a unit, a condition, and a way to measure it.
 *   2. CLASSIFIED       every requirement carries a class from the schema.
 *   3. TRANSITION FLAGGED a transition requirement says when it stops being needed.
 *   4. STATE CLOSED     every entity's states have legal transitions and declared terminals. This is
 *                       what state-coverage-check multiplies against screens and viewports, so a
 *                       state omitted here is a screen nobody builds and nothing misses.
 *
 * Usage: node requirements-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) { console.error("usage: node requirements-check.mjs <state.json>"); process.exit(2); }

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const nfrs = state.nfr || [];
const reqs = state.requirements || [];
const stateModel = state.stateModel || [];
if (!nfrs.length && !reqs.length && !stateModel.length) {
  console.log("NOT APPLICABLE  no NFRs, no classified requirements and no state model.");
  console.log("                Analysis has not reached them. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 8) => String(x || "").trim().length >= min;
const hasNumber = (x) => /\d/.test(String(x || ""));

const CLASSES = ["business", "stakeholder", "functional", "non-functional", "transition"];
const ADJECTIVES = /\b(fast|quick|responsive|scalable|robust|secure|reliable|intuitive|user-friendly|performant|slow|easy)\b/i;

/* ---- 1. NFR MEASURED ---- */
let nfrBad = 0;
for (const n of nfrs) {
  const id = n.id || "unnamed";
  if (!hasNumber(n.requirement)) {
    nfrBad++;
    fail("nfr-measured", `nfr ${id}`,
      `"${String(n.requirement || "").slice(0, 60)}" carries no number. A requirement without one ` +
      "cannot be held to or designed against, and every NFR that failed silently started here.");
  } else if (ADJECTIVES.test(n.requirement) && !/\d\s*(ms|s|%|rows|px|kb|mb|req|rps|users)/i.test(n.requirement)) {
    nfrBad++;
    fail("nfr-measured", `nfr ${id}`,
      `"${String(n.requirement).slice(0, 60)}" has a number and an adjective doing the real work. ` +
      "Name the unit: ms, %, rows, concurrent users.");
  }
  if (!said(n.condition, 8)) {
    nfrBad++;
    fail("nfr-measured", `nfr ${id}.condition`,
      "states no condition. 800ms at p95 with 10 rows and with 10000 rows are different promises.");
  }
  if (!said(n.measuredBy, 6)) {
    nfrBad++;
    fail("nfr-measured", `nfr ${id}.measuredBy`,
      "says nothing about how it would be measured. An NFR nobody can measure is an adjective with an id.");
  }
}

/* ---- 2. CLASSIFIED & 3. TRANSITION FLAGGED ---- */
let classBad = 0, transitionBad = 0;
for (const r of reqs) {
  const id = r.id || "unnamed";
  const c = String(r.class || "").toLowerCase();
  if (!CLASSES.includes(c)) {
    classBad++;
    fail("classified", `requirement ${id}`,
      `"${r.class ?? "absent"}" is not one of ${CLASSES.join(", ")}. Without a class a transition ` +
      "requirement is indistinguishable from a feature, and gets designed as one.");
    continue;
  }
  if (c !== "transition") continue;
  if (!said(r.untilWhen, 10)) {
    transitionBad++;
    fail("transition-flagged", `requirement ${id}.untilWhen`,
      "is a transition requirement that does not say when it stops being needed. That sentence is " +
      "the difference between scaffolding and a permanent screen.");
  }
}

/* ---- 4. STATE CLOSED ---- */
let stateBad = 0, statesSeen = 0;
for (const e of stateModel) {
  const ent = e.entity || e.name || "unnamed";
  const states = e.states || [];
  const names = new Set(states.map((s) => String(s.name ?? s)));
  statesSeen += states.length;
  if (!states.length) {
    stateBad++;
    fail("state-closed", `${ent}`, "appears in the state model with no states.");
    continue;
  }
  const terminals = states.filter((s) => s.terminal);
  if (!terminals.length) {
    stateBad++;
    fail("state-closed", `${ent}`,
      "declares no terminal state. Something has to be the end, or every instance is permanently in flight.");
  }
  for (const s of states) {
    const nm = String(s.name ?? s);
    const to = [].concat(s.to || []).map(String);
    if (s.terminal) {
      if (to.length) {
        stateBad++;
        fail("state-closed", `${ent}.${nm}`, "is terminal and has outgoing transitions. It is one or the other.");
      }
      continue;
    }
    if (!to.length) {
      stateBad++;
      fail("state-closed", `${ent}.${nm}`,
        "has no way out and is not declared terminal. The product traps things there, and if that " +
        "is intended it has to be said.");
    }
    for (const t of to) if (!names.has(t)) {
      stateBad++;
      fail("state-closed", `${ent}.${nm} → ${t}`, "transitions to a state the model does not declare.");
    }
    if (!said(s.by, 3) && to.length) {
      stateBad++;
      fail("state-closed", `${ent}.${nm}.by`,
        "does not say who may make this transition. A transition anybody can make is a permission nobody reviewed.");
    }
  }
}

const table = [
  ["nfr-measured", nfrBad, `${nfrs.length} NFR(s)`],
  ["classified", classBad, `${reqs.length} classified requirement(s)`],
  ["transition-flagged", transitionBad,
    `${reqs.filter((r) => String(r.class).toLowerCase() === "transition").length} transition requirement(s)`],
  ["state-closed", stateBad, `${stateModel.length} entity(ies), ${statesSeen} state(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(20)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
