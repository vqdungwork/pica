/**
 * Capture an HTML prototype as a measurement reference for Figma comparison.
 *
 * Records, per frame:
 *   - `viewport` and `hug`, TAGGED not inferred: never parse the caption, pica's
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
 *   node capture-html-reference.mjs --url <live-url> [--url <another>] --out <out-dir> [--as demo-reference.json]
 *
 * --url captures a running build rather than prototype files, which is what step 7.10
 * compares against the approved design. Pass it more than once for several routes.
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
  /* Exit 2: a missing TOOL is "could not run", not "ran and found defects". Intake 1b
   * asks what needs a tool that is not installed precisely so this arrives as a stated
   * limitation rather than as a failure nobody can act on. */
  console.error(
    "FAIL  playwright not found, so nothing was captured and that is not a pass.\n" +
    "  Pass --playwright /path/to/node_modules/playwright, or run:\n" +
    "    npm i -D playwright && npx playwright install chrome");
  process.exit(2);
}
const chromium = await loadChromium();

const DIR = get("--dir", process.cwd());
const OUT = get("--out", path.join(DIR, ".cmp"));
/* The file name, so a capture of the BUILD can sit beside the approved one. Every capture used to
 * be html-reference.json, so the build had to go to another directory, and build-diff's manifest
 * asked for .audit/demo-reference.json, a file nothing could produce: it never ran under
 * pica-verify. `--url <demo> --out .audit --as demo-reference.json` is that file. */
const AS = get("--as", "html-reference.json");
if (!/^[\w.-]+\.json$/.test(AS)) { console.error(`FAIL  --as ${AS}: a file name ending in .json, with no directory`); process.exit(2); }
const FONT = get("--font", null);
const WRAP = get("--sel", ".frame-wrap");
/* The frame selector defaults to the viewport tag, not to a device class.
 *
 * Through 0.3.0 this defaulted to ".phone", from the mobile-only era. A desktop or
 * two-viewport project whose frames are not called .phone matched nothing, and the
 * script reported "0 frames" as ordinary output rather than as an error, so the
 * default silently produced an empty artefact that every downstream check then
 * passed. Defaulting to [data-viewport] makes the one attribute do both jobs: it
 * locates the frame and names its viewport, which is what verify-html.mjs asserts.
 * Override with --frame for a project that predates the tag. */
const FRAME = get("--frame", "[data-viewport]");

fs.mkdirSync(OUT, { recursive: true });
// A storybook is a documentation board, not a screen: it carries no frame, so
// capturing it renders a page for zero result. See findings F12.
/* --url captures a LIVE build instead of a directory of prototype files. It is the
 * same capture, pointed at the running product, which is what makes step 7.10 possible:
 * comparing what was built against the design that was approved. Without it the flow
 * can measure its own prototype and nothing else, and the one comparison the whole
 * industry skips stays skipped. */
const URLS = args.filter((a, i) => args[i - 1] === "--url");
const LIVE = URLS.length > 0;
/* --dir and --url were mutually exclusive, and react-demo.md's own model needs both at
 * once: "Boards stay static. The flow becomes React", captured `--dir` and `--url`
 * respectively. One reference could hold one or the other, so a project built exactly as
 * the rules prescribe could not produce a reference covering its own deliverable — and
 * the per-source zero guard then failed every --dir run forever, because every file
 * state.flows declares is client-rendered and has no frames on disk. A gate that can
 * never go green is one people learn to pass with a flag.
 * Pass --dir WITH --url and the sources are the union. */
const WANT_DIR = args.includes("--dir") || !LIVE;

let files = [];
if (WANT_DIR) {
  /* Guarded: a directory that does not exist threw an unguarded ENOENT, so a project
   * with nothing built yet crashed here instead of saying so. */
  if (!fs.existsSync(DIR)) {
    /* With --url alongside, a missing directory is simply "no boards", not a failure:
       the routes are still a complete capture of what was asked for. */
    if (!LIVE) {
      console.error(`FAIL  ${DIR} does not exist, so there is nothing to capture and that is not a pass.`);
      process.exit(2);
    }
  }
  files = !fs.existsSync(DIR) ? [] : fs.readdirSync(DIR)
    .filter(f => f.endsWith(".html") && !/review|index|design-system/i.test(f));
  /* Exit 2, not 1. Inside picaflow, 1 means "ran and found defects" and 2 means "could
   * not run". An empty directory is the second, and reporting it as the first made a
   * project with nothing built yet look like a project with failures. */
  if (!files.length && !LIVE) {
    console.error(`FAIL  no html files in ${DIR}. Nothing to capture, and that is not a pass.`);
    process.exit(2);
  }
}

