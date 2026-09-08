/**
 * estimate-check.mjs — the commercial gate. Runs before an estimate is sent.
 *
 * An estimate is the one artefact in this flow that becomes a contractual number the
 * moment it leaves the building. It cannot be revised the way a screen can, so the
 * checks here are about whether it was allowed to be produced at all, and whether it
 * says enough to be defended.
 *
 * Six checks:
 *
 *   1. PRECONDITIONS  scope frozen and deadline fixed before any estimate exists.
 *                     PASS: both present.
 *   2. THREE POINTS   O, M, P per role, with O <= M <= P.
 *                     PASS: 0 malformed roles.
 *   3. TIER SPREAD    every complex package spreads wider than every standard one.
 *                     PASS: 0 inversions. Reports when one tier means nothing was compared.
 *   4. RISK REFLECTED the architect's risks moved the pessimistic figures.
 *                     PASS: risks exist => spread is not uniform.
 *   5. HEADCOUNT      derived from effort and duration, shown as arithmetic.
 *                     PASS: every role resolves.
 *   6. EFFORT LOG     at closeout, actuals recorded, with a reason on >20% variance.
 *                     PASS: 0 unexplained variances.
 *
 * Usage: node estimate-check.mjs <state.json> [--closeout]
 */
import fs from "fs";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
const CLOSEOUT = args.includes("--closeout");

if (!statePath) {
  console.error("usage: node estimate-check.mjs <state.json> [--closeout]");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const estRaw = state.estimate || {};

/* ---- for a client, for yourself, or skipped -------------------------------- *
 * Until 0.9.2 there was one mode and it was the strict one, so anyone sizing their own
 * work had to invent a frozen scope and a deadline to satisfy a gate written for a number
 * that leaves the building. They stopped estimating instead, which is the outcome the
 * whole package exists to prevent.
 *
 * `for` is on the estimate rather than beside it, so a project cannot carry a mode that
 * disagrees with the figures it labels. */
const FOR = String(estRaw.for || "client").toLowerCase();
const SELF = FOR === "self";
const SKIPPED = FOR === "skipped";
const est = Object.fromEntries(Object.entries(estRaw).filter(([k]) => !["for", "why"].includes(k)));
const roles = Object.keys(est);

/* ---- who is allowed to estimate what --------------------------------------- *
 * The person who does the work estimates the work. One estimator pricing four trades
 * they will not practise is a number with a signature and no knowledge behind it, and
 * that is what this repository shipped until 0.9.2. */
const TRADE = {
  "pica-researcher": /^(research|precedent|measurement)$/i,
  "pica-analyst":   /^(ba|analysis|analyst|requirements)$/i,
  "pica-designer":  /^(design|ui|ux|uiux)$/i,
  "pica-writer":    /^(content|copy|words|ux-writing)$/i,
  "pica-architect": /^(arch|architecture|architect)$/i,
  "pica-developer": /^(fe|be|frontend|backend|dev|development|mobile|api)$/i,
  "pica-tester":    /^(qa|test|testing)$/i,
  "pica-modeller":  /^(value|pricing|business-case)$/i,
};
/* ---- void detection ------------------------------------------------------ *
 * A field that has been EMPTIED reads exactly like a field that was answered. An early
 * revision of industry-check was defeated end to end by writing "n/a" into every field it
 * required, and the same hole was then found here: a sixty per cent effort variance "explained" with "n/a" passed the closeout gate, and the
 * effort log is the one artefact that makes the next estimate better than a guess
 *
 * Length is the wrong instrument and was tried first. A twenty-character floor rejected
 * "Dark by default.", which is a real decision written by someone who writes well, and a
 * false positive is worse than a miss because it teaches people to skip the check. So the
 * void list does the work, and the floor only has to clear "x".
 *
 * Two floors, because two kinds of field: a SOURCE or a NAME is legitimately short
 * ("client", "brief", "ISO 20022"), while a REASON has to be a sentence. Anything present,
 * not a void phrase, and still too thin to be useful is a judgement call, and it belongs
 * to the human at the gate rather than to a character count.
 *
 * This helper is duplicated in every script that needs it rather than imported. These
 * scripts are standalone by design: each runs from its own package after a single-package
 * install, where no sibling package's path exists. */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};
const NAMED = 2;   // a source or a person, not a sentence. "PM", "BA" and "QA" are
                   // all real answers here, and "n/a" is caught by the void list rather
                   // than by length, which is the whole point of separating the two

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

