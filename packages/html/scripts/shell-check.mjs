/**
 * shell-check.mjs: the review shell. Runs before the shell is handed to anyone.
 *
 * `html-prototype.md` has specified the shell since 0.3.0 and nothing read it. Every rule
 * in it was earned by a review that went wrong: a document instead of a demo, a tab bar
 * in build order, a tab that navigated away, and all of them stayed enforceable only by
 * somebody remembering.
 *
 * Textual, no browser, like flow-check and for the same reason: this has to work when the
 * page is broken, and a shell that fails to render is exactly when you want to know why.
 *
 * Six checks:
 *
 *   1. META LINE     the shell says what this is and WHAT IT DOES NOT DO, with a
 *                    revision date and the viewports.  PASS: all four present.
 *   2. FLOW FIRST    the interactive flow is the first or second tab, and the default.
 *                    PASS: both.
 *   3. ZOOM          fit width, fit screen and 100% all exist, and fit screen is not
 *                    capped at 100%.  PASS: three controls, no cap at 1.
 *   4. TABS IN PLACE no tab navigates away from the shell.  PASS: 0.
 *   5. GROUP ORDER   applications and roles, then states, then options, then the system.
 *                    PASS: 0 inversions.
 *   6. FRAME INSET   the gap between a frame and the pane edge is on the spacing scale.
 *                    PASS: 0 off-scale insets.
 *
 * WHAT IT CANNOT DO: tell you the shell is USABLE. Six green checks describe a shell with
 * the right parts in the right order, and whether a reviewer can find the thing they came
 * for is answered by watching one try.
 *
 * Usage: node shell-check.mjs <review.html> [state.json]
 */
import fs from "fs";

const [, , shellPath, statePath] = process.argv;
if (!shellPath) {
  console.error("usage: node shell-check.mjs <review.html> [state.json]");
  process.exit(2);
}