const browser = await chromium.launch({ channel: "chrome" });
// Wide enough for the widest declared frame. The 1400 floor keeps a
// single-viewport project byte-identical to 0.2.0 output.
const PAGE_W = Math.max(1400, Number(get("--pagewidth", 0)) || 0);
const page = await browser.newPage({ viewport: { width: PAGE_W, height: 1000 }, deviceScaleFactor: 2 });
const all = {};
const widthMedia = [];
const containerQueries = [];
const settled = [], unsettled = [];
let resolvedFont = null;

const sources = [
  ...files.map(f => ({ name: f.replace(/\.html$/, ""), url: null })),
  ...URLS.map(u => ({ name: u.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "-").slice(0, 60), url: u })),
];
/* A route name is the URL flattened and cut to 60 characters, so two routes differing
 * only past that point produced ONE key and the second silently replaced the first: a
 * state captured, overwritten, and reported as covered. Deduplicate by suffix — the name
 * is an identifier, and losing one is the same defect class as measuring nothing. */
{
  const seen = new Map();
  for (const src of sources) {
    const n = seen.get(src.name) || 0;
    seen.set(src.name, n + 1);
    if (n) src.name = `${src.name.slice(0, 57)}~${n}`;
  }
}

for (const src of sources) {
  const file = src.url ? null : src.name + ".html";
  const name = src.name;
  await page.goto(src.url ? src.url : "file://" + path.resolve(DIR, file),
                  src.url ? { waitUntil: "networkidle" } : undefined);

  /* Width-based @media rules are the one styling construct this harness CANNOT measure.
   * Every frame is laid out in a single browser window at PAGE_W, so a `max-width: 900px`
   * rule either fires for every frame or for none, never for the tablet frame alone.
   * html-prototype.md has said "responsive is @container, never a width @media" since
   * 0.4.0 for exactly this reason, and nothing checked it: a prototype using one looked
   * right in a browser and was measured against the wrong layout by every check
   * downstream, all of them reporting clean.
   *
   * Read from DISK, not from the CSSOM. The first version asked the page, and a linked
   * stylesheet on a file:// URL throws SecurityError on `cssRules` in Chrome, so it
   * returned an empty list on every project pica actually builds and the check silently
   * found nothing. Reading text finds it in linked sheets and inline <style> alike.
   *
   * Reported by verify-html. */
  if (!src.url) {
    const seenCss = new Set();
    const scan = (css) => {
      for (const m of css.matchAll(/@media([^{]+)\{/g)) {
        const t = m[1].trim().slice(0, 80);
        if (!/\b(min|max)-(width|height)\b/i.test(t)) continue;
        if (!widthMedia.includes(t)) widthMedia.push(t);
      }
      /* Container queries are counted so verify-html can tell a stylesheet that is
       * responsive from one that only looks it. A @container rule against a container
       * that cannot change size never fires. */
      for (const m of css.matchAll(/@container([^{]*)\{/g)) {
        const t = m[1].trim().slice(0, 80);
        if (t && !containerQueries.includes(t)) containerQueries.push(t);
      }
    };
    let html = "";
    try { html = fs.readFileSync(path.resolve(DIR, file), "utf8"); } catch {}
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) scan(m[1]);
    for (const m of html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)) {
      const href = m[1];
      if (seenCss.has(href)) continue;
      seenCss.add(href);
      try { scan(fs.readFileSync(path.resolve(DIR, href), "utf8")); } catch {}
    }
  }
  if (FONT) await page.addStyleTag({ content: `:root{--font-family:"${FONT}",sans-serif !important}` });
  await page.waitForTimeout(1200);

  /* ---- capture-settled ----------------------------------------------------
   * A route measured mid-render produces geometry for a layout that existed for 200ms, and
   * says nothing: no error, a page that looks right, every number wrong. It is the same
   * failure shape as a webfont silently falling back, and it arrived with --url: a
   * directory of static files has nothing to wait for.
   *
   * Sample the layout twice and require the two to agree. Not a timeout: a longer wait is a
   * guess that the page finished, and this is the assertion that it did. */
  const sample = () => page.evaluate(() => {
    const d = document.documentElement;
    const boxes = [...document.querySelectorAll("[data-scr], [data-viewport], section, main")]
      .slice(0, 200)
      .map((e) => { const r = e.getBoundingClientRect(); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0]; });
    return JSON.stringify([d.scrollWidth, d.scrollHeight, boxes]);
  });
  let a = await sample();
  let stable = false;
  for (let i = 0; i < 6 && !stable; i++) {
    await page.waitForTimeout(250);
    const b = await sample();
    stable = a === b;
    a = b;
  }
  if (!stable) {
    unsettled.push(name);
  } else {
    settled.push(name);
  }

  /* Record the family the browser ACTUALLY resolved, forced or not. `forcedFont` only
   * says what was asked for; when nothing is forced it is null and the artefact carries
   * no font at all: which is how a capture in one family comes to be diffed against a
   * design in another, with every metric difference read as a layout defect. */
  if (!resolvedFont) {
    resolvedFont = await page.evaluate((FRAME) => {
      const el = document.querySelector(`${FRAME} *`);
      const fam = getComputedStyle(el || document.body).fontFamily || "";
      return (fam.split(",")[0] || "").replace(/^["']|["']$/g, "").trim() || null;
    }, FRAME);
  }

  const data = await page.evaluate(({ WRAP, FRAME }) => {
    const out = [];
    // What counts as a control for the density census. Deliberately includes
    // role-based and class-based buttons: a prototype's primary action is very
    // often a styled <div>, and a density rule that only sees real <button>s
    // would report a clean pass on the screen it most needed to measure.
    /* Everything a user can reach or operate. It listed only things that LOOK like
     * controls, so a <div data-go> promoted to a button by a router, or an <a> with no
     * href pretending to be navigation, was invisible — which is exactly the shape of
     * defect that shipped a product unusable by keyboard while every gate was green. */
    const CONTROL_SEL = "button, input:not([type=hidden]), select, textarea, a, summary, " +
      "[role], [tabindex], [onclick], [data-go], [data-tab], [data-sheet], [data-pane], " +
      "[data-popback], [data-href], .btn, .button, .navitem, .tile, .key, .chip, .swatch";
    /* The wrapper NAMES a frame; it does not define one. A prototype page legitimately
     * renders a frame without the board chrome around it — this project's static apps
     * strip .frame-wrap on purpose, because the caption and border belong to the board
     * and not to the thing a client clicks. Requiring the wrapper meant those pages
     * captured zero frames and the per-source guard demanded a --url run that had just
     * happened. So: wrappers first, and any VISIBLE frame not inside one is measured on
     * its own, named from data-scr instead of a caption. */
    const wraps = [...document.querySelectorAll(WRAP)];
    const unwrapped = [...document.querySelectorAll(FRAME)].filter((f) => {
      if (wraps.some((w) => w.contains(f))) return false;
      const r = f.getBoundingClientRect();
      const cs = getComputedStyle(f);
      return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    });
    [...wraps, ...unwrapped].forEach((node, i) => {
      const bare = !node.matches(WRAP);
      const wrap = bare ? node.parentElement || node : node;
      const cap = bare ? null : wrap.querySelector(".frame-cap");
      const frame = bare ? node : wrap.querySelector(FRAME);
      if (!frame) return;
      const fr = frame.getBoundingClientRect();
      const texts = [], boxes = [], controls = [];
      /* Shadow blur and motion easing: three assertions the direction could declare and
       * nothing evaluated, because the census recorded no data for them. `shadow.blur.max`
       * is in the style signature table for flat and neobrutalism, so declaring either
       * implied an enforcement that did not exist, and shipping a blurred shadow under
       * `shadow.blur.max: 0` passed every gate. */
      const shadowBlur = new Set(), easings = new Set();

      /* Direction census. A declared design direction (state.direction) asserts
       * facts about the kit: corner radius, control height, numerals, how many
       * hues the palette actually spends. The four geometric checks are blind to
       * all of it: a screen can measure correct to the pixel and still be the
       * wrong design system. Recorded here because verify-html reads this
       * artefact and never re-renders, and AGGREGATED per frame because a
       * direction is a property of the kit, not of one node: recording it per
       * element would multiply the file by the node count to say the same thing. */
      const radii = new Map(), controlH = new Set(), hues = new Set();
      let numericRuns = 0, tabularRuns = 0;
      const bumpRadius = (px) => radii.set(px, (radii.get(px) || 0) + 1);
      // Saturation below this is a neutral: greys, near-blacks, and the off-whites
      // a surface scale is built from. Counting them as hues would make every
      // palette look like it spends a dozen, and the budget would never mean anything.
      const SAT_MIN = 0.15;
      const addHue = (v) => {
        const m = /^rgba?\(([^)]+)\)/.exec(v || "");
        if (!m) return;
        const p = m[1].split(",").map(Number);
        if (p.length > 3 && p[3] === 0) return;          // fully transparent
        const [r, g, b] = p.slice(0, 3).map((n) => n / 255);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        if (!d) return;                                   // pure neutral
        const l = (mx + mn) / 2;
        if (d / (1 - Math.abs(2 * l - 1)) < SAT_MIN) return;
        let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        // 30-degree buckets: two shades of one blue are one hue, blue and teal are two.
        hues.add(Math.floor(h / 30) * 30);
      };

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
            // A numeric run is a run that IS a number: "1,234.56", "$42", "8%",
            // not prose that happens to contain a digit. Tabular figures only
            // matter where numbers stack into a column and have to align.
            const bare = s.replace(/[\s,.\u00a0%+\-–—:/$€£¥]/g, "");
            if (bare && /^\d+$/.test(bare)) {
              numericRuns++;
              if (/tabular-nums/.test(cs.fontVariantNumeric || "")) tabularRuns++;
            }
            // Text colour is counted here rather than in the element pass below,
            // because `color` is inherited and every element reports one whether
            // or not it draws a glyph. Counting those would spend the hue budget
            // on containers that show nothing.
            addHue(cs.color);
            texts.push([
              // 160, not 44. The geometry checks only need enough of a string to
              // identify a run, but copy-check reads this same field to judge CONTENT,
              // and at 44 an error message was graded on its first sentence: the next
              // step it was failed for missing lived at character 47. One field, two
              // consumers, and the shorter need silently starved the longer one.
              s.replace(/\s+/g, " ").slice(0, 160),
              Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
              parseFloat(cs.fontSize), cs.fontWeight,
              (typeof el.className === "string" ? el.className : "").trim().slice(0, 44),
              cs.textAlign,
              /* Index 9 and 10: the resolved foreground and the background it actually
               * sits on, appended so every existing consumer keeps its positions.
               *
               * Contrast is the one accessibility property that is objective, computable
               * and legally binding: WCAG 2.2 AA is a statutory floor for public-sector
               * services, and four other sectors in the knowledge base call it functional
               * rather than aesthetic. This harness measured geometry to a tenth of a
               * pixel and never measured it, because the capture recorded no colour pair.
               *
               * The background is resolved by walking up until a non-transparent one is
               * found, because `background-color` on the element itself is transparent far
               * more often than not, and comparing text to `rgba(0,0,0,0)` computes a
               * ratio against nothing. */
              cs.color,
              (() => {
                let n = el;
                while (n && n !== document.documentElement) {
                  const bg = getComputedStyle(n).backgroundColor;
                  if (bg && bg !== "transparent" && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg)) return bg;
                  n = n.parentElement;
                }
                return getComputedStyle(document.body).backgroundColor || "rgb(255, 255, 255)";
              })(),
              /* Index 11: the nearest CLASSED ancestor's class, appended so every existing
               * consumer keeps its positions. Index 7 stays the run's own class and is
               * unchanged.
               *
               * A run's own element is very often unclassed: `<span class="warn">` wrapping
               * a bare `<span>` is the normal shape for a message with a label, and index 7
               * is then empty. copy-check narrows its next-step scan to the runs an error
               * component owns, and with only index 7 that scan saw the word "Refused" and
               * not the sentence beneath it, so it failed a refusal that said exactly what
               * to do. Scoping needs the owning COMPONENT, not the owning tag. */
              (() => {
                let n = el.parentElement;
                while (n && n !== document.documentElement) {
                  const c = typeof n.className === "string" ? n.className.trim() : "";
                  if (c) return c.slice(0, 44);
                  n = n.parentElement;
                }
                return "";
              })(),
            ]);
          } else if (node.nodeType === 1) walk(node);
        }
      };
      walk(frame);

      // Boxes carry DEPTH and PARENT INDEX at indexes 5 and 6. Excusing a
      // reflowing component has to excuse what is inside it, and that needs the
      // tree: otherwise every registered reflow leaks count mismatches through
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
        // the moment one sits between a registered component and its descendants,
        // a <td> wrapping a score pill defeated subtree pruning exactly this way.
        let pa = el.parentElement, parentIdx = -1;
        while (pa && pa !== frame) {
          if (idxOf.has(pa)) { parentIdx = idxOf.get(pa); break; }
          pa = pa.parentElement;
        }
        const st2 = getComputedStyle(el);
        for (const sh of String(st2.boxShadow || "").split(/,(?![^(]*\))/)) {
          if (!sh || sh === "none") continue;
          /* offset-x offset-y blur spread colour, in any order with the colour anywhere.
           * The third length is the blur; two lengths means a blur of zero. */
          const lens = sh.match(/-?\d+(?:\.\d+)?px/g) || [];
          shadowBlur.add(lens.length >= 3 ? Math.abs(parseFloat(lens[2])) : 0);
        }
        for (const prop of [st2.transitionTimingFunction, st2.animationTimingFunction]) {
          for (const fn of String(prop || "").split(/,(?![^(]*\))/)) {
            const t = fn.trim();
            if (t && t !== "ease") easings.add(t.slice(0, 40));
          }
        }
        idxOf.set(el, boxes.length);
        /* Index 7 is the tag name, appended rather than inserted so every existing
         * consumer keeps its positions. It is here because a class list cannot tell a
         * <button> from a <div>, and the data-ownership check needs to know whether an
         * element inside a read-only region is something a person can type into. That
         * rule was documented under a column headed "Enforced by" for three releases
         * with nothing enforcing it, and the reason nothing could was this field. */
        boxes.push([cls.slice(0, 44),
          Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
          Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
          depth, parentIdx, el.tagName.toLowerCase()]);
      });

      /* `layout` is EVERY block-level element, classed or not, in the same shape as
       * `boxes`. It is a separate array rather than an extension of that one because
       * `boxes` holds only classed elements by design, and parity-check counts them.
       *
       * Measuring the gap between two siblings needs ALL the siblings. With only the
       * classed ones, a table of 24 rows where 3 carry a class reported those 3 as
       * adjacent, 280px apart, and spacing-check called it a defect. It was the absence
       * of the other 21. A check fed an incomplete sibling set does not measure spacing,
       * it measures which elements happened to be styled. */
      const LAYOUT = new Set(["div", "section", "article", "aside", "header", "footer",
        "nav", "main", "form", "fieldset", "ul", "ol", "li", "table", "thead", "tbody",
        "tr", "figure", "dl", "p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr"]);
      const layout = [];
      const lidx = new Map();
      frame.querySelectorAll("*").forEach(el => {
        if (!LAYOUT.has(el.tagName.toLowerCase())) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        lidx.set(el, layout.length);
        let par = el.parentElement, pi = -1, d = 0;
        while (par && par !== frame) {
          if (LAYOUT.has(par.tagName.toLowerCase())) { if (pi === -1 && lidx.has(par)) pi = lidx.get(par); d++; }
          par = par.parentElement;
        }
        layout.push([(typeof el.className === "string" ? el.className : "").trim().slice(0, 44),
          Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
          Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
          d, pi, el.tagName.toLowerCase()]);
      });

      /* Controls are recorded separately from boxes, and separately for a reason: boxes
       * only holds CLASSED elements, and a control frequently has no class at all. The
       * data-ownership check exists to find an <input> inside a region the brief declared
       * read-only, and the first version of it found nothing, because the input it was
       * looking for was never captured.
       *
       * A separate array rather than a relaxed filter on boxes: every other consumer
       * reads boxes positionally and compares its structure, and quietly adding unclassed
       * nodes to it would move counts in checks that have nothing to do with this. */
      const CONTROL_TAGS = new Set(["input", "textarea", "select", "button"]);
      /* CONTROL_SEL, not the four native tags. The narrow list meant a <div> or <a>
       * acting as a control was never captured, so a11y-check could not see the exact
       * defect it exists to find: convert 68 <button> to <div> and the controls array
       * went from 125 entries to 5, and the check reported a clean run over what was
       * left. data-ownership filters this array by tag through EDITABLE, so widening it
       * cannot change that check's behaviour. */
      frame.querySelectorAll(CONTROL_SEL + ", [contenteditable=true]").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        let pa = el.parentElement, parentIdx = -1;
        while (pa && pa !== frame) {
          if (idxOf.has(pa)) { parentIdx = idxOf.get(pa); break; }
          pa = pa.parentElement;
        }
        /* THE INTERACTION RECORD.
         * Until now a control was [tag, x, y, w, h, parent, class] — geometry and
         * nothing else. Every accessibility property was absent from the artefact, so
         * no accessibility check could be WRITTEN, not merely none had been: converting
         * all 68 buttons in a board to divs produced byte-identical output from
         * verify-html and contrast-check.
         * These are a few more reads on a walk the capture already performs. */
        const cs2 = getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const focusable = el.matches("a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]")
          && !el.hasAttribute("disabled") && cs2.visibility !== "hidden" && cs2.display !== "none"
          && el.getAttribute("tabindex") !== "-1";
        /* the accessible name, in the order a screen reader resolves it */
        let name = el.getAttribute("aria-label") || "";
        if (!name && el.getAttribute("aria-labelledby")) {
          name = (el.getAttribute("aria-labelledby").split(/\s+/)
            .map((id) => (frame.querySelector("#" + CSS.escape(id)) || {}).textContent || "")
            .join(" ")).trim();
        }
        if (!name && tag === "img") name = el.getAttribute("alt") || "";
        /* <label for> IS the primary way an input is named in HTML, and this resolver
         * skipped it entirely: an input has no textContent, so every correctly labelled
         * field reported "no accessible name" and the check advised adding an aria-label
         * to markup that was already right. Advice that is wrong about correct code is
         * how a check gets ignored. Both associations, explicit and implicit. */
        if (!name && el.id) {
          const lab = frame.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lab) name = (lab.textContent || "").trim();
        }
        if (!name) {
          const wrapLab = el.closest("label");
          if (wrapLab) name = (wrapLab.textContent || "").trim();
        }
        if (!name) name = el.getAttribute("title") || "";
        /* placeholder is deliberately NOT a name: it disappears on the first keystroke,
         * so a field named only by one is unnamed exactly when the user needs it. */
        if (!name) name = (el.textContent || "").trim();
        controls.push([tag,
          Math.round((r.x - fr.x) * 10) / 10, Math.round((r.y - fr.y) * 10) / 10,
          Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10,
          parentIdx, (typeof el.className === "string" ? el.className : "").trim().slice(0, 44),
          {
            role: el.getAttribute("role") || null,
            tabindex: el.getAttribute("tabindex"),
            href: el.getAttribute("href"),
            disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
            hidden: el.hasAttribute("hidden") || cs2.display === "none" || cs2.visibility === "hidden",
            name: name.replace(/\s+/g, " ").slice(0, 60),
            /* Does this element actually DO anything, or does it merely wear a control's
             * class? CONTROL_SEL matches .chip and .btn on purpose, to catch a <div>
             * acting as a button — but the same net catches a <span class="chip"> used as
             * a status label, and reporting those as unreachable controls is how a check
             * teaches people to skim past it. The class is the guess; this is the
             * evidence, and a11y-check requires the two together. */
            verb: !!(el.onclick || el.getAttribute("onclick")
              || el.matches("[data-go],[data-tab],[data-sheet],[data-pane],[data-popback],[data-href],[data-sheetclose],[data-scr]")),
            focusable,
            /* A control with no visible focus style is one a keyboard user loses.
             * MEASURED BY FOCUSING IT, not by reading the resting style: :focus-visible
             * does not apply until the element is focused, so the resting outline is
             * "none" on almost everything and reading it reported 122 of 122 controls
             * as unfocusable. A check that fires on everything is worth the same as one
             * that fires on nothing. preventScroll keeps the measurement from moving the
             * layout underneath the rest of the capture. */
            focusOutline: (() => {
              if (!focusable) return null;
              const prev = document.activeElement;
              try {
                el.focus({ preventScroll: true });
                const fs2 = getComputedStyle(el);
                const w2 = parseFloat(fs2.outlineWidth) || 0;
                const shadow = fs2.boxShadow && fs2.boxShadow !== "none";
                const out = (fs2.outlineStyle !== "none" && w2 > 0) ? fs2.outlineWidth
                          : shadow ? "box-shadow" : null;
                return out;
              } catch (e) { return null; }
              finally { try { el.blur(); if (prev && prev.focus) prev.focus({ preventScroll: true }); } catch (e) {} }
            })(),
            type: el.getAttribute("type") || null,
          }]);
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

      // Radius and surface colour need their own pass: the boxes pass above skips
      // unclassed and sub-pixel elements, and a hardcoded radius is just as much a
      // direction breach on an unclassed div as on a named component.
      frame.querySelectorAll("*").forEach(el => {
        const cs = getComputedStyle(el);
        for (const corner of ["borderTopLeftRadius", "borderTopRightRadius",
                              "borderBottomLeftRadius", "borderBottomRightRadius"]) {
          const v = cs[corner];
          // A percentage radius is a circle, an avatar, a status dot, not a corner
          // style, and scoring it against a px maximum is a category error.
          if (!v || v.includes("%")) continue;
          const px = Math.round(parseFloat(v));
          if (Number.isFinite(px)) bumpRadius(px);
        }
        addHue(cs.backgroundColor);
        // A border colour with no border is currentColor showing through. Only a
        // drawn border spends a hue.
        if (parseFloat(cs.borderTopWidth) > 0) addHue(cs.borderTopColor);
      });

      // Control height is the one density fact a human reliably feels and never
      // measures. Read from the box, not from CSS: padding, line-height and the
      // font all move it, so the declared height is frequently not the real one.
      frame.querySelectorAll(CONTROL_SEL).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height >= 1) controlH.add(Math.round(r.height));
      });

      // The viewport is TAGGED here, never derived from the caption. pica's naming
      // convention puts "·" inside screen names, so parsing the caption collapses
      // distinct screens into one bucket (F19). `data-viewport` on the frame wins;
      // width is the documented fallback.
      const vp = frame.dataset ? (frame.dataset.viewport || null) : null;
      // Which use case this screen serves. TAGGED, never inferred, for the same reason
      // the viewport is: a caption cannot be parsed reliably and a guess that always
      // fires makes the tag inert. Comma-separated when one screen serves several.
      const uc = frame.dataset && frame.dataset.uc
        ? String(frame.dataset.uc).split(",").map(x => x.trim()).filter(Boolean) : [];
      // Which state of that screen. A use case plus a viewport is NOT a unique identity:
      // a screen and its empty state serve the same use case at the same size, and
      // pairing on the pair alone made a deleted screen hide behind its sibling while
      // its sibling was compared against the wrong frame. The state matrix at 3.0c
      // already enumerates these, so the identity is uc + state + viewport.
      const st = frame.dataset && frame.dataset.state
        ? String(frame.dataset.state).trim() : "default";
      const hug = /(^|\s)hug(\s|$)/.test(frame.className || "");
      const sr = frame.querySelector(".scroll-region");
      /* An unwrapped frame names itself from the vocabulary it already carries, so the
         report says "manage-alerts · desktop" rather than "frame0". */
      /* data-scr may sit on the frame or on the section AROUND it — the static apps put
         it on the section and the viewport on the frame inside. Naming from the frame
         alone made every route of one app read as "desktop", so parity-check saw one
         screen called "desktop" instead of four screens with names. */
      const scrHost = frame.closest("[data-scr]") || frame;
      const selfCap = [scrHost.getAttribute("data-scr"), frame.getAttribute("data-viewport")]
        .filter(Boolean).join(" · ");
      out.push({ idx: i, layout,
        cap: cap ? cap.textContent.trim() : (selfCap || "frame" + i),
        viewport: vp, hug, uc, state: st,
        w: Math.round(fr.width), h: Math.round(fr.height),
        /* Falls back to the frame's own scroll height when no .scroll-region is
         * present. It was null otherwise, and verify-html's tall-screen-pair skips a
         * null — so on a project with no .scroll-region anywhere, that check reported
         * a pass having measured zero of seventeen frames. `.scroll-region` is
         * documented in no rule and absent from pica's own example project, so "no
         * scroll region" is the normal case, not the exception. */
        contentH: sr ? sr.scrollHeight : (frame.scrollHeight || null),
        contentHFrom: sr ? "scroll-region" : (frame.scrollHeight ? "frame" : null),
        overflowX: overflow > 1 ? { px: overflow, node: overflowBy } : null,
        census: {
          radii: [...radii].sort((a, b) => a[0] - b[0]),
          controlH: [...controlH].sort((a, b) => a - b),
          hues: [...hues].sort((a, b) => a - b),
          numerals: { runs: numericRuns, tabular: tabularRuns },
          shadowBlur: [...shadowBlur].sort((x, y) => x - y),
          easings: [...easings].sort(),
        },
        texts, boxes, controls });
    });
    return out;
  }, { WRAP, FRAME });

  all[name] = data;

  const wraps = await page.$$(WRAP);
  let shot = 0, skipped = 0;
  for (const [i, w] of wraps.entries()) {
    const f = await w.$(FRAME);
    if (!f) continue;
    /* A hidden wrap has no box and screenshotting it hangs for the full 30s timeout and
     * then kills the run. An interactive prototype hides all but one screen by
     * definition, so a route capture of one hits four hidden wraps before it reaches the
     * visible one — which read as "the capture is broken" rather than "these are hidden".
     * Skipped and counted, never waited on. */
    if (!(await f.isVisible().catch(() => false))) { skipped++; continue; }
    await f.screenshot({ path: path.join(OUT, `html__${name}__${i}.png`) });
    shot++;
  }
  if (skipped) console.log(`  ${skipped} hidden frame(s) not screenshotted (${shot} captured)`);
  console.log(`${name}: ${data.length} frames, ${data.reduce((a, d) => a + d.texts.length, 0)} text runs`);
}

