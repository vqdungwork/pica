/**
 * code-tokens-check.mjs: the design-to-code gate. Runs at 7.5, on the front end
 * source, after the developers have built from the approved design.
 *
 * This is the cheapest half of step 7.10. The expensive half compares the rendered
 * build against the approved HTML; this one compares the SOURCE against the tokens
 * and catches the most common divergence before anything is rendered at all.
 *
 * The failure it prevents: a developer needs a colour, the token name is not obvious,
 * and #1f5fd8 goes in directly. It looks identical. It is identical, today. It stops
 * being identical the first time the palette changes, and by then there are two
 * hundred of them and nobody knows which were deliberate.
 *
 * Four checks:
 *
 *   1. RAW COLOUR    hex and rgb() literals in source that are not in tokens.
 *                    PASS: 0, or listed in rawValueExemptions.
 *   2. RAW SPACING   px literals outside the declared spacing scale.
 *                    PASS: 0, or exempted.
 *   3. RAW RADIUS    border-radius literals not in the radius scale.
 *                    PASS: 0, or exempted.
 *   4. LINEAR EASING transition and animation timing functions set to linear, which
 *                    every motion guideline rejects.  PASS: 0.
 *
 * Deliberately does not parse the code. It reads text, because a front end can be
 * React, Vue, Svelte, styled-components, Tailwind or plain CSS, and a parser for one
 * of those is a parser that silently returns zero for the rest. A regex that finds
 * a hex literal finds it in all of them.
 *
 * Usage: node code-tokens-check.mjs <src-dir> <tokens.json> [state.json]
 */
import fs from "fs";
import path from "path";

const [, , srcDir, tokensPath, statePath] = process.argv;
if (!srcDir || !tokensPath) {
  console.error("usage: node code-tokens-check.mjs <src-dir> <tokens.json> [state.json]");
  process.exit(2);
}

let tokens, state = {};
try {
  tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  if (statePath) state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read or parse an input (${e.message}).`);
  process.exit(2);
}

const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".css", ".scss", ".less", ".styl"]);
const SKIP_DIR = new Set(["node_modules", "dist", "build", ".next", "coverage", ".git", "__snapshots__"]);

const files = [];
(function walk(d) {
  let entries;
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(path.join(d, e.name)); }
    else if (EXT.has(path.extname(e.name))) files.push(path.join(d, e.name));
  }
})(srcDir);

/* Zero files is not a clean run. It means the path was wrong, and reporting a pass on
 * a directory nobody read is the silence-reads-as-success failure. */
if (!files.length) {
  console.error(`FAIL  no source files found under ${srcDir}. The path is wrong, and an empty scan is not a pass.`);
  process.exit(2);
}

/* Flatten the token tree to a set of literal values, whatever shape it is in. Tokens
 * come in three tiers and several export formats; the values are what matters here. */
const values = new Set();
(function flatten(o) {
  if (o == null) return;
  if (typeof o === "string" || typeof o === "number") { values.add(String(o).toLowerCase().trim()); return; }
  if (Array.isArray(o)) { o.forEach(flatten); return; }
  for (const v of Object.values(o)) flatten(v);
})(tokens);

const exempt = new Set((state.rawValueExemptions || []).map((x) =>
  String(typeof x === "string" ? x : x.value || "").toLowerCase().trim()));

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const norm = (h) => {
  const s = h.toLowerCase();
  /* #abc and #aabbcc are the same colour. Comparing them as strings reports a false
   * positive on a shorthand that is already in the token file. */
  return s.length === 4 ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s;
};

const spacingScale = new Set(
  [...values].filter((v) => /^-?\d+(\.\d+)?px$/.test(v)).map((v) => v)
);

let rawColour = 0, rawSpacing = 0, rawRadius = 0, linear = 0;
const seen = new Set();

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  const rel = path.relative(srcDir, f);
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    /* Comments are not shipped styling. Checking them reports the note a developer
     * left about a colour as if it were the colour. */
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    const at = `${rel}:${i + 1}`;

    /* ---- 1. raw colour ---- */
    for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g)) {
      const v = norm(m[0]);
      if (values.has(v) || exempt.has(v)) continue;
      const key = `c|${v}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawColour++;
      fail("raw-colour", at, `${m[0]} is not a token value. It is identical today and diverges the first time the palette moves`);
    }

    /* ---- 2. raw spacing ---- *
     * Scoped to the DECLARATION VALUE, not the line. The first version gated on whether
     * the line mentioned a spacing property and then scanned every px on it, so a
     * `border: 2px` sharing a line with a padding was reported as spacing.
     *
     * 0 and 1px are excluded: a hairline border and a zero are not spacing decisions,
     * and flagging them trains people to ignore the check. */
    for (const d of code.matchAll(
      /\b(margin|padding|gap|row-?gap|column-?gap|top|bottom|left|right|inset)[a-zA-Z-]*\s*:\s*([^;}\n]+)/gi)) {
      for (const m of d[2].matchAll(/\b(\d{1,3})px\b/g)) {
        const v = `${m[1]}px`;
        if (m[1] === "0" || m[1] === "1") continue;
        if (spacingScale.has(v) || values.has(v) || exempt.has(v)) continue;
        const key = `s|${v}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rawSpacing++;
        fail("raw-spacing", at, `${v} is not on the spacing scale. Either add it to the scale deliberately, or use the nearest step`);
      }
    }

    /* ---- 3. raw radius ---- *
     * Same scoping, and this is where the defect actually showed. The line
     * `.card{padding:24px;border-radius:12px;border:1px solid ...}` was reported as
     * "border-radius 1px", from the border width. `border: 1px solid` appears in
     * essentially every stylesheet ever written, so as shipped this check cried wolf on
     * every real project, and a check that cries wolf is a check people switch off. */
    for (const d of code.matchAll(/border-?radius[a-zA-Z-]*\s*:\s*([^;}\n]+)/gi)) {
      for (const m of d[1].matchAll(/\b(\d{1,4})px\b/g)) {
        const v = `${m[1]}px`;
        if (values.has(v) || exempt.has(v)) continue;
        const key = `r|${v}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rawRadius++;
        fail("raw-radius", at, `border-radius ${v} is not in the radius scale. This is how a design direction leaks away one component at a time`);
      }
    }

    /* ---- 4. linear easing ---- */
    if (/(transition|animation)[^;]*\blinear\b/i.test(code) || /timingFunction:\s*['"]linear/i.test(code)) {
      linear++;
      fail("linear-easing", at, "linear timing. Every motion guideline rejects it: entering uses ease-out, exiting ease-in, state changes ease-in-out");
    }
  });
}

/* ---- report ------------------------------------------------------------- */
console.log(`source files:  ${files.length} under ${srcDir}`);
console.log(`token values:  ${values.size}`);
console.log(`exemptions:    ${exempt.size}`);
console.log("");

const table = [
  ["raw-colour", rawColour, `${values.size} token values known`],
  ["raw-spacing", rawSpacing, spacingScale.size ? `${spacingScale.size} px steps in tokens` : "no px scale in tokens"],
  ["raw-radius", rawRadius, `${files.length} files`],
  ["linear-easing", linear, `${files.length} files`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(15)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (!spacingScale.size)
  console.log("\nNOTE  tokens carry no px values, so the spacing check found nothing to compare against.\n      That is not the same as passing it.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Code ${findings.length ? "has diverged from the tokens" : "consumes the tokens it was given"}.`);
process.exit(findings.length ? 1 : 0);
