/**
 * architecture-check.mjs: the platform gate. Runs at the end of step 5, before the demo
 * is built and before anybody prices the build.
 *
 * On the project this came from, the platform subtotal was 265 h of 1416 — nineteen per
 * cent — and no role owned it. It was decided invisibly, by whoever scaffolded the demo:
 * a monorepo, a token pipeline and a set of wire contracts chosen while building screens.
 * The contract meanwhile said the stack would be "confirmed in writing with the Customer
 * before development begins". Both were true at once, which is the problem.
 *
 * An architecture nobody wrote down is still an architecture. It is just one nobody
 * agreed to, and one the estimate is guessing at.
 *
 * Five checks:
 *
 *   1. STACK NAMED     every layer answered with a real choice, not "TBD" or an empty
 *                      string. A layer left open is a layer the demo will decide.
 *                      PASS: 0 unanswered.
 *   2. NFR MET         every non-functional requirement names the mechanism that meets
 *                      it. "Performance: p95 < 300ms" with no mechanism is a wish.
 *                      PASS: every nfr carries metBy.
 *   3. INTEGRATIONS    every system the specification integrates with has a declared
 *                      contract: direction, protocol and what happens when it is down.
 *                      PASS: 0 integrations without one.
 *   4. ENVIRONMENTS    at least two, and each names where it runs. One environment means
 *                      production is the test environment.
 *                      PASS: >= 2, each with a host.
 *   5. CHOICE ARGUED   every stack entry says WHY, from the NFRs, the integrations or the
 *                      team that will maintain it. "What everyone uses now" is not an
 *                      argument.  PASS: every entry carries a reason.
 *   6. ENV PURPOSE     every environment says what it is for, not just where it runs. An
 *                      environment nobody can state the purpose of is a machine somebody
 *                      deploys to by mistake.  PASS: every environment carries one.
 *   7. EXCLUSIONS      the architecture names what it is NOT building. Unstated, each one
 *                      becomes a change request with "we assumed it would" behind it, and
 *                      on fixed price you absorb it.  PASS: >= 1 exclusion named.
 *   8. DATA GOVERNED   every entity declares an owner, a location and a retention period.
 *                      A regulator asks this and the answer cannot be assembled
 *                      afterwards.  PASS: 0 entities missing any of the three.
 *   9. LOCK-IN         every choice states whether it can be replaced and at what cost.
 *                      A contract that forbids lock-in needs this answered per choice,
 *                      not asserted once.  PASS: every stack entry carries replaceable.
 *
 * Usage: node architecture-check.mjs <state.json>
 */
import fs from "fs";

const statePath = process.argv[2];
if (!statePath) { console.error("usage: architecture-check.mjs <state.json>"); process.exit(2); }
let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) { console.error(`FAIL  cannot read ${statePath}: ${e.message}`); process.exit(2); }

