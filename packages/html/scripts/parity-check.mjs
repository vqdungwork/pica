/**
 * parity-check.mjs: viewport parity. Runs in the HTML gate, alongside
 * verify-html.mjs, and again at review.
 *
 * Only meaningful for a project declaring two or more viewports. With one viewport
 * it reports that and exits 0.
 *
 * WHAT IT DOES NOT CHECK: the set of screen names present at each viewport. In the
 * two-column model both viewports are the same markup in the same file, so name
 * parity holds by construction and catches nothing. The real risk is markup drift
 * between two hand-maintained columns.
 *
 * Two passes:
 *   1. NOMINAL  : a screen missing at a viewport entirely. Excused only by a
 *                  `parityExemptions` entry naming that screen.
 *   2. STRUCTURAL: per-class element COUNTS compared across viewports. Excused
 *                  only by a scoped `reflowNotes` entry.
 *
 * Counts, not sets: delete one of five candidate rows from one column and the class
 * SET is unchanged, so a set comparison reports ok on a screen that lost content.
 *
 * Subtree-pruned: excusing a reflowing component excuses what is inside it. An
 * excused box's whole subtree is pruned, using the depth and parent index the
 * capture records. Without this, a registered component's descendants leak gaps the
 * register cannot cover and the check can never return zero.
 *
 * PASS: 0 findings. Legitimate reflow is not "expected noise" to be eyeballed: each
 * instance is declared in `reflowNotes` or it is a finding. That is what makes
 * responsive behaviour something that returns zero.
 *
 * Usage: node parity-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
/* --quiet drops the per-screen `ok` lines and keeps every FINDING and the summary.
 *
 * It exists because the alternative is what harnesses actually do: pipe this through
 * `tail -1` to get the count, which throws the findings away. On one project that check
 * reported "3 finding(s)" and the three were invisible until it was re-run by hand,
 * outside the harness, an hour later. A gate that reports a number and not the reason
 * costs a cycle every single time it fires. */
const QUIET = process.argv.includes("--quiet");
const ok = (line) => { if (!QUIET) console.log(line); };
if (!refPath || !statePath) {
  console.error("usage: node parity-check.mjs <html-reference.json> <state.json> [--quiet]");
  process.exit(2);
}

let ref, state;
try {
  ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  /* Guarded like contrast-check, coverage-check and spacing-check, which all read the
   * same two inputs and all say so when they cannot. These two threw an unguarded ENOENT
   * instead, so inside picaflow a missing capture arrived as a stack trace rather than as
   * a named absence. A check that cannot run is not a pass, and a crash does not say
   * which of the two it is. */
  console.error(`FAIL  could not read or parse an input (${e.message}).`);
  process.exit(2);
}

/* ---- shape guard --------------------------------------------------------- *
 * Feeding these scripts a state file with the right field names and the wrong types made
 * six of them exit on an uncaught TypeError. They still failed closed, so no gate was let
 * through, but the person running one got a stack trace instead of a sentence naming the
 * field, and a tool that answers a bad input with a stack trace reads as a broken tool.
 *
 * Duplicated per script rather than imported: these run standalone from their own package
 * after a single-package install, where no sibling package's path exists. */
const shapeErrors = [];
const expectArray = (key) => {
  const v = state[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    /* An array containing null is still the wrong shape: every consumer here reads
     * properties off its entries, and `[null]` throws exactly where `"a string"` does. */
    const holes = v.filter((x) => x === null || x === undefined).length;
    if (holes) shapeErrors.push(`state.${key} has ${holes} null entr${holes === 1 ? "y" : "ies"}`);
    return v;
  }
  shapeErrors.push(`state.${key} is ${typeof v}, and this reads it as an array`);
  return [];
};
expectArray("viewports");
expectArray("parityExemptions");
expectArray("reflowNotes");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}

const VIEWPORTS = (state.viewports || []).map((v) => v.name);
if (VIEWPORTS.length < 2) {
  /* One viewport is a legitimate project and there is genuinely no parity to check. ZERO
   * is a defect, and printing the same benign sentence for both made them look alike.
   * verify-html refuses to run at all on zero, so the gate as a whole is correct; this
   * line exists so a reader of THIS output is not told nothing is wrong. */
  console.log(VIEWPORTS.length
    ? "1 viewport declared. Parity needs two or more, so there is nothing to compare here."
    : "0 viewports declared. That is not a project with nothing to compare, it is a project "
      + "with no viewport declaration, and verify-html refuses to run on it. Fix that first.");
  process.exit(0);
}

