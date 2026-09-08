/**
 * discover-check.mjs: did anybody actually talk to a user.
 *
 * pica measured shipped products across nine foundations for nine versions and never once
 * asked a person anything. pica-researcher measures the design surface of competitors,
 * which is real research and is not user research: the personas were sector archetypes
 * from a curated table, and /pica-analyse said outright that analytics and support logs
 * "are the substitute for user interviews, and without them the AS-IS rests on assertion".
 * That was honest and it was still a hole.
 *
 * Two check ids here are prefixed `users-` because schema-check already reports
 * `sample-size` and `provenance`. They do not functionally clash, since mutate.mjs matches
 * on the id the NAMED script reports. They are prefixed anyway: a finding that says
 * "sample-size" without saying which sample sends the reader to the wrong package, which
 * is the co-fire problem wearing a different hat.
 *
 * Ten checks:
 *
 *   1. SEGMENT DEFINED    a job, a context of use, and how often
 *   2. USERS SAMPLE SIZE  five per segment, or the shortfall recorded as a limitation
 *   3. PAIN FREQUENCY     n of N, with n <= N and N > 0
 *   4. EVIDENCE CLASS     observed, stated or inferred, and inferred is not high confidence
 *   5. SAID NO            somebody who churned or chose otherwise, or why none was reachable
 *   6. STAKEHOLDER FEARS  wants, fears, decides, vetoes, and what would make them block
 *   7. BUYER NAMED        where buyer and user differ, both are present
 *   8. COMPETITOR PRICING pricing and packaging per competitor
 *   9. MARKET BOTTOM UP   two or more sourced factors, and the product is within an order
 *                         of magnitude of the stated size
 *  10. USERS PROVENANCE   a source on every pain point, competitor and factor
 *
 * Usage: node discover-check.mjs <state.json>
 */
import fs from "fs";

