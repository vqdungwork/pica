/**
 * geometry-diff.mjs: Figma against the HTML reference. Runs at the port and at
 * review. Only for a project with `figmaInScope: true`.
 *
 * HTML is the source of truth. Where the two disagree, Figma is wrong.
 *
 * Compares x and y ONLY, never width or height. The HTML glyph ink box and the Figma
 * line box measure different things; comparing them produced 120 phantom findings on
 * a substantially correct file. Position is comparable, extent is not.
 *
 * WHAT THIS CANNOT DO: detect absence. A node that was never created has no
 * coordinates, so it cannot be over tolerance. A frame missing a third of its
 * content still reports every node it does have as correct. Frame inventory and
 * text-run counts are parity-check.mjs's and verify-html.mjs's job: a clean
 * geometry diff is not evidence a frame is complete.
 *
 * PASS: 0 findings, and a nonzero number of text runs actually compared.
 *
 * Usage: node geometry-diff.mjs <html-reference.json> <figma-dump.json> <state.json>
 *
 * The Figma dump is an array of { pkg, frame, vp, texts: [[string, x, y, w, align], ...] }
 * with x/y relative to the frame origin, w the node's width, and align its
 * textAlignHorizontal lowercased ("left" | "right" | "center" | "justified").
 *
 * Each frame also carries `font`, the family the design was in when it was dumped.
 * The diff refuses to run unless that matches the family the capture resolved.
 *
 * `w` and `align` are OPTIONAL and were added in 0.7.1. Without them the diff falls
 * back to comparing left edges for every run, which is only correct for left-aligned
 * text: see COMPARE THE EDGE THE ALIGNMENT MAKES MEANINGFUL below. The fallback is
 * announced in the output rather than applied silently.
 */
import fs from "fs";

const [, , refPath, figPath, statePath] = process.argv;
if (!refPath || !figPath || !statePath) {
  console.error("usage: node geometry-diff.mjs <html-reference.json> <figma-dump.json> <state.json>");
  process.exit(2);
}

const ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
const fig = JSON.parse(fs.readFileSync(figPath, "utf8"));

/* The dump is an ARRAY of frames. Handed an object it threw "fig.map is not a function",
 * which is a stack trace where a sentence naming the file belongs. Every other script here
 * now guards its inputs the same way, and this one is the likeliest of all of them to be
 * handed something hand-assembled: it is pasted out of a Figma session. */
if (!Array.isArray(fig)) {
  console.error(`FAIL  ${figPath} is ${fig === null ? "null" : typeof fig}, and the Figma dump has to be an array of`);
  console.error("      { pkg, frame, vp, font, texts: [[string, x, y, w, align], ...] } objects.");
  console.error("      Nothing was compared, and that is not a pass.");
  process.exit(2);
}
const badFrames = fig.filter((f) => !f || typeof f !== "object" || !Array.isArray(f.texts));
if (badFrames.length) {
  console.error(`FAIL  ${badFrames.length} of ${fig.length} entries in the dump carry no texts array.`);
  console.error("      Each frame needs { pkg, frame, vp, texts: [...] }. Nothing was compared.");
  process.exit(2);
}
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

/* Tolerance. 3px absorbs the difference between a glyph ink box and a line box
 * without absorbing a real misplacement. */
const TOL = state.geometryTolerance ?? 3;

/* COMPARE THE EDGE THE ALIGNMENT MAKES MEANINGFUL.
 *
 * The HTML capture records the run's glyph INK rect. The Figma dump records the text
 * node's LAYOUT BOX. For left-aligned text those two share a left edge, so comparing
 * `x` to `x` is sound. For anything else it is not:
 *
 *   right-aligned FILL text: the box starts at the container's left while the ink
 *   ends at the container's right, so `dx` is the container's width minus the string.
 *   Nothing about that number is a defect, and nothing about it is a pass either.
 *
 *   centred text: the box spans the container, the ink sits in the middle, and the
 *   error scales with the string, so a long label fails while being perfectly placed.
 *
 * Through 0.7.0 this was handled by ANNOTATING centred findings and by asking projects
 * to write a `deviations` entry per run. On the project that produced this change that
 * meant eleven hand-written exemptions - and one of them hid a real 258px error for
 * days, because the exemption removed the very run that would have caught it. An
 * exemption that exists to paper over a measurement bug is a place for defects to live.
 *
 * So compare the edge that carries the meaning: left for left, RIGHT for right, CENTRE
 * for centred. Then a right-aligned label is checked against the margin it must sit on,
 * which is the thing the design actually promises. */
const edgeOf = (align, x, w) => {
  const a = (align || "").toLowerCase();
  if (a === "right" || a === "end") return { at: x + w, edge: "right" };
  if (a === "center" || a === "centre" || a === "justify" || a === "justified")
    return { at: x + w / 2, edge: "centre" };
  return { at: x, edge: "left" };
};

