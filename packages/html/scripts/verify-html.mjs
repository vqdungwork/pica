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
 * Five checks, each with a stated pass criterion:
 *
 *   1. VIEWPORT TAGGED    every frame carries data-viewport naming a declared viewport.
 *                        PASS: 0 untagged.
 *   2. OVERFLOW           nothing extends past the frame's right edge. The frame clips it,
 *                        so it is invisible in a screenshot.  PASS: 0.
 *   3. TALL-SCREEN PAIR   a frame whose content exceeds its viewport height by more than
 *                        the tolerance ships a scrolled twin.  PASS: 0 unpaired.
 *   4. VIEWPORT COVERAGE  every declared viewport actually produced frames.  PASS: 0 empty.
 *   5. DIRECTION          the built screens honour the direction's asserted numbers, or the
 *                        direction is declared null with a reason.  PASS: 0 over.
 *   6. DATA OWNERSHIP     a region the brief declares read-only contains no control a person
 *                        can type into.  PASS: 0, or the register says why it cannot be checked.
 *   7. WIDTH MEDIA        no width-based @media rule, which this harness cannot measure and
 *                        which therefore makes every check below it wrong.  PASS: 0.
 *
 * The name in this list is the name the report prints, so a finding can be grepped straight
 * back to the paragraph that explains it. "HORIZONTAL OVERFLOW" here and `overflow` in the
 * output was two vocabularies for one check.
 *
 * Exit 0 only when every check passes. A check that could not run is a failure, not
 * a pass — see the "green check" rule in the core package's review-discipline.md.
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
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  console.error("      Nothing below this was checked, and that is not a pass.");
  process.exit(2);
}


/* Content taller than the viewport by less than this is a rounding artefact of a
 * scroll region, not a screen that needs a hug twin. Calibrated rather than chosen:
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

/* ---- 5. direction adherence --------------------------------------------- *
 * The first four checks measure whether the screen is built correctly. This one
 * measures whether it is built to the design system that was chosen, which is a
 * different question and invisible to all of them: a screen can be tagged, in
 * bounds, paired and covered, and still spend eight hues on a product whose
 * direction budgeted three.
 *
 * A direction is only checkable because it was written down as numbers at step
 * 2c. Findings are reported ONE PER VIOLATING VALUE, not one per frame — a single
 * wrong token appears on every screen that uses it, and forty identical lines bury
 * the one value anybody has to change.
 *
 * The contract when the data is thin, learned from geometry-diff in 0.7.1:
 *   no direction declared      -> not applicable. Pass, and say why.
 *   declared, but no census    -> FAIL. A check that cannot run is not a pass.
 */
const DIRECTION = state.direction || null;
let dirFindings = 0, dirScope;

/* Frame lists get long and add nothing after the first few: the point of the
 * finding is the value, and the frames are only there to find it. */
const nameOf = (f) => `${f.pkg} :: ${f.cap}`;
const listFrames = (set) => {
  const all = [...set];
  return all.length <= 6 ? all.join(", ") : `${all.slice(0, 6).join(", ")} +${all.length - 6} more`;
};

