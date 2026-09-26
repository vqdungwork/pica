#!/usr/bin/env node
/**
 * Click through the demo, several clicks deep, and fail when a click leaves nothing on screen.
 *
 * Every other browser check loads a route FRESH and looks at it. That is exactly why the worked
 * example's own prototype router shipped for months going blank on its second click: it wrote the
 * current screen to <html data-scr>, the root then matched every [data-scr] query, and the next
 * navigation hid the document. Twelve checks passed over it, each one loading a route, measuring
 * it, and leaving. It was found by a person clicking the flow twice.
 *
 * So this one does not load and look. It walks. From each route it clicks every distinct control
 * it can see, then every control on the screen that produced, to --depth clicks, replaying each
 * path from a fresh load so one path cannot contaminate the next. Screens it has already expanded
 * are not expanded again, which keeps a walk over a real demo to a few hundred clicks.
 *
 *   blank-after-click  a click left no visible text on the page, or took every frame off screen
 *                      without navigating anywhere. PASS: 0.
 *   script-error       the page threw, on load or after a click. PASS: 0.
 *
 *   node flow-walk-check.mjs --url <base> --routes "<q1>,<q2>" [--frame .frame] [--ignore .devbar]
 *       [--depth 3] [--max 200] [--viewport 1440x900]
 *
 * WHAT IT CANNOT DO: tell a right screen from a wrong one. A click that opens another role's
 * screen, or the empty state instead of the list, renders perfectly and passes here. flow-check
 * reads where each control is declared to go; this only proves that going there leaves something
 * standing.
 *
 * SKIPPED (exit 0, and it says so) when playwright is absent or the URL does not answer.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["blank-after-click", "script-error"];

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);

const base = arg("--url");
const FRAME = arg("--frame", ".frame");
const IGNORE = arg("--ignore", "");
const DEPTH = Number(arg("--depth", 3));
const MAX = Number(arg("--max", 200));
const [VW, VH] = String(arg("--viewport", "1440x900")).split("x").map(Number);

async function resolveRoutes(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  if (/[,=&]/.test(s)) return s.split(",").map((x) => x.trim()).filter(Boolean);
  const { existsSync } = await import("node:fs");
  const nodePath = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  if (!existsSync(s)) return s.split(",").map((x) => x.trim()).filter(Boolean);
  const mod = await import(pathToFileURL(nodePath.resolve(s)).href);
  const list = mod.ROUTES ?? mod.SCREENS ?? mod.routes ?? mod.screens ?? mod.default ?? [];
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

if (!base) {
  console.log("flow-walk-check: SKIPPED — no --url given, so nothing was clicked. This is not a pass.");
  process.exit(0);
}
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("flow-walk-check: SKIPPED — playwright is not installed here. This is not a pass."); process.exit(0); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
const page = await ctx.newPage();
ctx.on("page", (p) => { if (p !== page) p.close().catch(() => {}); });   // a new tab is not the flow
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));
const sep = (u) => (u.includes("?") ? "&" : "?");

/* Every distinct control on screen, named by what a person would call it. Controls repeated in
 * several frames of a board (the same row at desktop, tablet and mobile) are one control. */
