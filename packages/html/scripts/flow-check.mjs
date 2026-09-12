#!/usr/bin/env node
/**
 * flow-check.mjs: the interactive flow is wired, and wired to the right place.
 *
 *   node flow-check.mjs --dir html [--state .pica/state.json] [--allow-none]
 *   node flow-check.mjs --url <u> [--url <another>] [--state .pica/state.json]
 *
 * --url reads the RENDERED DOM instead of the source files, which is what a React demo
 * needs. The vocabulary does not change: this file's own rule is "a link built in
 * JavaScript is invisible to it, keep targets in markup", and in JSX the data-* attributes
 * still are: they land in the DOM, and this is where they get read. What changes is where
 * the check looks, not what it looks for.
 *
 * Losing this check is the one thing a React demo could genuinely cost. It catches the
 * class of defect with NO geometric signature: a row on one role's home screen that opens
 * another role's screen. Every screenshot correct, every measured check green, the wiring
 * wrong.
 *
 * A work package ships option boards AND an interactive prototype of its main
 * flow (html-prototype.md, "Options decide, the flow is the deliverable"). The
 * boards are static and measurable. The flow is not: every defect a human found
 * by *using* a prototype rather than looking at it is a navigation defect with no
 * geometric signature: a row that opened another role's screen, a back control
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
 * link built in JS is invisible here, so keep link targets in markup: which is
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

/* A missing directory must report, not throw. An unhandled fs error prints a stack
 * trace with no usage line, and the reader cannot tell a wrong path from a broken
 * script. Every other check here exits 2 on a bad invocation; this one did not. */
if (!existsSync(DIR)) {
  console.error(`FAIL  no directory at "${DIR}".`);
  console.error("usage: node flow-check.mjs --dir <html-dir> [--state .pica/state.json] [--allow-none]");
  process.exit(2);
}

const URLS = process.argv.filter((a, i) => process.argv[i - 1] === "--url");

/* Sources are { name, src } either way, so everything below parses identically. */
let sources = [];
if (URLS.length) {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("flow-check: --url needs playwright, and it is not resolvable from here.");
    console.error("            Nothing was checked, and that is not a pass.");
    process.exit(2);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const u of URLS) {
    await page.goto(u, { waitUntil: "networkidle" });
    /* The router may mount asynchronously. A target that is not in the DOM yet reads as a
       dangling link, which is the same false finding as measuring before the page settles. */
    await page.waitForTimeout(400);
    const src = await page.evaluate(() => document.documentElement.outerHTML);
    /* Named by BASENAME, not by URL. state.flows names files and data-href names files,
     * because --dir needs them to. Naming a route "localhost:8000/app-pos-react.html"
     * meant neither could ever match: app-ops.html, present in html/, was reported as a
     * file that does not exist, and the running demo was reported as an undeclared
     * prototype while state.flows declared it by name. A project that follows
     * react-demo.md could satisfy neither mode. The full URL is kept for the header. */
    let base = u;
    try { base = new URL(u).pathname.split("/").filter(Boolean).pop() || u; } catch {}
    sources.push({ name: base, url: u, src });
  }
  await browser.close();
} else {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".html"));
  if (!files.length) {
    console.error(`flow-check: no .html files in ${DIR}`);
    process.exit(2);
  }
  sources = files.map((f) => ({ name: f, src: readFileSync(join(DIR, f), "utf8") }));
}

const all = (src, re) => [...src.matchAll(re)].map((m) => m[1]);

