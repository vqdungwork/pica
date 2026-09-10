/**
 * spacing-check.mjs: the gaps. Runs with the HTML gate, before approval.
 *
 * pica measured overflow, and it measured spacing LITERALS in source text, and between
 * those two it never measured the thing a person actually sees: how far the content sits
 * from the edge of the screen, and how far apart two things are.
 *
 * The capture has recorded every box as [class, x, y, w, h, depth, parentIdx, tag] since
 * 0.4.0. Everything needed was there and nothing computed it, which is why a screen with
 * a 16px margin could sit beside one with 24px through every green gate in this
 * repository. Nobody sees it on one screen. Everybody sees it on two.
 *
 * A rendered gap is not the same fact as a source literal. `code-tokens-check` reads
 * `padding: 24px` in a stylesheet; a flex container with `justify-content: space-between`
 * produces a gap no literal predicts, and that gap is what the user looks at.
 *
 * Four checks:
 *
 *   1. EDGE INSET     content does not touch the frame edge, and the inset is the same
 *                     across screens at one viewport.  PASS: 0 collisions, 0 disagreements.
 *   2. OFF SCALE      every vertical gap between stacked siblings is on the declared
 *                     spacing scale.  PASS: 0 off-scale gaps.
 *   3. EDGE SCALE     the edge inset itself is on the scale.  PASS: 0.
 *   4. RHYTHM         gaps between consecutive siblings in one stack are consistent.
 *                     PASS: reported, never failed.
 *
 * DELIBERATELY NARROW, because a false positive here is very easy to produce and this
 * repository has a rule about it. It measures only VERTICAL gaps between siblings that
 * share a parent, sit at the same depth, and do not overlap horizontally. Two boxes side
 * by side in a row have a horizontal gap that flexbox distributes, and reporting those
 * would flood the output on every well-built page.
 *
 * WHAT IT CANNOT DO: judge whether a gap is the RIGHT size. 24px where the design wanted
 * 32px is on the scale and wrong, and nothing here can see that. It finds gaps that are
 * on no scale at all, and edges that disagree with each other.
 *
 * Usage: node spacing-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node spacing-check.mjs <html-reference.json> <state.json>");
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

const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {}))
  for (const f of list) frames.push({ ...f, pkg });

if (!frames.length) {
  console.error("FAIL  the capture contains no frames. The selectors matched nothing.");
  process.exit(2);
}
if (!frames.some((f) => (f.layout || []).length)) {
  console.error("FAIL  no frame carries a `layout` array, so no gap could be measured.");
  console.error("      This capture predates it. Measuring a gap needs EVERY sibling, and `boxes` holds");
  console.error("      only the classed ones: a table of 24 rows where 3 carry a class reports those 3");
  console.error("      as adjacent. Re-capture before reading any result here:");
  console.error("      a spacing report over zero boxes would pass while measuring nothing.");
  process.exit(2);
}

/* ---- the scale ----------------------------------------------------------- *
 * From the token file when the project has one, because that is the same source
 * code-tokens-check reads and two scales that disagree is worse than one. */
let scale = new Set();
let scaleFrom = "";
const tokenPath = (state.tokensPath || "tokens/tokens.json");
try {
  const t = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  /* A SPACING token, not every px token. The first cut took all of them and pulled in
   * --row-h-counter, --control-h, --tap-min and --content-max, so the "scale" it compared
   * gaps against was a list of control heights. It then reported 201 findings on 227 gaps,
   * which is the false-positive flood this file's own docblock warns about.
   *
   * Named, not inferred: a token's name is the only place its ROLE is recorded, and a 40px
   * spacing step and a 40px row height are indistinguishable by value. */
  const SPACING_NAME = /^--(s|sp|space|spacing|gap|gutter|inset|pad|padding|margin)([-_]|$)/i;
  const SIZE_NAME = /(^|[-_])(h|w|height|width|max|min|size|radius|r)([-_]|$)/i;
  for (const [k, v] of Object.entries(t)) {
    if (!SPACING_NAME.test(k) || SIZE_NAME.test(k)) continue;
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim());
    if (m) scale.add(Math.abs(Math.round(Number(m[1]))));
  }
  scaleFrom = scale.size
    ? `${scale.size} step(s) from the spacing tokens in ${tokenPath}`
    : `${tokenPath} has no token named for spacing (--s-*, --space-*, --gap-*). Checks 2 and 3 did NOT run`;
} catch {
  /* No token file. A declared scale in state is the fallback; without either, checks 2
   * and 3 cannot run and say so rather than passing. */
  for (const v of (state.spacingScale || [])) scale.add(Math.abs(Math.round(Number(v))));
  scaleFrom = scale.size
    ? `${scale.size} px step(s) from state.spacingScale`
    : `no scale: ${tokenPath} is absent and state.spacingScale is empty. Checks 2 and 3 did NOT run`;
}
scale.delete(0);
scale.delete(1);   // a hairline border and a zero are not spacing decisions

