#!/usr/bin/env node
/**
 * Screenshot every declared route and compare it to a committed baseline.
 *
 * The other checks in this role assert PROPERTIES — no overflow, one left edge, contrast over the
 * floor. A baseline asserts something none of them can: that nothing changed except what was
 * meant to. On this project a chip was removed from a list for good reasons and silently vanished
 * from a detail screen too, a divider stopped drawing when a later rule won a cascade, and a
 * receding style crossed the contrast floor. Each was a one-line edit with a second consequence
 * somewhere nobody was looking, and a pixel diff is the only thing that reports that class of
 * defect without being told where to look.
 *
 *   node visual-baseline-check.mjs --url <base> --routes "<q1>,<q2>" --dir <baselineDir>
 *       [--update] [--clip .frame] [--viewport 390x844] [--tolerance 0.01]
 *
 * `--update` writes baselines instead of comparing. Commit them in the same change as the code:
 * a reviewer should see the visual diff beside the diff that caused it.
 *
 * Flake is designed out rather than tolerated, along the three axes that cause nearly all of it:
 * animations are frozen at capture, web fonts are awaited, and the viewport is stated explicitly
 * instead of inherited. A small per-pixel tolerance absorbs anti-aliasing without absorbing real
 * regressions.
 *
 * SKIPPED (exit 0, and it says so) when playwright is absent or the URL is silent.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["visual-baseline"];

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
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
const DIR = arg("--dir", ".audit/baseline");
const CLIP = arg("--clip", ".frame");
const UPDATE = args.includes("--update");
const TOL = Number(arg("--tolerance", "0.01"));
const [VW, VH] = arg("--viewport", "390x844").split("x").map(Number);

if (!base) {
  console.log("visual-baseline-check: SKIPPED — no --url given, so nothing was captured. This is not a pass.");
  process.exit(0);
}
/* Resolve the image libraries from the PROJECT, not from wherever this script happens to be
 * invoked. A check that lives in a plugin and reads a project's artefacts is run from both, and
 * resolving only against `process.cwd()` made it SKIP — silently, and therefore as a pass — the
 * first time anything called it from outside the project directory. `--modules` names the base
 * explicitly; otherwise the baseline directory's own ancestors are tried. */
let chromium, PNG, pixelmatch;
const bases = [process.cwd(), arg("--modules", ""), DIR, join(DIR, ".."), join(DIR, "..", ".."), join(DIR, "..", "..", "..")]
  .filter(Boolean).map((b) => (b.endsWith("/") ? b : `${b}/`));
try {
  ({ chromium } = await import("playwright"));
  let loaded = false;
  for (const b of bases) {
    try {
      const req = createRequire(b);
      ({ PNG } = req("pngjs"));
      pixelmatch = req("pixelmatch");
      if (pixelmatch.default) pixelmatch = pixelmatch.default;
      loaded = true; break;
    } catch { /* try the next base */ }
  }
  if (!loaded) throw new Error("no pngjs/pixelmatch");
} catch {
  console.log("visual-baseline-check: SKIPPED — needs playwright, pngjs and pixelmatch (looked in: " +
    bases.join(", ") + "). This is not a pass.");
  process.exit(0);
}

mkdirSync(DIR, { recursive: true });
const slug = (q) => (q || "index").replace(/[^A-Za-z0-9=&-]+/g, "_").replace(/[=&]/g, "-").slice(0, 110);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const changed = [], created = [], missing = [];
const sep = (u) => (u.includes("?") ? "&" : "?");

try {
  for (const q of routes.length ? routes : [""]) {
    const url = q ? `${base}${sep(base)}${q}` : base;
    try { await page.goto(url, { waitUntil: "networkidle" }); }
    catch {
      console.log(`visual-baseline-check: SKIPPED — nothing answered at ${url}. This is not a pass.`);
      await browser.close(); process.exit(0);
    }
    // A screenshot taken before the web font loads differs from one taken after, every time.
    await page.evaluate(() => document.fonts?.ready);
    const target = (await page.locator(CLIP).count()) ? page.locator(CLIP).first() : page;
    const shot = await target.screenshot({ animations: "disabled", caret: "hide" });

    const file = join(DIR, `${slug(q)}.png`);
    if (UPDATE || !existsSync(file)) {
      writeFileSync(file, shot);
      (existsSync(file) && !UPDATE ? created : UPDATE ? created : created).push(q || "index");
      continue;
    }
    const a = PNG.sync.read(readFileSync(file));
    const b = PNG.sync.read(shot);
    if (a.width !== b.width || a.height !== b.height) {
      changed.push([q, `size changed ${a.width}×${a.height} → ${b.width}×${b.height}`, null]);
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12 });
    const ratio = px / (a.width * a.height);
    if (ratio > TOL) {
      const dfile = join(DIR, `${slug(q)}.diff.png`);
      writeFileSync(dfile, PNG.sync.write(diff));
      changed.push([q, `${px} px differ (${(ratio * 100).toFixed(2)}% > ${(TOL * 100).toFixed(2)}%)`, dfile]);
    }
  }
} finally {
  await browser.close();
}

if (UPDATE) {
  console.log(`visual-baseline-check: wrote ${created.length} baseline(s) to ${DIR}`);
  console.log("NOTE  commit these in the same change as the code that moved them, so a reviewer sees the");
  console.log("      visual diff beside the diff that caused it. A baseline updated on its own proves nothing.");
  process.exit(0);
}
if (created.length) missing.push(...created);
/* A run that WROTE every baseline compared nothing. Reporting it as "0 changed" was a pass over an
 * empty comparison — on a fresh clone, where baselines are not committed yet, every run was green. */
const compared = (routes.length || 1) - created.length;
if (!changed.length && !compared) {
  console.log(`visual-baseline-check: ${created.length} baseline(s) written to ${DIR} and nothing compared. ` +
    "Commit them and run again. This is an abstention, not a pass.");
  process.exit(0);
}
if (!changed.length) {
  console.log(`visual-baseline-check: ${compared} route(s) compared, 0 changed` +
    (missing.length ? ` (${missing.length} new baseline(s) written)` : ""));
  process.exit(0);
}
for (const [q, why, dfile] of changed) {
  console.error(`FINDING  [visual-baseline] ${q || "index"}\n         ${why}${dfile ? `\n         diff: ${dfile}` : ""}`);
}
console.error(`\n${changed.length} route(s) look different from their baseline. If the change was intended, re-run with --update and commit both.`);
process.exit(1);