/* An empty capture is a failure, not a result.
 *
 * A selector that matches nothing produced "0 frames" as ordinary output, wrote a
 * well-formed artefact containing no frames, and every downstream check then passed
 * it: a green run that measured nothing. Refuse to write instead, and name both
 * selectors so the cause is obvious. */
/* And a PER-SOURCE zero is a failure too.
 *
 * The guard above fires only on a zero TOTAL, so a capture that omitted the entire
 * deliverable passed as long as something else was captured. On the project that found
 * this: app-ops 0 frames, app-manage 0, app-pos-react 0, three static boards 17 — and
 * verify-html reported "17 frames across 8 package(s) … HTML passes the measured gate."
 * Every measured claim on that project described the boards. The applications a client
 * actually clicks were measured by nothing.
 *
 * A file that state.flows names as an application entry MUST yield frames. A file with
 * no frames that nobody declared is an ordinary board-less page and is reported, not
 * failed. */
let declaredEntries = [];
try {
  const st = JSON.parse(fs.readFileSync(path.join(DIR, "..", ".pica/state.json"), "utf8"));
  declaredEntries = (st.flows || []).map((f) => String(f.entry || "")).filter(Boolean);
} catch { /* no state: nothing is declared, so nothing is required */ }

/* A declared entry is satisfied by frames from ANY source that covers it, and with
 * --dir alongside --url that is usually not the file of the same name: a client-rendered
 * entry yields nothing on disk by definition and everything by route. Matching the file
 * key alone failed a flow that had just been captured nineteen times — the guard would
 * have demanded a --url capture that was sitting in the same run. Route source names are
 * the URL flattened, so the entry's basename appears inside them. */
