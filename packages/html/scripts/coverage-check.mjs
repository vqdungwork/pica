/**
 * coverage-check.mjs — the Analyst-to-Designer link.
 *
 * This check exists because testing the flow on a real project found that the boundary
 * between analysis and design was the one boundary nothing verified. The Analyst
 * produces use cases. The Designer produces screens. Every other artefact in this flow
 * is checked against the one before it; these two were checked against nothing.
 *
 * The failure it prevents is quiet in both directions:
 *
 *   - A use case with no screen is a requirement that was agreed and then not built.
 *     Nobody notices until UAT, because every screen that DOES exist looks fine.
 *   - A screen with no use case is work nobody asked for. It passed every geometric
 *     check, it looks correct, and it is scope that was never sold.
 *
 * Screens declare what they serve with `data-uc="UC-02"`, comma-separated for several.
 * TAGGED, never inferred, for the same reason `data-viewport` is: a caption cannot be
 * parsed reliably, and a fallback that always fires makes the tag inert.
 *
 * Five checks:
 *
 *   1. UC COVERED      every use case has at least one screen serving it.
 *                      PASS: 0 uncovered.
 *   2. SCREEN TRACED   every screen names a use case it serves.
 *                      PASS: 0 untraced.
 *   3. UC EXISTS       every id a screen claims is a real use case.
 *                      PASS: 0 dangling.
 *   4. FLOW REACHABLE  every use case with a screen is reachable at every viewport
 *                      that declares it.  PASS: 0 present at one viewport only.
 *   5. TARGET BUILDABLE every declared build target has the viewports it needs, and a
 *                      native target never claims a desktop one.  PASS: 0 unbuildable.
 *
 * The fifth arrived with build targets and this header was not updated with it, so the
 * file claimed four checks while shipping five. Counted here rather than described,
 * because a header that disagrees with its own code is the drift this repo keeps finding.
 *
 * Contract when the data is thin, following geometry-diff:
 *   no use cases in state  -> NOT APPLICABLE. Pass, and say why.
 *   use cases but no tags  -> FAIL. The link cannot be checked, and a check that
 *                             cannot run is not a pass.
 *
 * Usage: node coverage-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node coverage-check.mjs <html-reference.json> <state.json>");
  process.exit(2);
}

let ref, state;
try {
  ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read or parse an input (${e.message}).`);
  process.exit(2);
}

/* ---- shape guard --------------------------------------------------------- *
 * Feeding these scripts a state file with the right field names and the wrong types made
 * six of them exit on an uncaught TypeError: "glossary.map is not a function". They still
 * failed closed, so no gate was let through, but the person running one got a stack trace
 * instead of a sentence naming the field. A tool that answers a bad input with a stack
 * trace reads as a broken tool, and the next thing that happens is somebody stops running
 * it.
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
  shapeErrors.push(`state.${key} is ${Array.isArray(v) ? "an array" : typeof v}, and this reads it as an array`);
  return [];
};
expectArray("viewports");
expectArray("useCases");
expectArray("targets");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}


const useCases = state.useCases || [];
const vpDefs = state.viewports || [];
const viewports = vpDefs.map((v) => v.name);
/* A project can ship more than one product surface: a responsive website AND a native
 * app are two products, not one product at more sizes. Comparing across them demands
 * that every web screen exist on iOS, which is not a defect, it is a category error.
 * Viewports declare `surface`; anything undeclared is treated as one surface, which is
 * what a single-surface project already is. */
/* One design, three viewports. Implementation TARGETS then choose which viewports they
 * consume: a responsive website takes all three, a native app takes tablet and mobile
 * and never desktop. The surface is a property of the target, not of the viewport, so
 * parity across viewports stays a single-design question and the target decides only
 * what gets built. */
const targets = state.targets || [];


const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {}))
  for (const fr of list) frames.push({ ...fr, pkg });

if (!frames.length) {
  console.error("FAIL  the capture contains no frames. The selectors matched nothing.");
  process.exit(2);
}

/* A hug twin is the same screen shown at full content height, not a second screen. It
 * inherits its base frame's coverage and must not be asked to carry its own tag. */
const HUG = /\s*·\s*hug\s*$/;
const real = frames.filter((f) => !HUG.test(f.cap || ""));

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- applicability ------------------------------------------------------ */
if (!useCases.length) {
  console.log(`frames: ${real.length}`);
  console.log("");
  console.log("pass  uc-covered        n/a   (state.json declares no use cases)");
  console.log("pass  screen-traced     n/a");
  console.log("pass  uc-exists         n/a");
  console.log("pass  flow-reachable    n/a");
  console.log("\n0 finding(s). Coverage not applicable: run /pica-analyse first if this project has requirements.");
  process.exit(0);
}

const tagged = real.filter((f) => Array.isArray(f.uc) && f.uc.length);
if (!tagged.length) {
  console.error(`FAIL  ${useCases.length} use case(s) declared and not one frame carries data-uc.`);
  console.error("      The link between analysis and design cannot be checked, and a check that");
  console.error("      cannot run is not a pass. Tag each screen with the use case it serves,");
  console.error('      or re-capture with a build that does: <div data-viewport="mobile" data-uc="UC-02">');
  process.exit(1);
}

