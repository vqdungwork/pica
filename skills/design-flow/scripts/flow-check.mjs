#!/usr/bin/env node
/**
 * flow-check.mjs — the interactive flow is wired, and wired to the right place.
 *
 *   node flow-check.mjs --dir html [--state .pica/state.json] [--allow-none]
 *
 * A work package ships option boards AND an interactive prototype of its main
 * flow (html-prototype.md, "Options decide, the flow is the deliverable"). The
 * boards are static and measurable. The flow is not: every defect a human found
 * on the source project by *using* the prototype was a navigation defect with no
 * geometric signature — a row that opened another role's screen, a back control
 * that left the application, a deep link that bounced through the launcher, an
 * entry point that lit the wrong tab.
 *
 * None of them are visible in a screenshot of the destination, because the
 * destination renders perfectly. This script reads the wiring instead.
 *
 * The attribute vocabulary it checks, which pica declares for interactive
 * prototypes (SKILL.md, "The interactive flow"):
 *
 *   <section class="scr" data-scr="id" [data-back]>   a screen
 *   <div class="sheetwrap" data-sheetwrap="id">       a sheet
 *   data-go="id"        push a screen in this file
 *   data-tab="id"       switch to a root screen, resetting the stack
 *   data-sheet="id"     open a sheet in this file
 *   data-pane="id"      switch a pane inside the current screen
 *   data-href="f.html"  cross-application link, optionally "?scr=id"
 *   data-popback        return to where the user came from
 *   <script src="proto.js" data-nav='[{"id":"…"}]' data-home="id">
 *                       the router: the tab set and the root. Its presence is
 *                       what makes a file interactive rather than a board.
 *
 * Textual parse, no browser and no dependencies: this runs before the capture
 * harness and has to work when the page is broken. The consequence is that a
 * link built in JS is invisible here, so keep link targets in markup — which is
 * the convention anyway, because a target in markup is greppable.
 *
 * Exits non-zero on any finding, and also when it found nothing to check: zero
 * screens or zero links means a selector missed, not that the flow is sound.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > -1 ? process.argv[i + 1] : d;
};
const DIR = arg("--dir", "html");
const STATE = arg("--state", ".pica/state.json");
const ALLOW_NONE = process.argv.includes("--allow-none");

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const FLOWS = state.flows || [];

const files = readdirSync(DIR).filter((f) => f.endsWith(".html"));
if (!files.length) {
  console.error(`flow-check: no .html files in ${DIR}`);
  process.exit(2);
}

const all = (src, re) => [...src.matchAll(re)].map((m) => m[1]);

// One record per file. `screens` are the destinations that exist; the rest are
// the destinations something asks for.
const doc = new Map();
for (const f of files) {
  const src = readFileSync(join(DIR, f), "utf8");
  const nav = /data-nav='([^']*)'/.exec(src);
  let tabs = [];
  if (nav) {
    try {
      tabs = JSON.parse(nav[1]).map((t) => t.id);
    } catch (e) {
      // A malformed tab set is a finding, not something to shrug at: the router
      // throws on load and the whole prototype renders blank.
      tabs = { error: e.message };
    }
  }
  doc.set(f, {
    src,
    screens: new Set(all(src, /data-scr="([^"]+)"/g)),
    sheets: new Set(all(src, /data-sheetwrap="([^"]+)"/g)),
    go: all(src, /data-go="([^"]+)"/g),
    tab: all(src, /data-tab="([^"]+)"/g),
    sheet: all(src, /data-sheet="([^"]+)"/g),
    href: all(src, /data-href="([^"]+)"/g),
    tabs,
    router: !!nav,
    home: (/data-home="([^"]+)"/.exec(src) || [])[1],
    // A tab in the review shell is a lazily-loaded iframe, so the target sits on
    // the button as data-src, not on an <iframe src>. Read both: one project
    // reported every prototype orphaned because only the second form was read.
    iframes: [...all(src, /<iframe[^>]+src="([^"?#]+)/g), ...all(src, /data-src="([^"?#]+)/g)],
  });
}

// Interactive files are the ones that declare a router. Everything else is a
// board, and a board has no flow to check.
//
// Detect the router by its own tag, never by "does this file mention data-home".
// A documentation board that *describes* the convention in a <code> block matched
// the looser test and was then reported as an interactive prototype with a
// broken root — a finding about prose.
const interactive = [...doc].filter(([, d]) => d.router);

// Screens the router itself opens, rather than any control in the markup: the
// bell, a deep-link default, a redirect. Collected from the string literals in
// the prototype's own scripts, which is loose but wrong in the safe direction —
// it can excuse a screen that is genuinely unreachable, so the reachability
// finding stays advisory-strict and rendering every screen remains the real
// check.
const routerNames = new Set();
for (const j of readdirSync(DIR).filter((f) => f.endsWith(".js")))
  for (const m of readFileSync(join(DIR, j), "utf8").matchAll(/["'`]([a-z][a-z0-9-]{2,})["'`]/g))
    routerNames.add(m[1]);
const findings = [];
const add = (check, where, msg) => findings.push({ check, where, msg });

let links = 0, screens = 0;

for (const [f, d] of interactive) {
  screens += d.screens.size;

  if (!Array.isArray(d.tabs)) {
    add("nav-target", f, `data-nav is not valid JSON: ${d.tabs.error}`);
    d.tabs = [];
  }

  // 1. Every destination asked for in this file exists in this file.
  for (const [attr, ids, pool, kind] of [["data-go", d.go, d.screens, "data-scr"],
                                         ["data-tab", d.tab, d.screens, "data-scr"],
                                         ["data-sheet", d.sheet, d.sheets, "data-sheetwrap"]]) {
    for (const id of new Set(ids)) {
      links++;
      if (!pool.has(id)) add("dangling-target", f, `${attr}="${id}" resolves to no ${kind}`);
    }
  }

  // 2. Cross-application links: the file exists, and the deep link lands on a
  //    real screen. This is the check that catches a launcher entry pointing at
  //    a screen that was renamed in the application it opens.
  for (const h of new Set(d.href)) {
    links++;
    const [file, query] = h.split("?");
    if (!doc.has(basename(file))) {
      add("dangling-href", f, `data-href="${h}" names a file that is not in ${DIR}`);
      continue;
    }
    const scr = /(?:^|&)scr=([^&]+)/.exec(query || "");
    if (scr && !doc.get(basename(file)).screens.has(scr[1]))
      add("dangling-href", f, `data-href="${h}" deep-links to a screen ${basename(file)} does not have`);
  }

  // 3. The router's own two references.
  if (!d.home) add("nav-target", f, "declares screens but no data-home, so the router has no root");
  else if (!d.screens.has(d.home)) add("nav-target", f, `data-home="${d.home}" resolves to no data-scr`);
  for (const t of d.tabs)
    if (!d.screens.has(t)) add("nav-target", f, `nav tab "${t}" resolves to no data-scr`);

  // 4. Reachability. A screen nothing opens is either dead markup or a state the
  //    reviewer will be told about and never see. Both are findings; a genuine
  //    router-only screen belongs in flowExemptions.
  const reached = new Set([d.home, ...d.tabs, ...d.go, ...d.tab, ...d.sheet]);
  for (const [, o] of doc)
    for (const h of o.href) {
      const [file, query] = h.split("?");
      const scr = /(?:^|&)scr=([^&]+)/.exec(query || "");
      if (basename(file) === f && scr) reached.add(scr[1]);
    }
  const exempt = new Set((state.flowExemptions || []).filter((e) => e.file === f).map((e) => e.screen));
  for (const s of d.screens)
    if (!reached.has(s) && !exempt.has(s) && !routerNames.has(s))
      add("unreachable", f, `screen "${s}" has no control that opens it`);

  // 5. Dead ends. A screen with nothing outgoing and no way back traps a
  //    reviewer, and the reviewer reports the whole prototype as broken.
  const navRoots = new Set([d.home, ...d.tabs]);
  for (const s of d.screens) {
    if (navRoots.has(s)) continue;
    const body = section(d.src, s);
    if (body === null) continue;
    const out = /data-go=|data-tab=|data-sheet=|data-href=|data-back\b|data-popback\b|data-pane=/.test(body);
    if (!out) add("dead-end", f, `screen "${s}" has no outgoing control and no back affordance`);
  }
}

// 6. The review shell reaches every prototype. A prototype nobody can open from
//    review.html is a prototype nobody reviews.
const shell = [...doc].find(([f]) => f === "review.html");
if (shell) {
  const tabbed = new Set(shell[1].iframes.map((s) => basename(s)));
  for (const [f] of interactive)
    if (f !== "review.html" && !tabbed.has(f))
      add("orphan-prototype", "review.html", `${f} is interactive but has no tab in the review shell`);
}

// 7. Declared flows exist. This is what makes "one interactive prototype per
//    application" checkable rather than aspirational.
for (const fl of FLOWS) {
  if (!doc.has(basename(fl.entry || "")))
    add("flow-declared", STATE, `flow "${fl.app}" names entry ${fl.entry}, which is not in ${DIR}`);
  else if (fl.home && !doc.get(basename(fl.entry)).screens.has(fl.home))
    add("flow-declared", STATE, `flow "${fl.app}" names home "${fl.home}", which ${fl.entry} does not have`);
}

/** The markup of one screen: from its data-scr to the start of the next one.
 *  Sections do not nest in this convention, which is what makes a textual slice
 *  safe. Returns null when the attribute sits somewhere other than a section. */
