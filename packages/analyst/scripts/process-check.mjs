/**
 * process-check.mjs: the process model, held to closing rather than to existing.
 *
 * Until 2.0.0 the whole specification for this was four sentences of prose. AS-IS was "how they work
 * today", TO-BE was "how they work with the product", no notation was named anywhere in the
 * repository, and `trace-check` asserted only that a non-empty string existed. One sentence in
 * state.asIs returned green. A process model nobody can check is a picture, and a picture drifts from
 * the process it depicts with nothing to say so.
 *
 * Five checks:
 *
 *   1. NOTATION       named, and one of the two that exist. BPMN with lanes when the process crosses
 *                     roles; a flowchart when it does not. The reason is recorded, because the
 *                     wrong notation costs either way and a habitual choice is not a decision.
 *   2. ACTIVITY LANED every activity sits in a lane. Work with no owner is work nobody agreed to.
 *   3. GATEWAY FORKS  every gateway has at least two outgoing paths. A decision with one answer is a
 *                     step drawn as a decision, which hides that somebody removed the alternative.
 *   4. NO DEAD END    every path reaches an end event. A path that stops is a user who stopped.
 *   5. ACTIVITY TRACED every activity names a use case. The same link coverage-check holds screens
 *                     to, one level up: an activity nobody asked for is scope.
 *
 * Abstains when there is no process model, because a project that has not reached analysis is not a
 * project with a broken one. An abstention is named and never counted as a pass.
 *
 * Usage: node process-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) { console.error("usage: node process-check.mjs <state.json>"); process.exit(2); }

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

/* Both directions are the same shape. AS-IS is discovery's and TO-BE is the modeller's, and each is
   checked the same way: a model that does not close is not improved by who drew it. */
const models = [];
if (state.toBe && typeof state.toBe === "object") models.push(["toBe", state.toBe]);
if (state.asIs && typeof state.asIs === "object") models.push(["asIs", state.asIs]);

if (!models.length) {
  const prose = [state.asIs, state.toBe].filter((x) => typeof x === "string" && x.trim());
  if (prose.length) {
    console.log(`FAIL  ${prose.length} process model(s) are prose, not data.`);
    console.log("      A model has lanes, nodes and edges and can be checked. A paragraph cannot,");
    console.log("      and one sentence in state.toBe used to be a green check. That is the defect.");
    process.exit(1);
  }
  console.log("NOT APPLICABLE  no process model exists, so analysis has not drawn one yet.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 8) => String(x || "").trim().length >= min;
const NOTATIONS = ["bpmn", "flowchart"];
const useCaseIds = new Set((state.useCases || []).map((u) => String(u.id || "").toUpperCase()));

let notationBad = 0, lanedBad = 0, gatewayBad = 0, deadBad = 0, tracedBad = 0;
let activities = 0, gateways = 0;

for (const [which, m] of models) {
  const lanes = new Set((m.lanes || []).map((l) => String(l.id ?? l)));
  const nodes = m.nodes || [];
  const edges = m.edges || [];

  /* ---- 1. NOTATION ---- */
  const n = String(m.notation || "").toLowerCase();
  if (!NOTATIONS.includes(n)) {
    notationBad++;
    fail("notation-named", `${which}.notation`,
      `"${m.notation ?? "absent"}" is not one of ${NOTATIONS.join(" or ")}. Name it, because a BPMN ` +
      "model of a three-step approval confuses the people it was drawn for and a flowchart of a " +
      "three-role process hides every handoff.");
  } else if (!said(m.notationWhy, 15)) {
    notationBad++;
    fail("notation-named", `${which}.notationWhy`,
      "gives no reason. The choice is reviewable or it is habitual, and only one of those survives a review.");
  } else if (n === "flowchart" && lanes.size > 1) {
    notationBad++;
    fail("notation-named", `${which} is a flowchart with ${lanes.size} lanes`,
      "A process that crosses roles is BPMN. The handoffs are the thing worth drawing and a flowchart hides them.");
  }

  const byId = new Map(nodes.map((x) => [String(x.id), x]));
  const out = new Map();
  for (const e of edges) {
    const f = String(e.from ?? e.source ?? "");
    if (!out.has(f)) out.set(f, []);
    out.get(f).push(String(e.to ?? e.target ?? ""));
  }

  for (const node of nodes) {
    const kind = String(node.kind || node.type || "activity").toLowerCase();
    const id = String(node.id);

    /* ---- 2. ACTIVITY LANED ---- */
    if (kind === "activity") {
      activities++;
      if (!node.lane || !lanes.has(String(node.lane))) {
        lanedBad++;
        fail("activity-laned", `${which}/${id}`,
          node.lane ? `sits in lane "${node.lane}", which the model does not declare.`
                    : "sits in no lane. An activity with no owner is work nobody agreed to do.");
      }
      /* ---- 5. ACTIVITY TRACED ---- */
      const uc = [].concat(node.tracesTo || node.useCase || []).map((x) => String(x).toUpperCase());
      if (!uc.length) {
        tracedBad++;
        fail("activity-traced", `${which}/${id}`,
          "names no use case. An activity nobody asked for is scope, and a use case with no activity " +
          "is a requirement the process forgot.");
      } else if (useCaseIds.size) {
        for (const u of uc) if (!useCaseIds.has(u)) {
          tracedBad++;
          fail("activity-traced", `${which}/${id} traces to ${u}`,
            "which is not a use case in state.useCases.");
        }
      }
    }

    /* ---- 3. GATEWAY FORKS ---- */
    if (kind === "gateway") {
      gateways++;
      if ((out.get(id) || []).length < 2) {
        gatewayBad++;
        fail("gateway-forks", `${which}/${id}`,
          `has ${(out.get(id) || []).length} outgoing path(s). A decision with one answer is a step, ` +
          "and drawing it as a decision hides that somebody removed the alternative.");
      }
    }

    /* ---- 4. NO DEAD END ---- */
    if (kind !== "end" && !(out.get(id) || []).length) {
      deadBad++;
      fail("no-dead-end", `${which}/${id}`,
        `is a ${kind} with no outgoing edge and is not an end event. A path that stops is a user who stopped.`);
    }
  }

  /* an edge pointing nowhere is a dead end of the other kind */
  for (const e of edges) {
    const to = String(e.to ?? e.target ?? "");
    if (byId.has(to)) continue;
    deadBad++;
    fail("no-dead-end", `${which} edge to "${to}"`, "points at a node the model does not declare.");
  }
}

const table = [
  ["notation-named", notationBad, models.map(([w, m]) => `${w}: ${m.notation ?? "?"}`).join(", ")],
  ["activity-laned", lanedBad, `${activities} activity(ies)`],
  ["gateway-forks", gatewayBad, `${gateways} gateway(s)`],
  ["no-dead-end", deadBad, `${models.length} model(s)`],
  ["activity-traced", tracedBad, useCaseIds.size ? `${useCaseIds.size} use case(s) to trace to`
    : "no use cases in state, so only the presence of a trace was checked"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