const ucIds = new Set(useCases.map((u) => u.id).filter(Boolean));
const nameOf = new Map(useCases.map((u) => [u.id, u.name || ""]));

/* ---- 1. use case covered ------------------------------------------------ */
const servedBy = new Map();
for (const f of tagged)
  for (const id of f.uc) {
    if (!servedBy.has(id)) servedBy.set(id, []);
    servedBy.get(id).push(f);
  }

let uncovered = 0;
for (const u of useCases) {
  if (!u.id) continue;
  if (!servedBy.has(u.id)) {
    uncovered++;
    fail("uc-covered", u.id,
      `"${nameOf.get(u.id)}" has no screen serving it. It was agreed and not built, and nothing else will notice until UAT`);
  }
}

/* ---- 2. screen traced --------------------------------------------------- */
let untraced = 0;
for (const f of real) {
  if (!Array.isArray(f.uc) || !f.uc.length) {
    untraced++;
    fail("screen-traced", `${f.pkg} :: ${f.cap}`,
      "carries no data-uc. It is either scope nobody asked for, or a use case nobody recorded");
  }
}

/* ---- 3. claimed use case exists ----------------------------------------- */
let dangling = 0;
for (const f of tagged)
  for (const id of f.uc)
    if (!ucIds.has(id)) {
      dangling++;
      fail("uc-exists", `${f.pkg} :: ${f.cap}`,
        `claims ${id}, which is not a use case in state.json. Known: ${[...ucIds].join(", ") || "(none)"}`);
    }

/* ---- 4. reachable at every viewport ------------------------------------- *
 * A use case that exists on desktop and not on mobile is a task a mobile user cannot
 * complete. That is a coverage defect, not a responsive one, so parity-check does not
 * see it: parity compares screens that exist, and this one does not. */
let partial = 0;
if (viewports.length > 1) {
  for (const [id, fs_] of servedBy) {
    if (!ucIds.has(id)) continue;
    const present = new Set(fs_.map((f) => f.viewport).filter(Boolean));
    const absent = viewports.filter((v) => !present.has(v));
    if (present.size && absent.length) {
      partial++;
      fail("flow-reachable", id,
        `"${nameOf.get(id)}" is served at ${[...present].join(", ")} but not at ${absent.join(", ")}. ` +
        `A user on ${absent[0]} cannot complete it. Excuse it in parityExemptions if deliberate`);
    }
  }
}

/* ---- 5. targets are buildable ------------------------------------------- *
 * A target declares which viewports it consumes. A native app takes mobile and tablet
 * and never desktop; a responsive website takes all three. If a target names a viewport
 * that produced no frames, it cannot be built from this design, and that is discovered
 * now rather than in phase 7 by a developer with nothing to work from. */
let unbuildable = 0;
const framedVps = new Set(real.map((f) => f.viewport).filter(Boolean));
for (const t of targets) {
  const kind = t.kind || "(unnamed target)";
  const need = Array.isArray(t.viewports) ? t.viewports : [];
  if (!need.length) {
    unbuildable++;
    fail("target-buildable", kind, "declares no viewports, so nothing says what it is built from");
    continue;
  }
  const missing = need.filter((v) => !framedVps.has(v));
  if (missing.length) {
    unbuildable++;
    fail("target-buildable", kind,
      `consumes ${need.join(", ")} but the design produced no frames at ${missing.join(", ")}. ` +
      "It cannot be built from this design");
  }
  const undeclared = need.filter((v) => !viewports.includes(v));
  if (undeclared.length) {
    unbuildable++;
    fail("target-buildable", kind,
      `consumes ${undeclared.join(", ")}, which is not a declared viewport. Known: ${viewports.join(", ")}`);
  }
}

/* ---- report ------------------------------------------------------------- */
console.log(`use cases declared: ${useCases.length}`);
console.log(`frames (excl. hug): ${real.length}, of which ${tagged.length} tagged`);
console.log(`viewports:          ${viewports.join(", ") || "(none declared)"}`);
console.log(`targets:            ${targets.length ? targets.map((t) => `${t.kind}[${(t.viewports || []).join("+")}]`).join(", ") : "(none declared)"}`);
console.log("");

const table = [
  ["uc-covered", uncovered, `${useCases.length} use cases`],
  ["screen-traced", untraced, `${real.length} frames`],
  ["uc-exists", dangling, `${tagged.length} tagged frames`],
  ["flow-reachable", partial, viewports.length > 1 ? `${viewports.length} viewports` : "1 viewport, not applicable"],
  ["target-buildable", unbuildable, targets.length ? `${targets.length} target(s)` : "no targets declared"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Coverage ${findings.length ? "is NOT complete" : "passes: every use case is built, every screen was asked for"}.`);
process.exit(findings.length ? 1 : 0);