const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 24);

/* Matched on SCREEN plus TEXT RUN, because that is the pair this script has. The dump
 * carries no Figma node ids and pairing here is by text content, so a node id would match
 * nothing whatever it named.
 *
 * figma-gates.md documented the entry as `{node: "29:119", prop: "y"}`, a node id and a
 * property name: for three releases. An entry written exactly as documented could never
 * match, and the same file says that without this register the definition of done is
 * unfalsifiable. Both spellings are accepted now so an existing register keeps working,
 * and the documented example is the one that does something. */
const DEV = new Set(
  (state.deviations || []).flatMap((d) => {
    const where = d.screen || d.node || "";
    const what = d.text || d.prop || "";
    return [`${where}|${norm(String(what))}`, `${where}|${what}`];
  }));

/* Figma frame name -> HTML screen name, from state.json.
 *
 * Kept explicit rather than derived: pica's naming convention puts "·" inside
 * screen names, and Figma frame names carry a variant suffix the HTML caption does
 * not, so no rule maps one onto the other reliably.
 *
 * A frame with no mapping is a FINDING, not a skip. Through 0.3.0 it was a skip,
 * which meant a project with no frameMap compared zero runs, reported "0 over
 * tolerance" and exited 0: a green check that had done nothing. */
const MAP = state.frameMap || {};

/* THE TWO SIDES MUST BE IN THE SAME FONT, AND BOTH MUST SAY WHICH.
 *
 * Text position depends on the family. On one project a font swap moved hug-width nodes
 * by 2-5%, which is several times the tolerance. A capture in one family diffed against
 * a dump in another reports typeface as layout, and the report reads like a broken design.
 *
 * The dangerous case is not disagreement, it is SILENCE: through 0.7.0 the dump recorded
 * no font at all, so a dump taken in the handover font looked identical to one taken in
 * the working font, and the diff believed it. A team that flips fonts between working and
 * handover hits this every other run.
 *
 * So both artefacts must name their family, and they must match. Unknown is not a pass.
 * Set `state.fontMatch: "off"` only if you have a reason and have written it down. */
const refFont  = ref.meta?.font ?? ref.meta?.forcedFont ?? null;
const figFonts = [...new Set(fig.map((f) => f.font).filter(Boolean))];
/* EVERY frame must carry it, not merely some. Checking only the set of families that
 * ARE present lets a partly-labelled dump through: the unlabelled frames are then
 * diffed in whatever font they happen to hold, which is the failure this guard exists
 * to prevent, reintroduced by the guard's own leniency. */
const unlabelled = fig.filter((f) => !f.font).map((f) => f.frame);
if ((state.fontMatch ?? "on") !== "off") {
  if (unlabelled.length) {
    console.error(`FAIL  ${unlabelled.length} of ${fig.length} dumped frame(s) carry no "font".`);
    console.error(`      A partly labelled dump is not a labelled dump - the unlabelled frames`);
    console.error(`      would be compared in whatever family they were taken in, unchecked.`);
    unlabelled.slice(0, 5).forEach((n) => console.error(`        ${n}`));
    process.exit(2);
  }
  if (!refFont || figFonts.length === 0) {
    console.error(`FAIL  the two sides cannot be shown to share a font.`);
    console.error(`      HTML capture font: ${refFont ?? "NOT RECORDED"}`);
    console.error(`      Figma dump font:   ${figFonts.length ? figFonts.join(", ") : "NOT RECORDED"}`);
    console.error(`      Position depends on the family, so a diff across two families reports`);
    console.error(`      typeface as layout. Re-capture, and re-dump with a "font" field per frame.`);
    process.exit(2);
  }
  const mismatched = figFonts.filter((f) => f.toLowerCase() !== refFont.toLowerCase());
  if (mismatched.length) {
    console.error(`FAIL  font mismatch. HTML captured in "${refFont}", Figma dumped in `
                + `"${mismatched.join('", "')}".`);
    console.error(`      Diff both sides in ONE family. Force it on the capture with --font,`);
    console.error(`      and take the dump while the design is in that same family.`);
    process.exit(2);
  }
}
if (!Object.keys(MAP).length) {
  console.error("FAIL  state.json declares no frameMap, so no Figma frame can be paired");
  console.error("      with an HTML screen. Add frameMap as { \"<pkg>|<figma frame>\": \"<html screen>\" }.");
  process.exit(2);
}


/* Index the HTML reference by screen + viewport, using the captured viewport tag. */
const screenOf = (frame) => {
  if (!frame.viewport) {
    console.error(`FAIL  frame "${frame.cap}" carries no viewport tag. Run verify-html.mjs first.`);
    process.exit(2);
  }
  return frame.cap.replace(new RegExp(`\\s*·\\s*${frame.viewport}\\b.*$`, "i"), "").trim();
};

