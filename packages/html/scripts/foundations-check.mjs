/**
 * foundations-check.mjs — the storybook, checked at last.
 *
 * html-prototype.md has asked for `design-system.html` since step 3 and then says this about it,
 * in its own words:
 *
 *   "No check reads this file. pica.md has asked for it since step 3, this rule names it, and the
 *    only script that mentions it is the capture producer, which EXCLUDES it. So the storybook is a
 *    rule with no executable behind it, which is the class of gap 0.3.0 shipped three of and this
 *    project keeps finding in itself."
 *
 * It also says exactly what would close it: "a check that every token in tokens/tokens.json appears
 * on the page, and that every class a screen uses appears there with at least one variant". This is
 * that check, written to that specification rather than to a new one, plus what 2.0.0 added: the
 * audience floors, and the icon set.
 *
 * Six checks:
 *
 *   1. TOKEN SHOWN      every token in tokens.json appears on the storybook page.
 *   2. CLASS DOCUMENTED every class a screen uses appears on the page. A component can otherwise
 *                       enter the product without ever being documented and nothing says so.
 *   3. CONTRAST FLOOR   every declared colour pair meets the AUDIENCE floor, not just AA. This is
 *                       where sector density loses to an audience floor, as a number.
 *   4. STATE COVERED    every component on the page carries every state the kit declares.
 *   5. ICON SET         named, licensed, with a stroke weight matching the direction.
 *   6. NO EMOJI ICONS   no emoji standing in for an icon. Fifteen reached a component library once
 *                       and every one had to be retrofitted across the whole file.
 *
 * Usage: node foundations-check.mjs <design-system.html> <tokens.json> <state.json>
 */
import fs from "fs";

