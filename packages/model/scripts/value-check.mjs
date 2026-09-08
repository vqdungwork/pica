/**
 * value-check.mjs: the funding gate. Runs before a business case is presented.
 *
 * pica measured design for nine versions and never once asked what the thing cost to
 * run. A design that is correct and unaffordable passes every other check in this
 * repository, which is why this file exists. Across all thirteen packages at 0.9.5 there
 * was no revenue, no pricing, no willingness to pay and no run cost anywhere.
 *
 * Eleven checks. Each guards the figure people leave out:
 *
 *   1. DECLARED     for a client, for yourself, or skipped with a reason.
 *   2. RUN COST     every line has a basis, and the maintenance rate is stated.
 *   3. THREE POINTS revenue has o <= m <= p, and they are not all the same number.
 *   4. BOTTOM UP    every revenue line rests on two or more sourced drivers.
 *   5. FENCE        every tier above the cheapest says what stops a buyer trading down.
 *   6. HORIZON      at least 24 months, and a break-even month exists.
 *   7. SENSITIVITY  three or more, each naming an assumption that exists.
 *   8. DO NOTHING   what happens if nobody builds it.
 *   9. ATTRIBUTION  every figure has a name against it.
 *  10. VERDICT      with --gate: build, do-not-build or revisit, and who decided.
 *  11. TRIGGER      a business case with no trigger is a solution hunting a problem.
 *
 * Usage: node value-check.mjs <state.json> [--gate]
 */
import fs from "fs";

const args = process.argv.slice(2);
const statePath = args.find((a) => !a.startsWith("--"));
const GATE = args.includes("--gate");

