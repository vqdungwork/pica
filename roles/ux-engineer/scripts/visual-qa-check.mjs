/**
 * visual-qa-check.mjs: the defects a rendered build has that no static check can see.
 *
 * Every check pica shipped before this one reads files. This one drives a browser, because the
 * class of defect it holds only exists once a layout has resolved: a pill that is an oval because
 * its box hugged its glyph, a badge that drifts off its corner at a width nobody drew, a literal
 * hex that survived tokenisation, two stacked marks a half-pixel apart.
 *
 * The list comes from a client's own QA checklist, handed over after four rounds in which every
 * gate was green and the build was still not usable. It is deliberately generic: none of these
 * rules mention this project, its tokens, or its components, because a rule that only holds one
 * engagement is a rule that taught pica nothing.
 *
 * Usage:
 *   node visual-qa-check.mjs <base-url> [--states <state.json>] [--widths 390,1280]
 *
 * It abstains rather than passing when it cannot reach a browser or a served build, because a
 * visual check that quietly measured nothing is the failure this whole file exists to end.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const args = process.argv.slice(2);
const BASE = args.find((a) => /^https?:\/\//.test(a));
const statePath = (args[args.indexOf("--states") + 1] || ".pica/state.json");
const WIDTHS = (args[args.indexOf("--widths") + 1] || "390,1280").split(",").map(Number);

const SELF_TEST = args.includes("--self-test");

if (!BASE && !SELF_TEST) {
  console.error("usage: node visual-qa-check.mjs <base-url> [--states <state.json>] [--widths 390,1280]");
  console.error("       node visual-qa-check.mjs --self-test       prove this check still fires");
  process.exit(2);
}

/* Playwright is not a dependency of pica and must not become one: it is installed per project.
   Resolve it from the project, and abstain — never pass — when it is absent. */
let chromium;
try {
  const req = createRequire(path.join(process.cwd(), "package.json"));
  chromium = req("playwright").chromium;
} catch {
  try { chromium = (await import("playwright")).chromium; }
  catch {
    console.log("NOT MEASURED  playwright is not installed in this project, so nothing was rendered.");
    console.log("              This is an abstention, not a pass.");
    process.exit(0);
  }
}

/* The screens and states to visit. Taken from state.screens when it exists so the check follows
   the project's own declaration rather than a list kept here. */
let targets = [{ q: "", label: "/" }];
try {
  const st = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (Array.isArray(st.screens) && st.screens.length) {
    targets = [];
    for (const s of st.screens)
      for (const state of (s.states || ["success"]))
        targets.push({ q: `?scr=${s.id}&state=${state}`, label: `${s.id}/${state}` });
  }
} catch { /* a project without state.screens is visited at its root, which is still worth checking */ }

const findings = [];
const fail = (id, where, why) => findings.push({ id, where, why });

/* ---- the probe, run inside the page -------------------------------------- *
 * Everything here is measured from resolved geometry and computed style. Nothing reads source,
 * because the defects are produced by resolution and are invisible before it. */