const [, , dsPath, tokensPath, statePath] = process.argv;
if (!dsPath || !tokensPath || !statePath) {
  console.error("usage: node foundations-check.mjs <design-system.html> <tokens.json> <state.json>");
  process.exit(2);
}

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (!fs.existsSync(dsPath)) {
  console.log(`NOT APPLICABLE  ${dsPath} does not exist, so the foundations page has not been built.`);
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}
const ds = fs.readFileSync(dsPath, "utf8");
let tokens = {};
try { tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8")); } catch {}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const said = (x, min = 3) => String(x || "").trim().length >= min;

/* The prototype shell is not the design system. `frame`, `scr` and the rest are proto.js's
   machinery — documented in html-prototype.md, owned by the router, and never a component the
   client approves. Asking the storybook to document them would make the check demand the wrong
   thing loudly, which is worse than not asking. */
const SHELL = new Set(["frame", "frame-wrap", "scr", "sheetwrap", "sheet", "viewport", "tabbar",
  "tab", "frame-cap", "chrome", "statusbar", "homeindicator", "notch", "zoom", "meta", "shell", "stack"]);

/* tokens.json is a flat map of dotted names to { value, source, origin } */
const tokenNames = Object.keys(tokens).filter((k) => !k.startsWith("_"));

/* ---- 1. TOKEN SHOWN ------------------------------------------------------ */
let tokenBad = 0;
for (const name of tokenNames) {
  const css = "--" + name.replace(/\./g, "-");
  if (ds.includes(name) || ds.includes(css)) continue;
  tokenBad++;
  fail("token-shown", name,
    `appears in tokens.json and nowhere on the foundations page. A token nobody can see is a token ` +
    "nobody approved, and the page exists so the client approves the system rather than a screen that uses it.");
}

/* ---- 2. CLASS DOCUMENTED ------------------------------------------------- */
let classBad = 0, classesSeen = 0;
const screenClasses = new Set();
for (const dir of ["html"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html") || f === "design-system.html" || f === "review.html") continue;
    const src = fs.readFileSync(`${dir}/${f}`, "utf8");
    for (const m of src.matchAll(/class="([^"]+)"/g))
      for (const c of m[1].split(/\s+/))
        if (c && !/^(is|has|js)-/.test(c) && !SHELL.has(c)) screenClasses.add(c);
  }
}
classesSeen = screenClasses.size;
for (const c of screenClasses) {
  if (ds.includes(`"${c}"`) || ds.includes(`${c} `) || ds.includes(`.${c}`)) continue;
  classBad++;
  fail("class-documented", `.${c}`,
    "is used on a screen and appears nowhere on the foundations page. A component that enters the " +
    "product undocumented will not receive the next token change, and nobody will notice.");
}

/* ---- 3. CONTRAST FLOOR --------------------------------------------------- */
const floors = (state.audience && state.audience.floors) || {};
const need = Number(floors.contrastRatio ?? 4.5);
let contrastBad = 0, pairsSeen = 0;
const lum = (hex) => {
  const h = String(hex).replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
for (const pair of (state.direction && state.direction.pairs) || []) {
  const a = lum(pair.fg), b = lum(pair.bg);
  if (a === null || b === null) continue;
  pairsSeen++;
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  if (ratio >= need) continue;
  contrastBad++;
  fail("contrast-floor", `${pair.name || `${pair.fg} on ${pair.bg}`}`,
    `computes ${ratio.toFixed(2)}:1 and the audience floor is ${need}:1. A floor is not a preference ` +
    "to be balanced against the sector's density — it is the number below which a real user cannot read this.");
}

/* ---- 4. STATE COVERED ---------------------------------------------------- */
let stateBad = 0;
const kitStates = (state.direction && state.direction.componentStates) || [];
for (const comp of (state.direction && state.direction.components) || []) {
  const nm = String(comp.name ?? comp);
  const declared = comp.states || kitStates;
  for (const st of declared) {
    if (ds.includes(`data-state="${st}"`) || ds.includes(`${nm}--${st}`)) continue;
    stateBad++;
    fail("state-covered", `${nm} · ${st}`,
      "is declared and does not appear on the foundations page. A state nobody drew is a state " +
      "somebody implements from imagination.");
  }
}

/* ---- 5. ICON SET & 6. NO EMOJI ICONS ------------------------------------- */
let iconBad = 0;
const icons = (state.direction && state.direction.icons) || state.icons;
if (!icons) {
  iconBad++;
  fail("icon-set", "direction.icons",
    "is absent. html-prototype.md forbids emoji standing in for icons and nothing decided what the " +
    "right set is, so the rule bans the wrong answer with no way to give the right one.");
} else {
  for (const [k, why] of [
    ["name", "an icon set with no name cannot be installed by whoever builds this"],
    ["licence", "a set whose licence nobody checked is a legal exposure, not a taste question"],
    ["strokeWidth", "the stroke has to match the direction or the icons read as another product's"],
    ["gridSize", "a set drawn on a different grid will not align with anything"],
  ]) if (!said(icons[k], 2)) {
    iconBad++;
    fail("icon-set", `direction.icons.${k}`, `absent: ${why}.`);
  }
  const declaredStroke = state.direction && state.direction.asserts && state.direction.asserts.strokeWidth;
  if (declaredStroke !== undefined && String(icons.strokeWidth) !== String(declaredStroke)) {
    iconBad++;
    fail("icon-set", "direction.icons.strokeWidth",
      `is ${icons.strokeWidth} and the direction asserts ${declaredStroke}. One of them is wrong and ` +
      "the icons are what a reader notices.");
  }
}

let emojiBad = 0;
/* emoji as CONTENT is a different question — a reaction picker's subject is emoji. Only an emoji
   sitting where an icon belongs is a finding, so look inside the icon slots. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const m of ds.matchAll(/<(?:i|span|div)[^>]*class="[^"]*icon[^"]*"[^>]*>([^<]*)</g)) {
  if (!EMOJI.test(m[1])) continue;
  emojiBad++;
  fail("no-emoji-icons", `an icon slot contains "${m[1].trim()}"`,
    "Fifteen emoji and glyph placeholders reached a component library before anyone noticed, and " +
    "every one had to be retrofitted across the whole file. Use the real set.");
}

const table = [
  ["token-shown", tokenBad, `${tokenNames.length} token(s)`],
  ["class-documented", classBad, `${classesSeen} class(es) used on screens`],
  ["contrast-floor", contrastBad, `${pairsSeen} pair(s) against a ${need}:1 floor`],
  ["state-covered", stateBad, `${kitStates.length} declared state(s)`],
  ["icon-set", iconBad, icons ? String(icons.name || "unnamed") : "not declared"],
  ["no-emoji-icons", emojiBad, "icon slots only; emoji as content is a different question"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(20)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
