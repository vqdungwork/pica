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
import path from "path";

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
/* Where the tab bar STARTS, which is where the header ends. Recorded from the first tab
 * ELEMENT, not from the first occurrence of the string: see the meta-line check below. */
let firstTabAt = -1;
for (const m of html.matchAll(/<(button|a|div|li)\b([^>]*(?:role=["']tab["']|data-(?:tab|pane|target)=)[^>]*)>([\s\S]*?)<\/\1>/gi)) {
  if (firstTabAt < 0) firstTabAt = m.index;
  const attrs = m[2];
  const label = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!label) continue;
  tabs.push({
    label,
    tag: m[1].toLowerCase(),
    selected: /aria-selected=["']true["']|class=["'][^"']*\b(is-)?(active|selected|current)\b/i.test(attrs),
    href: (/href=["']([^"']+)["']/.exec(attrs) || [])[1] || null,
    /* what this tab actually opens, so the flow test can read the file rather than
       guess from the label */
    src: (/data-src=["']([^"']+)["']/.exec(attrs) || [])[1]
      || (/data-(?:panel|pane|target)=["']([^"']+)["']/.exec(attrs) || [])[1] || null,
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
/* The header is everything before the tab bar. That used to be
 *   html.search(/role=["']tab/i)
 * which matches a `[role="tablist"]{...}` SELECTOR in the <head> stylesheet just as
 * happily as the markup. On one 1.3MB shell the selector sat at byte 2,684 and the meta
 * paragraph at 7,739, so a correct, visible meta line was reported absent three times
 * over: no revision date, no caveat, no viewports. The check was defeated by ordinary CSS.
 * Cut at the first tab ELEMENT instead, which is the thing the rule is actually about.
 *
 * And START at <body>, because the window used to begin at byte 0 and take the whole
 * <head> with it. On the same shell, deleting the meta line outright still scored
 * "viewports: present" - satisfied by the string 375x812 inside a CSS COMMENT. The rule
 * is that the READER can see it; <title>, <style> and every comment in them cannot be
 * read by anyone, and a check that counts them is scoring the file rather than the page. */
const bodyAt = (() => { const m = /<body\b[^>]*>/i.exec(html); return m ? m.index + m[0].length : 0; })();
const head = html.slice(bodyAt, firstTabAt > bodyAt ? firstTabAt : bodyAt + 4000);
let metaGaps = 0;
const META = [
  ["a revision date", /revis(ed|ion)[^<]{0,40}\d|\b\d{1,2}[.\-/ ]\d{1,2}[.\-/ ]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i],
  ["what it does not do", /\bno (database|live api|backend|server|payment)\b|\bsample data\b|\bnothing is (signed|transacted|charged|sent)\b|\bnot (a |)production\b|\bno real\b/i],
    /* &times; and &#215; render as the glyph the reader sees, so they say the viewports as
     plainly as a literal x does. A shell that wrote "375 &times; 812" was told it had not
     stated its viewports, while a 375x812 inside a CSS comment was accepted as proof. */
  ["the viewports it was built at", /\b\d{3,4}\s*(?:[x\u00d7]|&times;|&#215;)\s*\d{3,4}\b/i],
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
/* A TAB IS A FLOW IF IT POINTS AT A FILE THAT CARRIES A ROUTER — not if its label
 * happens to contain the word "flow".
 *
 * This was a regex over tab text. Rename a board tab "Operations · interactive flow"
 * and the shell passed; ship the real React demo labelled "POS · app" and it failed
 * with "no tab names the interactive flow". The check enforcing "a shell of boards is
 * not a package" could not tell a board from a package, and 2.0.0 never added a React
 * term to its vocabulary.
 *
 * flow-check already determines this from the markup: a file with data-nav/data-home,
 * or a <script> router. The same test is applied here, to the file each tab points at. */
const ROUTER = /data-nav\s*=|data-home\s*=|src=["'][^"']*proto\.js/i;
const dirOf = (p2) => path.dirname(path.resolve(p2));
const carriesRouter = (src2) => {
  if (!src2) return false;
  try { return ROUTER.test(fs.readFileSync(path.join(dirOf(shellPath), src2.split("?")[0]), "utf8")); }
  catch { return false; }
};
const FLOW_LABEL = /\binteractive\b|\bflow\b|\bprototype\b|\bclickable\b|\breact\b|\bdemo\b|\bapp\b/i;
const FLOW = { test: (t) => FLOW_LABEL.test(t) };
/* markup first, label only as a fallback for a tab whose target cannot be read */
const isFlowTab = (t) => carriesRouter(t.src) || (!t.src && FLOW.test(t.label));
const flowAt = tabs.findIndex(isFlowTab);

/* A DECLARED DEMO IS A FLOW THAT IS NOT A FILE.
 *
 * `state.flows` assumes the flow is a file in html/, which was true while everything was
 * static. Since 2.0.0 the flow is React and what the client receives is "a hosted URL,
 * never a repository" — so on those projects there is no file for a tab to point at, and
 * requiring one forced the demo to be embedded in an iframe inside the shell. That is the
 * arrangement that produced the double scrollbar and the 6%-zoom "fit screen": the shell
 * froze the iframe at its load height while the demo kept growing inside it.
 *
 * So `state.demo = { url, routes }` is declared separately, and a boards-only shell is a
 * complete deliverable when it LINKS to the demo rather than containing it. The link is
 * the thing checked, because a declaration nothing points at leaves the reviewer with a
 * shell of boards and no way to reach the half they were meant to use. */
const demo = state.demo && typeof state.demo === "object" ? state.demo : null;
const demoUrl = demo && typeof demo.url === "string" ? demo.url.trim() : "";
const demoLinked = demoUrl && (html.includes(demoUrl) ||
  /* a shell may link the origin and route on its own */
  (() => { try { return html.includes(new URL(demoUrl).origin); } catch { return false; } })());

if (demo && !demoUrl) {
  flowGaps++;
  fail("flow-first", "state.demo",
    "is declared with no `url`. A demo the reviewer cannot open is not a deliverable, and a " +
    "declaration with an empty url reads as one that was set up and never finished");
} else if (demoUrl && flowAt < 0) {
  /* boards-only shell, demo declared elsewhere: the valid arrangement */
  if (!demoLinked) {
    flowGaps++;
    fail("flow-first", "the tab bar",
      `state.demo declares ${demoUrl} and nothing in this shell links to it. The boards settle a ` +
      `decision and the flow is what the reviewer uses: a shell that mentions neither leaves them ` +
      `with half the package and no way to find the other half`);
  }
  if (!Array.isArray(demo.routes) || !demo.routes.length) {
    flowGaps++;
    fail("flow-first", "state.demo.routes",
      "lists no routes. Every screen, viewport and state must be reachable by its own URL — that is " +
      "what lets the capture measure the demo and what lets a reviewer be sent to one state. An " +
      "unlisted route set means state-coverage-check has nothing to multiply against");
  }
} else if (flowAt < 0) {
  flowGaps++;
  fail("flow-first", "the tab bar",
    `no tab names the interactive flow, and state.demo declares no hosted one. A shell of boards is ` +
    `not a package: the boards settle a decision and the flow is what the reviewer uses. Either ship ` +
    `the flow as a tab, or declare state.demo = { url, routes } and link it. ` +
    `Tabs found: ${tabs.slice(0, 6).map((t) => t.label).join(", ")}`);
} else {
  if (flowAt > 1) {
    flowGaps++;
    fail("flow-first", tabs[flowAt].label,
      `is tab ${flowAt + 1}. Tab order reads as priority order whatever you intended, and the ` +
      `first thing a refresh shows is the argument the shell makes about what the deliverable is`);
  }
  if (!tabs.some((t) => isFlowTab(t) && t.selected)) {
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
  const paneRules = [...html.matchAll(/(\.(?:pane|viewport|stage|canvas|shell__body)[^{]*)\{([^}]*)\}/gi)];
  for (const [, sel, body] of paneRules) {
    for (const m of body.matchAll(/padding[a-z-]*\s*:\s*([^;]+)/gi)) {
      for (const px of String(m[1]).matchAll(/(\d+(?:\.\d+)?)px/g)) {
        const v = Math.round(Number(px[1]));
        if (v === 0) continue;
        if (![...scale].some((s) => Math.abs(s - v) <= 1)) {
          insetGaps++;
          /* Name the WHOLE selector, and the value that was actually read. It used to
           * report only the matched keyword - `.pane` - for a rule that was
           * `.pane > h3{padding:26px 24px 10px}`, so "sits frames 26px from the pane edge"
           * described a heading, twice, and the reader went looking for a frame. */
          fail("frame-inset", sel.trim(),
            `declares ${m[0].trim()}, and ${v}px is on no step of the spacing scale ` +
            `(${[...scale].sort((a, b) => a - b).join(", ")}). An off-scale inset around a design ` +
            `built on that scale is the first thing a designer notices and the last thing anyone ` +
            `writes down. If this rule does not set a frame inset, it should not be named like one`);
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
