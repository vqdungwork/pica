#!/usr/bin/env node
/**
 * The chain, walked in both directions, with every orphan named.
 *
 *   segment → pain → use case → feature → rule → entity/state → screen
 *
 * A screen with no use case, a pain point nothing addresses, a state with no screen, a rule
 * nothing enforces: each is an orphan, and each is a defect. This is the one artefact a machine
 * can verify completely, which is why it belongs in a check rather than in a chapter of the PRD —
 * a traceability matrix written by hand is a table that agrees with itself.
 *
 * It does commercial work too. Once every link carries an id, the matrix is what ties a client
 * requirement to a deliverable, a milestone and a sign-off, and it is what settles a scope
 * dispute. A fixed-price statement of work is carved by citing those ids; if the chain has holes,
 * the carve has holes, and the holes are found after signature.
 *
 *   node traceability-check.mjs .pica/state.json [--json]
 *
 * Two kinds of finding, and the difference matters:
 *   ORPHAN       one item nothing points at, or that points at nothing.
 *   BROKEN LINK  a whole hop where NO item carries the field — the chain is severed for the
 *                entire project, which is one defect, not forty. Reporting it as forty orphans
 *                buries the cause under its symptoms.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["duplicate-id", "broken-link", "orphan-segment", "orphan-pain", "orphan-usecase",
  "orphan-requirement", "orphan-rule", "orphan-state", "orphan-screen", "dangling-ref"];

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) || ".pica/state.json";
let state;
try { state = JSON.parse(readFileSync(file, "utf8")); }
catch (e) {
  console.error(`traceability-check: cannot read ${file} — ${e.message}`);
  process.exit(1);
}

const findings = [];
const fail = (check, what, detail) => findings.push({ check, what, detail });
const arr = (v) => (Array.isArray(v) ? v : []);
/* A reference may be namespaced — `nfr:NFR-01` — because an id is only unique within its own
 * register. The first version compared the whole string and reported six correct references
 * as dangling, which is how a check teaches a team to ignore it. */
const bare = (x) => String(x).includes(":") ? String(x).split(":").pop() : String(x);
const ids = (v) => arr(v).map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean).map(bare);

const segments  = arr(state.discovery?.segments);
const pains     = arr(state.discovery?.painPoints);
const useCases  = arr(state.useCases);
const reqs      = arr(state.requirements);
const rules     = arr(state.businessRules);
const entities  = arr(state.domainModel);
const stateM    = arr(state.stateModel);
const screens   = arr(state.screens);

/* Nothing to walk is not a pass. A project that has not reached analysis has no chain yet, and
 * saying so is different from saying the chain is sound. */
const have = [segments, pains, useCases, reqs, rules, screens].filter((x) => x.length).length;
if (have < 3) {
  console.log(`traceability-check: SKIPPED — ${file} carries fewer than three links of the chain, so there is nothing to walk. This is not a pass.`);
  process.exit(0);
}

const ucIds   = new Set(useCases.map((u) => u.id).filter(Boolean));
const ruleIds = new Set(rules.map((r) => r.id).filter(Boolean));
const painIds = new Set(pains.map((p) => p.id).filter(Boolean));
const reqIds  = new Set(reqs.map((r) => r.id).filter(Boolean));
/* Non-functional requirements live in their own register and are cited from the functional
 * one; a reference that resolves there is not dangling. */
const nfrIds  = new Set(arr(state.nfr).map((n) => n.id).filter(Boolean));

/* ---- every register is keyed by id, so no id may name two things -------------------------
 * Found the hard way: a screen register carried "RP-02" twice — deliberately, with a note
 * explaining that the second entry existed so an archetype check would see a second role. The
 * intent was sound and the mechanism was not: a canvas generator keyed boards by id and drew ten
 * boards for eleven screens without a word. A variant needs its own id (`RP-02#nguoi`) and a
 * `variantOf` pointing home; then it is one thing in two views rather than two things with one
 * name. */