/* Registers, for the same reason every other register in this project exists: a
 * deliberate case has to be distinguishable from an oversight. */
const fullBleed = new Set((state.fullBleed || []).map((x) => String(x).trim()));
const gapExemptions = new Map();
for (const g of (state.gapExemptions || []))
  gapExemptions.set(`${g.scope || "*"}|${g.gap}`, g.why || "");

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const TOL = 1;   // subpixel rounding, not a decision

const onScale = (px) => scale.size === 0 || [...scale].some((s) => Math.abs(s - px) <= TOL);
const exempted = (scope, px) =>
  gapExemptions.has(`${scope}|${px}`) || gapExemptions.has(`*|${px}`);

/* ---- measure ------------------------------------------------------------- */
let collisions = 0, edgeDisagree = 0, offScale = 0, edgeOffScale = 0, ragged = 0;
let gapsMeasured = 0, framesMeasured = 0;
const insetByViewport = new Map();   // viewport -> Map(inset -> [captions])

for (const f of frames) {
  /* `layout` for gaps, because it holds every block-level element. `boxes` holds only the
   * classed ones, and a gap measured across an absent sibling is not a gap. */
  const boxes = f.layout || [];
  if (!boxes.length) continue;
  framesMeasured++;
  const vp = f.viewport || "?";
  const where = `${f.pkg} :: ${f.cap}`;

  /* ---- 1a. edge collision ---- *
   * The outermost content, not the frame's own wrapper. A box that spans the full frame
   * width IS the wrapper or a deliberate full-bleed band, and neither is a collision. */
  const inner = boxes.filter((b, i) => { b.__i = i; return b[3] < (f.w || Infinity) - 2 && b[4] > 2; });
  if (!inner.length) continue;

  /* Excusing a full-bleed component has to excuse what is INSIDE it. A table registered
   * as full-bleed still has rows, and the rows carry the table's class on none of them:
   * the first version dropped `.q` and kept its 24 `<tr>` children, all sitting at the
   * frame edge, and reported the register as having no effect. parity-check learned the
   * same lesson about reflowNotes and its descendants (F11). */
  const isBleed = (i, seen = 0) => {
    if (i < 0 || i >= boxes.length || seen > 32) return false;
    const cls = String(boxes[i][0] || "");
    if (cls.split(/\s+/).some((c) => fullBleed.has(c))) return true;
    return isBleed(boxes[i][6], seen + 1);
  };
  const bleedFree = inner.filter((b) => {
    const cls = String(b[0] || "");
    if (cls.split(/\s+/).some((c) => fullBleed.has(c))) return false;
    return !isBleed(b[6]);
  });
  if (!bleedFree.length) continue;

  const left = Math.round(Math.min(...bleedFree.map((b) => b[1])));
  const right = Math.round(Math.min(...bleedFree.map((b) => (f.w || 0) - (b[1] + b[3]))));
  const inset = Math.min(left, right);

  if (inset <= 0) {
    collisions++;
    fail("edge-inset", where,
      `content reaches the frame edge (${inset}px). Either it is deliberately full-bleed, in which ` +
      `case add its class to state.fullBleed, or the screen has no margin and every one beside it does`);
  } else {
    if (!insetByViewport.has(vp)) insetByViewport.set(vp, new Map());
    const m = insetByViewport.get(vp);
    if (!m.has(inset)) m.set(inset, []);
    m.get(inset).push(f.cap);

    /* ---- 3. the edge inset is on the scale ---- */
    if (scale.size && !onScale(inset) && !exempted(f.cap, inset)) {
      edgeOffScale++;
      fail("edge-scale", where,
        `the edge inset is ${inset}px, which is on no step of the spacing scale (${[...scale].sort((a, b) => a - b).join(", ")}). ` +
        `A margin nobody chose is a margin nobody can change consistently`);
    }
  }

  /* ---- 2 and 4. gaps between stacked siblings ---- *
   * Vertical only, same parent, same depth, no horizontal overlap gap. Two boxes side by
   * side have a horizontal gap flexbox distributes, and reporting those would flood the
   * output on every well-built page. */
  /* LAYOUT siblings only. The first cut measured every classed box, and 126 of the 160
   * boxes on one frame were spans: it was measuring the leading between two words in a
   * flex row and calling it a spacing decision.
   *
   * A gap is a spacing decision when both sides are things a designer POSITIONED: a
   * block-level element, tall enough to be a band rather than a line of text, and wide
   * enough to be part of the stack rather than a fragment inside it. */
  const MIN_H = 16;      // a line of text is smaller than this; a band is not
  const MIN_W_FRAC = 0.4;  // a fragment inside a row is narrower than this

  const byParent = new Map();
  boxes.forEach((b, i) => {
    if (b[4] < MIN_H) return;
    const key = `${b[6]}|${b[5]}`;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push({ i, cls: b[0], tag: b[7], x: b[1], y: b[2], w: b[3], h: b[4] });
  });

  for (const [key, sibs] of byParent) {
    if (sibs.length < 2) continue;
    const widest = Math.max(...sibs.map((s) => s.w));
    const stacked = sibs
      .filter((s) => s.w >= widest * MIN_W_FRAC)
      .sort((a, b) => a.y - b.y);
    const runs = [];
    for (let k = 1; k < stacked.length; k++) {
      const a = stacked[k - 1], b = stacked[k];
      /* Must actually be stacked: overlapping horizontally and not overlapping vertically. */
      /* Genuinely stacked: they share most of their horizontal extent. Two boxes
       * side by side have a gap flexbox distributes, and it is not a decision anyone made
       * in a token. */
      const shared = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapsX = shared > Math.min(a.w, b.w) * 0.6;
      const gap = Math.round(b.y - (a.y + a.h));
      if (!overlapsX || gap < 0) continue;
      if (gap === 0) continue;   // flush by design is a layout decision, not a gap
      gapsMeasured++;
      runs.push(gap);
      if (scale.size && !onScale(gap) && !exempted(f.cap, gap)) {
        offScale++;
        fail("off-scale", `${where} :: ${a.cls || a.i} to ${b.cls || b.i}`,
          `${gap}px gap, which is on no step of the spacing scale (${[...scale].sort((a2, b2) => a2 - b2).join(", ")}). ` +
          `A gap the scale does not contain came from somewhere nobody decided`);
      }
    }
    /* ---- 4. rhythm, reported and never failed ---- *
     * A stack whose gaps vary is very often correct: a heading sits closer to its own
     * paragraph than to the next section, and that is good typography rather than a
     * defect. Failing it would be a false positive on every well-set page. */
    if (runs.length >= 3) {
      const uniq = new Set(runs);
      if (uniq.size > 2) ragged++;
    }
  }
}