if (!DIRECTION) {
  dirScope = "no direction in state.json";
} else if (frames.some((f) => !f.census)) {
  const stale = frames.filter((f) => !f.census).length;
  dirScope = `${stale} of ${frames.length} frames carry no census`;
  dirFindings = 1;
  findings.push({ check: "direction", where: "the capture",
    detail: `state.json declares direction "${DIRECTION.name || "(unnamed)"}" but ${stale} frame(s) ` +
            `were captured without a census, so nothing about it can be measured. Re-run ` +
            `capture-html-reference.mjs — a direction cannot be verified from a pre-0.8.0 capture.` });
} else {
  /* ---- a declared style must not contradict its own signature ----------------
   * design-vocabulary.md says "a declared style adds checks to direction.assert.
   * Declare neobrutalism and a blurred shadow becomes a violation." Nothing added them,
   * and nothing compared the two: `style: "neobrutalism"` with `shadow.blur.max: 12` was
   * a direction contradicting its own name, and every screen passed it.
   *
   * This does not GENERATE the assertions — that would put the check in the business of
   * choosing, and the vocabulary file is explicit that the table is for recognising and
   * naming, never for choosing. It reports a declared style whose assertions say the
   * opposite of what the style means, and a style name that belongs to no tradition.
   *
   * The second one earned itself. A direction on this project was once named for a
   * quality rather than a tradition, which meant nobody could look it up, compare it, or
   * measure a product against it. A name outside the vocabulary is that failure. */
  const SIGNATURE = {
    flat:            { "shadow.blur.max": ["<=", 0, "flat means no shadow at all"] },
    material:        {},
    skeuomorphism:   {},
    neumorphism:     {},
    glassmorphism:   {},
    neobrutalism:    { "shadow.blur.max": ["<=", 0, "neobrutalism's shadows are hard offsets with zero blur"] },
    minimalism:      { "hue.count.max": ["<=", 4, "minimalism is few hues doing a lot of work"],
                       "type.roles.max": ["<=", 3, "one or two type roles carry a minimalist page"] },
    maximalism:      { "hue.count.max": [">=", 5, "a maximalist palette capped at three hues is not maximalist"] },
    editorial:       {},
    international:   { "hue.count.max": ["<=", 4, "the Swiss tradition runs a tight hue budget"] },
    swiss:           { "hue.count.max": ["<=", 4, "the Swiss tradition runs a tight hue budget"] },
  };
  const styleName = String(DIRECTION.style || "").toLowerCase().trim();
  if (styleName) {
    const sig = SIGNATURE[styleName];
    if (!sig) {
      findings.push({ check: "direction", where: `direction.style "${DIRECTION.style}"`,
        detail: "names no tradition in design-vocabulary.md, so nobody can look it up, compare a " +
                "product to it, or measure against it. Known: " + Object.keys(SIGNATURE).join(", ") });
    } else {
      const AA = DIRECTION.assert || {};
      for (const [claim, [op, want, why]] of Object.entries(sig)) {
        if (!(claim in AA)) continue;   // absent is the author's call; contradiction is not
        const got = Number(AA[claim]);
        const ok = op === "<=" ? got <= want : got >= want;
        if (!ok)
          findings.push({ check: "direction", where: `direction.style "${styleName}"`,
            detail: `asserts ${claim} = ${got}, and ${why}. The direction contradicts the tradition it names` });
      }
    }
  }

  const A = DIRECTION.assert || {};
  const label = DIRECTION.name || "(unnamed)";
  const asserted = Object.keys(A).length;
  /* The style clause is optional, so it is silent on most projects. Saying so is the
   * difference between "checked and clean" and "never ran", which this repository has
   * confused often enough to make a habit of stating it. */
  const styleNote = styleName
    ? `, style "${styleName}" checked against its signature`
    : ", no style declared, so nothing was checked against a tradition";
  dirScope = (asserted
    ? `direction "${label}", ${asserted} assertion(s)`
    : `direction "${label}" asserts nothing measurable`) + styleNote;

  /* A direction that declares no assertions is a paragraph, not a constraint. It
   * is not a failure — some projects genuinely settle only on tone — but it must
   * not read as a green check either, so it reports as a finding of its own. */
  if (!asserted) {
    dirFindings++;
    findings.push({ check: "direction", where: `direction "${label}"`,
      detail: `declares no "assert" block, so the direction cannot be checked and every screen ` +
              `passes it by default. Give it the numbers it was chosen for, or drop it.` });
  }

  /* radius.max — the single value that most decides whether a product reads as a
   * bank or as a toy, and the easiest to leak past a kit via a hardcoded corner. */
  if (typeof A["radius.max"] === "number") {
    const bad = new Map();
    for (const f of frames)
      for (const [px, n] of f.census.radii)
        if (px > A["radius.max"]) {
          if (!bad.has(px)) bad.set(px, { frames: new Set(), n: 0 });
          bad.get(px).frames.add(nameOf(f));
          bad.get(px).n += n;
        }
    for (const [px, hit] of [...bad].sort((a, b) => b[0] - a[0])) {
      dirFindings++;
      findings.push({ check: "direction", where: `radius ${px}px`,
        detail: `direction "${label}" caps corner radius at ${A["radius.max"]}px. ` +
                `${px}px is used ${hit.n} time(s) in ${hit.frames.size} frame(s): ${listFrames(hit.frames)}` });
    }
  }

  /* Control height is density made measurable. Both bounds exist because the two
   * directions that care about it want opposite things: a field tool needs a
   * floor under its touch targets, a dense console needs a ceiling on its rows. */
  for (const [key, cmp, word] of [
    ["control.height.min", (h, lim) => h < lim, "at least"],
    ["control.height.max", (h, lim) => h > lim, "at most"],
  ]) {
    if (typeof A[key] !== "number") continue;
    const bad = new Map();
    for (const f of frames)
      for (const h of f.census.controlH)
        if (cmp(h, A[key])) {
          if (!bad.has(h)) bad.set(h, new Set());
          bad.get(h).add(nameOf(f));
        }
    for (const [h, where] of [...bad].sort((a, b) => a[0] - b[0])) {
      dirFindings++;
      findings.push({ check: "direction", where: `control ${h}px tall`,
        detail: `direction "${label}" requires controls ${word} ${A[key]}px. ` +
                `${h}px appears in ${where.size} frame(s): ${listFrames(where)}` });
    }
  }

  /* Hues are counted across the WHOLE capture, never per frame. A three-hue budget
   * spent one hue per screen is still three; scoring each frame alone would call
   * that a pass and let the palette sprawl one screen at a time. */
  if (typeof A["hue.count.max"] === "number") {
    const union = new Set();
    const byHue = new Map();
    for (const f of frames)
      for (const h of f.census.hues) {
        union.add(h);
        if (!byHue.has(h)) byHue.set(h, new Set());
        byHue.get(h).add(nameOf(f));
      }
    if (union.size > A["hue.count.max"]) {
      dirFindings++;
      const listed = [...union].sort((a, b) => a - b)
        .map((h) => `${h}° (${byHue.get(h).size} frame${byHue.get(h).size === 1 ? "" : "s"})`).join(", ");
      findings.push({ check: "direction", where: `${union.size} hues`,
        detail: `direction "${label}" budgets ${A["hue.count.max"]} hue(s); the capture spends ` +
                `${union.size}: ${listed}. Hues are 30° buckets over non-neutral colour, so this counts ` +
                `distinct colours, not shades.` });
    }
  }

  /* Tabular figures. Only asserted true is meaningful — no direction requires that
   * numbers must NOT align — so a false or absent value simply does not check. */
  /* shadow.blur.max, type.roles.max and motion.easing.linear were declarable, named in the
   * style signature table, and evaluated by NOTHING: the census carried no shadow, no
   * easing, and nobody counted type roles. `shadow.blur.max: 0` beside a blurred shadow
   * passed every gate, and the style check above reads that same key to detect a
   * contradiction, which implied an enforcement that did not exist. */
  if (typeof A["shadow.blur.max"] === "number") {
    const bad = new Map();
    for (const f of frames)
      for (const px of (f.census.shadowBlur || []))
        if (px > A["shadow.blur.max"]) bad.set(px, (bad.get(px) || new Set()).add(nameOf(f)));
    for (const [px, fr] of [...bad].sort((x, y) => y[0] - x[0])) {
      dirFindings++;
      findings.push({ check: "direction", where: `shadow blur ${px}px`,
        detail: `direction "${label}" caps shadow blur at ${A["shadow.blur.max"]}px. ` +
                `${px}px appears in ${fr.size} frame(s): ${listFrames(fr)}` });
    }
  }

  /* A type role is a distinct size and weight pair. design-vocabulary.md is explicit that
   * typography is recorded by role and never as bare sizes, and this is the same rule
   * turned on our own build rather than on a competitor's. */
  if (typeof A["type.roles.max"] === "number") {
    const roles = new Set();
    for (const f of frames)
      for (const t of f.texts || []) roles.add(`${t[5]}/${t[6]}`);
    if (roles.size > A["type.roles.max"]) {
      dirFindings++;
      findings.push({ check: "direction", where: `${roles.size} type roles`,
        detail: `direction "${label}" allows ${A["type.roles.max"]}. The capture uses ` +
                `${[...roles].sort().join(", ")}, counted as distinct size and weight pairs` });
    }
  }

  if (A["motion.easing.linear"] === false) {
    const bad = new Map();
    for (const f of frames)
      for (const e of (f.census.easings || []))
        if (/^linear$/i.test(e.trim())) bad.set(e, (bad.get(e) || new Set()).add(nameOf(f)));
    for (const [e, fr] of bad) {
      dirFindings++;
      findings.push({ check: "direction", where: `easing ${e}`,
        detail: `direction "${label}" rules out linear timing, and every motion guideline agrees: ` +
                `entering uses ease-out, exiting ease-in, state changes ease-in-out. In ${listFrames(fr)}` });
    }
  }

  /* An assertion nobody can evaluate is worse than an absent one: it reads as a constraint
   * and constrains nothing. Three of them sat in this file's own vocabulary for two
   * releases. Anything unrecognised is now reported rather than skipped. */
  const KNOWN = new Set(["radius.max", "control.height.min", "control.height.max",
    "hue.count.max", "numerals.tabular", "shadow.blur.max", "type.roles.max",
    "motion.easing.linear"]);
  for (const k of Object.keys(A)) {
    if (KNOWN.has(k)) continue;
    dirFindings++;
    findings.push({ check: "direction", where: `assert "${k}"`,
      detail: `is declared and nothing evaluates it, so it constrains nothing while reading as a ` +
              `constraint. Measurable today: ${[...KNOWN].join(", ")}` });
  }

  if (A["numerals.tabular"] === true) {
    const bad = new Set();
    let short = 0;
    for (const f of frames) {
      const { runs, tabular } = f.census.numerals;
      if (runs > 0 && tabular < runs) { bad.add(nameOf(f)); short += runs - tabular; }
    }
    if (bad.size) {
      dirFindings++;
      findings.push({ check: "direction", where: `${short} numeric run(s)`,
        detail: `direction "${label}" requires tabular figures. ${short} run(s) across ${bad.size} ` +
                `frame(s) render with proportional figures: ${listFrames(bad)}. ` +
                `Set font-variant-numeric: tabular-nums in the kit, not on the screens.` });
    }
  }
}

