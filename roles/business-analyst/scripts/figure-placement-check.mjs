#!/usr/bin/env node
// A diagram that was rendered and never placed is a diagram nobody drew. The generator reports
// "wrote 7 diagram(s)" and every check passes, while the reader opens the page and sees six.
//
// This closes the gap between producing a figure and putting it in front of someone.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const page = process.argv[2] ?? "docs/spec/index.html";
const dir = process.argv[3] ?? "docs/spec/diagrams";
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!existsSync(page)) {
  console.log(`figure-placement-check: ${page} does not exist yet — nothing to place into`);
  process.exit(0);
}
if (!existsSync(dir)) {
  console.log(`figure-placement-check: ${dir} does not exist yet — no figures rendered`);
  process.exit(0);
}

const html = readFileSync(page, "utf8");
const svgs = readdirSync(dir).filter((f) => f.endsWith(".svg"));
if (!svgs.length) fail("no-figures", `${dir} holds no diagram, so the document is text alone`);

// a figure is placed either by reference (<img src>) or by being inlined; for the inline case the
// diagram's own title is what proves it, since the SVG source is rewritten on the way in
for (const f of svgs) {
  const name = basename(f, ".svg");
  const src = readFileSync(join(dir, f), "utf8");
  const title = (src.match(/<title[^>]*>([^<]+)<\/title>/) || src.match(/font-weight="[67]\d\d"[^>]*>([^<]{6,})</) || [])[1];
  const placed = html.includes(f) || html.includes(`data-figure="${name}"`) || (title && html.includes(title.trim()));
  if (!placed)
    fail("figure-rendered-but-not-placed",
      `${f} was rendered and the assembled page does not show it. Either place it or stop generating it`);
}

// Placed is not the same as legible. An SVG wider than the column it sits in is scaled down by the
// browser, and its type shrinks with it: a 968px drawing in a 932px column keeps its 11px labels at
// 10.6px, while a 1538px one drops them to 6.7px and the figure becomes a grey texture. This is how
// a diagram passes every check and still tells the reader nothing.
//
// The threshold is 9px because that is roughly where Vietnamese diacritics stop resolving.
const COLUMN = Number(process.env.PICA_FIGURE_COLUMN ?? 900);
/* The narrow case has to be measured too, and was not. Everything about this figure was verified
   at 900px and the same drawing rendered its labels at 3.7px in a phone column — a check that only
   looks at the width you designed for will never see the width the reader has. A figure that
   cannot fit legibly on a phone must be allowed to scroll inside its own frame; what it must not
   do is shrink into a grey texture. */
const NARROW = Number(process.env.PICA_FIGURE_NARROW ?? 358);
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const w = Number((src.match(/viewBox="0 0 ([\d.]+)/) || [])[1]);
  if (!w) continue;
  const sizes = [...src.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1])).filter((n) => n > 0);
  if (!sizes.length) continue;
  const scale = Math.min(1, COLUMN / w);
  const smallest = Math.min(...sizes) * scale;
  const onPhone = Math.min(...sizes) * Math.min(1, NARROW / w);
  if (onPhone < 9 && !/data-scrolls-when-narrow="yes"/.test(src))
    fail("figure-unreadable-on-a-phone",
      `${f} renders its smallest label at ${onPhone.toFixed(1)}px in a ${NARROW}px column. Let the ` +
      "figure scroll inside its own frame on narrow screens, or split it — do not shrink it into a texture");
  if (smallest < 9)
    fail("figure-too-wide-to-read",
      `${f} is ${Math.round(w)}px wide in a ${COLUMN}px column, so its smallest label renders at ` +
      `${smallest.toFixed(1)}px. Draw it along the page's long axis — down, not across — or split it`);
}

// A generated SVG carries whatever colours the generator wrote. Inlined into a page that has a
// dark theme, a literal hex is a light-mode drawing pasted onto a dark document: #16191d text on
// a #ffffff card, both of which the dark surface then renders as black on black. The page is
// correct, the contrast checks look at CSS and see nothing, and every diagram is unreadable.
//
// The fix is a variable with the light value as its fallback — var(--fig-ink, #16191d) — so the
// host page can retheme it and a standalone .svg still opens correctly. So a bare literal is the
// defect, and a literal inside a var() fallback is not.
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const bare = [...src.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))"/g)]
    .map((m) => m[1])
    // white and black ON a coloured shape are legitimate: they follow that shape, not the theme
    .filter((c) => !/^#(fff|ffffff|000|000000)$/i.test(c));
  if (bare.length)
    fail("figure-hardcodes-a-colour",
      `${f} paints ${[...new Set(bare)].slice(0, 4).join(", ")} as a literal. In a themed page that is a ` +
      `light drawing on whatever background the reader has. Use var(--fig-<role>, <light hex>)`);
}

