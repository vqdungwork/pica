/**
 * contrast-check.mjs — the accessibility measurement this harness never made.
 *
 * pica measures geometry to a tenth of a pixel and, until 0.8.0, never measured contrast.
 * That is the one accessibility property which is objective, computable, and in one sector
 * legally binding: the knowledge base records WCAG 2.2 AA as a statutory floor for
 * public-sector services, and four more sectors call contrast functional rather than
 * aesthetic — a warehouse handheld in sunlight, a plant screen behind polycarbonate, a
 * clinician's monitor under theatre lighting, a phone in a tractor cab.
 *
 * `evaluation.md` has required "contrast computed from tokens" since 0.5.0 and nothing
 * computed it. The Figma audit had a contrast metric; the HTML side, which is where every
 * project starts and where an HTML-only project ends, had none.
 *
 * Four checks:
 *
 *   1. BODY CONTRAST   normal text reaches the declared ratio.   PASS: 0 below.
 *   2. LARGE CONTRAST  large text reaches the large-text ratio.  PASS: 0 below.
 *   3. UNRESOLVED      no run was measured against a background the capture could not
 *                      resolve.  PASS: 0. This is not the same as passing.
 *   4. EXEMPTION USED  every contrastExemption is still needed.  PASS: 0 stale.
 *
 * WCAG 2.x, relative luminance and the 0.05 offset, as published. Large text is 24px, or
 * 18.66px at 700 or heavier. AA is 4.5 and 3.0; AAA is 7.0 and 4.5. The level is a project
 * decision read from state.
 *
 * WHAT THIS CANNOT DO: judge a foreground over an image, a gradient, or a translucent
 * layer. The capture resolves the nearest opaque background, so text over photography is
 * measured against whatever sits behind the photograph, which is the wrong number. Those
 * are reported as unresolved rather than scored, because a confident wrong ratio is worse
 * than an admitted gap.
 *
 * Usage: node contrast-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node contrast-check.mjs <html-reference.json> <state.json>");
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

const shapeErrors = [];
const expectArray = (key) => {
  const v = state[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    const holes = v.filter((x) => x === null || x === undefined).length;
    if (holes) shapeErrors.push(`state.${key} has ${holes} null entr${holes === 1 ? "y" : "ies"}`);
    return v;
  }
  shapeErrors.push(`state.${key} is ${typeof v}, and this reads it as an array`);
  return [];
};
expectArray("contrastExemptions");
if (shapeErrors.length) {
  console.error("FAIL  .pica/state.json has the right keys with the wrong shapes:");
  for (const e of shapeErrors) console.error(`      ${e}`);
  process.exit(2);
}

const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {}))
  for (const f of list) frames.push({ ...f, pkg });

if (!frames.length) {
  console.error("FAIL  the capture contains no frames. The selectors matched nothing.");
  process.exit(2);
}

/* Colour parsing. rgb(), rgba() and #hex, which is everything a computed style returns. */
const parse = (c) => {
  const s = String(c || "").trim();
  let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
    const n = (i) => parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return [n(0), n(1), n(2), h.length === 8 ? n(3) / 255 : 1];
  }
  return null;
};

/* WCAG 2.x relative luminance. */
const lum = ([r, g, b]) => {
  const f = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/* A translucent foreground is composited over its background before measuring, which is
 * what the eye sees and what a ratio taken from the declared colour alone gets wrong. */
const over = (fg, bg) => {
  const a = fg[3];
  if (a >= 1) return fg;
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1);
};

const ratio = (fg, bg) => {
  const a = lum(over(fg, bg)) + 0.05;
  const b = lum(bg) + 0.05;
  return (Math.max(a, b) / Math.min(a, b));
};

const LEVEL = String(state.contrastLevel || "AA").toUpperCase();
const NORMAL = LEVEL === "AAA" ? 7.0 : 4.5;
const LARGE = LEVEL === "AAA" ? 4.5 : 3.0;

