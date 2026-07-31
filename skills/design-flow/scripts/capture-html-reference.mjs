/**
 * Capture an HTML prototype as a measurement reference for Figma comparison.
 *
 * Records, per frame:
 *   - true text-run rects via Range.getBoundingClientRect() (glyph boxes, not element boxes)
 *   - every element box with its class list
 *   - computed font size and weight
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
const FRAME = get("--frame", ".phone");

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".html") && !/review|index/i.test(f));
if (!files.length) { console.error("no html files in " + DIR); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
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
            texts.push([
              s.replace(/\s+/g, " ").slice(0, 44),
              Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
              parseFloat(cs.fontSize), cs.fontWeight,
            ]);
          } else if (node.nodeType === 1) walk(node);
        }
      };
      walk(frame);

      frame.querySelectorAll("*").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const cls = (typeof el.className === "string" ? el.className : "").trim();
        if (!cls) return;
        boxes.push([cls.slice(0, 44),
          Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
          Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]);
      });

      out.push({ idx: i, cap: cap ? cap.textContent.trim() : "frame" + i,
        w: Math.round(fr.width), h: Math.round(fr.height), texts, boxes });
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

const meta = { capturedAt: new Date().toISOString(), forcedFont: FONT, dir: DIR };
fs.writeFileSync(path.join(OUT, "html-reference.json"), JSON.stringify({ meta, frames: all }));
console.log("\nwrote " + path.join(OUT, "html-reference.json"));
console.log(FONT ? `font forced to ${FONT}, re-run without --font once Figma uses the same family`
                 : "rendered native");
await browser.close();