let html, state = {};
try {
  html = fs.readFileSync(shellPath, "utf8");
  if (statePath) state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read an input (${e.message}).`);
  process.exit(2);
}
if (html.trim().length < 200) {
  console.error(`FAIL  ${shellPath} is ${html.trim().length} bytes. There is no shell to check, and`);
  console.error("      reporting zero findings on an empty file would pass while measuring nothing.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- the tabs ------------------------------------------------------------ *
 * A tab is anything with a tab role, or an element carrying data-tab / data-pane. Matched
 * broadly on purpose: a shell writes its bar in whatever markup suits it, and a matcher
 * that only found <button role="tab"> would report "0 tabs" on a working page and call it
 * a pass. Zero tabs is a failure here for exactly that reason. */
const tabs = [];
for (const m of html.matchAll(/<(button|a|div|li)\b([^>]*(?:role=["']tab["']|data-(?:tab|pane|target)=)[^>]*)>([\s\S]*?)<\/\1>/gi)) {
  const attrs = m[2];
  const label = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!label) continue;
  tabs.push({
    label,
    tag: m[1].toLowerCase(),
    selected: /aria-selected=["']true["']|class=["'][^"']*\b(is-)?(active|selected|current)\b/i.test(attrs),
    href: (/href=["']([^"']+)["']/.exec(attrs) || [])[1] || null,
    attrs,
  });
}

if (!tabs.length) {
  console.error("FAIL  no tabs found in the shell. Either it is not a tabbed shell, which the rule");
  console.error("      requires, or its tabs carry neither a tab role nor a data-tab attribute and");
  console.error("      nothing here could find them. Zero tabs is not a pass.");
  process.exit(1);
}

/* ---- 1. the meta line ---------------------------------------------------- *
 * The caveat is the load-bearing half. Two sentences written after somebody mistook a
 * demo for a product are the reason this check exists. */
const head = html.slice(0, html.search(/role=["']tab/i) + 1 || 4000);
let metaGaps = 0;
const META = [
  ["a revision date", /revis(ed|ion)[^<]{0,40}\d|\b\d{1,2}[.\-/ ]\d{1,2}[.\-/ ]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i],
  ["what it does not do", /\bno (database|live api|backend|server|payment)\b|\bsample data\b|\bnothing is (signed|transacted|charged|sent)\b|\bnot (a |)production\b|\bno real\b/i],
  ["the viewports it was built at", /\b\d{3,4}\s*[x×]\s*\d{3,4}\b/],
];
for (const [what, re] of META) {
  if (!re.test(head)) {
    metaGaps++;
    fail("meta-line", what,
      `the shell's header does not state it. ${what === "what it does not do"
        ? "This is the load-bearing half: \"sample data, no database, no live API\" is the sentence that stops a demo being mistaken for a product, and it was written after somebody made that mistake"
        : "A reviewer opening this in three weeks cannot tell what they are looking at"}`);
  }
}

/* ---- 2. the interactive flow leads ---------------------------------------- */
let flowGaps = 0;
const FLOW = /\binteractive\b|\bflow\b|\bprototype\b|\bclickable\b/i;
const flowAt = tabs.findIndex((t) => FLOW.test(t.label));
if (flowAt < 0) {
  flowGaps++;
  fail("flow-first", "the tab bar",
    `no tab names the interactive flow. A shell of boards is not a package: the boards settle a ` +
    `decision and the flow is what the reviewer uses. Tabs found: ${tabs.slice(0, 6).map((t) => t.label).join(", ")}`);
} else {
  if (flowAt > 1) {
    flowGaps++;
    fail("flow-first", tabs[flowAt].label,
      `is tab ${flowAt + 1}. Tab order reads as priority order whatever you intended, and the ` +
      `first thing a refresh shows is the argument the shell makes about what the deliverable is`);
  }
  if (!tabs.some((t) => FLOW.test(t.label) && t.selected)) {
    flowGaps++;
    fail("flow-first", "the default tab",
      `no interactive tab is marked selected, so the shell opens on whatever the markup lists first`);
  }
}

/* ---- 3. the zoom control -------------------------------------------------- */
let zoomGaps = 0;
/* Scoped to the CONTROLS, not the document. Searching the whole file for "100%" matched
 * `html,body{height:100%}` in the stylesheet and a sentence in a code comment, so removing
 * the exact-size button entirely still reported the control as present: a check passing
 * because of a CSS declaration is a check measuring the wrong file. */
const controls = [...html.matchAll(/<(button|a|div|span|label|input|option)\b([^>]*)>([\s\S]{0,80}?)<\/\1>/gi)]
  .map((m) => `${m[2]} ${m[3].replace(/<[^>]+>/g, " ")}`)
  .filter((t) => /zoom|scale|fit|%|actual size/i.test(t))
  .join(" | ");

const ZOOM = [
  ["fit width", /fit[\s_-]?width/i],
  ["fit screen", /fit[\s_-]?(screen|page|all)/i],
  ["100%", /\b100\s*%|\bactual size\b|\bzoom[\s_-]?(one|1)\b|data-zoom=["']one["']/i],
];
for (const [what, re] of ZOOM) {
  if (!re.test(controls)) {
    zoomGaps++;
    fail("zoom", what,
      what === "100%"
        ? "there is no exact-size control. 100% is where a reviewer decides whether 14px is too small, " +
          "and a shell that quietly renders at 92% makes that judgement about a size that does not exist"
        : `there is no ${what} control. A 1440-wide frame does not fit a 1440-wide laptop, so the ` +
          `reviewer with the smallest screen sees the product at 70% and never knows`);
  }
}
/* Fit screen capped at 1 is the common mistake: a 375 phone frame on a 2560 display is
 * legible at 180% and postage-stamp sized at 100%. */
if (/Math\.min\s*\(\s*1\s*,|Math\.min\s*\([^)]*,\s*1\s*\)/.test(html) && ZOOM[1][1].test(html)) {
  zoomGaps++;
  fail("zoom", "fit screen",
    "is capped at 100% by a Math.min against 1. A 375-wide phone frame on a large display is legible " +
    "at 180% and postage-stamp sized at 100%. Cap it somewhere sane rather than at one");
}

/* ---- 4. every tab loads in place ------------------------------------------ */
let leaves = 0;
for (const t of tabs) {
  if (!t.href) continue;
  if (t.href.startsWith("#") || t.href === "" || t.href === "javascript:void(0)") continue;
  leaves++;
  fail("tabs-in-place", t.label,
    `is a link to ${t.href}. A tab that navigates away from the shell is a tab a reviewer does not ` +
    `come back from, and the next thing they do is close it`);
}

/* ---- 5. the group order --------------------------------------------------- *
 * Applications and roles, then states, then settled options, then the system. Reversed,
 * a reviewer sees a spec and never reaches the product. */
let inversions = 0;
const RANK = [
  [/\brole\b|\bapp\b|\bportal\b|\bconsole\b|\binteractive\b|\bflow\b/i, 0, "the product"],
  [/\bstate\b|\bwp\s*\d|\bwp\d/i, 1, "the states behind it"],
  [/\boption\b/i, 2, "the settled options"],
  [/\bdesign system\b|\btoken/i, 3, "the system it was built from"],
];
const rankOf = (label) => {
  for (const [re, r] of RANK) if (re.test(label)) return r;
  return null;
};
let seen = -1, seenLabel = "";
for (const t of tabs) {
  const r = rankOf(t.label);
  if (r === null) continue;
  if (r < seen) {
    inversions++;
    const name = RANK.find(([, rr]) => rr === r)[2];
    fail("group-order", t.label,
      `is ${name} and sits after "${seenLabel}". Applications and roles first, then the states, then ` +
      `the settled options, then the system. Reversed, a reviewer reads a spec and never reaches the product`);
    break;   // one finding: the first inversion is the one to fix
  }
  if (r > seen) { seen = r; seenLabel = t.label; }
}

/* ---- 6. the frame inset is on the scale ----------------------------------- */
let insetGaps = 0;
let scale = new Set();
let scaleFrom = "";
try {
  const t = JSON.parse(fs.readFileSync(state.tokensPath || "tokens/tokens.json", "utf8"));
  const SPACING = /^--(s|sp|space|spacing|gap|gutter|inset|pad|padding|margin)([-_]|$)/i;
  const SIZE = /(^|[-_])(h|w|height|width|max|min|size|radius|r)([-_]|$)/i;
  for (const [k, v] of Object.entries(t)) {
    if (!SPACING.test(k) || SIZE.test(k)) continue;
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim());
    if (m) scale.add(Math.abs(Math.round(Number(m[1]))));
  }
  scaleFrom = scale.size ? `${scale.size} step(s) from the spacing tokens` : "no spacing tokens found";
} catch {
  for (const v of (state.spacingScale || [])) scale.add(Math.abs(Math.round(Number(v))));
  scaleFrom = scale.size ? `${scale.size} step(s) from state.spacingScale` : "no scale available. This check did NOT run";
}
scale.delete(0); scale.delete(1);

if (scale.size) {
  /* The pane's own padding, which is the gap the frame sits at. Read from the declared
   * value rather than measured, because the shell is excluded from the capture: it is
   * navigation, not a screen, and capturing it would put the chrome in the census. */
  const paneRules = [...html.matchAll(/\.(pane|viewport|stage|canvas|shell__body)[^{]*\{([^}]*)\}/gi)];
  for (const [, sel, body] of paneRules) {
    for (const m of body.matchAll(/padding[a-z-]*\s*:\s*([^;]+)/gi)) {
      for (const px of String(m[1]).matchAll(/(\d+(?:\.\d+)?)px/g)) {
        const v = Math.round(Number(px[1]));
        if (v === 0) continue;
        if (![...scale].some((s) => Math.abs(s - v) <= 1)) {
          insetGaps++;
          fail("frame-inset", `.${sel}`,
            `sits frames ${v}px from the pane edge, which is on no step of the spacing scale ` +
            `(${[...scale].sort((a, b) => a - b).join(", ")}). A 20px inset around a design built on an ` +
            `8px scale is the first thing a designer notices and the last thing anyone writes down`);
        }
      }
    }
  }
}

/* ---- report -------------------------------------------------------------- */
/* Case-insensitive: a shell writes "State boards" in the markup and uppercases it in CSS,
 * and matching the rendered form would report a grouped bar as ungrouped. */
const groups = [...html.matchAll(/\b(role|future|state boards?|option boards?|system)\b/gi)].length;
console.log(`shell:            ${shellPath}`);
console.log(`tabs:             ${tabs.length}${groups ? `, ${groups} group label(s)` : ", ungrouped"}`);
console.log(`interactive tab:  ${flowAt >= 0 ? `#${flowAt + 1} "${tabs[flowAt].label}"` : "NONE"}`);
console.log(`spacing scale:    ${scaleFrom}`);
console.log("");

const table = [
  ["meta-line", metaGaps, "4 things the header has to say"],
  ["flow-first", flowGaps, `${tabs.length} tabs`],
  ["zoom", zoomGaps, "3 controls"],
  ["tabs-in-place", leaves, `${tabs.filter((t) => t.href).length} tab(s) with an href`],
  ["group-order", inversions, groups ? `${groups} group label(s)` : "ungrouped, order still read"],
  ["frame-inset", insetGaps, scale.size ? `${scaleFrom}` : "NOT RUN, no scale"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(14)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (tabs.length > 12)
  console.log(`\nNOTE  ${tabs.length} tabs. If the bar does not fit, the tabs are too verbose rather than too\n` +
              "      many: a bar that needs a scroll hides whatever is last.");

console.log("\nNOTE  this cannot tell you the shell is USABLE. Six green checks describe the right parts");
console.log("      in the right order. Whether a reviewer finds what they came for is answered by");
console.log("      watching one try.");

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The shell ${findings.length ? "is NOT ready to hand to a reviewer" : "has the parts the rule requires, in the order it requires"}.`);
process.exit(findings.length ? 1 : 0);