/* Labels that sit on top of each other.
 *
 * Three attempts at placing branch labels were made by eye and each left a different collision:
 * two labels stacked into one line of gibberish, then a label sitting on an unrelated step three
 * rows down and appearing to name it. Every one of them looked fine in the code.
 *
 * The rectangles are in the file, so the overlap is arithmetic rather than opinion. This reads the
 * SVG's own rounded rects — which is what every label in these diagrams is drawn as — and reports
 * any pair that intersects. It cannot see text that overflows its box, and says so rather than
 * claiming more than it checked. */
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const boxes = [...src.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"/g)]
    .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], r: +m[5] }))
    // only the pill-shaped ones: a label is a rect whose corner radius is half its height. A lane
    // band and a step box are not labels and are allowed to contain things.
    .filter((b) => b.r >= b.h / 2 - 0.6 && b.w < 340);
  let clashes = 0;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) clashes++;
    }
  if (clashes)
    fail("figure-labels-collide",
      `${f} draws ${clashes} pair(s) of labels on top of each other. A label that overlaps another ` +
      `reads as neither of them. Separate them where the coordinates are, before emitting`);
}

/* A control that looks interactive and changes nothing.
 *
 * The generator marks each diagram data-interrogable after measuring whether focusing a node
 * narrows the view. This re-derives that independently, because a claim and its evidence should
 * not come from the same line of code: a figure asserting "yes" has to have edges, and focusing
 * its median node has to leave most of the diagram dimmed.
 *
 * Both failures were live. Clicking the first step of the process lit 21 of 23 boxes, because
 * "everything reachable from the start" is the whole diagram. The use case model claimed to
 * narrow to a tenth and had no tagged edges at all, so clicking a node dimmed the other nine and
 * lit nothing. */
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  if (!/data-interrogable="yes"/.test(src)) continue;
  const ids = [...src.matchAll(/data-node="([^"]+)"/g)].map((m) => m[1]);
  const pairs = [...src.matchAll(/data-edge="([^"|]+)\|([^"]+)"/g)].map((m) => [m[1], m[2]]);
  if (!pairs.length) {
    fail("figure-control-does-nothing",
      `${f} offers a click control and carries no edges, so focusing a node dims every other node ` +
      "and lights nothing. A graph with no edges is a list");
    continue;
  }
  const near = (id) => {
    const set = new Set([id]);
    for (const [a, b] of pairs) { if (a === id) set.add(b); if (b === id) set.add(a); }
    return set.size;
  };
  const sizes = ids.map(near).sort((a, b) => a - b);
  const med = sizes[Math.floor(sizes.length / 2)];
  if (med / ids.length > 0.5)
    fail("figure-control-does-nothing",
      `${f} offers a click control that lights ${med} of its ${ids.length} node(s) for the median step. ` +
      "A control that dims almost nothing answers no question — make the figure a drawing and say so");
}

/* An edge drawn through a box it has nothing to do with.
 *
 * This reads a count the ROUTER reports rather than re-deriving it, and that is a weaker check
 * than the others here — it verifies that the generator noticed, not that the generator was
 * right. Re-deriving it means parsing arbitrary SVG path commands, and a hand-written parser for
 * that is exactly what silently dropped eight orthogonal routes from the measurement harness
 * during this work and reported an improvement that was partly edges vanishing.
 *
 * The honest version of this check runs in a browser with getPointAtLength. Until it does, this
 * catches a router that gives up, and says plainly that it cannot catch a router that lies. */
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const n = Number((src.match(/data-route-conflicts="(\d+)"/) || [])[1]);
  if (n > 0)
    fail("figure-edge-through-node",
      `${f}: the router could not clear ${n} edge(s) of a box they do not touch. A line drawn ` +
      "through an unrelated step reads as a connection to it");
}