if (SKIPPED && !CLOSEOUT) {
  /* A skipped estimate with a reason is a decision. A missing one is an oversight, and
   * afterwards nobody can tell which happened, so the reason is the only thing checked. */
  if (!said(estRaw.why, 12)) {
    console.log('estimate: skipped\n');
    console.log("FAIL  skipped-reasoned   1 finding(s)   (no reason recorded)");
    console.log("\nFINDING  [skipped-reasoned] state.estimate.why");
    console.log("         the estimate is marked skipped with no reason. A skip nobody explained is");
    console.log("         indistinguishable from an estimate nobody remembered to produce");
    process.exit(1);
  }
  console.log("estimate: skipped\n");
  console.log(`pass  skipped-reasoned   0 finding(s)   ("${String(estRaw.why).slice(0, 60)}")`);
  console.log("\nNOTE  nothing below ran, because there is nothing to price. That is a decision on");
  console.log("      the record, not a clean estimate.");
  console.log("\n0 finding(s). The estimate was deliberately skipped.");
  process.exit(0);
}

if (!CLOSEOUT && !roles.length) {
  console.error("FAIL  state carries no estimate. Nothing to check, and zero findings would be a lie.");
  process.exit(2);
}

/* ---- 1. preconditions --------------------------------------------------- *
 * An estimate produced before scope is frozen prices a guess, and a guess that has
 * been sent to a client is a commitment. */
let pre = 0;
/* One name, not two. An alias means two spellings of the same fact, and the day they
 * disagree nobody can tell which one the gate actually read. */
const scopeFrozen = Boolean(state.scopeFrozen);
const deadline = state.deadline;
/* Sizing your own work commits nobody, so nothing has to be frozen first. The three
 * points still apply: the spread is the part worth having. */
if (!SELF) {
if (!scopeFrozen) {
  pre++;
  fail("preconditions", "state.scopeFrozen",
    "scope is not frozen (4.6). An estimate produced now prices a guess, and the guess becomes the commitment");
}
if (!said(deadline, NAMED)) {
  pre++;
  fail("preconditions", "state.deadline",
    'no deadline (4.7). Headcount cannot be derived, so the price cannot be either. "Soon" is not a date');
}
}

/* ---- 2. three points ---------------------------------------------------- */
let malformed = 0;
for (const r of roles) {
  const v = est[r] || {};
  const { o, m, p } = v;
  if ([o, m, p].some((x) => typeof x !== "number")) {
    malformed++;
    fail("three-points", r, "does not carry three numeric points. A single figure hides the risk instead of showing it");
    continue;
  }
  if (!(o <= m && m <= p)) {
    malformed++;
    fail("three-points", r, `points are out of order: O=${o}, M=${m}, P=${p}`);
  }
  if (o === m && m === p) {
    malformed++;
    fail("three-points", r, "all three points are equal, which is a single number wearing a costume");
  }
}

const pert = (v) => (v.o + 4 * v.m + v.p) / 6;
const spread = (v) => (v.p - v.o) / (v.m || 1);

/* ---- 2b. estimated by the doer -------------------------------------------- */
let misattributed = 0;
for (const r of roles) {
  const by = String((est[r] || {}).by || "").trim().toLowerCase();
  if (!by) {
    misattributed++;
    fail("estimated-by-doer", r,
      "names no `by`. Someone estimated this line, nobody knows who, and when it is wrong nobody can " +
      "say what they misjudged. The agent that does the work is the one that estimates it");
    continue;
  }
  if (by === "human" || by.startsWith("pm") || /project manage/i.test(by)) continue;
  const pattern = TRADE[by];
  if (!pattern) {
    misattributed++;
    fail("estimated-by-doer", r,
      `is attributed to "${by}", which is not an agent with a trade. Known: ${Object.keys(TRADE).join(", ")}, ` +
      `or "human" for the lines this package does not price`);
    continue;
  }
  if (!pattern.test(r)) {
    misattributed++;
    fail("estimated-by-doer", r,
      `is estimated by ${by}, which does not do this work. A trade pricing a trade it will not practise ` +
      "is a guess with a signature on it");
  }
}

/* ---- 3. tier spread ----------------------------------------------------- *
 * A tier that changes nothing about the numbers was decorative. */
let inversions = 0;
const wps = state.workPackages || {};
const byTier = { standard: [], complex: [] };
for (const [name, wp] of Object.entries(wps)) {
  const t = (wp || {}).tier;
  const e = (wp || {}).estimate;
  if (!t || !e) continue;
  const s = Object.values(e).filter((v) => v && typeof v.o === "number").map(spread);
  if (s.length) byTier[t]?.push({ name, spread: s.reduce((a, b) => a + b, 0) / s.length });
}
/* When every package sits in one tier there is nothing to compare, and the first version
 * printed "pass" for that. It cannot be a failure: a project legitimately has one tier.
 * But it cannot be a pass either, because relabelling the hard package as standard
 * produces exactly this state and makes the estimate look tighter than it is, and this
 * check has no way to know which package is genuinely hard.
 *
 * So it says so. The tier system either moved the numbers or it was decorative, and which
 * one happened is the reader's to judge with the fact in front of them. */
