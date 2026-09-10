/**
 * font-check.mjs: the family the design declares against the family that actually painted.
 *
 * 2.0.0 took fonts out of intake. They were input 4's first line: "which fonts are installed
 * locally, and which are missing", and the constraint existed only because Figma's plugin runtime
 * cannot load a font installed during a session. That is Figma's limit, and Figma is the derived
 * artefact: letting it constrain the source of truth inverts the rule that where HTML and Figma
 * disagree, Figma is wrong. So design is font-free now, and the family is a webfont.
 *
 * A webfont can fail. And when it does, nothing says so: the browser silently substitutes, the page
 * looks slightly different, and every text position in the capture describes a layout in a family
 * nobody chose. Downstream, geometry-diff compares that against a Figma file rendering the real face
 * and reports hundreds of differences that are pure substitution: or, worse, both sides fall back,
 * everything "matches", and the design was never verified at all.
 *
 * This is a HANDOFF gate, not a design gate. During iteration a fallback is noise. At handoff it is
 * the difference between a measured reference and a meaningless one.
 *
 * Four checks:
 *
 *   1. FAMILY DECLARED   the direction names the family, so the porter knows what to install. A
 *                        system stack counts, but only when direction.fontsWhy says it was chosen.
 *   2. FAMILY RESOLVED   the family the capture actually resolved is the declared one.
 *   3. FALLBACK STATED   a real fallback stack, not one generic keyword. A fallback nobody chose is
 *                        chosen by the operating system, and differently on each one.
 *   4. FORCED DECLARED   a capture taken with --font is labelled as such and is not mistaken for a
 *                        native run. The rule is to capture both ways; a forced capture presented as
 *                        native is a diff that isolated nothing.
 *
 * Usage: node font-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node font-check.mjs <html-reference.json> <state.json>");
  process.exit(2);
}

let state, ref;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (!fs.existsSync(refPath)) {
  console.log(`NOT APPLICABLE  ${refPath} does not exist, so nothing has been captured.`);
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}
try { ref = JSON.parse(fs.readFileSync(refPath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${refPath} could not be parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 10) => String(x || "").trim().length >= min;
const meta = ref.meta || {};
const dir = state.direction || {};
const fonts = dir.fonts || (dir.font ? { display: dir.font } : null);

/* A generic keyword is a fallback of last resort, not a stack. `-apple-system` and its friends are
   system stacks and resolve differently on every platform, which is fine as the TAIL and useless as
   the whole answer. */
const GENERIC = /^(-apple-system|blinkmacsystemfont|system-ui|ui-sans-serif|ui-serif|ui-monospace|sans-serif|serif|monospace|cursive|fantasy)$/i;
const norm = (x) => String(x || "").trim().replace(/^["']|["']$/g, "");

/* ---- 1. FAMILY DECLARED -------------------------------------------------- */
let declaredBad = 0;
if (!fonts || !Object.keys(fonts).length) {
  declaredBad++;
  fail("family-declared", "direction.fonts",
    "names no font family. The family is what the porter installs and what geometry-diff holds both " +
    "sides to; without it the design has no typeface it can be said to be in.");
}
for (const [role, stack] of Object.entries(fonts || {})) {
  const first = norm(String(stack).split(",")[0]);
  if (!first) {
    declaredBad++;
    fail("family-declared", `direction.fonts.${role}`, "is empty.");
  } else if (GENERIC.test(first) && !said(dir.fontsWhy, 15)) {
    /* A system stack IS a valid direction: fast, native, no webfont to fail. What is not valid is
       arriving at one by default. So it passes when the direction says it was chosen and why, and
       fails when nothing does: the difference between a decision and an omission is the sentence. */
    declaredBad++;
    fail("family-declared", `direction.fonts.${role}`,
      `leads with "${first}", a system stack, and direction.fontsWhy does not say that was chosen. ` +
      "A system stack resolves to a different typeface on every platform, which is a real design " +
      "decision when it is one and an accident when nobody made it.");
  }
}

/* ---- 3. FALLBACK STATED -------------------------------------------------- */
let fallbackBad = 0;
for (const [role, stack] of Object.entries(fonts || {})) {
  const parts = String(stack).split(",").map(norm).filter(Boolean);
  if (parts.length >= 2) continue;
  fallbackBad++;
  fail("fallback-stated", `direction.fonts.${role}`,
    `is "${stack}" with no fallback after it. A webfont that fails then falls back to whatever the ` +
    "operating system picks, and it picks differently on each one.");
}

/* ---- 4. FORCED DECLARED -------------------------------------------------- */
let forcedBad = 0;
const forced = meta.forcedFont ? norm(meta.forcedFont) : null;
const resolved = norm(meta.font);
if (!("forcedFont" in meta)) {
  forcedBad++;
  fail("forced-declared", "meta.forcedFont",
    "is absent from the capture, so there is no way to tell a forced run from a native one. The rule " +
    "is to capture both ways, and a forced capture read as native is a diff that isolated nothing.");
}
if (!resolved) {
  forcedBad++;
  fail("forced-declared", "meta.font",
    "records no resolved family. The capture is meant to record the family the browser ACTUALLY " +
    "resolved, forced or not: without it a capture in one family gets diffed against a design in another.");
}

/* ---- 2. FAMILY RESOLVED -------------------------------------------------- */
let resolvedBad = 0;
if (resolved && fonts && Object.keys(fonts).length) {
  const want = forced || norm(String(Object.values(fonts)[0]).split(",")[0]);
  const same = resolved.toLowerCase() === want.toLowerCase();
  if (!same) {
    resolvedBad++;
    fail("family-resolved", `capture resolved "${resolved}"`,
      forced
        ? `and --font asked for "${want}". The force did not take, so the capture is in neither the ` +
          "declared family nor the forced one."
        : `and the design declares "${want}". The webfont did not load and the browser substituted ` +
          "silently: every text position in this reference describes a layout in a family nobody chose. " +
          "Downstream, geometry-diff reports that substitution as hundreds of design defects, or both " +
          "sides fall back and the design is never verified at all.");
  }
}

const table = [
  ["family-declared", declaredBad, fonts ? `${Object.keys(fonts).length} role(s) declared` : "none declared"],
  ["family-resolved", resolvedBad, resolved ? `capture resolved ${resolved}` : "no resolved family recorded"],
  ["fallback-stated", fallbackBad, `${Object.keys(fonts || {}).length} stack(s)`],
  ["forced-declared", forcedBad, forced ? `forced to ${forced}` : "native run"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
