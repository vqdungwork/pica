/**
 * build-diff.mjs — step 7.10. The built product against the approved design.
 *
 * This is the check the industry reliably leaves undone: the designer assumes QA covers
 * it, QA assumes the designer does, and the code quietly reinterprets the design in
 * between. Everything needed already existed. The reference is the approved capture,
 * the measurement is the same capture harness pointed at a live URL, and the gate is a
 * human. Only the comparison was missing.
 *
 * Both sides are capture artefacts, so this cannot disagree with what was captured.
 *
 * PAIRING IS BY `data-uc` PLUS `data-state` PLUS VIEWPORT, never by caption. A build's captions come from
 * its own markup and will not match the prototype's, so pairing by name reports every
 * frame as missing. The use case tag is an identity channel that both sides control
 * deliberately, which is the whole reason it exists.
 *
 * Five checks:
 *
 *   1. FRAME PAIRED    every approved frame has a built counterpart.
 *                      PASS: 0 unbuilt.
 *   2. CONTROL HEIGHT  control heights match within tolerance.
 *                      PASS: 0 outside.
 *   3. RADIUS          the set of corner radii matches.
 *                      PASS: 0 introduced or dropped.
 *   4. HUE BUDGET      the build spends no hue the design did not.
 *                      PASS: 0 new hues.
 *   5. TEXT POSITION   each text run sits where the design put it, within tolerance.
 *                      PASS: 0 beyond tolerance.
 *
 * WHAT THIS CANNOT DO: detect absence of content inside a paired frame. A frame missing
 * half its rows still reports every row it does have as correct. Frame pairing covers
 * whole screens; coverage-check covers whole use cases; rendering it and looking covers
 * what no script does.
 *
 * The approved design is the reference and it is READ-ONLY. Report divergence. Never
 * adjust the design to match the build.
 *
 * Usage: node build-diff.mjs <approved.json> <built.json> [--tolerance 2]
 */
import fs from "fs";

const args = process.argv.slice(2);
const [approvedPath, builtPath] = args.filter((a) => !a.startsWith("--"));
const tAt = args.indexOf("--tolerance");
const TOL = tAt >= 0 ? Number(args[tAt + 1]) || 2 : 2;

if (!approvedPath || !builtPath) {
  console.error("usage: node build-diff.mjs <approved.json> <built.json> [--tolerance 2]");
  process.exit(2);
}

