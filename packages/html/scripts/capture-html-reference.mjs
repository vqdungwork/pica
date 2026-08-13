/**
 * Capture an HTML prototype as a measurement reference for Figma comparison.
 *
 * Records, per frame:
 *   - `viewport` and `hug`, TAGGED not inferred — never parse the caption, pica's
 *     naming convention puts "·" inside screen names (F19)
 *   - `contentH` and `overflowX`, so clipped content is measurable (F15, F26)
 *   - text runs: glyph rect via Range.getBoundingClientRect(), font size, weight,
 *     plus the OWNING element's classes and its text-align. The owner lets a text
 *     finding be attributed to a component (F8); text-align says whether the x is
 *     comparable at all, since this records glyph ink and a design tool records the
 *     layout box (F24)
 *   - element boxes with class, depth, and nearest CLASSED parent index, so excusing
 *     a reflowing component can prune its whole subtree (F11)
 *   - a PNG of the frame
 *
 * Usage:
 *   node capture-html-reference.mjs --dir <html-dir> --out <out-dir> [--font "<family>"] [--sel ".frame-wrap"]
 *
 * --font forces a family so the diff isolates layout from typeface metrics. Omit to render native.
 * Run it BOTH ways: forced while fixing layout, native once both sides share the family.
 *
 * Requires playwright. If it is not installed in the current project, run from a directory that has it.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const args = process.argv.slice(2);
const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };

/**
 * Resolve playwright even though this script lives outside any project.
 * ESM resolves bare specifiers relative to the SCRIPT path, not the cwd, so running from a
 * directory that has playwright installed is not enough. Search instead.
 */
async function loadChromium() {
  try { return (await import("playwright")).chromium; } catch {}
  const explicit = get("--playwright", null);
  const roots = [];
  if (explicit) roots.push(explicit);
  let d = process.cwd();
  for (let i = 0; i < 6; i++) { roots.push(path.join(d, "node_modules", "playwright")); d = path.dirname(d); }
  for (const base of [process.env.HOME + "/node_modules", "/usr/local/lib/node_modules", "/opt/homebrew/lib/node_modules"])
    roots.push(path.join(base, "playwright"));
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(r, "package.json"), "utf8"));
      const entry = path.join(r, pkg.main || "index.js");
      const mod = await import(pathToFileURL(entry).href);
      console.log("using playwright at " + r);
      return (mod.chromium || mod.default?.chromium);
    } catch {}
  }
  console.error(
    "playwright not found.\n" +
    "  Pass --playwright /path/to/node_modules/playwright, or run:\n" +
    "    npm i -D playwright && npx playwright install chrome");
  process.exit(1);
}
const chromium = await loadChromium();

const DIR = get("--dir", process.cwd());
const OUT = get("--out", path.join(DIR, ".cmp"));
const FONT = get("--font", null);
const WRAP = get("--sel", ".frame-wrap");
/* The frame selector defaults to the viewport tag, not to a device class.
 *
 * Through 0.3.0 this defaulted to ".phone", from the mobile-only era. A desktop or
 * two-viewport project whose frames are not called .phone matched nothing, and the
 * script reported "0 frames" as ordinary output rather than as an error — so the
 * default silently produced an empty artefact that every downstream check then
 * passed. Defaulting to [data-viewport] makes the one attribute do both jobs: it
 * locates the frame and names its viewport, which is what verify-html.mjs asserts.
 * Override with --frame for a project that predates the tag. */
const FRAME = get("--frame", "[data-viewport]");

fs.mkdirSync(OUT, { recursive: true });
// A storybook is a documentation board, not a screen: it carries no frame, so
// capturing it renders a page for zero result. See findings F12.
const files = fs.readdirSync(DIR)
  .filter(f => f.endsWith(".html") && !/review|index|design-system/i.test(f));
