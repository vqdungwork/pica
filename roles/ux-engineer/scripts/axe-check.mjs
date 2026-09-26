#!/usr/bin/env node
/**
 * Run axe-core over every declared route, and say plainly how much of WCAG that is.
 *
 * pica's own `a11y-check` asks five questions of a capture — accessible name, role, keyboard
 * reach, focus-visible, target size. They are good questions and they are five. axe-core runs the
 * whole machine-checkable subset of WCAG 2.0/2.1/2.2 against the rendered DOM: contrast, labels,
 * ARIA misuse, landmark and heading structure, duplicate ids, list semantics, and roughly a
 * hundred more.
 *
 * What it is NOT: complete. The published figures put automated coverage at somewhere between a
 * third and a half of WCAG success criteria — the rest need a person, and a page that passes
 * every rule here can still be unusable with a screen reader. This script prints that limit every
 * time it passes, because a green line that implies more than it proves is how a team stops
 * looking.
 *
 *   node axe-check.mjs --url <base> --routes "<q1>,<q2>" [--axe <path to axe.min.js>]
 *       [--tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa] [--viewport 390x844]
 *       [--include <selector>]  restrict to the product frame, excluding harness chrome
 *
 * SKIPPED (exit 0, and it says so) when playwright or axe-core is absent, or the URL is silent.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["axe-violations"];

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = arg("--url");
/* --routes takes a comma-separated list, OR a path to a module that exports one.
 *
 * A project that already keeps its route list in one shared module should not have to restate it
 * in a runner config — restating it is how two copies drift, and this project had deliberately
 * collapsed them into one file earlier for exactly that reason. */
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
const TAGS = arg("--tags", "wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa").split(",").map((s) => s.trim());
const INCLUDE = arg("--include", "");
const [VW, VH] = arg("--viewport", "390x844").split("x").map(Number);

if (!base) {
  console.log("axe-check: SKIPPED — no --url given, so nothing was scanned. This is not a pass.");
  process.exit(0);
}

let axeSource = arg("--axe", "");
if (!axeSource) {
  try { axeSource = createRequire(`${process.cwd()}/`).resolve("axe-core/axe.min.js"); } catch { /* below */ }
}
if (!axeSource || !existsSync(axeSource)) {
  console.log("axe-check: SKIPPED — axe-core not found (npm i -D axe-core, or pass --axe). This is not a pass.");
  process.exit(0);
}

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log("axe-check: SKIPPED — playwright is not installed here. This is not a pass.");
  process.exit(0);
}

const AXE = readFileSync(axeSource, "utf8");

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
const byRule = new Map();       // rule id -> { impact, help, nodes, routes:Set }
let scanned = 0;
const wholePage = [];
const sep = (u) => (u.includes("?") ? "&" : "?");

try {
  for (const q of routes.length ? routes : [""]) {
    const url = q ? `${base}${sep(base)}${q}` : base;
    try { await page.goto(url, { waitUntil: "networkidle" }); }
    catch {
      console.log(`axe-check: SKIPPED — nothing answered at ${url}. This is not a pass.`);
      await browser.close(); process.exit(0);
    }
    const dead = await pageIsDead(page, INCLUDE || "");
    if (dead) {
      console.error(`FINDING  [axe-violations] ${url}\n         this route rendered nothing to scan: ${dead}`);
      process.exitCode = 1;
      continue;
    }
    await page.addScriptTag({ content: AXE });
    // `--include` names the product frame so harness chrome is not scanned as if it were the
    // product. A route that has no frame — a login screen, a catalogue page — is still a page a
    // person can open, so it is scanned whole and said so, rather than throwing. A check that
    // crashes on the second-most-ordinary input is a check nobody will keep in the suite.
    const hasInclude = INCLUDE ? await page.locator(INCLUDE).count() > 0 : false;
    if (INCLUDE && !hasInclude) wholePage.push(url);
    let res;
    try {
      res = await page.evaluate(
      async ({ tags, include }) =>
        // eslint-disable-next-line no-undef
        await window.axe.run(include ? { include: [[include]] } : document, { runOnly: { type: "tag", values: tags } }),
        { tags: TAGS, include: hasInclude ? INCLUDE : "" }
      );
    } catch (e) {
      console.error(`FINDING  [axe-violations] ${url}\n         axe could not run here: ${String(e).split("\n")[0]}`);
      process.exitCode = 1;
      continue;
    }
    scanned++;
    for (const v of res.violations) {
      const cur = byRule.get(v.id) || { impact: v.impact, help: v.help, nodes: new Set(), routes: new Set() };
      for (const n of v.nodes) cur.nodes.add(n.target.join(" "));
      cur.routes.add(url);
      byRule.set(v.id, cur);
    }
  }
} finally {
  await browser.close();
}

const LIMIT =
  "NOTE  axe covers the machine-checkable part of WCAG — published estimates run from about a third\n" +
  "      to about half of the success criteria. The rest needs a person, and a page that passes every\n" +
  "      rule here can still be unusable with a screen reader. This is a floor, not a result.";

if (!byRule.size) {
  console.log(`axe-check: ${scanned} route(s), 0 violations (${TAGS.join(", ")})`);
  if (wholePage.length) console.log(`NOTE  ${wholePage.length} route(s) carry no "${INCLUDE}" and were scanned whole, harness chrome included.`);
  console.log(LIMIT);
  process.exit(0);
}
const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
for (const [id, v] of [...byRule].sort((a, b) => (order[a[1].impact] ?? 9) - (order[b[1].impact] ?? 9))) {
  // Name the routes. Aggregating by rule keeps the report short, but a count of routes with no
  // route in it cannot be reproduced — the first run of this check reported "9 route(s)" and it
  // took a separate bisect to find out which nine.
  console.error(`FINDING  [axe-violations] ${id} (${v.impact}) on ${v.routes.size} route(s)\n` +
                `         ${v.help}\n` +
                `         ${[...v.nodes].slice(0, 3).join("  |  ")}${v.nodes.size > 3 ? `  … ${v.nodes.size - 3} more` : ""}\n` +
                [...v.routes].slice(0, 3).map((r) => `         at ${r}`).join("\n") +
                (v.routes.size > 3 ? `\n         … and ${v.routes.size - 3} more route(s)` : ""));
}
console.error(`\n${byRule.size} rule(s) violated across ${scanned} route(s).`);
console.error(LIMIT);
process.exit(1);