let approved, built;
try {
  approved = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
  built = JSON.parse(fs.readFileSync(builtPath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read or parse an input (${e.message}).`);
  process.exit(2);
}

const flatten = (ref) => {
  const out = [];
  for (const [pkg, list] of Object.entries(ref.frames || {}))
    for (const f of list) out.push({ ...f, pkg });
  return out;
};

const HUG = /\s*·\s*hug\s*$/;
const A = flatten(approved).filter((f) => !HUG.test(f.cap || ""));
const B = flatten(built).filter((f) => !HUG.test(f.cap || ""));

if (!A.length) {
  console.error("FAIL  the approved capture contains no frames. There is nothing to compare against.");
  process.exit(2);
}
if (!B.length) {
  console.error("FAIL  the built capture contains no frames. The URL rendered nothing the selectors matched.");
  process.exit(2);
}

/* Identity is use case PLUS STATE plus viewport. The first version keyed on use case
 * and viewport alone, and a project with a screen and its empty state broke it three
 * ways at once: the empty state paired against the populated one and produced four
 * false findings, and a screen deleted from the build was never reported because its
 * sibling absorbed the pairing. One missing key, three wrong answers, and the check
 * still said "0 findings" on the thing it was written to catch. */
const key = (f) => `${(f.uc || []).join("+")}:${f.state || "default"}@${f.viewport || "?"}`;
const untagged = [...A, ...B].filter((f) => !(f.uc || []).length).length;
if (untagged) {
  console.error(`FAIL  ${untagged} frame(s) carry no data-uc, so the two sides cannot be paired.`);
  console.error("      Pairing by caption does not work: a build's captions come from its own markup.");
  console.error("      Tag both the prototype and the build with the use case each screen serves.");
  process.exit(1);
}

const builtBy = new Map();
for (const f of B) {
  if (!builtBy.has(key(f))) builtBy.set(key(f), []);
  builtBy.get(key(f)).push(f);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

let unbuilt = 0, ctrl = 0, radius = 0, hue = 0, moved = 0, compared = 0, uncomparable = 0;

for (const a of A) {
  const k = key(a);
  const pair = (builtBy.get(k) || [])[0];

  /* ---- 1. paired ---- */
  if (!pair) {
    unbuilt++;
    fail("frame-paired", `${a.cap} [${k}]`,
      "the approved design has this screen and the build does not. It was agreed, drawn, approved, and not built");
    continue;
  }
  /* A frame with no census cannot be compared, and the first version treated a missing
   * one as an empty one: every radius and every control height read as "dropped by the
   * build", and a build identical to the design reported ten divergences.
   *
   * This is not hypothetical. It happens whenever the approved capture and the build
   * capture were taken by different versions of the harness, which is the normal case for
   * an approval in one month and a build in the next. Reporting a harness mismatch as a
   * design divergence sends people to look for a defect that is not there, and the second
   * time that happens they stop believing the check. */
  if (!a.census || !pair.census) {
    uncomparable++;
    fail("frame-paired", `${a.cap} [${k}]`,
      `paired, but ${!a.census ? "the approved" : "the built"} capture carries no census, so nothing ` +
      `could be measured on it. Re-capture both sides with the same harness before reading any result here`);
    continue;
  }
  compared++;

  const ca = a.census, cb = pair.census;

  /* ---- 2. control height ---- *
   * Compared as sets: a build that introduces a 32px control where the design had only
   * 44px has changed the density, and density is a decision the design already made. */
  const ha = new Set(ca.controlH || []), hb = new Set(cb.controlH || []);
  for (const h of hb)
    if (!ha.has(h) && ![...ha].some((x) => Math.abs(x - h) <= TOL)) {
      ctrl++;
      fail("control-height", `${a.cap} [${k}]`,
        `build has a ${h}px control, design has ${[...ha].join(", ") || "none"}. Density is a decision the design already made`);
    }

  /* ---- 3. radius ---- */
  const ra = new Set((ca.radii || []).map(([px]) => px));
  const rb = new Set((cb.radii || []).map(([px]) => px));
  for (const r of rb)
    if (!ra.has(r)) {
      radius++;
      fail("radius", `${a.cap} [${k}]`,
        `build uses ${r}px radius, which the design does not. Design uses ${[...ra].join(", ") || "none"}`);
    }
  for (const r of ra)
    if (!rb.has(r) && r !== 0) {
      radius++;
      fail("radius", `${a.cap} [${k}]`, `design uses ${r}px radius and the build has dropped it`);
    }

  /* ---- 4. hue budget ---- *
   * One-directional on purpose. A build spending a hue the design never used has
   * introduced colour; a build using fewer is usually an unbuilt state, which check 1
   * and coverage-check are the right places to catch. */
  const qa = new Set(ca.hues || []), qb = new Set(cb.hues || []);
  for (const q of qb)
    if (!qa.has(q)) {
      hue++;
      fail("hue-budget", `${a.cap} [${k}]`,
        `build spends a ${q}° hue the design never used. The palette was a decision, and this is outside it`);
    }

  /* ---- 5. text position ---- *
   * Matched on the string, so a moved run is found even when the order changed.
   * Compares x and y only: glyph ink and layout box measure different extents, and
   * comparing width reports a phantom on every string that renders slightly differently. */
  const bText = new Map();
  for (const t of pair.texts || []) {
    const s = String(t[0] || "");
    if (!bText.has(s)) bText.set(s, []);
    bText.get(s).push({ x: t[1], y: t[2] });
  }
  for (const t of a.texts || []) {
    const s = String(t[0] || "");
    const cands = bText.get(s);
    if (!cands || !cands.length) continue;      // absence is check 1's job, not this one
    const near = cands.reduce((best, c) =>
      Math.hypot(c.x - t[1], c.y - t[2]) < Math.hypot(best.x - t[1], best.y - t[2]) ? c : best);
    const dx = Math.round(near.x - t[1]), dy = Math.round(near.y - t[2]);
    if (Math.abs(dx) > TOL || Math.abs(dy) > TOL) {
      moved++;
      fail("text-position", `${a.cap} [${k}]`,
        `"${s.slice(0, 32)}" is at dx=${dx} dy=${dy} from where the design put it (tolerance ${TOL}px)`);
    }
  }
}

/* Extra frames in the build are reported, not failed: a build legitimately carries
 * routes the prototype never drew. Reported because unsold scope is worth seeing. */
const approvedKeys = new Set(A.map(key));
const extra = B.filter((f) => !approvedKeys.has(key(f)));

/* ---- report ------------------------------------------------------------- */
console.log(`approved frames: ${A.length}`);
console.log(`built frames:    ${B.length}`);
console.log(`paired:          ${compared}`);
console.log(`tolerance:       ${TOL}px`);
console.log("");

const table = [
  ["frame-paired", unbuilt + uncomparable, `${A.length} approved` + (uncomparable ? `, ${uncomparable} paired but not measurable` : "")],
  ["control-height", ctrl, `${compared} paired`],
  ["radius", radius, `${compared} paired`],
  ["hue-budget", hue, `${compared} paired`],
  ["text-position", moved, `${compared} paired`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (extra.length) {
  console.log("");
  console.log(`NOTE  ${extra.length} built frame(s) have no approved counterpart: ${extra.map((f) => f.cap).slice(0, 4).join(", ")}`);
  console.log("      Not a failure here, but it is scope the client did not approve. Worth asking about.");
}

console.log("\nNOTE  this cannot detect absence INSIDE a paired frame. A screen missing half its rows");
console.log("      reports every row it does have as correct. Render it and look.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The build ${findings.length ? "has diverged from the approved design" : "matches the approved design"}.`);
process.exit(findings.length ? 1 : 0);