// One record per file. `screens` are the destinations that exist; the rest are
// the destinations something asks for.
const doc = new Map();
for (const { name: f, src } of sources) {
  /* Either quote style. In source the JSON is single-quoted so its own double quotes survive;
     in a rendered DOM outerHTML normalises attribute quotes to double and escapes the inner
     ones as &quot;. Matching only the source form made --url find zero screens on a demo that
     carried twelve links: the vocabulary was there and the regex was looking for the wrong
     punctuation. */
  const nav = /data-nav='([^']*)'/.exec(src)
    || (() => {
      const m = /data-nav="([^"]*)"/.exec(src);
      return m ? [m[0], m[1].replace(/&quot;/g, '"')] : null;
    })();
  let tabs = [], declared = new Set();
  if (nav) {
    try {
      const parsed = JSON.parse(nav[1]);
      tabs = parsed.map((t) => t.id);
      /* What the router SAYS it owns. For a server-rendered file this is redundant with
         the data-scr sections; for a client-rendered one it is the only screen list that
         exists before the script runs, and it is in markup precisely so it can be read
         here. */
      for (const t of parsed) {
        if (t && t.id) declared.add(t.id);
        for (const o of (t && Array.isArray(t.owns) ? t.owns : [])) declared.add(o);
      }
    } catch (e) {
      // A malformed tab set is a finding, not something to shrug at: the router
      // throws on load and the whole prototype renders blank.
      tabs = { error: e.message };
    }
  }
  /* CLIENT-RENDERED FILES CANNOT BE CHECKED FROM DISK.
   * A React flow's data-scr, data-go and data-tab exist only after the script runs, so
   * reading the file reports an interactive prototype with zero screens and every nav
   * target dangling — true of the file and false of the product. react-demo.md requires
   * the flow to BE React and flow-check is a textual parse by design; the two compose
   * only if a file can say so. It declares itself with data-csr on the router tag, and
   * --dir then reports it as not checkable here rather than as broken. --url renders it
   * and checks it properly. */
  const csr = /data-csr\b/.test(src) || (/<script[^>]+type=["']module["']/.test(src)
    && !/data-scr=/.test(src) && /data-nav\s*=/.test(src));
  /* MERGE, never overwrite. In --url mode every route of one demo shares a basename, and
   * a demo puts ONE screen in the DOM at a time. Keyed by basename and set, the last
   * route silently replaced the other eighteen: the record held one screen, so the home
   * and every nav tab "resolved to no data-scr" and the flow's own home was reported
   * missing from the file that renders it. The union across routes is the app's screen
   * set, which is what each of those checks is actually asking about. */
  const prev = doc.get(f);
  const merge = (a, b) => prev ? [...new Set([...a, ...b])] : b;
  const mergeSet = (a, b) => prev ? new Set([...a, ...b]) : b;
  doc.set(f, {
    csr,
    src,
    screens: mergeSet(prev && prev.screens || [], new Set(all(src, /data-scr="([^"]+)"/g))),
    sheets: mergeSet(prev && prev.sheets || [], new Set(all(src, /data-sheetwrap="([^"]+)"/g))),
    go: merge(prev && prev.go || [], all(src, /data-go="([^"]+)"/g)),
    tab: merge(prev && prev.tab || [], all(src, /data-tab="([^"]+)"/g)),
    sheet: merge(prev && prev.sheet || [], all(src, /data-sheet="([^"]+)"/g)),
    href: merge(prev && prev.href || [], all(src, /data-href="([^"]+)"/g)),
    tabs: prev && prev.tabs && prev.tabs.length ? prev.tabs : tabs,
    declared: mergeSet(prev && prev.declared || [], declared),
    router: !!nav || !!(prev && prev.router),
    home: (/data-home="([^"]+)"/.exec(src) || [])[1] || (prev && prev.home),
    // A tab in the review shell is a lazily-loaded iframe, so the target sits on
    // the button as data-src, not on an <iframe src>. Read both: one project
    // reported every prototype orphaned because only the second form was read.
    iframes: merge(prev && prev.iframes || [],
      [...all(src, /<iframe[^>]+src="([^"?#]+)/g), ...all(src, /data-src="([^"?#]+)/g)]),
  });
}

/* A client-rendered source is set aside BEFORE any check reads it, not after. Placed
 * later it was named in the report while every check had already run against an empty
 * shell and reported its screens missing. */
/* What actually exists in the directory, independent of what was parsed. --url parses
 * routes; --dir parses files; file EXISTENCE is a question about neither. */
const onDisk = new Set(
  existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".html")) : []);
const unresolved = [];
/* ...but ONLY when reading from disk. In --url mode the page HAS been rendered, so its
 * data-scr sections are present in the DOM this just read. Setting it aside there would
 * disable the one mode written to check it: --url would report 19 routes, 0 screens and
 * 0 links on a demo that is entirely there, which is the pass-over-nothing these rules
 * exist to end — reached, absurdly, through the marker that exists to prevent it. */
const csrFiles = URLS.length ? []
  : [...doc.entries()].filter(([, d]) => d.csr).map(([f]) => f);
/* Set aside from being CHECKED, not from EXISTING. Removing them outright made every
 * other file's link to the demo dangle and the declared flow read as missing — trading
 * one false report for another. They stay in the file set as known-present, with an
 * empty screen list, and no check reads their contents. */
for (const f of csrFiles) {
  /* Keep what the MARKUP still says. Blanking `declared` too made every deep link into
     the demo dangle: the file was excused from having its screens counted and then held
     to having them anyway, which is the same file judged two ways. data-nav is in the
     markup and survives the script not having run, so it is what deep links resolve
     against until --url can do better. */
  const was = doc.get(f);
  doc.set(f, { src: "", csr: true, setAside: true,
    screens: new Set(), declared: was ? was.declared : new Set(),
    sheets: new Set(), go: [], tab: [], sheet: [], pane: [],
    href: [], popback: 0, tabs: [], home: null, router: false });
}

/* THE SHELL IS NOT AN APPLICATION.
 *
 * `review.html` carries a router whenever it inlines the prototype - and inlining is the
 * only arrangement that works, because on file:// every document is its own opaque origin
 * and a pane per iframe renders the browser's "it may have been moved" page. So the shell
 * declares data-nav like any prototype, and every board screen it also inlines was then
 * reported as "has no control that opens it": on FitShaker, 215 findings, 109 of them
 * unreachable, every one a contact-sheet frame nobody was ever meant to click.
 *
 * Check 6 below already knew this and skipped the shell by name. It was the only check
 * that did. The shell is navigation, not a screen set - the same reason shell-check gives
 * for excluding it from the capture, "capturing it would put the chrome in the census".
 *
 * It stays in `doc`, so check 6 can still ask which prototypes it reaches. */
const SHELL = "review.html";

// Interactive files are the ones that declare a router. Everything else is a
// board, and a board has no flow to check.
//
// Detect the router by its own tag, never by "does this file mention data-home".
// A documentation board that *describes* the convention in a <code> block matched
// the looser test and was then reported as an interactive prototype with a
// broken root: a finding about prose.
const interactive = [...doc].filter(([f, d]) => d.router && f !== SHELL);

// Screens the router itself opens, rather than any control in the markup: the
// bell, a deep-link default, a redirect. Collected from the string literals in
// the prototype's own scripts, which is loose but wrong in the safe direction:
// it can excuse a screen that is genuinely unreachable, so the reachability
// finding stays advisory-strict and rendering every screen remains the real
// check.
const routerNames = new Set();
for (const j of URLS.length ? [] : readdirSync(DIR).filter((f) => f.endsWith(".js")))
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
      /* In --url mode `doc` holds the routes that were passed, not the directory, so a
       * cross-application link read as "a file that is not in html" while the file was
       * sitting right there. One application's routes are checked at a time by design,
       * so the other app's file will never be among them — the check was asking the
       * wrong collection. Ask the directory, which is what the question is about. */
      if (onDisk.has(basename(file))) continue;
      add("dangling-href", f, `data-href="${h}" names a file that is not in ${DIR}`);
      continue;
    }
    const scr = /(?:^|&)scr=([^&]+)/.exec(query || "");
    if (scr) {
      const t = doc.get(basename(file));
      /* A set-aside file has no rendered screens to compare against, so its declaration
         is the best available truth. If it declares nothing either, say the link was not
         adjudicated rather than calling it dangling or calling it fine. */
      const known = t.setAside ? (t.declared || new Set()) : t.screens;
      if (t.setAside && !known.size) {
        unresolved.push(`${f} → ${h}`);
      } else if (!known.has(scr[1])) {
        add("dangling-href", f, `data-href="${h}" deep-links to a screen ${basename(file)} ` +
          (t.setAside ? "does not declare in its data-nav" : "does not have"));
      }
    }
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
const shell = [...doc].find(([f]) => f === SHELL);
/* This check needs review.html and there is not always one. It used to print "ok 0" in
 * that case, which is the pattern this repository keeps finding in itself: a check that
 * could not run reporting a pass. It now says which happened. */
const shellPresent = Boolean(shell);
if (shell) {
  const tabbed = new Set(shell[1].iframes.map((s) => basename(s)));
  for (const [f] of interactive)
    if (!tabbed.has(f))
      add("orphan-prototype", SHELL, `${f} is interactive but has no tab in the review shell`);
}

// 7. Declared flows exist. This is what makes "one interactive prototype per
//    application" checkable rather than aspirational.
const partialUrlRun = URLS.length > 0;
let notCaptured = 0, homeUnverified = 0;
for (const fl of FLOWS) {
  if (!doc.has(basename(fl.entry || ""))) {
    /* In --url mode you legitimately check one application's routes at a time, so a
     * flow that is simply not among the routes you passed is a NOTE, not a defect —
     * otherwise checking the POS reports Operations and Management as missing and the
     * mode can never return zero. In --dir mode every flow's file should be present,
     * so it stays a finding. */
    if (partialUrlRun) { notCaptured++; continue; }
    add("flow-declared", STATE, `flow "${fl.app}" names entry ${fl.entry}, which is not in ${DIR}`);
  }
  else if (doc.get(basename(fl.entry)).setAside) {
    /* Its screens exist only after the script runs, so "does not have" would be a claim
     * about an empty shell. --url verifies the home for real. */
    homeUnverified++;
  } else if (fl.home && !doc.get(basename(fl.entry)).screens.has(fl.home))
    add("flow-declared", STATE, `flow "${fl.app}" names home "${fl.home}", which ${fl.entry} does not have`);
}

/* The other direction, which was missing. Checking only declared -> file means a project
 * that declares NO flows passes this check while shipping interactive prototypes, so the
 * rule "one interactive prototype per application" held only for people who had already
 * chosen to follow it. A register that is optional is not a register. */
const declaredEntries = new Set(FLOWS.map((fl) => basename(fl.entry || "")));
for (const [f] of interactive) {
  if (f === "review.html") continue;
  if (declaredEntries.has(f)) continue;
  add("flow-declared", f,
    `is an interactive prototype that no entry in state.flows declares. ` +
    `Undeclared, nothing can tell whether the set of applications is complete`);
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
if (URLS.length) {
  const uniq = [...new Set(sources.map((s2) => s2.name))];
  console.log(`routes resolved to ${uniq.length} file name(s): ${uniq.join(", ")}`);
}
console.log(`flow-check: ${sources.length} ${URLS.length ? "route(s)" : "file(s)"} in ${URLS.length ? "the running demo" : DIR}, ` +
  `${interactive.length} interactive (${interactive.map(([f]) => f).join(", ") || "none"}), ` +
  `${sources.length - interactive.length} board(s)`);
if (homeUnverified)
  console.log(`  ${homeUnverified} declared home(s) not verified here: their file is client-rendered. --url checks them.`);
if (unresolved.length) {
  console.log(`  ${unresolved.length} deep link(s) NOT adjudicated: ${unresolved.join(", ")}`);
  console.log("  Their target is client-rendered and declares no owns in data-nav, so neither");
  console.log("  'dangling' nor 'fine' would have been measured. Check them with --url.");
}
if (csrFiles.length && !URLS.length) {
  console.log(`  ${csrFiles.length} client-rendered file(s) set aside: ${csrFiles.join(", ")}`);
  console.log(`  Their markup exists only after the script runs, so reading them from disk would report`);
  console.log(`  every screen missing. Check them with --url <route>, one per addressable state.`);
}
if (notCaptured)
  console.log(`  note: ${notCaptured} declared flow(s) are not among the routes passed. Pass their routes too `
            + `to check them; they are not reported as missing.`);
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
/* The denominator each check measured against, so a zero says what it is a zero OF. */
const SCOPES = {
  "dangling-target": `${links} link(s)`,
  "dangling-href": `${links} link(s)`,
  "nav-target": `${interactive.length} interactive file(s)`,
  "unreachable": `${screens} screen(s)`,
  "dead-end": `${screens} screen(s)`,
  "orphan-prototype": `${interactive.length} interactive file(s)`,
  "flow-declared": `${FLOWS.length} declared flow(s)`,
};
console.log("");
for (const c of CHECKS) {
  const hits = by[c] || [];
  if (c === "orphan-prototype" && !shellPresent) {
    console.log(`  ----  ${c.padEnd(18)} not run: no review.html in ${DIR}. This is not a pass`);
    continue;
  }
  /* The dialect every other check prints, and the one pica-verify parses:
   *   `pass|FAIL  <id>  N finding(s)   (scope)`
   * This printed `  ok    <id>  N` — indented, "ok" rather than "pass", and no
   * "finding". pica-verify's row regex matched none of it, so a run with real findings
   * was aggregated as `FAIL flow-check 0 finding(s) across 0 check(s)`: a failure with
   * its contents erased. A check that speaks its own dialect is invisible to the runner
   * that reports it. */
  console.log(`${hits.length ? "FAIL" : "pass"}  ${c.padEnd(18)} ${String(hits.length).padStart(3)} finding(s)   `
    + `(${SCOPES[c] || `${screens} screen(s)`})`);
  for (const h of hits) console.log(`          ${h.where}: ${h.msg}`);
}

if (findings.length) {
  console.error(`\nFAIL: ${findings.length} finding(s). A dangling link is not cosmetic: it is the ` +
    `defect class no screenshot and no geometry diff can see.`);
  process.exit(1);
}
console.log("\nPASS: every link resolves, every screen is reachable, nothing is a dead end.");