/* reflowNotes are SCOPED: a component is excused either globally ("*") or only on a
 * named screen. A flat global set was tried first and was too blunt: one screen's
 * legitimate reflow silently excused the same component everywhere. */
const REFLOW = new Map();
for (const n of state.reflowNotes || []) {
  if (!REFLOW.has(n.scope)) REFLOW.set(n.scope, new Set());
  REFLOW.get(n.scope).add(n.component);
}
const excused = (screen, component) =>
  REFLOW.get("*")?.has(component) || REFLOW.get(screen)?.has(component) || false;

/* The viewport is read from the tag the capture records. verify-html.mjs asserts
 * every frame carries it, so an untagged frame here means the gate was skipped. */
const vpOf = (frame) => {
  if (!frame.viewport) {
    console.error(`FAIL  frame "${frame.cap}" carries no viewport tag. Run verify-html.mjs first.`);
    process.exit(2);
  }
  return frame.viewport;
};

/* Screen name from the caption, stripping from the frame's OWN viewport token
 * rightwards.
 *
 * NOT a split on the first "·". pica's naming convention is
 * `family / state · qualifier`, so "·" appears INSIDE screen names:
 * "search / entry · error · desktop 1440×900" must yield "search / entry · error",
 * not "search / entry". Splitting naively collapses distinct screens into one
 * bucket and invents findings. Using the frame's tagged viewport rather than an
 * alternation over all viewport names keeps this exact even when one viewport's
 * name is a prefix of another's. */
const screenOf = (frame) =>
  frame.cap.replace(new RegExp(`\\s*·\\s*${vpOf(frame)}\\b.*$`, "i"), "").trim();

let pruned_total = 0;

const classesOf = (frame, screen) => {
  const m = new Map();
  const pruned = new Set();
  frame.boxes.forEach((b, i) => {
    const cls = b[0], parentIdx = b.length > 6 ? b[6] : -1;
    if (parentIdx >= 0 && pruned.has(parentIdx)) { pruned.add(i); return; }
    const list = cls.split(/\s+/).filter(Boolean);
    if (list.some((c) => excused(screen, c))) { pruned.add(i); pruned_total++; return; }
    for (const c of list) m.set(c, (m.get(c) || 0) + 1);
  });
  return m;
};

/* Text attributed to its OWNING element, so text inside a registered reflow is
 * excused with it instead of reporting forever as drift. */
const textsOf = (frame, screen) => {
  const out = new Set();
  for (const t of frame.texts) {
    const owner = (t.length > 7 ? t[7] : "").split(/\s+/).filter(Boolean);
    if (owner.some((c) => excused(screen, c))) continue;
    const v = (t[0] || "").trim();
    if (v) out.add(v);
  }
  return out;
};

const diff = (a, b) => [...a].filter((x) => !b.has(x));

let nominalFindings = 0, structuralFindings = 0;
let findings = 0, advisory = 0, exempt = 0;
let comparisonsMade = 0, screensCompared = 0;
const screens = new Map();

/* The tall-screen pair is NOT two screens.
 *
 * A hug twin exists because its screen's content exceeds THAT viewport's height: a
 * property of the viewport, not a decision about coverage. Counting each twin as its
 * own screen makes nominal parity report "absent at desktop" for something that has
 * no reason to exist there. A twin folds into its base screen; whether it exists at
 * all is verify-html.mjs's tall-screen-pair check, not parity's. */
const HUG = /\s*·\s*hug\s*$/;
const hugTwins = new Map();

for (const [pkg, frames] of Object.entries(ref.frames)) {
  for (const fr of frames) {
    const base = screenOf(fr);
    if (HUG.test(fr.cap)) {
      const k = `${pkg} :: ${base}`;
      if (!hugTwins.has(k)) hugTwins.set(k, []);
      hugTwins.get(k).push(vpOf(fr));
      continue;
    }
    const key = `${pkg} :: ${base}`;
    if (!screens.has(key)) screens.set(key, {});
    screens.get(key)[vpOf(fr)] = fr;
  }
}

console.log(`viewports declared: ${VIEWPORTS.join(", ")}`);
console.log(`screens found:      ${screens.size}`);
console.log(`reflowNotes:        ${(state.reflowNotes || []).length} entries across ${REFLOW.size} scope(s)`);
console.log(`hug twins:          ${[...hugTwins.values()].reduce((a, v) => a + v.length, 0)} `
          + `across ${hugTwins.size} screen(s) (folded into their base screen)\n`);