if (!files.length) { console.error("no html files in " + DIR); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome" });
// Wide enough for the widest declared frame. The 1400 floor keeps a
// single-viewport project byte-identical to 0.2.0 output.
const PAGE_W = Math.max(1400, Number(get("--pagewidth", 0)) || 0);
const page = await browser.newPage({ viewport: { width: PAGE_W, height: 1000 }, deviceScaleFactor: 2 });
const all = {};

for (const file of files) {
  const name = file.replace(/\.html$/, "");
  await page.goto("file://" + path.resolve(DIR, file));
  if (FONT) await page.addStyleTag({ content: `:root{--font-family:"${FONT}",sans-serif !important}` });
  await page.waitForTimeout(1200);

  const data = await page.evaluate(({ WRAP, FRAME }) => {
    const out = [];
    document.querySelectorAll(WRAP).forEach((wrap, i) => {
      const cap = wrap.querySelector(".frame-cap");
      const frame = wrap.querySelector(FRAME);
      if (!frame) return;
      const fr = frame.getBoundingClientRect();
      const texts = [], boxes = [];

      // true glyph rects, walking text nodes rather than elements
      const walk = (el) => {
        for (const node of el.childNodes) {
          if (node.nodeType === 3) {
            const s = node.textContent.trim();
            if (!s) continue;
            const rg = document.createRange();
            rg.selectNodeContents(node);
            const r = rg.getBoundingClientRect();
            if (r.width < 0.5 && r.height < 0.5) continue;
            const cs = getComputedStyle(el);
            // index 7 is the OWNING element's classes, and index 8 its text-align.
            // Without the owner, a text finding cannot be attributed to a component,
            // so text belonging to a registered reflow reports forever as drift (F8).
            // Without text-align, a centred or FILL run's x cannot be compared: the
            // capture records glyph ink and a design tool records the layout box (F24).
            texts.push([
              s.replace(/\s+/g, " ").slice(0, 44),
              Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
              parseFloat(cs.fontSize), cs.fontWeight,
              (typeof el.className === "string" ? el.className : "").trim().slice(0, 44),
              cs.textAlign,
            ]);
          } else if (node.nodeType === 1) walk(node);
        }
      };
      walk(frame);

      // Boxes carry DEPTH and PARENT INDEX at indexes 5 and 6. Excusing a
      // reflowing component has to excuse what is inside it, and that needs the
      // tree — otherwise every registered reflow leaks count mismatches through
      // its descendants and the parity check can never return zero (F11).
      const idxOf = new Map();
      frame.querySelectorAll("*").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const cls = (typeof el.className === "string" ? el.className : "").trim();
        if (!cls) return;
        let depth = 0, a = el.parentElement;
        while (a && a !== frame) { depth++; a = a.parentElement; }
        // Parent is the nearest CLASSED ancestor, not the immediate parent. Unclassed
        // elements are not recorded, so using the immediate parent breaks the chain
        // the moment one sits between a registered component and its descendants —
        // a <td> wrapping a score pill defeated subtree pruning exactly this way.
        let pa = el.parentElement, parentIdx = -1;
        while (pa && pa !== frame) {
          if (idxOf.has(pa)) { parentIdx = idxOf.get(pa); break; }
          pa = pa.parentElement;
        }
        idxOf.set(el, boxes.length);
        boxes.push([cls.slice(0, 44),
          Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
          Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
          depth, parentIdx]);
      });

      // Overflow past the frame edge. The frame clips it, so it is invisible in a
      // screenshot and needs measuring (F15).
      let overflow = 0, overflowBy = "";
      frame.querySelectorAll("*").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1) return;
        const o = Math.round(r.right - fr.right);
        if (o > overflow) { overflow = o;
          overflowBy = (typeof el.className === "string" ? el.className : "").slice(0, 30); }
      });

      // The viewport is TAGGED here, never derived from the caption. pica's naming
      // convention puts "·" inside screen names, so parsing the caption collapses
      // distinct screens into one bucket (F19). `data-viewport` on the frame wins;
      // width is the documented fallback.
      const vp = frame.dataset ? (frame.dataset.viewport || null) : null;
      const hug = /(^|\s)hug(\s|$)/.test(frame.className || "");
      const sr = frame.querySelector(".scroll-region");
      out.push({ idx: i, cap: cap ? cap.textContent.trim() : "frame" + i,
        viewport: vp, hug,
        w: Math.round(fr.width), h: Math.round(fr.height),
        contentH: sr ? sr.scrollHeight : null,
        overflowX: overflow > 1 ? { px: overflow, node: overflowBy } : null,
        texts, boxes });
    });
    return out;
  }, { WRAP, FRAME });

  all[name] = data;

  const wraps = await page.$$(WRAP);
  for (const [i, w] of wraps.entries()) {
    const f = await w.$(FRAME);
    if (f) await f.screenshot({ path: path.join(OUT, `html__${name}__${i}.png`) });
  }
  console.log(`${name}: ${data.length} frames, ${data.reduce((a, d) => a + d.texts.length, 0)} text runs`);
}

/* An empty capture is a failure, not a result.
 *
 * A selector that matches nothing produced "0 frames" as ordinary output, wrote a
 * well-formed artefact containing no frames, and every downstream check then passed
 * it — a green run that measured nothing. Refuse to write instead, and name both
 * selectors so the cause is obvious. */
const totalFrames = Object.values(all).reduce((a, d) => a + d.length, 0);
if (!totalFrames) {
  console.error(`\nFAIL  captured 0 frames from ${Object.keys(all).length} file(s).`);
  console.error(`      wrap selector  --sel   "${WRAP}"`);
  console.error(`      frame selector --frame "${FRAME}"`);
  console.error(`      One of these matches nothing. Nothing was written: an empty`);
  console.error(`      reference would pass every downstream check while measuring nothing.`);
  await browser.close();
  process.exit(1);
}

const meta = { capturedAt: new Date().toISOString(), forcedFont: FONT, dir: DIR };
fs.writeFileSync(path.join(OUT, "html-reference.json"), JSON.stringify({ meta, frames: all }));
console.log("\nwrote " + path.join(OUT, "html-reference.json"));
console.log(FONT ? `font forced to ${FONT}, re-run without --font once Figma uses the same family`
                 : "rendered native");
await browser.close();