const statePath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!statePath) {
  console.error("usage: node discover-check.mjs <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const d = state.discovery || {};
if (!Object.keys(d).length) {
  console.error("FAIL  state carries no discovery. Nothing to check, and zero findings would be a lie.");
  process.exit(2);
}

const segments = Array.isArray(d.segments) ? d.segments : [];
const pains = Array.isArray(d.painPoints) ? d.painPoints : [];
const saidNo = Array.isArray(d.saidNo) ? d.saidNo : [];
/* The stakeholder register is state.stakeholders, written at 2.1 and read by
 * industry-check, which resolves the sector's deciding roles against it. Holding a
 * second copy under discovery would drift from it, and the copy is the one nothing
 * else reads. This ENRICHES that register with wants, fears and wouldBlockIf. */
const holders = Array.isArray(state.stakeholders) ? state.stakeholders : [];
const comps = Array.isArray(d.competitors) ? d.competitors : [];
const market = d.market || {};

const CLASS = ["observed", "stated", "inferred"];
const CONF = ["high", "medium", "low"];

/* ---- 1. SEGMENT DEFINED -------------------------------------------------- *
 * The conditions of use are the input nobody asks for and the one that most often
 * invalidates a design after it is built. The same clinical product is a different
 * product in a lit consulting room and in a moving ambulance. */
let segBad = 0;
if (!segments.length) {
  segBad++;
  fail("segment-defined", "discovery.segments", "empty. A pain point belonging to no segment belongs to nobody.");
}
for (const [i, s] of segments.entries()) {
  const where = `discovery.segments[${i}] (${s.name || "unnamed"})`;
  if (!said(s.name, 3)) { segBad++; fail("segment-defined", where, "no name."); }
  if (!said(s.jobToBeDone, 12)) {
    segBad++;
    fail("segment-defined", where, "no job to be done. A segment defined by demographics is not a segment, it is a filter.");
  }
  if (!said(s.context, 10)) {
    segBad++;
    fail("segment-defined", where,
      "no context of use. At a desk, outdoors, one-handed, gloved, on a shared device: this is the input nobody asks for and the one that most often invalidates a design after it is built.");
  }
  if (!said(s.frequency, 4)) {
    segBad++;
    fail("segment-defined", where,
      "no use frequency. A tool someone lives in for six hours a day and one they open twice a year are opposite designs, and nothing in a screenshot distinguishes them.");
  }
}

/* ---- 2. USERS SAMPLE SIZE ----------------------------------------------- *
 * Five per segment is roughly where new themes stop appearing in B2B. Below it you are
 * quoting anecdotes with a percentage sign attached. A shortfall is allowed and has to be
 * SAID, because an unrecorded shortfall reads exactly like a full sample. */
let sampleBad = 0;
for (const [i, s] of segments.entries()) {
  const n = Number(s.interviews);
  if (!Number.isFinite(n)) {
    sampleBad++;
    fail("users-sample-size", `discovery.segments[${i}] (${s.name || "unnamed"})`,
      "interviews is not a number. Zero is a real answer and it makes this segment a hypothesis.");
  } else if (n < 5 && !said(s.shortfallWhy, 15)) {
    sampleBad++;
    fail("users-sample-size", `discovery.segments[${i}] (${s.name || "unnamed"})`,
      `${n} interview(s), under 5, and no shortfallWhy. Record what the shortfall costs, or an anecdote reads as saturation.`);
  }
}

/* ---- 3. PAIN FREQUENCY -------------------------------------------------- *
 * "Most users" is not a finding. n of N is, and it is the difference between a pain point
 * and the one interview that stuck in your memory. */
let freqBad = 0;
if (!pains.length) {
  freqBad++;
  fail("pain-frequency", "discovery.painPoints", "empty. Research that found no pain found nothing.");
}
for (const [i, pp] of pains.entries()) {
  const where = `discovery.painPoints[${i}] (${pp.id || pp.statement?.slice(0, 30) || "unnamed"})`;
  const nOf = Array.isArray(pp.nOf) ? pp.nOf.map(Number) : null;
  if (!nOf || nOf.length !== 2 || !nOf.every(Number.isFinite)) {
    freqBad++;
    fail("pain-frequency", where, '`nOf` is not [n, N]. "Most users" is not a frequency.');
  } else {
    const [n, N] = nOf;
    if (!(N > 0)) { freqBad++; fail("pain-frequency", where, `N is ${N}. Nobody was asked.`); }
    else if (n > N) { freqBad++; fail("pain-frequency", where, `${n} of ${N} is more people than were asked.`); }
  }
  if (!said(pp.statement, 15)) {
    freqBad++;
    fail("pain-frequency", where, "no statement. Write it in the user's own words, not your paraphrase of them.");
  }
}

/* ---- 4. EVIDENCE CLASS -------------------------------------------------- *
 * An inferred pain point presented as observed is the defect that survives every review,
 * because it reads identically. class and confidence are checked together so a guess
 * cannot be laundered into a finding by relabelling one of them. */
let classBad = 0;
for (const [i, pp] of pains.entries()) {
  const where = `discovery.painPoints[${i}] (${pp.id || "unnamed"})`;
  const cl = String(pp.class || "").toLowerCase();
  const cf = String(pp.confidence || "").toLowerCase();
  if (!CLASS.includes(cl)) {
    classBad++;
    fail("evidence-class", where,
      `class "${pp.class ?? "absent"}" is not observed, stated or inferred. A pain point nobody observed is a hypothesis and has to look like one.`);
  }
  if (!CONF.includes(cf)) {
    classBad++;
    fail("evidence-class", where, `confidence "${pp.confidence ?? "absent"}" is not high, medium or low.`);
  }
  if (cl === "inferred" && cf === "high") {
    classBad++;
    fail("evidence-class", where,
      "inferred and high confidence. Nobody said this and nobody was seen doing it, so the confidence is in your reasoning rather than in evidence.");
  }
}

/* ---- 5. SAID NO --------------------------------------------------------- *
 * Interviewing only the people who stayed builds a product for the customers you already
 * have. The ones who churned, or evaluated you and picked a spreadsheet, know the thing
 * your happy users cannot tell you. */
let saidNoBad = 0;
if (!saidNo.length && !said(d.saidNoWhyNone, 20)) {
  saidNoBad++;
  fail("said-no", "discovery.saidNo",
    "nobody who churned or chose otherwise, and no reason none was reachable. Interviewing only the people who stayed builds a product for the customers you already have.");
}
for (const [i, s] of saidNo.entries()) {
  if (!said(s.why, 12)) {
    saidNoBad++;
    fail("said-no", `discovery.saidNo[${i}] (${s.who || "unnamed"})`, "no reason recorded, which is the only part of this worth having.");
  }
}

/* ---- 6. STAKEHOLDER FEARS ----------------------------------------------- *
 * `fears` is the field that predicts a veto and the one always left out. Research the
 * users, design well, then get blocked in week nine by somebody nobody interviewed. */
let holderBad = 0;
if (!holders.length) {
  holderBad++;
  fail("stakeholder-fears", "state.stakeholders", "empty. Users have pain; stakeholders have a veto, and they are not the same list.");
}
for (const [i, s] of holders.entries()) {
  const where = `stakeholders[${i}] (${s.role || "unnamed"})`;
  if (!said(s.wants, 10)) { holderBad++; fail("stakeholder-fears", where, "no `wants`."); }
  if (!said(s.fears, 10)) {
    holderBad++;
    fail("stakeholder-fears", where,
      "no `fears`. This is the field that predicts a veto, and it is the one always left out.");
  }
  if (typeof s.decides !== "boolean" || typeof s.vetoes !== "boolean") {
    holderBad++;
    fail("stakeholder-fears", where, "`decides` and `vetoes` must both be booleans. Absent reads as false and nobody chose that.");
  }
  if (s.vetoes === true && !said(s.wouldBlockIf, 15)) {
    holderBad++;
    fail("stakeholder-fears", where,
      "holds a veto and nothing says what would make them use it, which is the only actionable part of having found them.");
  }
}

/* ---- 7. BUYER NAMED ----------------------------------------------------- *
 * In B2B the buyer and the user are different people with different pain. Research one
 * and you build a product that either nobody chooses or nobody uses, and which of the two
 * failed is invisible until launch. */
let buyerBad = 0;
if (segments.length) {
  const buyers = segments.filter((s) => s.isBuyer === true);
  const users = segments.filter((s) => s.isUser === true);
  if (!buyers.length) {
    buyerBad++;
    fail("buyer-named", "discovery.segments",
      "no segment is marked isBuyer. Somebody signs the invoice, and if that is the same person as the user, say so by marking one segment both.");
  }
  if (!users.length) {
    buyerBad++;
    fail("buyer-named", "discovery.segments", "no segment is marked isUser.");
  }
}

/* ---- 8. COMPETITOR PRICING ---------------------------------------------- *
 * pica-researcher measures a competitor's radius and control height. What it charges and
 * how it packages decides whether anyone switches, and nothing measured that. */
let compBad = 0;
if (!comps.length) {
  compBad++;
  fail("competitor-pricing", "discovery.competitors", "empty. Three to five, named, or the field was not looked at.");
}
for (const [i, c] of comps.entries()) {
  const where = `discovery.competitors[${i}] (${c.product || "unnamed"})`;
  if (!said(c.pricing, 4)) {
    compBad++;
    fail("competitor-pricing", where,
      "no pricing. What the field charges decides whether anyone switches, and it is public information for nearly every product.");
  }
  if (!said(c.packaging, 8)) {
    compBad++;
    fail("competitor-pricing", where, "no packaging. What is in which tier is how the field fences its own price.");
  }
}

/* ---- 9. MARKET BOTTOM UP ------------------------------------------------ *
 * The order-of-magnitude test is deliberately loose. It catches a size nobody derived,
 * not a forecast somebody disagrees with. */
let marketBad = 0;
const factors = Array.isArray(market.derivedFrom) ? market.derivedFrom : [];
const sourcedFactors = factors.filter((f) => said(f.source, 6) && Number.isFinite(Number(f.value)));
if (sourcedFactors.length < 2) {
  marketBad++;
  fail("market-bottom-up", "discovery.market.derivedFrom",
    `${sourcedFactors.length} sourced factor(s), needs 2. A market size with no factors behind it is one per cent of a big number.`);
}
const size = Number(market.size);
if (!Number.isFinite(size) || size <= 0) {
  marketBad++;
  fail("market-bottom-up", "discovery.market.size", "absent or not a positive number.");
} else if (sourcedFactors.length >= 2) {
  const product = sourcedFactors.reduce((a, f) => a * Number(f.value), 1);
  const ratio = product > 0 ? size / product : Infinity;
  if (!(ratio >= 0.1 && ratio <= 10)) {
    marketBad++;
    fail("market-bottom-up", "discovery.market.size",
      `${size} is not within an order of magnitude of its own factors (${product}). Either a factor is missing or the size was written first and justified afterwards.`);
  }
}
if (!said(market.switchingCost, 12)) {
  marketBad++;
  fail("market-bottom-up", "discovery.market.switchingCost",
    "absent. This is the number that decides whether a better product wins, and a market analysis without it assumes nobody is already using something.");
}
if (!said(market.whyBuyersChange, 15)) {
  marketBad++;
  fail("market-bottom-up", "discovery.market.whyBuyersChange",
    "absent. Name the trigger event in the buyer's world, because nobody replaces working software on a Tuesday for no reason.");
}

/* ---- 10. USERS PROVENANCE ---------------------------------------------- *
 * The same rule schema-check applies to a measured product: a lazy claim and a careful
 * one have the same shape without a source. */
let provBad = 0;
for (const [i, pp] of pains.entries())
  if (!said(pp.source, 6)) {
    provBad++;
    fail("users-provenance", `discovery.painPoints[${i}] (${pp.id || "unnamed"})`, "no source.");
  }
for (const [i, c] of comps.entries())
  if (!said(c.source, 6)) {
    provBad++;
    fail("users-provenance", `discovery.competitors[${i}] (${c.product || "unnamed"})`, "no source.");
  }
for (const [i, f] of factors.entries())
  if (!said(f.source, 6)) {
    provBad++;
    fail("users-provenance", `discovery.market.derivedFrom[${i}] (${f.factor || "unnamed"})`, "no source.");
  }

/* ---- report -------------------------------------------------------------- */
const table = [
  ["segment-defined", segBad, `${segments.length} segment(s)`],
  ["users-sample-size", sampleBad, `${segments.reduce((n, s) => n + (Number(s.interviews) || 0), 0)} interviews total`],
  ["pain-frequency", freqBad, `${pains.length} pain point(s)`],
  ["evidence-class", classBad, `${pains.filter((p) => String(p.class).toLowerCase() === "observed").length} observed of ${pains.length}`],
  ["said-no", saidNoBad, saidNo.length ? `${saidNo.length} who chose otherwise` : "nobody who said no"],
  ["stakeholder-fears", holderBad, `${holders.length} stakeholder(s), ${holders.filter((s) => s.vetoes).length} with a veto`],
  ["buyer-named", buyerBad, `${segments.filter((s) => s.isBuyer).length} buyer, ${segments.filter((s) => s.isUser).length} user`],
  ["competitor-pricing", compBad, `${comps.length} competitor(s)`],
  ["market-bottom-up", marketBad, `${sourcedFactors.length} sourced factor(s)`],
  ["users-provenance", provBad, `${pains.length + comps.length + factors.length} claim(s)`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(19)} ${String(n).padStart(3)} finding(s)   (${scope})`);

const inferred = pains.filter((p) => String(p.class).toLowerCase() === "inferred").length;
if (inferred && inferred === pains.length) {
  console.log("");
  console.log("NOTE  every pain point is inferred. Nothing here was observed and nobody said any of it,");
  console.log("      so this is a hypothesis set rather than research. It is a valid state to be in and");
  console.log("      it is not the same state as having asked, and the design that follows should say so.");
}

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Discovery ${findings.length ? "is NOT ready to build a PRD on" : "rests on evidence rather than assertion"}.`);
process.exit(findings.length ? 1 : 0);
