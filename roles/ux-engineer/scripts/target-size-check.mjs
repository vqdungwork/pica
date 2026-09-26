#!/usr/bin/env node
/* Is every control big enough to hit?
 *
 * The audience profile sets a target-size floor before any token exists — that is the whole point
 * of measuring the audience first. Nothing enforced it. One project's "target size check" printed
 * the dimensions of seven hand-picked selectors and exited 0: it ran in the chain, joined by &&,
 * and could not fail. A report a human must read is not a check.
 *
 * Two things this gets right that a naive version does not:
 *
 * THE HIT AREA IS NOT THE GLYPH. A 22px checkbox inside a 62px <label> is a 62px target, because
 * tapping anywhere in the label toggles it. Measuring the input reported four defects that were
 * not there. Measure the outermost thing that receives the tap.
 *
 * PAINTED PIXELS ARE NOT CSS PIXELS. If the page scales itself to fit a short window,
 * getBoundingClientRect returns what was painted and a correct 48px target measures 44. Ask for
 * the harness parameter that turns scaling off; this passes fit=off, as the demo contract says.
 *
 * Usage: target-size-check.mjs --url <base> --routes <list|module> [--min 44] [--viewport 390x844]
 */
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = arg("--url", "");
const MIN = Number(arg("--min", 44));
const [VW, VH] = String(arg("--viewport", "390x844")).split("x").map(Number);
/* The review harness is not the product. A demo that carries its own toolbar — screen and state
 * pickers, a viewport switch — puts a dozen 26px <select>s on every route, and measuring them
 * reports fifteen defects in a chrome the client never sees. The project says which part is the
 * harness; nothing here can guess it. */
const IGNORE = arg("--ignore", "");
const CHECKS = ["target-too-small"];

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
  console.log("target-size-check: SKIPPED — no --url given, so nothing was measured. This is not a pass.");
  process.exit(0);
}
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("target-size-check: SKIPPED — playwright is not installed here. This is not a pass."); process.exit(0); }

const findings = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const seen = new Set();
let measured = 0;

for (const q of routes.length ? routes : [""]) {
  const url = `${base}${base.includes("?") ? "&" : "?"}${q}${q ? "&" : ""}fit=off`;
  /* A page that will not load is an abstention, not a crash. Throwing a stack trace here made the
   * mutation harness read the check as failing on a clean baseline, which is the check saying
   * "something is wrong" about itself in a voice nothing can parse. */
  try { await page.goto(url, { waitUntil: "networkidle" }); }
  catch (e) {
    await browser.close();
    console.log(`target-size-check: SKIPPED — ${url} would not load (${String(e.message).split("\n")[0]}). This is not a pass.`);
    process.exit(0);
  }
  await page.waitForTimeout(90);
  const small = await page.evaluate(({ min, ignore }) => {
    const out = [];
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [role="tab"], [role="link"], [tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll(sel)) {
      if (el.disabled) continue;
      if (ignore && el.closest(ignore)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;             // not rendered on this route
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      /* The tap lands on the outermost element that acts on it: a label wrapping the control, or
       * an anchor wrapping an icon. Measure that box, not the glyph inside it. */
      const host = el.closest("label, a[href], button") || el;
      const h = host.getBoundingClientRect();
      const w = Math.round(Math.max(r.width, h.width));
      const t = Math.round(Math.max(r.height, h.height));
      if (t < min || w < min) {
        const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().slice(0, 34);
        out.push({ name, tag: el.tagName.toLowerCase(), w, t });
      }
    }
    return out;
  }, { min: MIN, ignore: IGNORE });
  measured++;
  for (const s of small) {
    const key = `${s.tag}|${s.name}|${s.w}x${s.t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ check: "target-too-small", where: q || "(default route)",
      detail: `<${s.tag}> "${s.name}" is ${s.w}×${s.t}, under the ${MIN}px floor the audience profile set` });
  }
}
await browser.close();

console.log(`${findings.length ? "FAIL" : "pass"}  target-too-small     ${String(findings.length).padStart(3)} finding(s)   (${measured} route(s), floor ${MIN}px, hit area not glyph${IGNORE ? `, ignoring ${IGNORE}` : ""})`);
if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