for (const [label, list] of [["screen", screens], ["use case", useCases], ["requirement", reqs], ["business rule", rules], ["pain point", pains]]) {
  const seen = new Map();
  for (const it of list) {
    if (!it?.id) continue;
    seen.set(it.id, (seen.get(it.id) || 0) + 1);
  }
  for (const [id, n] of seen) {
    if (n > 1) fail("duplicate-id", id, `${n} ${label} entries share this id — every citation of it is ambiguous, and anything keyed by id drops all but one silently`);
  }
}

/* ---- hop 1: segment → pain ------------------------------------------------------------- */
for (const s of segments) {
  const name = s?.name;
  if (!name) continue;
  if (!pains.some((p) => p.segment === name)) {
    fail("orphan-segment", name, "a segment nothing hurts — no pain point names it, so nothing downstream is built for these people");
  }
}

/* ---- hop 2: pain → use case ------------------------------------------------------------- */
/* Which field carries it is a project's own choice; all three spellings are accepted, and if
 * NONE of them appears anywhere the hop is reported once as severed rather than once per pain. */
const PAIN_LINK = ["addresses", "painPoints", "solves", "pains"];
const ucPainField = PAIN_LINK.find((f) => useCases.some((u) => arr(u[f]).length));
if (!ucPainField && pains.length && useCases.length) {
  fail("broken-link", "pain → use case",
    `no use case carries any of ${PAIN_LINK.join(", ")}, so ${pains.length} pain point(s) and ${useCases.length} use case(s) sit either side of a hop that does not exist. ` +
    `Every pain is unaddressed and every use case is unmotivated, and neither fact can be checked until the link is written down.`);
} else if (ucPainField) {
  for (const p of pains) {
    if (!useCases.some((u) => ids(u[ucPainField]).includes(p.id))) {
      fail("orphan-pain", p.id, `${JSON.stringify(p.statement || "").slice(0, 70)} — no use case addresses it`);
    }
  }
  for (const u of useCases) {
    for (const ref of ids(u[ucPainField])) {
      if (!painIds.has(ref)) fail("dangling-ref", `${u.id} → ${ref}`, "names a pain point that does not exist");
    }
  }
}

/* ---- hop 3: use case → feature ----------------------------------------------------------- */
for (const u of useCases) {
  if (!u.id) continue;
  if (!reqs.some((r) => ids(r.tracesTo).includes(u.id))) {
    fail("orphan-usecase", u.id, `${u.name || ""} — no requirement traces to it, so nothing was specified to deliver it`);
  }
}

/* ---- hop 4: feature → rule, and every reference resolves ---------------------------------- */
for (const r of reqs) {
  const refs = ids(r.tracesTo);
  if (!refs.length) { fail("orphan-requirement", r.id, "traces to nothing"); continue; }
  for (const ref of refs) {
    if (!ucIds.has(ref) && !ruleIds.has(ref) && !reqIds.has(ref) && !nfrIds.has(ref)) {
      fail("dangling-ref", `${r.id} → ${ref}`, "names a use case, rule or NFR that does not exist — an id was renumbered or deleted and its citation was left behind");
    }
  }
}

/* ---- hop 5: rule → something that enforces it --------------------------------------------- */
const referencedRules = new Set([
  ...reqs.flatMap((r) => ids(r.tracesTo)),
  ...useCases.flatMap((u) => ids(u.tracesTo)),
]);
for (const r of rules) {
  if (!r.id) continue;
  const cited = referencedRules.has(r.id);
  const enforced = Boolean(r.enforcedBy);
  if (!cited && !enforced) {
    fail("orphan-rule", r.id, `${String(r.rule || "").slice(0, 70)} — no requirement or use case cites it and nothing is named as enforcing it`);
  }
}

/* ---- hop 6: state → screen ---------------------------------------------------------------- */
/* A state declared in the model and drawn nowhere is the failure mode that ships as a blank
 * screen in production: the model promised the case is handled and no screen handles it. */