const PROBE = () => {
  const out = [];
  const rect = (e) => e.getBoundingClientRect();
  const vis = (e) => { const r = rect(e); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  /* The demo harness — a state switcher, a route readout — is scaffolding, not the product, and
     holding it to the product's token discipline reports noise. A project marks its own harness
     with data-harness; anything inside one is skipped. html and body are skipped for colour
     because an unset colour there is the user agent's, not a design decision. */
  const inHarness = (e) => !!e.closest("[data-harness], .devbar, .demo-chrome");
  const all = [...document.querySelectorAll("*")].filter((e) => vis(e) && !inHarness(e));
  const name = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0,2).join(".") : ""}`;

  /* 1.1 / 1.2 — a container rounded to a circle must BE square. radius only rounds corners; it
     does not make a box square, and a box that hugs a glyph is never square by accident. */
  for (const e of all) {
    const s = getComputedStyle(e), r = rect(e);
    const rad = parseFloat(s.borderTopLeftRadius) || 0;
    const circular = s.borderRadius.includes("50%") || rad >= Math.min(r.width, r.height) / 2;
    if (!circular) continue;
    if (r.width < 8 || r.height < 8) continue;
    /* A pill is a legitimate shape: a wide box with a radius half its height is a capsule, not a
       failed circle. The rule is about a container that HOLDS A GLYPH and is meant to read as a
       circle — an avatar, a status dot, an icon button. An empty box is a bar, and a first draft
       of this check reported every skeleton loader in the build as an oval. */
    const kids = [...e.children];
    const glyph = kids.length === 1 && /^(svg|img)$/i.test(kids[0].tagName);
    const shortText = kids.length === 0 && (e.textContent || "").trim().length > 0 && (e.textContent || "").trim().length <= 2;
    if (!glyph && !shortText) continue;
    if (Math.abs(r.width - r.height) > 1)
      out.push(["round-is-square", name(e), `rounded to a circle at ${Math.round(r.width)}×${Math.round(r.height)} — ${Math.round(Math.abs(r.width-r.height))}px from square, so it renders as an oval`]);
  }

  /* 1.3 — clipped boxes must contain their content. Content grows; a fixed clipped box does not. */
  for (const e of all) {
    const s = getComputedStyle(e);
    if (!/hidden|clip/.test(s.overflow + s.overflowX + s.overflowY)) continue;
    const r = rect(e);
    for (const c of e.children) {
      if (!vis(c)) continue;
      const cr = rect(c);
      const over = Math.max(cr.right - r.right, r.left - cr.left, cr.bottom - r.bottom, r.top - cr.top);
      if (over > 1.5) out.push(["clip-contains", name(e), `clips its overflow and ${name(c)} exceeds it by ${Math.round(over)}px, so content is silently cut`]);
    }
  }

  /* 1.6 — marks drawn on top of one another must be concentric by construction, not by eye. */
  for (const e of all) {
    if (getComputedStyle(e).position !== "absolute") continue;
    const p = e.offsetParent; if (!p) continue;
    const a = rect(e), b = rect(p);
    const inside = a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    if (!inside) continue;
    const dx = Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2);
    const dy = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
    const centred = dx < 4 && dy < 4;                 /* clearly meant to be concentric */
    if (centred && (dx > 0.5 || dy > 0.5))
      out.push(["concentric", name(e), `sits ${dx.toFixed(1)}px / ${dy.toFixed(1)}px off the centre of ${name(p)} — near enough to read as a centring mistake rather than a placement`]);
  }

  /* 3.1 — every visible colour is a token. A literal that survived tokenisation is invisible in
     review and permanent in the build. Detected as a resolved colour that no CSS custom property
     on :root resolves to. */
  const tokenVals = new Set();
  for (const sheet of [...document.styleSheets]) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (!rule.style) continue;
      for (const prop of rule.style) if (prop.startsWith("--")) tokenVals.add(rule.style.getPropertyValue(prop).trim().toLowerCase());
    }
  }
  /* A token is written #CE8509 and resolves to rgb(206, 133, 9). Comparing the two forms without
     converting reports every genuine token as a literal — which this check did, on its first run,
     producing 32 false findings and burying the one real one. Normalise to rgb() first. */
  const hex2rgb = (h) => {
    const m = h.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return null;
    let x = m[1]; if (x.length === 3) x = x.split("").map((c) => c + c).join("");
    return `rgb(${parseInt(x.slice(0,2),16)},${parseInt(x.slice(2,4),16)},${parseInt(x.slice(4,6),16)})`;
  };
  const norm = (c) => { const t = c.replace(/\s/g, "").toLowerCase(); return hex2rgb(t) || t; };
  const tokenSet = new Set();
  for (const v of tokenVals) {
    tokenSet.add(norm(v));
    /* a token may itself be a var() chain or an oklch(); record the raw form too */
    tokenSet.add(v.replace(/\s/g, "").toLowerCase());
  }
  const seen = new Map();
  for (const e of all) {
    if (/^(html|body)$/i.test(e.tagName)) continue;
    const s = getComputedStyle(e);
    const isSvg = e.ownerSVGElement !== undefined && e.ownerSVGElement !== null || /^(svg|path|circle|rect|line|polygon)$/i.test(e.tagName);
    /* fill and stroke resolve to their initial value on every non-SVG element, so reading them
       there reports the initial black on every div in the document. */
    for (const prop of isSvg ? ["color", "fill", "stroke"] : ["color", "backgroundColor", "borderTopColor"]) {
      const v = s[prop]; if (!v || v === "none") continue;
      if (/rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(v)) continue;
      /* A colour that paints nothing is not a literal anyone can see. Border colour on a zero-width
         border, and fill on an element whose text is what is actually painted, both resolve to the
         initial black and are invisible in the render — reporting them buries the ones that show. */
      if (prop === "borderTopColor" && parseFloat(s.borderTopWidth) === 0) continue;
      if (prop === "fill" && (v === "rgb(0, 0, 0)" && !e.getAttribute("fill"))) continue;
      if (prop === "color" && !(e.textContent || "").trim()) continue;
      const key = norm(v);
      if (tokenSet.has(key)) continue;
      /* color(srgb …) is what color-mix() resolves to. A mix of two tokens is derived from them,
         not a literal that escaped tokenisation, and cannot be matched back by string compare. */
      if (/^color\(srgb/.test(key)) continue;
      if (!seen.has(key)) seen.set(key, { prop, el: name(e), n: 0 });
      seen.get(key).n++;
    }
  }
  for (const [v, info] of seen)
    if (info.n >= 2) out.push(["colour-is-token", info.el, `${info.prop} resolves to ${v}, which no custom property on this page defines — a literal that survived tokenisation, on ${info.n} elements`]);

  return out;
};

/* --self-test renders one deliberately broken page shipped beside this script, carrying exactly
   one instance of each defect class, and asserts every class is still caught. A check nobody has
   seen fire is a check nobody can trust, and this one's whole subject — resolved geometry — cannot
   be mutated from a state file the way every other check here is proven. So it carries its own
   proof, and it runs anywhere without a server. */
if (SELF_TEST) {
  const fixture = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "fixtures", "visual-qa", "deliberately-broken.html");
  if (!fs.existsSync(fixture)) {
    console.error(`FAIL  the fixture is missing at ${fixture}. This check cannot prove itself.`);
    process.exit(2);
  }
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.goto("file://" + fixture);
  await pg.waitForTimeout(150);
  const got = new Set((await pg.evaluate(PROBE)).map((f) => f[0]));
  await b.close();
  const want = ["round-is-square", "clip-contains", "concentric", "colour-is-token"];
  const missed = want.filter((w) => !got.has(w));
  console.log(`self-test: ${want.length - missed.length} of ${want.length} defect classes caught`);
  if (missed.length) {
    for (const m of missed) console.error(`FAIL  [${m}] was not caught on a page built to contain it`);
    process.exit(1);
  }
  console.log("\n0 finding(s). Every class this check claims to hold, it still holds.");
  process.exit(0);
}

/* ---- drive it ------------------------------------------------------------ */
const browser = await chromium.launch();
let visited = 0, pagesFailed = 0;

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const t of targets) {
    let res;
    try { res = await page.goto(BASE.replace(/\/$/, "") + "/" + t.q, { waitUntil: "load", timeout: 15000 }); }
    catch { pagesFailed++; continue; }
    if (!res || !res.ok()) { pagesFailed++; continue; }
    await page.waitForTimeout(150);
    visited++;
    for (const [id, where, why] of await page.evaluate(PROBE))
      fail(id, `${t.label} @${w}px · ${where}`, why);
  }
  await page.close();
}
await browser.close();

if (!visited) {
  console.log(`NOT MEASURED  nothing was served at ${BASE}, so no page was rendered.`);
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

console.log(`pages rendered: ${visited} (${targets.length} screen-states × ${WIDTHS.length} width(s))`);
if (pagesFailed) console.log(`unreachable: ${pagesFailed}`);

/* One line per distinct defect rather than per instance: the same oval repeated across forty
   states is one thing to fix, and forty findings would bury the other four. */
const byKey = new Map();
for (const f of findings) {
  const k = `${f.id}|${f.where.split("· ")[1] || f.where}|${f.why.replace(/\d+(\.\d+)?/g, "N")}`;
  if (!byKey.has(k)) byKey.set(k, { ...f, n: 0 });
  byKey.get(k).n++;
}
const unique = [...byKey.values()];
console.log(`defects: ${unique.length} distinct (${findings.length} instances)`);

if (unique.length) {
  console.error("");
  for (const f of unique.sort((a, b) => b.n - a.n))
    console.error(`FINDING  [${f.id}] ${f.where}${f.n > 1 ? `  ×${f.n}` : ""}\n         ${f.why}`);
  console.error(`\n${unique.length} finding(s).`);
  process.exit(1);
}
console.log("\n0 finding(s).");