const coveredByRoute = (entry) => {
  const stem = entry.replace(/\.html$/, "").replace(/[^\w.-]+/g, "-");
  return Object.entries(all).some(([k, v]) => v.length && k !== entry.replace(/\.html$/, "")
    && k.includes(stem));
};
const emptyDeclared = declaredEntries.filter((e) => {
  const key = e.replace(/\.html$/, "");
  return key in all && all[key].length === 0 && !coveredByRoute(e);
});
const emptyOther = Object.entries(all).filter(([k, v]) => !v.length
  && !declaredEntries.some((e) => e.replace(/\.html$/, "") === k)).map(([k]) => k);

if (emptyDeclared.length) {
  console.error(`\nFAIL  ${emptyDeclared.length} file(s) named in state.flows captured 0 frames:`);
  for (const e of emptyDeclared) console.error(`        ${e}`);
  console.error(`      state.flows calls these the applications, and html-prototype.md calls the`);
  console.error(`      interactive flow the deliverable. A gate that measured everything except them`);
  console.error(`      is not a gate. Either the frames carry no ${WRAP} wrapper, or their screens are`);
  console.error(`      hidden — a hidden element has no box and cannot be captured from a file.`);
  console.error(`      Capture a prototype by route with --url, one per addressable state.`);
  process.exit(1);
}
if (emptyOther.length)
  console.log(`note: ${emptyOther.length} file(s) carried no frames and are declared nowhere: ${emptyOther.join(", ")}`);

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