if (!statePath) {
  console.error("usage: node value-check.mjs <state.json> [--gate]");
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
 * An emptied field reads exactly like an answered one. "n/a" defeated two earlier checks
 * in this repository end to end, so length alone is the wrong instrument. */
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

/* An ABSENT value case is not a broken one. Every sibling that reads a block it needs
 * says so and exits 2: arch-check, estimate-check and discover-check all refuse rather
 * than report findings against nothing. This one reported eight on all nine real projects
 * in the wild, which said "your business case is broken" to nine teams who had simply
 * never run this step. Zero findings would be a lie; so would eight. */
if (!state.value || !Object.keys(state.value).length) {
  console.error("FAIL  state carries no value. Nothing to check, and neither zero findings nor a list");
  console.error("      of them would be true: run /pica-model first, or record value.for as \"skipped\"");
  console.error("      with a reason if this project is not being priced.");
  process.exit(2);
}
const v = state.value;
const FOR = String(v.for || "").toLowerCase();
const SELF = FOR === "self";
const SKIPPED = FOR === "skipped";
const revenue = Array.isArray(v.revenue) ? v.revenue : [];
const runCost = Array.isArray(v.runCost) ? v.runCost : [];

/* ---- 1. DECLARED --------------------------------------------------------- *
 * Three modes, and the difference is who the number binds. `skipped` is a decision when
 * it carries a reason and an oversight when it does not, and afterwards nobody can tell
 * those apart, so the reason is the only thing checked. */
let declaredBad = 0;
if (!["client", "self", "skipped"].includes(FOR)) {
  declaredBad++;
  fail("value-declared", "value.for",
    `"${v.for ?? "absent"}" is not a mode. Use "client", "self", or "skipped" with a reason.`);
}
if (SKIPPED && !said(v.why, 12)) {
  declaredBad++;
  fail("value-declared", "value.why",
    "the value case is skipped and no reason says why, so a decision and an oversight look identical.");
}

/* ---- 2. RUN COST --------------------------------------------------------- *
 * The line everybody omits, and the one that kills a product in year two when the build
 * team has moved on and the bill has not. A basis separates a quote from a guess, and
 * both are acceptable; not saying which is not. */
const BASIS = ["measured", "quoted", "assumed"];
let unbasedCost = 0;
if (!SKIPPED) {
  if (!runCost.length) {
    unbasedCost++;
    fail("run-cost", "value.runCost", "empty. A product with no running cost has never been run.");
  }
  for (const [i, c] of runCost.entries()) {
    const where = `value.runCost[${i}] (${c.item || "unnamed"})`;
    const basis = String(c.basis || "").toLowerCase();
    if (!BASIS.includes(basis)) {
      unbasedCost++;
      fail("run-cost", where, `basis "${c.basis ?? "absent"}" is not one of measured, quoted, assumed.`);
    } else if (basis !== "assumed" && !said(c.source, 10)) {
      unbasedCost++;
      fail("run-cost", where,
        `basis is "${c.basis}" but no source is named, which makes it an assumption wearing a better word.`);
    }
    if (!(Number(c.annual) > 0)) {
      unbasedCost++;
      fail("run-cost", where, "annual cost is zero or absent.");
    }
  }
  if (!(Number(v.maintenancePct) > 0)) {
    unbasedCost++;
    fail("run-cost", "value.maintenancePct",
      "not stated. Maintenance is a real annual cost and a plan that hides it inside the build figure spends it without deciding to.");
  }
}

/* ---- 3. THREE POINTS ---------------------------------------------------- *
 * The same doctrine estimate-check applies to effort, for the same reason: a single
 * revenue number is a wish, and a range is the only form in which the risk is visible.
 * o == m == p is one number wearing three hats, so it is a finding rather than a pass. */
let revMalformed = 0;
if (!SKIPPED) {
  if (!revenue.length) {
    revMalformed++;
    fail("revenue-three-points", "value.revenue",
      "empty. A value case with no revenue and no saving is a cost case.");
  }
  for (const [i, r] of revenue.entries()) {
    const where = `value.revenue[${i}] (${r.line || "unnamed"})`;
    const [o, m, p] = [Number(r.o), Number(r.m), Number(r.p)];
    if (![o, m, p].every((n) => Number.isFinite(n))) {
      revMalformed++;
      fail("revenue-three-points", where, "o, m and p are not all numbers.");
      continue;
    }
    if (!(o <= m && m <= p)) {
      revMalformed++;
      fail("revenue-three-points", where,
        `o=${o} m=${m} p=${p} is not ordered. Optimistic cannot exceed most likely.`);
    }
    if (o === m && m === p) {
      revMalformed++;
      fail("revenue-three-points", where,
        `all three points are ${m}. That is one number in three fields, and it hides the spread that is the only useful part.`);
    }
  }
}

/* ---- 4. BOTTOM UP ------------------------------------------------------- *
 * "One per cent of a two billion dollar market" is arithmetic with no mechanism behind
 * it: nothing in it says who buys, or why, or how many there are. Two or more sourced
 * drivers forces the number to be built rather than asserted, and `class` keeps an
 * observed driver distinguishable from one somebody hoped for. */
const CLASS = ["observed", "stated", "inferred"];
let notBottomUp = 0;
if (!SKIPPED) {
  for (const [i, r] of revenue.entries()) {
    const where = `value.revenue[${i}] (${r.line || "unnamed"})`;
    const drivers = Array.isArray(r.drivers) ? r.drivers : [];
    const sourced = drivers.filter(
      (d) => said(d.from, 6) && CLASS.includes(String(d.class || "").toLowerCase()));
    if (sourced.length < 2) {
      notBottomUp++;
      fail("bottom-up", where,
        `${sourced.length} sourced driver(s), needs 2. Every driver carries a \`from\` and a \`class\` of observed, stated or inferred, or the figure was asserted rather than built.`);
    }
    for (const [j, d] of drivers.entries()) {
      if (!Number.isFinite(Number(d.value))) {
        notBottomUp++;
        fail("bottom-up", `${where} drivers[${j}] (${d.name || "unnamed"})`, "no numeric value.");
      }
    }
  }
}

/* ---- 5. FENCE ----------------------------------------------------------- *
 * A tier list with no fence is a discount schedule: every buyer picks the cheapest and
 * the upper tiers are decoration. The cheapest tier needs no fence, because there is
 * nothing below it to trade down to. */
let unfenced = 0;
const pricing = v.pricing || {};
const tiers = Array.isArray(pricing.tiers) ? pricing.tiers : [];
if (!SKIPPED && String(pricing.model || "").toLowerCase() === "tiered") {
  if (tiers.length < 2) {
    unfenced++;
    fail("tier-fence", "value.pricing.tiers",
      `${tiers.length} tier(s) on a tiered model. One tier is a flat price.`);
  }
  const cheapest = tiers.reduce((lo, t, i) => (Number(t.price) < Number(tiers[lo].price) ? i : lo), 0);
  for (const [i, t] of tiers.entries()) {
    if (i === cheapest) continue;
    if (!said(t.fence, 12)) {
      unfenced++;
      fail("tier-fence", `value.pricing.tiers[${i}] (${t.name || "unnamed"})`,
        "no fence. Say what this tier has that a buyer on the cheapest one cannot do without, or they will not move.");
    }
  }
}

/* ---- 6. HORIZON --------------------------------------------------------- *
 * Twelve months flatters every product, because most of the run cost and all of the
 * churn land after it. Two years is the shortest horizon on which a subscription
 * business case says anything. */
let horizonBad = 0;
const horizon = Number(v.horizonMonths);
if (!SKIPPED) {
  if (!(horizon >= 24)) {
    horizonBad++;
    fail("value-horizon", "value.horizonMonths",
      `${v.horizonMonths ?? "absent"}. Use 24 or more: a shorter horizon hides the run cost that decides this.`);
  }
  if (!(Number(v.breakEvenMonth) > 0)) {
    horizonBad++;
    fail("value-horizon", "value.breakEvenMonth",
      "absent. If it never breaks even, say so as a month beyond the horizon.");
  }
}

/* ---- 7. SENSITIVITY ----------------------------------------------------- *
 * Three is the floor because the answer always rests on more than one assumption, and
 * naming only the comfortable one is worse than naming none. An entry pointing at an
 * assumption that appears nowhere else is theatre, so every one is resolved against the
 * drivers and cost lines that actually exist. */
let sensBad = 0;
const sens = Array.isArray(v.sensitivity) ? v.sensitivity : [];
if (!SKIPPED) {
  const known = new Set([
    ...revenue.flatMap((r) => (r.drivers || []).map((d) => String(d.name || "").toLowerCase())),
    ...runCost.map((c) => String(c.item || "").toLowerCase()),
    "maintenancepct", "buildcost", "horizonmonths",
  ].filter(Boolean));
  if (sens.length < 3) {
    sensBad++;
    fail("sensitivity", "value.sensitivity",
      `${sens.length} entries, needs 3. The answer rests on more than one assumption.`);
  }
  for (const [i, s] of sens.entries()) {
    const name = String(s.assumption || "").toLowerCase();
    if (!known.has(name)) {
      sensBad++;
      fail("sensitivity", `value.sensitivity[${i}]`,
        `"${s.assumption ?? "absent"}" is not a driver or a cost line anywhere in this case, so moving it moves nothing.`);
    }
    const [lo, mid, hi] = [Number(s.low), Number(s.mid), Number(s.high)];
    if (!(Number.isFinite(lo) && Number.isFinite(mid) && Number.isFinite(hi) && lo <= mid && mid <= hi)) {
      sensBad++;
      fail("sensitivity", `value.sensitivity[${i}] (${s.assumption || "unnamed"})`,
        `low=${s.low} mid=${s.mid} high=${s.high} is not an ordered range.`);
    }
  }
}

/* ---- 8. DO NOTHING ------------------------------------------------------ *
 * Every project beats zero when zero is never costed. Sometimes doing nothing is
 * genuinely fine, and not asking is how you never find that out. */
let doNothingBad = 0;
if (!SKIPPED && !said(v.doNothing, 20)) {
  doNothingBad++;
  fail("do-nothing", "value.doNothing",
    "absent. State what happens if nobody builds it, because a case compared against nothing has not been compared.");
}

/* ---- 9. ATTRIBUTION ----------------------------------------------------- *
 * The rule estimate-check applies to effort. An unowned revenue assumption is nobody's
 * to defend and nobody's to correct when it turns out wrong. */
let unattributed = 0;
if (!SKIPPED) {
  for (const [i, r] of revenue.entries())
    if (!said(r.by, 2)) {
      unattributed++;
      fail("value-attribution", `value.revenue[${i}] (${r.line || "unnamed"})`,
        "no `by`. Someone produced this figure and nobody knows who.");
    }
  for (const [i, c] of runCost.entries())
    if (!said(c.by, 2)) {
      unattributed++;
      fail("value-attribution", `value.runCost[${i}] (${c.item || "unnamed"})`, "no `by`.");
    }
  if (v.buildCost && !said(v.buildCost.by, 2)) {
    unattributed++;
    fail("value-attribution", "value.buildCost", "no `by`.");
  }
}

/* ---- 10. VERDICT -------------------------------------------------------- *
 * Only at the gate. A case with no verdict was presented and never decided, which is the
 * state a project drifts into and then builds from. */
const VERDICTS = ["build", "do-not-build", "revisit"];
let verdictBad = 0;
if (GATE && !SKIPPED) {
  if (!VERDICTS.includes(String(v.verdict || "").toLowerCase())) {
    verdictBad++;
    fail("value-verdict", "value.verdict",
      `"${v.verdict ?? "absent"}" is not one of build, do-not-build, revisit.`);
  }
  if (!said(v.decidedBy, 4)) {
    verdictBad++;
    fail("value-verdict", "value.decidedBy",
      "nobody is named. A verdict with no name against it binds no one, and a case that cannot be funded by whoever agreed it was not agreed.");
  }
}

/* ---- 11. TRIGGER -------------------------------------------------------- *
 * Read from state.trigger, written at intake. A business case with no trigger is a
 * solution hunting a problem, and the window is what makes the break-even month mean
 * something rather than being a number on its own. Only for a client, because sizing
 * your own idea does not need a window to be honest. */
let triggerBad = 0;
const tr = state.trigger || {};
if (!SKIPPED && FOR === "client") {
  for (const k of ["changed", "ifNothing", "window"]) {
    if (!said(tr[k], 12)) {
      triggerBad++;
      fail("value-trigger", `trigger.${k}`,
        "absent. Without it the case cannot say why now, and a break-even month with no window against it decides nothing.");
    }
  }
}

/* ---- report -------------------------------------------------------------- */
const table = [
  ["value-declared", declaredBad,
    SKIPPED ? "skipped with a reason" : (SELF ? "for yourself, so nothing binds" : `for ${FOR || "nobody"}`)],
  ["run-cost", unbasedCost, `${runCost.length} lines, maintenance ${v.maintenancePct ?? "unstated"}%`],
  ["revenue-three-points", revMalformed, `${revenue.length} lines`],
  ["bottom-up", notBottomUp, `${revenue.reduce((n, r) => n + (r.drivers || []).length, 0)} drivers`],
  ["tier-fence", unfenced, `${tiers.length} tiers, model ${pricing.model || "unstated"}`],
  ["value-horizon", horizonBad, `${horizon || "?"} months, break-even ${v.breakEvenMonth ?? "?"}`],
  ["sensitivity", sensBad, `${sens.length} entries`],
  ["do-nothing", doNothingBad, said(v.doNothing, 20) ? "stated" : "absent"],
  ["value-attribution", unattributed, `${revenue.length} revenue, ${runCost.length} run-cost lines`],
  ["value-verdict", verdictBad, GATE ? `${v.verdict || "none"}` : "not checked, run with --gate"],
  ["value-trigger", triggerBad, FOR === "client" ? "checked" : "not checked, only applies for a client"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(21)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Value case ${findings.length ? "is NOT ready to present" : "passes the funding gate"}.`);
process.exit(findings.length ? 1 : 0);