/* ---- 6. data ownership --------------------------------------------------- *
 * research.md carries a table with a column headed "Enforced by", and this row said
 * "no editable control inside the declared read-only regions". Nothing enforced it for
 * three releases. That is worse than an unwritten rule: an unwritten rule is honestly
 * absent, while a table claiming enforcement stops anyone looking for the executable.
 *
 * It could not be enforced because the register named an ENTITY in prose, and prose is
 * not a region. `region` is the missing half: the class that marks where that entity is
 * shown. An entry without one is reported as unenforceable, never as clean. */
const OWN = state.dataOwnership || [];
const EDITABLE = new Set(["input", "textarea", "select", "button"]);
let ownViolations = 0, ownUncheckable = 0, ownRegions = 0;

for (const o of OWN) {
  const surface = String(o.thisSurface || "").toLowerCase();
  const readOnly = /^\s*(read|read-only|readonly|view)\s*$/.test(surface);
  if (!readOnly) continue;
  const region = String(o.region || "").trim();
  if (!region) {
    ownUncheckable++;
    findings.push({ check: "data-ownership", where: o.entity || "(unnamed entity)",
      detail: 'declared read-only on this surface with no `region`, so nothing can locate it. ' +
           'Name the class that marks where this entity is shown, or the rule is a preference' });
    continue;
  }
  ownRegions++;
  for (const f of frames) {
    const boxes = f.boxes || [];
    /* A box is inside the region when the region is anywhere up its parent chain. */
    const inRegion = new Set();
    boxes.forEach((b, i) => {
      const cls = String(b[0] || "");
      if (cls.split(/\s+/).includes(region)) inRegion.add(i);
    });
    if (!inRegion.size) continue;
    /* Controls come from their own array, not from boxes. boxes holds only classed
     * elements and an <input> often has none, which is why the first version of this
     * check found nothing on a page that had one. */
    const inside = (idx) => {
      let p = idx, hops = 0;
      while (p >= 0 && hops++ < 40) {
        if (inRegion.has(p)) return true;
        p = (boxes[p] || [])[6] ?? -1;
      }
      return false;
    };
    for (const c of f.controls || []) {
      const tag = String(c[0] || "");
      if (!EDITABLE.has(tag)) continue;
      if (!inside(c[5])) continue;
      ownViolations++;
      findings.push({ check: "data-ownership", where: `${f.cap} :: .${region}`,
        detail: `a <${tag}> sits inside a region declared read-only for "${o.entity}". ` +
                `${o.why ? o.why + ". " : ""}The person can edit what the brief says they cannot` });
    }
  }
}