/* ---- 1b. the insets agree across screens at one viewport ---- */
for (const [vp, m] of insetByViewport) {
  if (m.size <= 1) continue;
  const sorted = [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  const [common, commonCaps] = sorted[0];
  for (const [inset, caps] of sorted.slice(1)) {
    edgeDisagree++;
    fail("edge-inset", `${vp}`,
      `${caps.length} screen(s) sit ${inset}px from the edge and ${commonCaps.length} sit ${common}px. ` +
      `Nobody sees this on one screen and everybody sees it on two: ${caps.slice(0, 3).join(", ")}` +
      `${caps.length > 3 ? ` +${caps.length - 3} more` : ""}`);
  }
}

/* ---- report -------------------------------------------------------------- */
console.log(`frames measured:  ${framesMeasured} of ${frames.length}`);
console.log(`gaps measured:    ${gapsMeasured}`);
console.log(`spacing scale:    ${scaleFrom}`);
console.log(`full-bleed:       ${fullBleed.size} class(es) registered`);
console.log(`gap exemptions:   ${gapExemptions.size}`);
console.log("");

const table = [
  ["edge-inset", collisions + edgeDisagree,
    `${framesMeasured} frames, ${insetByViewport.size} viewport(s)`],
  ["off-scale", offScale, scale.size ? `${gapsMeasured} gaps` : "NOT RUN, no scale"],
  ["edge-scale", edgeOffScale, scale.size ? `${framesMeasured} frames` : "NOT RUN, no scale"],
  ["rhythm", 0, `${ragged} stack(s) with varying gaps, reported only`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(12)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!scale.size)
  console.log(`\nNOTE  ${scaleFrom}\n      That is not the same as passing them.`);
if (ragged)
  console.log(`\nNOTE  ${ragged} stack(s) have more than two distinct gaps. Often correct: a heading sits\n` +
              "      closer to its own paragraph than to the next section. Worth a look, never a failure.");

console.log("\nNOTE  this cannot tell you a gap is the RIGHT size. 24px where the design wanted 32px is");
console.log("      on the scale and wrong, and nothing here can see it. Render it and look.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Spacing ${findings.length ? "is NOT ready for approval" : "is on the scale it declared"}.`);
process.exit(findings.length ? 1 : 0);