const controls = () => page.evaluate(({ IGNORE }) => {
  const SEL = 'a[href],button,[role=button],[role=tab],[role=link],[data-go],[data-tab],[data-sheet],[data-popback],summary';
  const seen = new Set(), out = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (IGNORE && el.closest(IGNORE)) continue;
    if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      if (el.target === "_blank" || /^(mailto|tel|sms|javascript):/i.test(href)) continue;
      try { if (new URL(href, location.href).origin !== location.origin) continue; } catch { continue; }
    }
    const name = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 48);
    const sig = `${el.tagName.toLowerCase()}|${name}|${el.dataset.go || el.dataset.tab || el.getAttribute("href") || ""}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ sig, label: name || el.tagName.toLowerCase() });
  }
  return out;
}, { IGNORE });

const clickSig = (sig) => page.evaluate(({ sig, IGNORE }) => {
  const SEL = 'a[href],button,[role=button],[role=tab],[role=link],[data-go],[data-tab],[data-sheet],[data-popback],summary';
  for (const el of document.querySelectorAll(SEL)) {
    if (IGNORE && el.closest(IGNORE)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const name = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 48);
    if (`${el.tagName.toLowerCase()}|${name}|${el.dataset.go || el.dataset.tab || el.getAttribute("href") || ""}` !== sig) continue;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }
  return false;
}, { sig, IGNORE });

const look = () => page.evaluate((FRAME) => {
  const text = (document.body?.innerText || "").trim();
  const frames = FRAME ? [...document.querySelectorAll(FRAME)].filter((f) => {
    const r = f.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  }).length : 0;
  return { text: text.length, frames, url: location.href, print: text.slice(0, 400) };
}, FRAME);

async function load(q) {
  const url = q ? `${base}${sep(base)}${q}` : base;
  errors.length = 0;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(60);
  return url;
}

const findings = [];
const add = (id, where, detail) => findings.push([id, where, detail]);
let sequences = 0, capped = 0, unloaded = 0;

try {
  for (const q of routes.length ? routes : [""]) {
    const where = q || "index";
    try { await load(q); }
    catch (e) {
      console.log(`flow-walk-check: SKIPPED — ${base} would not load (${String(e.message).split("\n")[0]}). This is not a pass.`);
      await browser.close(); process.exit(0);
    }
    for (const e of errors) add("script-error", `${where} :: on load`, e);
    const start = await look();
    if (!start.text) { unloaded++; continue; }        // a route that renders nothing is layout's finding, not a walk

    const expanded = new Set([start.url + "\n" + start.print]);
    const queue = (await controls()).map((c) => [c]);
    while (queue.length) {
      if (sequences >= MAX) { capped += queue.length; break; }
      const path = queue.shift();
      sequences++;
      await load(q);
      let before = await look(), ok = true;
      for (const step of path) {
        const hit = await clickSig(step.sig);
        if (!hit) { ok = false; break; }                // the control went away on replay: not this path's defect
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(250);
        const after = await look().catch(() => ({ text: 0, frames: 0, url: "", print: "" }));
        const trail = `${where} :: ${path.slice(0, path.indexOf(step) + 1).map((s) => `"${s.label}"`).join(" → ")}`;
        if (errors.length) { add("script-error", trail, errors.join("; ")); errors.length = 0; ok = false; break; }
        if (!after.text || (before.frames && !after.frames && after.url === before.url)) {
          add("blank-after-click", trail, after.text
            ? `every ${FRAME} left the screen and the page did not navigate`
            : "nothing readable is left on the page");
          ok = false; break;
        }
        before = after;
      }
      if (!ok || path.length >= DEPTH) continue;
      const state = await look();
      const fp = state.url + "\n" + state.print;
      if (expanded.has(fp)) continue;
      expanded.add(fp);
      for (const c of await controls()) queue.push([...path, c]);
    }
  }
} finally {
  await browser.close();
}

/* One finding per distinct defect: the same blank reached by ten paths is one defect. */
const uniq = [...new Map(findings.map((f) => [f[0] + f[2] + f[1].split(" :: ")[1]?.split(" → ").pop(), f])).values()];
const n = (id) => uniq.filter((f) => f[0] === id).length;
const scope = `${sequences} click path(s), up to ${DEPTH} deep, across ${routes.length || 1} route(s)`;
console.log(`${n("blank-after-click") ? "FAIL" : "pass"}  blank-after-click  ${String(n("blank-after-click")).padStart(3)} finding(s)   (${scope})`);
console.log(`${n("script-error") ? "FAIL" : "pass"}  script-error       ${String(n("script-error")).padStart(3)} finding(s)   (${scope})`);
if (uniq.length) {
  console.log("");
  for (const [id, where, detail] of uniq) console.log(`FINDING  [${id}] ${where}\n         ${detail}`);
}
if (unloaded) console.log(`\nNOTE  ${unloaded} route(s) rendered nothing readable on load, so no walk started there.`);
if (capped) console.log(`\nNOTE  stopped at --max ${MAX}; ${capped} path(s) were not walked. Raise --max to go further.`);
if (!sequences && !findings.length) console.log("\nNOTE  nothing on any route was clickable, so nothing was walked.");
console.log(`\n${uniq.length} finding(s).${uniq.length ? " A click that leaves nothing standing is a demo nobody can review past it." : ""}`);
process.exit(uniq.length ? 1 : 0);
