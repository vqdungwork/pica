#!/usr/bin/env node
/**
 * Operate the demo with the Tab key and nothing else, and report where that fails.
 *
 * pica's `a11y-check` reads a capture and asks whether each control is reachable, named and
 * focus-visible. Those are properties of a control in isolation. None of them is a property of
 * the SEQUENCE, and the sequence is what a keyboard user actually experiences: whether focus
 * moves in the order the screen reads, whether it can leave, whether a sheet holds it while it is
 * open and gives it back when it closes. Automated scanners cannot detect focus traps or broken
 * keyboard interactions — that is the documented limit of the static approach, and this walks the
 * page instead of reading it.
 *
 *   node keyboard-check.mjs --url <base> --routes "<q1>,<q2>" [--open <selector>] [--modal .sheet]
 *       [--frame .frame] [--viewport 390x844] [--max-tabs 60]
 *
 * SKIPPED (exit 0, and it says so) when playwright is absent or the URL does not answer.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["focus-order", "keyboard-trap", "modal-traps-focus", "escape-closes", "focus-returns", "focus-visible-live"];

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
const OPEN = arg("--open", "");
const MODAL = arg("--modal", '[role="dialog"]');
const FRAME = arg("--frame", ".frame");
const MAXTAB = Number(arg("--max-tabs", "60"));
const [VW, VH] = arg("--viewport", "390x844").split("x").map(Number);

if (!base) {
  console.log("keyboard-check: SKIPPED — no --url given, so nothing was operated. This is not a pass.");
  process.exit(0);
}
let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log("keyboard-check: SKIPPED — playwright is not installed here. This is not a pass.");
  process.exit(0);
}

/** Tag every focusable inside the frame with its VISUAL rank, measured once before any tabbing.
 *  Reading `getBoundingClientRect().top` during the walk measures the viewport, and Tab scrolls
 *  the list — so a correct page reports focus "jumping back up" the moment the second screenful
 *  arrives. The rank is fixed in document space first; the walk then only reads it back. */
const rankFocusables = (page, FRAME) => page.evaluate((F) => {
  const frame = document.querySelector(F) || document.body;
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const els = [...frame.querySelectorAll(sel)].filter((e) => e.offsetParent !== null || e === document.activeElement);
  /* Rank WITHIN a scroll region, never across. Pinned chrome — a confirm bar, a bottom nav — sits
   * outside the scrolling list and has no position in its reading order: it is always at the
   * bottom of the screen no matter where the list has got to. Ranking everything together made a
   * correct page report that Tab "moved backwards" the moment it left the eleventh row and
   * reached the button pinned beneath it, which is precisely the order a keyboard user wants. */
  const scrollParent = (el) => {
    for (let p2 = el.parentElement; p2; p2 = p2.parentElement) {
      const cs = getComputedStyle(p2);
      if (/(auto|scroll)/.test(cs.overflowY) && p2.scrollHeight > p2.clientHeight + 1) return p2;
    }
    return null;
  };
  const regions = new Map();
  const docPos = (el) => {
    const r = el.getBoundingClientRect();
    let x = r.left, y = r.top;
    for (let p2 = el.parentElement; p2; p2 = p2.parentElement) { x += p2.scrollLeft; y += p2.scrollTop; }
    return { x, y };
  };
  const withPos = els.map((el) => {
    const sp = scrollParent(el);
    if (!regions.has(sp)) regions.set(sp, regions.size);
    return { el, region: regions.get(sp), ...docPos(el) };
  });
  for (const region of new Set(withPos.map((w) => w.region))) {
    withPos.filter((w) => w.region === region)
      .sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x))
      .forEach((w, rank) => { w.el.dataset.kbRank = String(rank); w.el.dataset.kbRegion = String(region); });
  }
  return withPos.length;
}, FRAME);

const active = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    rank: el.dataset.kbRank !== undefined ? Number(el.dataset.kbRank) : null,
    region: el.dataset.kbRegion !== undefined ? Number(el.dataset.kbRegion) : null,
    name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 34),
    x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    inModal: !!el.closest('[role="dialog"]'),
    sig: (el.tagName + "|" + (el.className || "") + "|" + (el.textContent || "").trim().slice(0, 20)),
    outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
    boxShadow: cs.boxShadow !== "none",
  };
});