const exemptions = (state.contrastExemptions || []);
const exemptKey = new Map();
for (const e of exemptions) {
  const k = `${String(e.text || "").trim().toLowerCase()}|${String(e.owner || "").trim()}`;
  exemptKey.set(k, { ...e, used: false });
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

let belowBody = 0, belowLarge = 0, unresolved = 0, measured = 0;
const seen = new Set();

for (const f of frames) {
  for (const t of f.texts || []) {
    const s = String(t[0] || "").trim();
    if (!s) continue;
    const size = Number(t[5]) || 0;
    const weight = Number(t[6]) || 400;
    const fgRaw = t[9], bgRaw = t[10];

    /* A capture taken before 0.8.0 has no colour fields. Reporting those as clean would
     * be the silence-reads-as-success failure; they are reported as unmeasured. */
    if (fgRaw === undefined || bgRaw === undefined) {
      unresolved++;
      const k = `old|${f.cap}`;
      if (!seen.has(k)) {
        seen.add(k);
        fail("unresolved", `${f.pkg} :: ${f.cap}`,
          "this capture predates the colour fields, so nothing here was measured. Re-capture before reading any result");
      }
      continue;
    }
    const fg = parse(fgRaw), bg = parse(bgRaw);
    if (!fg || !bg || bg[3] < 1) {
      unresolved++;
      /* Collapsed by the background that could not be resolved: one transparent surface
       * produces one finding, not one per word on it. Forty-four findings for a single
       * cause is a report nobody reads to the end, which is how a real defect two lines
       * below it survives. */
      const k = `unres|${bgRaw}`;
      if (!seen.has(k)) {
        seen.add(k);
        fail("unresolved", `background ${bgRaw}`,
          `could not be resolved to an opaque colour, so nothing over it was scored. First seen on ` +
          `"${s.slice(0, 28)}" in ${f.cap}. Text over an image, a gradient or a translucent layer is not ` +
          `scored here, because a confident wrong ratio is worse than an admitted gap`);
      }
      continue;
    }

    const key = `${s.toLowerCase()}|${String(t[7] || "").trim()}`;
    const ex = exemptKey.get(key);
    if (ex) { ex.used = true; continue; }

    measured++;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? LARGE : NORMAL;
    const r = ratio(fg, bg);
    if (r + 0.005 < need) {
      const dedupe = `${key}|${Math.round(r * 100)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      if (large) belowLarge++; else belowBody++;
      fail(large ? "large-contrast" : "body-contrast",
        `${f.pkg} :: ${f.cap} :: "${s.slice(0, 28)}"`,
        `${r.toFixed(2)}:1 at ${size}px/${weight}, and ${LEVEL} needs ${need}:1 for ${large ? "large" : "normal"} text. ` +
        `${fgRaw} on ${bgRaw}`);
    }
  }
}

/* An exemption nobody needs is a silenced check waiting to hide a real defect. */
let stale = 0;
for (const [k, e] of exemptKey) {
  if (e.used) continue;
  stale++;
  fail("exemption-used", k.split("|")[0] || "(unnamed)",
    "is exempted from contrast and no run matched it. Either the text changed or the exemption outlived its reason");
}

console.log(`frames:        ${frames.length}`);
console.log(`runs measured: ${measured}`);
console.log(`level:         ${LEVEL} (${NORMAL}:1 normal, ${LARGE}:1 large)`);
console.log(`exemptions:    ${exemptions.length}`);
console.log("");

const table = [
  ["body-contrast", belowBody, `${measured} runs`],
  ["large-contrast", belowLarge, `${measured} runs`],
  ["unresolved", unresolved, unresolved ? `${unresolved} run(s) not scored, and that is not a pass` : "every run resolved to an opaque pair"],
  ["exemption-used", stale, `${exemptions.length} exemptions`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(15)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!measured && !unresolved)
  console.log("\nNOTE  nothing was measured. That is not the same as passing.");

console.log("\nNOTE  text over an image, a gradient or a translucent layer cannot be scored from a");
console.log("      resolved background colour. Those are counted as unresolved, never as clean.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Contrast ${findings.length ? "does NOT meet the declared level" : `meets ${LEVEL}`}.`);
process.exit(findings.length ? 1 : 0);