function section(src, id) {
  const at = src.indexOf(`data-scr="${id}"`);
  if (at < 0) return null;
  const open = src.lastIndexOf("<", at);
  const next = src.slice(at).search(/data-scr="/g) > -1 ? src.indexOf('data-scr="', at + 1) : -1;
  const end = next < 0 ? src.length : src.lastIndexOf("<", next);
  return src.slice(open, end);
}

// ---- report -------------------------------------------------------------
console.log(`flow-check: ${files.length} file(s) in ${DIR}, ` +
  `${interactive.length} interactive (${interactive.map(([f]) => f).join(", ") || "none"}), ` +
  `${files.length - interactive.length} board(s)`);
console.log(`  ${screens} screen(s), ${links} link(s) checked` +
  (FLOWS.length ? `, ${FLOWS.length} declared flow(s)` : ", no flows declared in state"));

if (!interactive.length || !screens || !links) {
  if (ALLOW_NONE && !interactive.length) {
    console.log("no interactive prototype found; --allow-none was passed, so this is not a failure");
    process.exit(0);
  }
  console.error("\nFAIL: nothing to check. A work package ships an interactive prototype of its main " +
    "flow, so zero screens or zero links means either it was not built or a selector missed. " +
    "Pass --allow-none only for a boards-only package, and say so at the gate.");
  process.exit(2);
}

const by = {};
for (const f of findings) (by[f.check] ||= []).push(f);
const CHECKS = ["dangling-target", "dangling-href", "nav-target", "unreachable", "dead-end",
  "orphan-prototype", "flow-declared"];
console.log("");
for (const c of CHECKS) {
  const hits = by[c] || [];
  console.log(`  ${hits.length ? "FAIL" : "ok  "}  ${c.padEnd(18)} ${hits.length}`);
  for (const h of hits) console.log(`          ${h.where}: ${h.msg}`);
}

if (findings.length) {
  console.error(`\nFAIL: ${findings.length} finding(s). A dangling link is not cosmetic — it is the ` +
    `defect class no screenshot and no geometry diff can see.`);
  process.exit(1);
}
console.log("\nPASS: every link resolves, every screen is reachable, nothing is a dead end.");
