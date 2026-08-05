/**
 * verify-html.mjs — the measured HTML gate. Runs BEFORE the human is asked to
 * approve a work package, and it is the only verification an HTML-only project
 * (`figmaInScope: false`) ever gets.
 *
 * Reads the artefact produced by capture-html-reference.mjs. No browser, no second
 * render: the capture already measured overflow, content height, the viewport tag
 * and the hug flag, so verifying from the artefact cannot disagree with what was
 * captured.
 *
 * Four checks, each with a stated pass criterion:
 *
 *   1. VIEWPORT TAGGED   every frame carries data-viewport naming a declared
 *                        viewport.  PASS: 0 untagged, 0 unknown names.
 *   2. HORIZONTAL OVERFLOW  nothing extends past the frame's right edge. The frame
 *                        clips it, so it is invisible in a screenshot.
 *                        PASS: 0 frames with overflowX.
 *   3. TALL-SCREEN PAIR  a frame whose content exceeds its viewport height by more
 *                        than HUG_THRESHOLD px has a hug twin, so a reviewer can see
 *                        the clipped remainder.  PASS: 0 unpaired tall frames.
 *   4. VIEWPORT COVERAGE every declared viewport actually produced frames.
 *                        PASS: 0 viewports with no frames.
 *
 * Exit 0 only when every check passes. A check that could not run is a failure, not
 * a pass — see the "green check" rule in review-gates.md.
 *
 * Usage: node verify-html.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node verify-html.mjs <html-reference.json> <state.json>");
  process.exit(2);
}

const ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

/* Content taller than the viewport by less than this is a rounding artefact of a
 * scroll region, not a screen that needs a hug twin. Calibrated on the 0.3.0 spike:
 * real overflows there were 90px and up, sub-pixel noise never exceeded 8px. */
const HUG_THRESHOLD = 24;

const VIEWPORTS = state.viewports || [];
if (!VIEWPORTS.length) {
  console.error("FAIL  state.json declares no viewports. Nothing can be verified.");
  process.exit(2);
}
const VP_NAMES = new Set(VIEWPORTS.map((v) => v.name));
const heightOf = new Map(VIEWPORTS.map((v) => [v.name, v.h]));

const HUG = /\s*·\s*hug\s*$/;

/* Flatten every captured frame, keeping its package for reporting. */
const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {})) {
  for (const fr of list) frames.push({ ...fr, pkg });
}
if (!frames.length) {
  console.error("FAIL  the capture contains no frames. The selectors matched nothing.");
  process.exit(2);
}

const findings = [];
const fail = (check, frame, detail) =>
  findings.push({ check, where: `${frame.pkg} :: ${frame.cap}`, detail });

/* ---- 1. viewport tagged ------------------------------------------------- *
 * The tag exists so nothing downstream has to infer the viewport from frame
 * width or parse it out of a caption. Both inferences were wrong in practice:
 * width collides once two viewports share a width, and pica's naming convention
 * puts "·" inside screen names. An untagged frame is a finding rather than a
 * silent fallback, because a fallback that always fires makes the tag inert. */
let untagged = 0;
for (const f of frames) {
  if (!f.viewport) {
    untagged++;
    fail("viewport-tagged", f, `no data-viewport attribute (frame is ${f.w}px wide)`);
  } else if (!VP_NAMES.has(f.viewport)) {
    untagged++;
    fail("viewport-tagged", f,
      `data-viewport="${f.viewport}" is not a declared viewport (declared: ${[...VP_NAMES].join(", ")})`);
  }
}

/* ---- 2. horizontal overflow -------------------------------------------- */
let overflowing = 0;
for (const f of frames) {
  if (f.overflowX) {
    overflowing++;
    fail("overflow", f, `content extends ${f.overflowX.px}px past the right edge, worst offender "${f.overflowX.node}"`);
  }
}

/* ---- 3. tall-screen pair ------------------------------------------------ *
 * Fold hug twins onto their base screen first, then ask of each base frame:
 * does its content exceed the viewport, and if so does a twin exist at the same
 * viewport? A twin is not a separate screen and must not be counted as coverage. */
const twins = new Set();
for (const f of frames) {
  if (HUG.test(f.cap)) twins.add(`${f.pkg} :: ${f.cap.replace(HUG, "").trim()} @ ${f.viewport}`);
}
let unpaired = 0, tall = 0;
for (const f of frames) {
  if (HUG.test(f.cap)) continue;
  if (f.contentH == null) continue;       // no scroll region: nothing to clip
  const vpH = heightOf.get(f.viewport);
  if (vpH == null) continue;              // already reported by check 1
  const over = f.contentH - vpH;
  if (over <= HUG_THRESHOLD) continue;
  tall++;
  if (!twins.has(`${f.pkg} :: ${f.cap.trim()} @ ${f.viewport}`)) {
    unpaired++;
    fail("tall-screen-pair", f,
      `content is ${f.contentH}px against a ${vpH}px viewport (+${over}px clipped) and has no "· hug" twin`);
  }
}

/* ---- 4. viewport coverage ---------------------------------------------- */
let uncovered = 0;
const seen = new Map();
for (const f of frames) seen.set(f.viewport, (seen.get(f.viewport) || 0) + 1);
for (const v of VIEWPORTS) {
  if (!seen.get(v.name)) {
    uncovered++;
    findings.push({ check: "viewport-coverage", where: v.name,
      detail: `declared ${v.w}x${v.h} but the capture produced no frames for it` });
  }
}

/* ---- report ------------------------------------------------------------- */
console.log(`frames captured:    ${frames.length} across ${Object.keys(ref.frames).length} package(s)`);
console.log(`viewports declared: ${VIEWPORTS.map((v) => `${v.name} ${v.w}x${v.h}`).join(", ")}`);
console.log(`frames per viewport: ${[...seen].map(([k, n]) => `${k}=${n}`).join(", ")}`);
console.log(`hug twins:          ${twins.size}`);
console.log("");

const table = [
  ["viewport-tagged", untagged, `${frames.length} frames checked`],
  ["overflow", overflowing, `${frames.length} frames checked`],
  ["tall-screen-pair", unpaired, `${tall} frames exceed their viewport by >${HUG_THRESHOLD}px`],
  ["viewport-coverage", uncovered, `${VIEWPORTS.length} viewports declared`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(18)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). HTML ${findings.length ? "is NOT ready for approval" : "passes the measured gate"}.`);
process.exit(findings.length ? 1 : 0);