const screenStates = new Set(screens.flatMap((s) => arr(s.states)));
const declared = new Map();
for (const e of [...entities, ...stateM]) {
  const name = e?.entity || e?.name;
  for (const st of arr(e?.states)) {
    const sn = typeof st === "string" ? st : st?.name;
    if (sn) declared.set(sn, name);
  }
}
/* Domain states (Todo, Done) live in the upstream system and are drawn AS DATA on a screen, not
 * as a screen state — only screen-state vocabulary is compared, which is what `screens[].states`
 * holds. A project with no overlap at all between the two vocabularies is reported as a severed
 * hop rather than as a list of every state it declares. */
const overlap = [...declared.keys()].filter((s) => screenStates.has(s));
const vocabDeclared = arr(state.structureExemptions).some((e) => /vocab|state/i.test(String(e?.reason || "")) && /deliberate|by design|khác/i.test(String(e?.reason || "")));
/* A declared vocabulary split silences the hop ENTIRELY, not just its headline. The first
 * version guarded only the severed-hop branch, so declaring the exemption swapped one accurate
 * finding for seven inaccurate ones — every lifecycle state reported as "drawn on no screen"
 * when the declaration says precisely that it never should be. */
if (vocabDeclared) {
  /* nothing to compare: the two vocabularies are different by design and the project said so */
} else if (declared.size && screenStates.size && !overlap.length) {
  fail("broken-link", "state → screen",
    `none of the ${declared.size} modelled state(s) appears in any screen's state list. Either the two vocabularies are deliberately different — ` +
    `domain states drawn as data, screen states describing load and failure — or the models and the screens were written without reading each other. Say which, in state.structureExemptions.`);
} else {
  for (const [sn, ent] of declared) {
    if (!screenStates.has(sn)) fail("orphan-state", sn, `declared on "${ent}" and drawn on no screen`);
  }
}

/* ---- hop 7: screen → use case ------------------------------------------------------------- */
for (const s of screens) {
  const refs = ids(s.tracesTo);
  if (!refs.length) { fail("orphan-screen", s.id, `${s.name || ""} — traces to no use case, so nothing asked for this screen`); continue; }
  for (const ref of refs) {
    if (!ucIds.has(ref)) fail("dangling-ref", `${s.id} → ${ref}`, "names a use case that does not exist");
  }
}
/* …and back: a use case with no screen is a promise with no surface. */
const screenUCs = new Set(screens.flatMap((s) => ids(s.tracesTo)));
for (const u of useCases) {
  if (!u.id || screenUCs.has(u.id)) continue;
  const infra = /INT|SYS/.test(u.id) || /^(Hệ thống|System)/i.test(arr(u.actors)[0] || "");
  if (!infra) fail("orphan-usecase", u.id, `${u.name || ""} — no screen traces to it`);
}

if (args.includes("--json")) {
  console.log(JSON.stringify({ findings, counts: { segments: segments.length, pains: pains.length, useCases: useCases.length, requirements: reqs.length, rules: rules.length, screens: screens.length } }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

const walked = `${segments.length} segment · ${pains.length} pain · ${useCases.length} use case · ${reqs.length} requirement · ${rules.length} rule · ${declared.size} state · ${screens.length} screen`;
/* The runner's row contract: one `pass|FAIL  <id>  N finding(s)   (scope)` per assertion, so
 * pica-verify counts what was verified rather than reporting a clean run as "0 assertion(s)". */
for (const id of CHECKS) {
  const n = findings.filter((x) => x.check === id).length;
  console.log(`${n ? "FAIL" : "pass"}  ${id.padEnd(20)} ${String(n).padStart(3)} finding(s)   (${walked})`);
}
if (!findings.length) {
  console.log(`traceability-check: the chain closes in both directions (${walked})`);
  process.exit(0);
}
const broken = findings.filter((f) => f.check === "broken-link");
const orphans = findings.filter((f) => f.check !== "broken-link");
for (const f of broken) console.error(`FINDING  [${f.check}] ${f.what}\n         ${f.detail}`);
for (const f of orphans) console.error(`FINDING  [${f.check}] ${f.what}\n         ${f.detail}`);
console.error(`\n${broken.length} severed hop(s) and ${orphans.length} orphan(s) over: ${walked}`);
console.error(`An orphan is a defect in one item. A severed hop is a defect in the method, and it hides every orphan beneath it.`);
process.exit(1);
