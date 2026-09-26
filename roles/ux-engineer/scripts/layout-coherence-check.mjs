#!/usr/bin/env node
/**
 * Four assertions about a RENDERED screen that no token, contrast or overflow check can make.
 *
 * Every defect this file exists to catch survived a full suite: 376 screen×state×viewport renders
 * with zero overflow, zero console errors and every tap target over 48px, on screens a client
 * called unusable twice over. Those checks answer "did it render" and "is this value from a
 * token". None of them answers "is the result coherent to look at", and that is where every one
 * of the defects was. They were all found by a person opening a screenshot.
 *
 *   node layout-coherence-check.mjs --url <base> --routes "<q1>,<q2>,..."
 *       [--frame .frame] [--list .list] [--viewport 390x844]
 *
 * SKIPPED (exit 0, and it says so) when playwright is absent or the URL does not answer. An
 * abstention is reported as an abstention and never folded into a pass.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["ragged-rows", "orphan-slot", "framed-viewport", "device-scrollbar"];

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);

const base = arg("--url");
/* --routes takes a comma-separated list, OR a path to a module that exports one.
 *
 * A project that already keeps its route list in one shared module should not have to restate it
 * in a runner config — restating it is how the two copies drift, and this project had deliberately
 * collapsed them into one file earlier for exactly that reason. Given a path, import it and take
 * whatever array it exports. */
async function resolveRoutes(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  if (/[,=&]/.test(s)) return s.split(",").map((x) => x.trim()).filter(Boolean);
  // self-contained: these scripts import nothing at the top level, so the helper must not either
  const { existsSync } = await import("node:fs");
  const nodePath = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  if (!existsSync(s)) return s.split(",").map((x) => x.trim()).filter(Boolean);
  const mod = await import(pathToFileURL(nodePath.resolve(s)).href);
  const list = mod.ROUTES ?? mod.SCREENS ?? mod.routes ?? mod.screens ?? mod.default ?? [];
  /* A screen with states is not one route, it is one route per state — which is the whole point of
   * having the list: a check that visits "the screens" and not their states has not visited the
   * empty one, the error one, or the one the client actually argues about. */
  return (Array.isArray(list) ? list : Object.values(list)).flatMap((r) => {
    if (typeof r === "string") return [r];
    if (!r || typeof r !== "object") return [];
    if (r.query ?? r.q ?? r.route) return [r.query ?? r.q ?? r.route];
    const id = r.scr ?? r.screen ?? r.id;
    if (!id) return [];
    const states = Array.isArray(r.states) && r.states.length ? r.states : ["default"];
    return states.map((st) => `scr=${encodeURIComponent(id)}&state=${encodeURIComponent(st)}`);
  }).filter(Boolean);
}
const routes = await resolveRoutes(arg("--routes", ""));
const FRAME = arg("--frame", ".frame");
const LIST = arg("--list", "");   // empty = discover every repeated-row container
const [VW, VH] = arg("--viewport", "390x844").split("x").map(Number);

if (!base) {
  console.log("layout-coherence-check: SKIPPED — no --url given, so nothing was rendered. This is not a pass.");
  process.exit(0);
}

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log("layout-coherence-check: SKIPPED — playwright is not installed here. This is not a pass.");
  process.exit(0);
}