/* ---- 7. width media ------------------------------------------------------ *
 * Every frame is laid out in ONE browser window, so a width @media either fires for all
 * of them or for none. A prototype using one looks correct in a browser and is measured
 * against the wrong layout by this file, by parity-check and by build-diff, all three
 * reporting clean. html-prototype.md has said "responsive is @container, never a width
 * @media" since 0.4.0, with nothing enforcing it, which is this project's own definition
 * of a preference. */
const WM = ref.widthMedia;
let widthMedia = 0;
for (const t of WM || []) {
  widthMedia++;
  findings.push({ check: "width-media", where: "@media " + t,
    detail: "a width-based media query. Every frame is captured in one browser window, so this fires " +
            "for all frames or none, and the measurement below it describes a layout nobody will see. " +
            "Use @container, which resolves against the frame" });
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
  ["width-media", widthMedia, WM === undefined ? "capture predates this check, so not measured. That is not a pass" : ((WM || []).length + " width @media rule(s)")],
  ["data-ownership", ownViolations + ownUncheckable,
      OWN.length ? (ownRegions ? `${ownRegions} read-only region(s)` : "declared, none locatable") : "not declared, so not checked. That is not the same as passing it"],
  ["direction", dirFindings, dirScope],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(18)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). HTML ${findings.length ? "is NOT ready for approval" : "passes the measured gate"}.`);
process.exit(findings.length ? 1 : 0);