let tierInert = false;
if (Object.keys(wps).length > 1 && (!byTier.complex.length || !byTier.standard.length))
  tierInert = true;

if (byTier.complex.length && byTier.standard.length) {
  const widestStandard = Math.max(...byTier.standard.map((x) => x.spread));
  for (const c of byTier.complex) {
    if (c.spread <= widestStandard) {
      inversions++;
      fail("tier-spread", c.name,
        `marked complex but its spread (${c.spread.toFixed(2)}) is no wider than a standard package (${widestStandard.toFixed(2)}). The tier changed nothing`);
    }
  }
}

/* ---- 4. risk reflected -------------------------------------------------- */
let riskFlat = 0;
const risks = state.risks || [];
if (risks.length && roles.length) {
  const spreads = roles.map((r) => (typeof est[r].o === "number" ? spread(est[r]) : null)).filter((x) => x !== null);
  if (spreads.length && new Set(spreads.map((s) => s.toFixed(3))).size === 1) {
    riskFlat = 1;
    fail("risk-reflected", "state.estimate",
      `${risks.length} risk(s) recorded but every role has an identical spread. A risk that moved no pessimistic figure was not a risk`);
  }
}

/* ---- 5. headcount ------------------------------------------------------- */
let unresolved = 0;
const weeks = Number(state.durationWeeks || 0);
const hoursPerWeek = Number(state.hoursPerWeek || 40);
const headcount = {};
if (!CLOSEOUT && !SELF) {
  if (!weeks) {
    unresolved++;
    fail("headcount", "state.durationWeeks", "no duration, so effort cannot be turned into a team");
  } else {
    for (const r of roles) {
      const v = est[r];
      if (typeof v.o !== "number") continue;
      const h = pert(v);
      headcount[r] = Math.ceil(h / weeks / hoursPerWeek);
      if (!Number.isFinite(headcount[r]) || headcount[r] < 1) {
        unresolved++;
        fail("headcount", r, "headcount does not resolve to a whole person");
      }
    }
  }
}

/* ---- 6. effort log ------------------------------------------------------ */
let unexplained = 0;
if (CLOSEOUT) {
  const log = state.effortLog || [];
  if (!log.length) {
    unexplained++;
    fail("effort-log", "state.effortLog",
      "project closing with no effort record. The next estimate learns nothing, and 5.1 stays a guess forever");
  }
  for (const e of log) {
    const { estimated, actual, why, role, package: pkg } = e;
    if (typeof estimated !== "number" || typeof actual !== "number") continue;
    const variance = Math.abs(actual - estimated) / (estimated || 1);
    if (variance > 0.2 && !said(why)) {
      unexplained++;
      fail("effort-log", `${pkg || "?"} / ${role || "?"}`,
        `${Math.round(variance * 100)}% variance with no reason recorded. A variance nobody explains teaches nothing`);
    }
  }
}

/* ---- report ------------------------------------------------------------- */
console.log(`estimate: for ${FOR}\n`);
if (roles.length) {
  console.log("role      O      M      P     PERT   headcount   by");
  for (const r of roles) {
    const v = est[r];
    if (typeof v.o !== "number") { console.log(`${r.padEnd(8)} (malformed)`); continue; }
    console.log(`${r.padEnd(8)}${String(v.o).padStart(5)}${String(v.m).padStart(7)}${String(v.p).padStart(7)}` +
      `${pert(v).toFixed(0).padStart(8)}${(headcount[r] ?? "-").toString().padStart(11)}   ${v.by || "(nobody)"}`);
  }
  console.log("");
}

const table = [
  ["preconditions", pre, SELF ? "for yourself, so nothing has to be frozen" : (scopeFrozen ? "scope frozen" : "scope NOT frozen")],
  ["three-points", malformed, `${roles.length} roles`],
  ["estimated-by-doer", misattributed, `${roles.length} lines`],
  ["tier-spread", inversions, `${byTier.complex.length} complex, ${byTier.standard.length} standard`
     + (tierInert ? " — NOT COMPARED, every package is one tier" : "")],
  ["risk-reflected", riskFlat, `${risks.length} risks recorded`],
  ["headcount", unresolved, SELF ? "not derived: there is no team" : (weeks ? `${weeks} weeks at ${hoursPerWeek}h` : "no duration")],
  ["effort-log", unexplained, CLOSEOUT ? `${(state.effortLog || []).length} entries` : "not checked, run with --closeout"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(15)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (tierInert) {
  console.log("");
  console.log("NOTE  every work package carries the same tier, so tier-spread compared nothing.");
  console.log("      This is not a failure and it is not a pass. Either the work really is uniform, or");
  console.log("      a package that is harder than the rest is priced as if it is not. Nothing here can");
  console.log("      tell those apart, so a human has to.");
}

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Estimate ${findings.length ? "is NOT ready to send" : "passes the commercial gate"}.`);
process.exit(findings.length ? 1 : 0);