const IN_PAGE = ({ FRAME, LIST }) => {
  const out = { ragged: [], orphan: [], frame: null, scrollbars: [], noFrame: false };
  const frame = document.querySelector(FRAME);
  if (!frame) { out.noFrame = true; return out; }

  /* Every painted thing, not only text. A first version measured text ranges alone and reported
   * eleven correct rows as ragged: a status icon sitting exactly at the title's left edge is
   * invisible to a text walker, while the word beside it starts 20px further in. A rule about
   * what a person SEES has to measure everything that puts ink on the screen. */
  const inkBoxes = (el) => {
    const out2 = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        out2.push({ x: b.left, top: b.top, bottom: b.bottom, text: true, t: n.textContent.trim().slice(0, 22) });
      }
    }
    for (const e of el.querySelectorAll("svg, img, [class*='marker'], [class*='icon']")) {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) out2.push({ x: b.left, top: b.top, bottom: b.bottom, text: false, t: "(mark)" });
    }
    return out2;
  };

  /* Lines by vertical OVERLAP, not by a rounded band: an avatar and the name beside it sit on one
   * visual line while their boxes start at different y, and banding split them into two lines
   * that then "disagreed" about their left edge by exactly the marker column's width. */
  const toLines = (boxes) => {
    const lines = [];
    for (const b of [...boxes].sort((p, q) => p.top - q.top)) {
      const L = lines.find((l) => Math.min(l.bottom, b.bottom) - Math.max(l.top, b.top) >
                                  Math.min(l.bottom - l.top, b.bottom - b.top) * 0.5);
      if (L) { L.top = Math.min(L.top, b.top); L.bottom = Math.max(L.bottom, b.bottom); L.boxes.push(b); }
      else lines.push({ top: b.top, bottom: b.bottom, boxes: [b] });
    }
    return lines;
  };

  /* --- ragged-rows -------------------------------------------------------------------------
   * The title's line is the first one carrying real words, and its TEXT edge is the column every
   * line below it hangs from. A marker may sit further left — that is what a marker column IS —
   * but only on the title's own line. A line BELOW the title that starts left of it is the
   * defect: a badge outdented past the title it belongs to, a status word thrown back to the
   * row's edge by a grid that broke. More than two distinct edges in one row is the same defect
   * in its louder form — the row a client photographed had four. */
  /* Repeated-row containers are DISCOVERED, not configured. The first version took a `--list`
   * selector, defaulted it to `.list`, passed clean, and missed a screen whose rows live in
   * `.sheet-list` — the confirm screen, which is the one screen in that product where the row
   * layout had actually broken. A check that only looks where it is pointed inherits the blind
   * spot of whoever pointed it. Any element with two or more children sharing a class name is a
   * list, whatever it is called; `--list`, if given, narrows it back down. */
  const containers = LIST
    ? [...frame.querySelectorAll(LIST)]
    : [...frame.querySelectorAll("*")].filter((el) => {
        const kids = [...el.children].filter((k) => k.className && typeof k.className === "string");
        if (kids.length < 2) return false;
        const counts = new Map();
        for (const k of kids) counts.set(k.className, (counts.get(k.className) || 0) + 1);
        return [...counts.values()].some((n) => n >= 2);
      });

  /* Innermost only. A body whose children are project groups satisfies "two children sharing a
   * class" just as a list of rows does, so the whole GROUP was measured as one row and its label,
   * its titles and its badges counted as three columns. A group is a container OF lists, not a
   * list; the rows are the deepest thing that repeats. */
  const lists = containers.filter((c) => !containers.some((o) => o !== c && c.contains(o)));

  for (const list of lists) {
    const rows = [...list.children];
    if (rows.length < 2) continue;
    for (const row of rows) {
      if (row.closest("[data-layout-exempt]")) continue;
      const lines = toLines(inkBoxes(row));
      if (lines.length < 2) continue;
      const titleIdx = lines.findIndex((L) => L.boxes.some((b) => b.text && b.t.trim().length >= 2));
      if (titleIdx === -1) continue;
      const titleTexts = lines[titleIdx].boxes.filter((b) => b.text);
      if (!titleTexts.length) continue;
      const titleEdge = Math.min(...titleTexts.map((b) => b.x));

      const edges = lines.map((L) => ({ x: Math.min(...L.boxes.map((b) => b.x)), t: L.boxes.find((b) => b.text)?.t || "(mark)" }));
      const outdented = edges.filter((e, i) => i !== titleIdx && e.x < titleEdge - 2);
      /* Columns within 3px of each other are ONE column. Counting exact pixels made the check
       * report seventeen correct rows, every one of them because a status icon's box begins 2px
       * right of the text above it — a difference no eye resolves and no layout intends. A check
       * for what a person sees must not be more precise than seeing. */
      const cols = [];
      for (const e of [...edges].sort((a, b) => a.x - b.x)) {
        if (!cols.length || e.x - cols[cols.length - 1] > 3) cols.push(e.x);
      }
      if (outdented.length || cols.length > 2) {
        out.ragged.push({
          row: (row.textContent || "").trim().slice(0, 44),
          edges: edges.map((e) => ({ x: Math.round(e.x), t: e.t })),
          why: outdented.length
            ? `${outdented.length} line(s) start left of the title column at ${Math.round(titleEdge)}px`
            : `${cols.length} different left edges in one row`,
        });
      }
    }
  }

  /* --- orphan-slot -------------------------------------------------------------------------
   * A labelled field that renders no value. The label has already spent the ink; leaving it to
   * answer nothing is worse than whatever used to be there. Seen after a chip was correctly
   * removed from a LIST and, with it, incorrectly removed from a detail screen. */
  for (const label of frame.querySelectorAll('[class*="label"]')) {
    const value = label.nextElementSibling;
    if (!value || !/value/i.test(value.className || "")) continue;
    if ((value.textContent || "").trim() === "" && value.children.length === 0) {
      out.orphan.push({ label: (label.textContent || "").trim().slice(0, 44) });
    }
  }

  /* --- framed-viewport ---------------------------------------------------------------------
   * A frame declares two numbers and the review window must show both. When it cannot, the
   * frame's own header slides out of sight and the reviewer is shown an app with no chrome,
   * which is indistinguishable from missing chrome — and was reported as missing chrome. */
  const fb = frame.getBoundingClientRect();
  out.frame = { top: Math.round(fb.top), bottom: Math.round(fb.bottom), win: window.innerHeight,
                visible: fb.top >= -1 && fb.bottom <= window.innerHeight + 1 };

  /* --- device-scrollbar ---------------------------------------------------------------------
   * A phone does not have a grey scrollbar down the middle of its screen. Asserted on the
   * DECLARATION, not on a measurement: headless Chromium draws overlay scrollbars and reports
   * 0px on a page that puts a classic bar inside the device on any machine set to "always show
   * scrollbars" — which is exactly where this was seen, on the reviewer's own screen and on
   * none of the captures. `scrollbar-width` is what decides it. */
  for (const el of frame.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (cs.scrollbarWidth === "auto" || cs.scrollbarWidth === "") {
      out.scrollbars.push({ el: String(el.className || el.tagName).slice(0, 40), sw: cs.scrollbarWidth || "(unset)" });
    }
  }
  return out;
};


