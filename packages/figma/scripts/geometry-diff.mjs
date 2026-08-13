/**
 * geometry-diff.mjs — Figma against the HTML reference. Runs at the port and at
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
 * text-run counts are parity-check.mjs's and verify-html.mjs's job — a clean
 * geometry diff is not evidence a frame is complete.
 *
 * PASS: 0 findings, and a nonzero number of text runs actually compared.
 *
 * Usage: node geometry-diff.mjs <html-reference.json> <figma-dump.json> <state.json>
 *
 * The Figma dump is an array of { pkg, frame, vp, texts: [[string, x, y], ...] }
 * with x/y relative to the frame origin.
 */
import fs from "fs";

const [, , refPath, figPath, statePath] = process.argv;
if (!refPath || !figPath || !statePath) {
  console.error("usage: node geometry-diff.mjs <html-reference.json> <figma-dump.json> <state.json>");
  process.exit(2);
}

const ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
const fig = JSON.parse(fs.readFileSync(figPath, "utf8"));
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

/* Tolerance. 3px is calibrated for left-aligned text: it absorbs the difference
 * between a glyph ink box and a line box without absorbing a real misplacement.
 *
 * It is NOT calibrated for centred text, where the ink/line-box difference scales
 * with the string's width, so a long centred label can exceed 3px while being
 * correctly centred. The capture records each run's text-align for exactly this
 * reason; raising tolerance per-alignment is not yet implemented, so centred runs
 * over tolerance need reading rather than trusting. */
const TOL = state.geometryTolerance ?? 3;

const DEV = new Set(
  (state.deviations || []).map((d) => `${d.node || ""}|${d.prop || ""}`));

/* Figma frame name -> HTML screen name, from state.json.
 *
 * Kept explicit rather than derived: pica's naming convention puts "·" inside
 * screen names, and Figma frame names carry a variant suffix the HTML caption does
 * not, so no rule maps one onto the other reliably.
 *
 * A frame with no mapping is a FINDING, not a skip. Through 0.3.0 it was a skip,
 * which meant a project with no frameMap compared zero runs, reported "0 over
 * tolerance" and exited 0 — a green check that had done nothing. */
const MAP = state.frameMap || {};
if (!Object.keys(MAP).length) {
  console.error("FAIL  state.json declares no frameMap, so no Figma frame can be paired");
  console.error("      with an HTML screen. Add frameMap as { \"<pkg>|<figma frame>\": \"<html screen>\" }.");
  process.exit(2);
}

const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 24);

/* Alignments where the ink/line-box difference scales with string width, so a run
 * can exceed tolerance while being correctly placed. "start" and "end" are the
 * computed values of left and right in an LTR document and carry no extra error,
 * so they are NOT here — flagging them made two thirds of a report look suspect. */
const CENTRED = new Set(["center", "justify"]);

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

let findings = 0, compared = 0, unmatched = 0, framesChecked = 0;
const rows = [];

for (const f of fig) {
  const screen = MAP[`${f.pkg}|${f.frame}`];
  if (!screen) {
    rows.push({ level: "FINDING", msg: `no frameMap entry for "${f.pkg}|${f.frame}" — nothing was compared for this frame` });
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
    buckets.get(k).push({ x: t[1], y: t[2], align: t.length > 8 ? t[8] : null, used: false });
  }

  const worst = [];
  for (const [s, fx, fy] of f.texts) {
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
    const dx = Math.round((fx - best.x) * 10) / 10;
    const dy = Math.round((fy - best.y) * 10) / 10;
    if (Math.abs(dx) > TOL || Math.abs(dy) > TOL) {
      if (DEV.has(`${screen}|${norm(s)}`)) continue;   // registered decision
      findings++;
      worst.push({ s: s.slice(0, 34), dx, dy, figma: [fx, fy], html: [best.x, best.y],
                   align: best.align });
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
    console.log(`         dx=${String(w.dx).padStart(7)} dy=${String(w.dy).padStart(7)}  `
              + `figma=${JSON.stringify(w.figma)} html=${JSON.stringify(w.html)}  "${w.s}"`
              + `${CENTRED.has(w.align) ? `  [text-align: ${w.align} — tolerance is calibrated for left-aligned text]` : ""}`);
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