for (const [key, byVp] of screens) {
  const present = Object.keys(byVp);
  const screenName = key.split("::")[1].trim();

  /* ---- pass 1: nominal parity ---- */
  const missing = VIEWPORTS.filter((v) => !present.includes(v));
  if (missing.length) {
    const ex = (state.parityExemptions || []).find((e) => e.screen === screenName);
    const excusedAll = ex && missing.every((v) => !(ex.presentAt || []).includes(v));
    if (excusedAll) {
      ok(`ok       ${key}  (absent at ${missing.join(", ")}: recorded decision: ${ex.why})`);
      exempt++;
      continue;
    }
    console.log(`FINDING  ${key}`);
    console.log(`         absent at: ${missing.join(", ")}`
              + `${ex ? " (parityExemptions entry does not cover this)" : " (no parityExemptions entry)"}`);
    findings++; nominalFindings++;
    continue;
  }
  if (present.length < 2) continue;
  screensCompared++;

  /* ---- pass 2: structural parity ----
   * EVERY PAIR OF PRESENT VIEWPORTS, not the first two declared.
   * This read `const [a, b] = VIEWPORTS`, so with three viewports it compared
   * viewport 1 against viewport 2 and never looked at the third — and because it
   * indexed the DECLARED list rather than the ones this screen is actually present
   * at, a screen present at only the second and third was compared using a viewport
   * it does not have. Reproduced: a screen losing its entire sidebar at mobile passed
   * with viewports [desktop, pos, mobile] and failed with [desktop, mobile, pos].
   * Pass or fail was decided by the order of a JSON array. */
  const mismatched = [];
  let pairsCompared = 0;
  for (let i = 0; i < present.length - 1; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i], b = present[j];
      pairsCompared++;
      comparisonsMade++;
      const ca = classesOf(byVp[a], screenName), cb = classesOf(byVp[b], screenName);
      const ta = textsOf(byVp[a], screenName), tb = textsOf(byVp[b], screenName);
      for (const c of new Set([...ca.keys(), ...cb.keys()])) {
        const na = ca.get(c) || 0, nb = cb.get(c) || 0;
        if (na !== nb) mismatched.push(`${c} (${a}=${na}, ${b}=${nb})`);
      }
      advisory += diff(ta, tb).length + diff(tb, ta).length;
    }
  }

  /* Text parity is ADVISORY BY DESIGN, not pending implementation.
   *
   * Owner attribution works, so text inside a registered reflow is already excused.
   * What remains is genuine copy that differs between viewports: a shortened
   * desktop label, a mobile-only hint. Some of that is deliberate and some is a
   * mistake, and nothing measurable tells them apart. Counted and printed so a
   * reviewer can read them; never a finding, because a check that cannot decide
   * must not block. */
  if (!mismatched.length) {
    ok(`ok       ${key}`);
    continue;
  }
  console.log(`FINDING  ${key}`);
  for (const m of mismatched) console.log(`         count mismatch, unregistered: ${m}`);
  findings++; structuralFindings++;
}

/* THE STANDARD DIALECT. This printed `ok` and `FINDING` lines and a prose summary, and
 * never a row the runner could parse — so pica-verify reported "FAIL parity-check
 * 0 finding(s) across 0 check(s)" while the check had found seven. A check whose output
 * the runner cannot read is a check whose result nobody sees, and the runner's own
 * honesty assertion is what caught it. Same shape as flow-check's drift, same fix:
 * `pass|FAIL  <id>  N finding(s)   (scope)`, one row per check, with its denominator. */
console.log("");
for (const [n, c, scope] of [
  ["parity-nominal", nominalFindings, `${screens.size} screen(s) across ${VIEWPORTS.length} declared viewport(s)`],
  ["parity-structural", structuralFindings, `${comparisonsMade} viewport-pair comparison(s) across ${screensCompared} screen(s)`],
]) console.log(`${c ? "FAIL" : "pass"}  ${String(n).padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

/* THE DENOMINATOR. This printed "0 finding(s)" on a project where every screen was
 * excused at pass 1, so the structural pass ran ZERO comparisons — indistinguishable
 * from a clean run over hundreds. A check must say what it measured, not only what it
 * found. */
console.log(`\n${findings} finding(s) over ${comparisonsMade} viewport-pair comparison(s) `
          + `across ${screensCompared} screen(s), ${exempt} recorded parity exemption(s), `
          + `${pruned_total} box(es) pruned by reflowNotes, `
          + `${advisory} attributed text diff(s) (advisory, see notes above).`);
if (!comparisonsMade)
  console.log(`NOTE  the structural pass compared nothing: every screen was either excused or present `
            + `at fewer than two viewports. That is not the same as structural parity holding.`);
process.exit(findings ? 1 : 0);