/* An unsettled route is refused rather than written. A reference taken mid-render is worse
 * than no reference: every downstream check runs, every one passes, and every number in it
 * describes a layout that existed for a fraction of a second. */
if (unsettled.length) {
  console.error(`\nFAIL  ${unsettled.length} of ${settled.length + unsettled.length} source(s) never settled:`);
  for (const n of unsettled) console.error(`        ${n}`);
  console.error(`      Layout was still changing after six samples over 1.5s. Nothing was written.`);
  console.error(`      A capture taken mid-render measures a layout that existed for 200ms and says`);
  console.error(`      nothing: no error, a page that looks right, and every number wrong.`);
  await browser.close();
  process.exit(1);
}

const meta = { capturedAt: new Date().toISOString(), forcedFont: FONT,
               font: resolvedFont, dir: DIR, settled: settled.length };
fs.writeFileSync(path.join(OUT, AS), JSON.stringify({ meta, widthMedia, containerQueries, frames: all }));
console.log("\nwrote " + path.join(OUT, AS));
console.log(FONT ? `font forced to ${FONT}, re-run without --font once Figma uses the same family`
                 : "rendered native");
console.log(`settled: ${settled.length} source(s) reached a stable layout before measurement`);
console.log(`resolved font family: ${resolvedFont ?? "unknown"}: the design dump must be taken in the same one`);
await browser.close();