const html = new Map();
for (const frames of Object.values(ref.frames)) {
  for (const fr of frames) html.set(`${screenOf(fr)}|${fr.viewport}`, fr);
}

let findings = 0, compared = 0, unmatched = 0, framesChecked = 0, noWidth = 0;
const rows = [];

for (const f of fig) {
  const screen = MAP[`${f.pkg}|${f.frame}`];
  if (!screen) {
    rows.push({ level: "FINDING", msg: `no frameMap entry for "${f.pkg}|${f.frame}", nothing was compared for this frame` });
    findings++;
    continue;
  }
  const h = html.get(`${screen}|${f.vp}`);
  if (!h) {
    rows.push({ level: "FINDING", msg: `no HTML frame for ${screen} @ ${f.vp}` });
    findings++;
    continue;
  }
  framesChecked++;

  /* Bucket HTML runs by normalised text so repeated labels pair by proximity. */
  const buckets = new Map();
  for (const t of h.texts) {
    const k = norm(t[0]);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ x: t[1], y: t[2], w: t.length > 3 ? t[3] : null,
                          align: t.length > 8 ? t[8] : null, used: false });
  }

  const worst = [];
  for (const [s, fx, fy, fw, falign] of f.texts) {
    const cand = buckets.get(norm(s));
    if (!cand) { unmatched++; continue; }
    let best = null, bestD = Infinity;
    for (const c of cand) {
      if (c.used) continue;
      const d = Math.abs(c.y - fy) + Math.abs(c.x - fx);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) { unmatched++; continue; }
    best.used = true;
    compared++;

    /* The design side owns the alignment: it is what the design says the text does.
     * Fall back to the HTML's computed text-align, then to left. Both sides need a
     * width before an edge other than the left one can be computed at all. */
    const align = falign ?? best.align;
    const canEdge = Number.isFinite(fw) && Number.isFinite(best.w);
    if (!canEdge) noWidth++;
    const fe = canEdge ? edgeOf(align, fx, fw) : { at: fx, edge: "left" };
    const he = canEdge ? edgeOf(align, best.x, best.w) : { at: best.x, edge: "left" };

    const dx = Math.round((fe.at - he.at) * 10) / 10;
    const dy = Math.round((fy - best.y) * 10) / 10;
    if (Math.abs(dx) > TOL || Math.abs(dy) > TOL) {
      if (DEV.has(`${screen}|${norm(s)}`)) continue;   // registered decision
      findings++;
      worst.push({ s: s.slice(0, 34), dx, dy, figma: [fx, fy], html: [best.x, best.y],
                   align: best.align, edge: fe.edge, edged: canEdge });
    }
  }
  worst.sort((a, b) => Math.abs(b.dx) + Math.abs(b.dy) - (Math.abs(a.dx) + Math.abs(a.dy)));
  rows.push({ level: worst.length ? "FINDING" : "ok", screen, vp: f.vp,
              runs: f.texts.length, over: worst.length, worst: worst.slice(0, 5) });
}

for (const r of rows) {
  if (r.msg) { console.log(`${r.level.padEnd(8)} ${r.msg}`); continue; }
  console.log(`${r.level.padEnd(8)} ${`${r.screen} @ ${r.vp}`.padEnd(46)} `
            + `runs=${String(r.runs).padStart(3)}  over-tolerance=${r.over}`);
  for (const w of r.worst)
    console.log(`         d${w.edge === "left" ? "x" : w.edge === "right" ? "R" : "C"}`
              + `=${String(w.dx).padStart(7)} dy=${String(w.dy).padStart(7)}  `
              + `figma=${JSON.stringify(w.figma)} html=${JSON.stringify(w.html)}  "${w.s}"`
              + `${w.edged ? `  [compared the ${w.edge} edge, per text-align]`
                           : `  [left edge only, the dump carries no width, so the ${w.align || "?"} `
                             + `edge could not be compared]`}`);
}

if (noWidth) {
  console.log(`\nNOTE  ${noWidth} run(s) were compared on their LEFT edge only, because the dump or the`);
  console.log(`      capture carried no width for them. That is correct for left-aligned text and`);
  console.log(`      meaningless for right-aligned or centred text. Re-dump with [text, x, y, w, align]`);
  console.log(`      to compare the edge the alignment makes meaningful.`);
}

console.log(`\ncompared ${compared} text run(s) across ${framesChecked} frame(s), `
          + `${findings} over ${TOL}px, ${unmatched} unmatched.`);
console.log(`deviations registered: ${DEV.size}`);

/* Comparing nothing is not passing. */
if (!compared) {
  console.error(`\nFAIL  0 text runs compared. Whatever this measured, it was not the design.`);
  process.exit(2);
}
console.log(`\n${findings} finding(s).`);
process.exit(findings ? 1 : 0);