/** Tab `n` times and record where focus lands, stopping when it cycles. */
async function walk(page, limit) {
  const seen = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const a = await active(page);
    if (!a) { seen.push(null); continue; }
    if (seen.length && seen[0] && a.sig === seen[0].sig && i > 1) break; // cycled back to the start
    seen.push(a);
  }
  return seen;
}


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
      console.log(`keyboard-check: SKIPPED — nothing answered at ${url}. This is not a pass.`);
      await browser.close(); process.exit(0);
    }
    const dead = await pageIsDead(page, FRAME);
    if (dead) { findings.push(["focus-order", url, `this route rendered nothing to operate: ${dead}`]); continue; }
    await page.evaluate((F) => document.querySelector(F)?.querySelector("*")?.focus?.(), FRAME).catch(() => {});
    await page.evaluate(() => document.body.focus());
    await rankFocusables(page, FRAME);

    const stops = (await walk(page, MAXTAB)).filter(Boolean);
    if (!stops.length) continue;

    /* focus-order — focus must move the way the screen reads: down, and within a row, right.
     * A jump BACK up the page is the signature of a control that was moved visually with CSS
     * while its DOM position stayed where it was, which is invisible to a mouse and disorienting
     * to everyone else. Tolerance is a row's worth of height, because two controls side by side
     * legitimately differ by a few pixels of y. */
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1], b = stops[i];
      if (a.rank === null || b.rank === null) continue;
      if (a.region !== b.region) continue;   // crossing from a list into its pinned chrome is not a jump
      if (b.rank < a.rank) {
        findings.push(["focus-order", url,
          `Tab moved backwards through the layout: "${a.name}" is the ${a.rank + 1}th control on screen, "${b.name}" is the ${b.rank + 1}th. ` +
          `Focus order must follow reading order — a control moved by CSS while its DOM position stayed put is invisible to a mouse and disorienting to everyone else.`]);
        break;
      }
    }

    /* focus-visible, checked LIVE. A capture records whether a :focus-visible rule exists; only
     * pressing Tab shows whether it actually paints on the element that received focus. */
    const invisible = stops.filter((s) => !s.outline && !s.boxShadow);
    for (const s of invisible.slice(0, 3)) {
      findings.push(["focus-visible-live", url,
        `"${s.name}" (${s.tag}) takes focus with no visible indicator — neither outline nor box-shadow`]);
    }

    /* keyboard-trap — outside a dialog, Tab must always be able to leave. If every stop in a long
     * walk shares one container and the walk never cycled, focus cannot get out. */
    if (stops.length >= MAXTAB && !stops.some((s) => s.inModal)) {
      findings.push(["keyboard-trap", url,
        `${MAXTAB} tab presses never returned to the first control — focus may not be able to leave`]);
    }

    if (!OPEN) continue;
    const opener = await page.locator(OPEN).first();
    if (!(await opener.count())) continue;
    const openerSig = (await active(page).catch(() => null));
    await opener.click();
    await page.waitForTimeout(350);
    if (!(await page.locator(MODAL).count())) continue;

    /* modal-traps-focus — while a sheet is open, Tab must not walk out behind it. */
    const inModal = await walk(page, 25);
    const escaped = inModal.filter(Boolean).filter((s) => !s.inModal);
    if (escaped.length) {
      findings.push(["modal-traps-focus", url,
        `with the sheet open, Tab reached "${escaped[0].name}" outside it — the page behind a modal must not be reachable`]);
    }

    /* escape-closes — a sheet a mouse can dismiss by dragging must also close from the keyboard. */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const stillOpen = await page.locator(MODAL).count();
    if (stillOpen) {
      findings.push(["escape-closes", url, `Escape did not close ${MODAL} — a dialog that only a pointer can dismiss`]);
      await page.keyboard.press("Escape").catch(() => {});
    } else {
      /* focus-returns — closing must hand focus back to what opened it, or a keyboard user is
       * dropped at the top of the document with no idea where they were. */
      const after = await active(page);
      const returned = after && openerSig && after.sig === openerSig.sig;
      const onOpener = after && (await opener.evaluate((el) => el === document.activeElement).catch(() => false));
      if (!onOpener && !returned) {
        findings.push(["focus-returns", url,
          `after the sheet closed, focus was on "${after?.name ?? "(nothing)"}" rather than the control that opened it`]);
      }
    }
  }
} finally {
  await browser.close();
}

if (!findings.length) {
  console.log(`keyboard-check: ${routes.length || 1} route(s) operated by keyboard, 0 findings (${CHECKS.join(", ")})`);
  console.log("NOTE  this walks the page; it does not run a screen reader. Announcements, reading order and");
  console.log("      widget semantics still need a person with NVDA or VoiceOver.");
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
console.error(`\n${seen.size} finding(s). A product that cannot be operated from the keyboard cannot be operated by everyone.`);
process.exit(1);
