#!/usr/bin/env node
/* What is the design standing on?
 *
 * On one finished project the analyse phase reported thirteen checks passing and nothing failing,
 * while discover, scope and close were all red: zero interviews, zero observed pain points, two
 * proposals presented with no choice recorded, no frozen scope, no closeout. Every number was
 * accurate and the picture they made together was false — a design verified to the pixel on
 * premises nobody had checked.
 *
 * No single check could see it, because each one is scoped to its own phase. This one is scoped
 * to the JOIN: it fails when something downstream of the client is finished while the decision it
 * rests on was never recorded.
 *
 * It does not re-report what discover-check and proposal-check already say. It reports the thing
 * only visible from both at once.
 */
import { readFileSync } from "node:fs";

const statePath = process.argv[2] ?? ".pica/state.json";
const S = JSON.parse(readFileSync(statePath, "utf8"));
const arr = (x) => (Array.isArray(x) ? x : []);
const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const segments = arr(S.discovery?.segments ?? S.segments);
const interviews = segments.reduce((t, s) => t + (Number(s.interviews) || 0), 0);
const pains = arr(S.discovery?.painPoints ?? S.painPoints);
/* The canonical field is `class`, which is what discover-check reads and what the shipped example
 * carries. Reading `evidence`/`evidenceClass` and not `class` reported the reference project as
 * having no observed pain at all — the check's own first finding was its own bug, for the third
 * time today. When a new check disagrees with the example, suspect the check. */
const observed = pains.filter((p) =>
  /observ|quan sát/i.test(String(p.class ?? p.evidenceClass ?? p.evidence ?? ""))).length;
const screens = arr(S.screens);
const proposals = arr(S.proposals);
const built = screens.length > 0 || Boolean(S.direction);

/* ---- 1. A DESIGN ON UNOBSERVED PAIN ---------------------------------------------------------
 * Screens exist to relieve something. If nothing was observed, every screen relieves a pain that
 * was reasoned about rather than seen, and the design's confidence outruns its evidence. */
if (built && pains.length && observed === 0)
  fail("design-rests-on-unobserved-pain", `${screens.length} screen(s)`,
    `${pains.length} pain point(s) and not one carries an observed evidence class. The design is complete ` +
    "and the thing it relieves was inferred. Report the design as built, never as validated.");

if (built && interviews === 0)
  fail("design-rests-on-unobserved-pain", `${segments.length} segment(s)`,
    "the design is built and no segment records a single interview. Evaluation methods find usability " +
    "problems; they do not find out whether anybody wants the thing.");

/* ---- 2. A DESIGN ON AN UNMADE DECISION ------------------------------------------------------
 * A proposal is a decision offered to the client. Offered and unanswered, it is an open question
 * — and building past it means somebody on this side answered it silently. */
for (const p of proposals) {
  const chosen = p.chosen ?? p.choice ?? p.decision;
  if (!p.presented && !p.offeredOn) continue;
  if (!chosen && built)
    fail("built-past-an-unmade-decision", p.id ?? p.slot ?? "(proposal)",
      "was presented, no choice is recorded, and the build went ahead. Either the client chose and " +
      "nobody wrote it down, or somebody here chose for them.");
}

/* ---- 3. A DELIVERABLE WITH NO AGREED SCOPE -------------------------------------------------- */
if (built && !S.scopeFrozen)
  fail("nothing-was-agreed", "scopeFrozen",
    "screens and a direction exist and no scope is frozen. Everything built so far is an offer, " +
    "and saying otherwise in a closing report is the claim that gets disputed.");

/* ---- 4. ASSUMPTIONS THAT WERE NEVER GRADED --------------------------------------------------
 * The whole method rests on an assumption carrying a confidence and a blast radius, so the client
 * can be shown the consequential ones first. Ungraded, the register is a list nobody can triage. */
const assumptions = arr(S.assumptions);
const ungraded = assumptions.filter((a) => !a.confidence);
if (assumptions.length && ungraded.length)
  fail("assumption-without-a-grade", `${ungraded.length} of ${assumptions.length}`,
    "carry no confidence, so nothing can be presented most-consequential-first and the register " +
    "cannot be triaged by the person who has to answer it.");

const table = [
  ["design-rests-on-unobserved-pain", findings.filter((f) => f.check === "design-rests-on-unobserved-pain").length,
    `${interviews} interview(s), ${observed}/${pains.length} pain observed`],
  ["built-past-an-unmade-decision", findings.filter((f) => f.check === "built-past-an-unmade-decision").length,
    `${proposals.length} proposal(s)`],
  ["nothing-was-agreed", findings.filter((f) => f.check === "nothing-was-agreed").length,
    S.scopeFrozen ? "scope frozen" : "scope not frozen"],
  ["assumption-without-a-grade", findings.filter((f) => f.check === "assumption-without-a-grade").length,
    `${assumptions.length} assumption(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(32)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
  console.log("\nThese are not defects in the build. They are the difference between what was verified\n" +
    "and what was agreed, and the closing report has to state both.");
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