/* Two steps drawn on top of each other.
 *
 * Unlike an edge route, a node's footprint is a rectangle and a circle in the source, so this
 * re-derives the answer instead of trusting a number the generator reports about itself — which
 * is the stronger form, and is available here precisely because the geometry is simple.
 *
 * It found a real one: the half-row used for a cell that overflows its columns dropped a box by
 * 59px when the box is 54 tall, leaving 5px of air — and the step-number badge overhangs 9px
 * above its box, so the badge of the lower step was drawn on top of the box above it. Everything
 * measured about routing was clean and the drawing still looked cramped, because nothing had
 * measured the boxes. */
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const boxes = [];
  for (const g of src.matchAll(/<g data-node="([^"]+)"[\s\S]*?<\/g>/g)) {
    const body = g[0];
    const parts = [];
    for (const r of body.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g))
      parts.push({ x: +r[1], y: +r[2], x2: +r[1] + +r[3], y2: +r[2] + +r[4] });
    for (const c of body.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"/g))
      parts.push({ x: +c[1] - +c[3], y: +c[2] - +c[3], x2: +c[1] + +c[3], y2: +c[2] + +c[3] });
    for (const d of body.matchAll(/<path d="M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)/g)) {
      const xs = [+d[1], +d[3], +d[5], +d[7]], ys = [+d[2], +d[4], +d[6], +d[8]];
      parts.push({ x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) });
    }
    if (parts.length) boxes.push({ id: g[1],
      x: Math.min(...parts.map((q) => q.x)), y: Math.min(...parts.map((q) => q.y)),
      x2: Math.max(...parts.map((q) => q.x2)), y2: Math.max(...parts.map((q) => q.y2)) });
  }
  const bad = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x2 - 0.5 && b.x < a.x2 - 0.5 && a.y < b.y2 - 0.5 && b.y < a.y2 - 0.5) bad.push(`${a.id}/${b.id}`);
    }
  if (bad.length)
    fail("figure-steps-overlap",
      `${f} draws ${bad.length} pair(s) of steps on top of each other (${bad.slice(0, 4).join(", ")}). ` +
      "Height is the axis a page has to spare — give them room rather than crowding the width");
}

/* A step nobody can reach.
 *
 * This check exists because of a change that passed every other check here. A four-way fork had a
 * legend naming each branch and its target, so the branch routes looked redundant and were
 * removed: a third of the ink came out, crossings dropped, and every geometric measure improved.
 * Four steps were then drawn with no incoming line at all. The legend became a dead end and the
 * process visibly stopped in the middle.
 *
 * "The legend carries the step numbers" was true and useless. A number in a list is a REFERENCE;
 * a reader following a process needs a CONNECTION. Nothing measuring ink, crossings or overlap
 * could see it, because the drawing got tidier — it just stopped being a process.
 *
 * Reachability is about ids, not geometry, so this re-derives it in full. */
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const ids = [...src.matchAll(/<g data-node="([^"]+)"/g)].map((m) => m[1]);
  if (ids.length < 2) continue;
  const ed = [...src.matchAll(/data-edge="([^"|]+)\|([^"]+)"/g)].map((m) => [m[1], m[2]]);
  if (!ed.length) continue;
  const hasIn = new Set(ed.map((e) => e[1]));
  let roots = ids.filter((i) => !hasIn.has(i));
  /* A strongly connected graph has no node without an incoming edge — a lifecycle usually does not
   * — and reporting every state in it as unreachable would be a false alarm on a correct diagram.
   * With no root, seed from the first node: what matters then is whether the rest connect to it. */
  if (!roots.length) roots = ids.slice(0, 1);
  const seen = new Set(roots), q = [...roots];
  while (q.length) {
    const c = q.shift();
    for (const [a, b] of ed) if (a === c && ids.includes(b) && !seen.has(b)) { seen.add(b); q.push(b); }
  }
  const touched = new Set(ed.flat());
  const isolated = ids.filter((i) => !touched.has(i));
  if (isolated.length)
    fail("figure-step-unreachable",
      `${f}: ${isolated.length} step(s) have no line in or out at all (${isolated.slice(0, 4).join(", ")}). ` +
      "A box connected to nothing is not part of the process it is drawn inside");
  const orphan = ids.filter((i) => !seen.has(i) && touched.has(i));
  if (orphan.length)
    fail("figure-step-unreachable",
      `${f}: ${orphan.length} step(s) have no path from any start (${orphan.slice(0, 4).join(", ")}). ` +
      "A step with no incoming line is a step the reader cannot get to, however tidy the drawing is");
}

// and the reverse: a figure the page frames but has no caption is a picture with no question
const framed = [...html.matchAll(/<figure[^>]*>/g)];
for (const tag of framed) {
  if (!/data-label=|<figcaption/.test(tag[0]) && !html.slice(html.indexOf(tag[0])).slice(0, 4000).includes("<figcaption"))
    fail("figure-without-a-caption", `a <figure> carries no label, so the reader must infer what it answers`);
}

if (fails.length) {
  console.error("figure-placement-check FAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`figure-placement-check: ${svgs.length} figure(s) rendered, ${svgs.length} placed in ${basename(page)}`);
