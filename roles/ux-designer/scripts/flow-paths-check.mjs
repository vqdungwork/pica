/**
 * flow-paths-check.mjs: the flow gate. Runs at step 5, alongside structure-check.
 *
 * structure-check holds the lo-fi screens: traced, greyscale, realistic, every state
 * present. What nothing held is the flows BETWEEN them, and flows fail in two ways that
 * a screen inventory cannot show.
 *
 * The first is the unhappy path. A flow drawn only through success is a flow that has not
 * been designed — the payment that declines, the upload that times out, the integration
 * that is down. Those screens get invented during the build, by whoever hits them, at the
 * quality of whoever hits them.
 *
 * The second is the dead end. An inventory lists screens; it does not list exits. A screen
 * somebody can reach and cannot leave is invisible until a person walks the flow, and
 * "Something went wrong" with no route forward is a dead end with a sad face on it.
 *
 * Three checks:
 *
 *   1. UNHAPPY PATHS  every flow declares at least one failure branch. Where a flow
 *                     genuinely cannot fail, it says so by name.
 *                     PASS: 0 flows with only a happy path.
 *   2. DEAD ENDS      every terminal step is a completed job or names where the person
 *                     goes next. Errors count.
 *                     PASS: 0 terminals with neither.
 *   3. IA EVIDENCED   the navigation model cites a card sort, a tree test, or a stated
 *                     reason why neither was possible. An IA reviewed only by the person
 *                     who drew it has been reviewed by nobody.
 *                     PASS: evidence or a written reason.
 *
 * Usage: node flow-paths-check.mjs <state.json>
 */
import fs from "fs";

const statePath = process.argv[2];
if (!statePath) { console.error("usage: flow-paths-check.mjs <state.json>"); process.exit(2); }
let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) { console.error(`FAIL  cannot read ${statePath}: ${e.message}`); process.exit(2); }

const flows = Array.isArray(state.flows) ? state.flows
            : state.flows && typeof state.flows === "object" ? Object.values(state.flows) : null;
if (!flows) {
  console.log("NOT MEASURED  state.flows is absent, so nothing was checked.");
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const add = (check, where, detail) => findings.push({ check, where, detail });
const txt = (v) => String(v ?? "").toLowerCase();
const FAILWORDS = /fail|error|decline|timeout|timed out|unavailable|denied|reject|invalid|offline|retry|empty/;

let happyOnly = 0, deadEnds = 0, terminals = 0;

for (const f of flows) {
  const name = f?.name || f?.id || "(unnamed flow)";
  const steps = Array.isArray(f?.steps) ? f.steps : [];
  const branches = Array.isArray(f?.branches) ? f.branches : [];

  /* 1. UNHAPPY PATHS */
  const declaredNoFailure = f?.cannotFail && String(f.cannotFail).trim();
  const hasFailure = branches.some((b) => FAILWORDS.test(txt(b?.when) + txt(b?.name) + txt(b?.kind)))
    || steps.some((s) => FAILWORDS.test(txt(s?.state) + txt(s?.name)));
  if (!hasFailure && !declaredNoFailure) {
    happyOnly++; add("unhappy-paths", name,
      "declares no failure branch. A flow drawn only through success has not been designed — the screens for decline, timeout and permission-denied get invented during the build by whoever hits them");
  }

  /* 2. DEAD ENDS */
  /* In an ordered `steps` array the sequence is the order, so only the last entry ends the
     flow. An earlier draft treated every step without an explicit `next` as terminal and
     reported the whole happy path as dead ends — a check that finds a defect on every
     correct input is worse than no check. A `branches` entry is terminal unless it says
     where it rejoins. */
  const all = [
    ...steps.map((s, i) => [s, i === steps.length - 1]),
    ...branches.map((b) => [b, !(Array.isArray(b?.next) ? b.next.length : b?.next)]),
  ];
  for (const [s, lastInSequence] of all) {
    const isTerminal = s?.terminal === true || lastInSequence;
    if (!isTerminal) continue;
    terminals++;
    const completes = s?.completes === true || /success|complete|done|confirmed/.test(txt(s?.state) + txt(s?.name));
    const exit = s?.exit || s?.goesTo || s?.recovery;
    if (!completes && !exit) {
      deadEnds++; add("dead-ends", `${name} :: ${s?.name || s?.state || "(unnamed step)"}`,
        "terminal, but neither completes the job nor names where the person goes next");
    }
  }
}

/* 3. IA EVIDENCED */
const nav = state.navigation || state.sitemap || {};
const evidence = nav.cardSort || nav.treeTest || nav.evidence || nav.noEvidenceBecause;
const iaBad = evidence ? 0 : 1;
if (iaBad) add("ia-evidenced", "navigation",
  "cites no card sort, no tree test and no reason why neither was possible. An information architecture reviewed only by the person who drew it has been reviewed by nobody");

const table = [
  ["unhappy-paths", happyOnly, `${flows.length} flow(s)`],
  ["dead-ends",     deadEnds,  `${terminals} terminal step(s)`],
  ["ia-evidenced",  iaBad,     evidence ? "evidence recorded" : "none recorded"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
if (!terminals) console.log("\nNOTE  no terminal steps found, so dead-ends measured nothing. Flows that never end are their own finding.");

console.log(`\n${findings.length} finding(s). The flows ${findings.length ? "are NOT ready for the direction gate" : "hold"}.`);
process.exit(findings.length ? 1 : 0);