const arch = state.architecture;
if (!arch || typeof arch !== "object") {
  console.log("NOT MEASURED  state.architecture is absent, so nothing was checked.");
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const add = (check, where, detail) => findings.push({ check, where, detail });
const EMPTY = (v) => v === undefined || v === null || v === "" ||
  (typeof v === "string" && /^(tbd|todo|\?+|n\/?a)$/i.test(v.trim()));

/* 1. STACK NAMED */
const stack = Array.isArray(arch.stack) ? arch.stack : [];
let unanswered = 0;
for (const s of stack)
  if (EMPTY(s?.choice)) { unanswered++; add("stack-named", s?.layer || "(unnamed layer)",
    "no choice recorded. A layer left open is a layer whoever builds the demo will close, silently"); }
if (!stack.length) { unanswered++; add("stack-named", "architecture.stack", "no layers declared at all"); }

/* 2. NFR MET */
const nfrs = Array.isArray(state.nfr) ? state.nfr : [];
let unmet = 0;
for (const n of nfrs) {
  const id = n?.id || n?.name || JSON.stringify(n).slice(0, 40);
  const met = (arch.meets || []).find((m) => m?.nfr === (n?.id || n?.name));
  if (!met || EMPTY(met.metBy)) { unmet++; add("nfr-met", id,
    "no mechanism named. A non-functional requirement with nothing behind it is a wish the build inherits"); }
}

/* 3. INTEGRATIONS */
const ints = Array.isArray(arch.integrations) ? arch.integrations : [];
/* The systems the specification names. This used to read `domainConstraints.integrations`, but
 * domainConstraints is an ARRAY — domain-check holds it to one — so the property was always
 * undefined, the scope was always zero, and this assertion could not fire on any valid state. It
 * reads `integrationsNamed`, the key the context diagram already draws its external systems from,
 * so the diagram and the gate are about the same list. */
const declared = Array.isArray(state.integrationsNamed) ? state.integrationsNamed
  : Array.isArray(state.domainConstraints?.integrations) ? state.domainConstraints.integrations : [];
let uncontracted = 0;
for (const sys of declared) {
  // `system` is the field in integrationsNamed and in the contracts; `name` is the older spelling
  const name = typeof sys === "string" ? sys : (sys?.system ?? sys?.name);
  const c = ints.find((i) => i?.system === name);
  if (!c || EMPTY(c.protocol) || EMPTY(c.onFailure)) { uncontracted++; add("integrations", name || "(unnamed)",
    "no contract: needs direction, protocol, and what happens when it is unavailable"); }
}

/* 4. ENVIRONMENTS */
const envs = Array.isArray(arch.environments) ? arch.environments : [];
let envFindings = 0;
if (envs.length < 2) { envFindings++; add("environments", "architecture.environments",
  `${envs.length} declared. Fewer than two means production is the test environment`); }
for (const e of envs)
  if (EMPTY(e?.host)) { envFindings++; add("environments", e?.name || "(unnamed)", "no host recorded"); }

/* 5. CHOICE ARGUED */
let unargued = 0;
for (const s of stack)
  if (EMPTY(s?.because)) { unargued++; add("choice-argued", s?.layer || "(unnamed layer)",
    "no reason recorded. A stack is argued from the NFRs, the integrations and who maintains it — never from what is current"); }

/* 6. ENV PURPOSE */
let noPurpose = 0;
for (const e of envs)
  if (EMPTY(e?.purpose)) { noPurpose++; add("env-purpose", e?.name || "(unnamed)",
    "says where it runs but not what it is for. An environment with no stated purpose is one somebody deploys to by mistake"); }

/* 7. EXCLUSIONS */
const excludes = Array.isArray(arch.excludes) ? arch.excludes.filter((x) => !EMPTY(x)) : [];
const noExclusions = excludes.length ? 0 : 1;
if (noExclusions) add("exclusions-named", "architecture.excludes",
  "names nothing it is not building. No multi-region, no offline-first, no real-time sync are all decisions somebody could reasonably have expected the other way, and unstated each becomes a change request");

/* 8. DATA GOVERNED */
const entities = Array.isArray(state.domainModel?.entities) ? state.domainModel.entities
               : Array.isArray(state.domainModel) ? state.domainModel : [];
const gov = Array.isArray(arch.data) ? arch.data : [];
let ungoverned = 0;
for (const e of entities) {
  /* `entity` is the field, and the worked example is what says so: its domainModel entries
     carry { entity, attributes } and no `name` at all. permissions-check reads it correctly
     as `e.entity ?? e.name`; this read `e.name` alone, so on any domain model shaped the way
     the example shapes it, every entity resolved to undefined and data-governed failed
     unconditionally with "(unnamed entity)". A check that cannot pass on pica's own example
     is not a gate, it is an obstacle, and the only way past it was to misshape the model.
     Found by a solution-architect agent on the first real end-to-end run. */
  const name = typeof e === "string" ? e : (e?.entity ?? e?.name);
  const g = gov.find((x) => x?.entity === name);
  const missing = !g ? ["owner", "location", "retention"]
    : ["owner", "location", "retention"].filter((k) => EMPTY(g[k]));
  if (missing.length) { ungoverned++; add("data-governed", name || "(unnamed entity)",
    `missing ${missing.join(", ")}. A regulator asks this and the answer cannot be assembled afterwards`); }
}

/* 9. LOCK-IN */
let unstated = 0;
for (const s of stack)
  if (s?.replaceable === undefined) { unstated++; add("lock-in", s?.layer || "(unnamed layer)",
    "replaceable not stated. A no-lock-in clause is answered per choice or not at all"); }

const table = [
  ["stack-named",  unanswered,   `${stack.length} layer(s)`],
  ["nfr-met",      unmet,        `${nfrs.length} requirement(s)`],
  ["integrations", uncontracted, `${declared.length} declared in the specification`],
  ["environments", envFindings,  `${envs.length} declared`],
  ["choice-argued",     unargued,     `${stack.length} choice(s)`],
  ["env-purpose",       noPurpose,    `${envs.length} environment(s)`],
  ["exclusions-named",  noExclusions, `${excludes.length} exclusion(s) named`],
  ["data-governed",     ungoverned,   `${entities.length} entity(ies)`],
  ["lock-in",           unstated,     `${stack.length} choice(s)`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(18)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The platform ${findings.length ? "is NOT ready to be built or priced against" : "is written down and can be estimated"}.`);
process.exit(findings.length ? 1 : 0);