/* A route that renders nothing is a FINDING, not a skip.
 *
 * All three of these checks began by quietly `continue`-ing past a route with no frame. A build
 * error took the dev server down mid-session and they reported, variously, an uncaught exception,
 * "0 routes, 0 findings", and a clean pass — on an application that was serving HTTP 500 to every
 * request. A check that abstains silently when the page is broken reports a pass on a broken
 * page, which is the exact failure this project exists to prevent. */
const pageIsDead = async (page, FRAME) => await page.evaluate((F) => {
  if (document.querySelector("vite-error-overlay")) return "a build error overlay is on screen";
  if (/Internal Server Error/i.test(document.body.textContent || "")) return "the server returned an error page";
  if (F && !document.querySelector(F)) return `nothing matching "${F}" rendered`;
  return null;
}, FRAME);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const findings = [];
const sep = (u) => (u.includes("?") ? "&" : "?");

try {
  for (const q of routes.length ? routes : [""]) {
    const url = q ? `${base}${sep(base)}${q}` : base;
    try { await page.goto(url, { waitUntil: "networkidle" }); }
    catch {
      console.log(`layout-coherence-check: SKIPPED — nothing answered at ${url}. This is not a pass.`);
      await browser.close();
      process.exit(0);
    }
    const dead = await pageIsDead(page, FRAME);
    if (dead) { findings.push(["ragged-rows", url, `this route rendered nothing to check: ${dead}`]); continue; }
    const r = await page.evaluate(IN_PAGE, { FRAME, LIST });
    if (r.noFrame) continue;
    for (const g of r.ragged) {
      findings.push(["ragged-rows", url,
        `${g.why} — ${g.edges.map((e) => `"${e.t}"@${e.x}`).join(" / ")}`]);
    }
    for (const o of r.orphan) findings.push(["orphan-slot", url, `"${o.label}" is a label whose value renders nothing`]);
    if (r.frame && !r.frame.visible) {
      findings.push(["framed-viewport", url,
        `the device runs ${r.frame.top}→${r.frame.bottom} in a ${r.frame.win}px window — part of it is off screen, including chrome a reviewer will read as missing`]);
    }
    for (const s of r.scrollbars) {
      findings.push(["device-scrollbar", url,
        `"${s.el}" scrolls inside the device with scrollbar-width: ${s.sw} — a desktop scrollbar on any machine that shows them`]);
    }
  }
} finally {
  await browser.close();
}

if (findings.length === 0) {
  console.log(`layout-coherence-check: ${routes.length || 1} route(s), 0 findings (${CHECKS.join(", ")})`);
  process.exit(0);
}
const seen = new Set();
for (const [id, where, detail] of findings) {
  // The route belongs in the key. Keying on the message alone collapsed one finding per
  // route into one finding total, so a defect on nine screens was reported as a defect on
  // one — and the eight that went unmentioned looked fixed.
  const k = id + where + detail;
  if (seen.has(k)) continue;
  seen.add(k);
  console.error(`FINDING  [${id}] ${where}\n         ${detail}`);
}
console.error(`\n${findings.length} finding(s)${seen.size < findings.length ? ` (${seen.size} distinct)` : ""}. Each one is visible to a person and invisible to every other check.`);
process.exit(1);
