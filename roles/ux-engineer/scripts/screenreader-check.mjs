#!/usr/bin/env node
/**
 * Read what a screen reader is handed, and watch what it would be told.
 *
 * This is NOT a screen reader. It reads the accessibility tree — the structure VoiceOver, NVDA
 * and JAWS actually consume — and it observes live regions while the page changes. Those two
 * things cover the defects that are decidable: a control the tree has no name for, a control a
 * pointer can use that the tree does not contain at all, a tree whose order contradicts the
 * screen, a change that happens in silence, a dialog with no name, a page with no headings.
 *
 * What it cannot do is listen. Whether an announcement is the RIGHT announcement, whether the
 * reading order makes sense in Vietnamese, whether a widget behaves the way its role promises —
 * those need a person with the software on, and this script says so every time it passes. A page
 * can satisfy every rule here and still be unusable by a screen reader user.
 *
 *   node screenreader-check.mjs --url <base> --routes "<q1>,<q2>" [--frame .frame]
 *       [--act <selector>] [--modal .sheet] [--viewport 390x844]
 *
 * `--act` names a control whose activation changes state; the check watches whether anything is
 * announced when it does.
 */

/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["unnamed-in-tree", "hidden-from-tree", "tree-order", "silent-change", "dialog-unnamed", "no-headings"];

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
const ACT = arg("--act", "");
const MODAL = arg("--modal", '[role="dialog"]');
const [VW, VH] = arg("--viewport", "390x844").split("x").map(Number);

if (!base) {
  console.log("screenreader-check: SKIPPED — no --url given, so no tree was read. This is not a pass.");
  process.exit(0);
}
let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log("screenreader-check: SKIPPED — playwright is not installed here. This is not a pass.");
  process.exit(0);
}

/* Roles that a screen reader user operates and therefore must be able to identify. A role that is
 * merely structural (group, generic, list) does not need a name; a control does. */
const OPERABLE = new Set(["button", "link", "checkbox", "radio", "textbox", "combobox", "listbox",
  "menuitem", "switch", "tab", "slider", "spinbutton", "searchbox", "option"]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const findings = [];
const sep = (u) => (u.includes("?") ? "&" : "?");

/** Watch every live region for the duration of `fn`, and return what would have been spoken. */
async function announcements(page, fn) {
  await page.evaluate(() => {
    window.__spoken = [];
    window.__obs?.disconnect();
    const watch = (root) => {
      for (const el of root.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"]')) {
        if (el.__watched) continue;
        el.__watched = true;
        new MutationObserver(() => {
          const t = (el.textContent || "").trim();
          if (t) window.__spoken.push(t.slice(0, 80));
        }).observe(el, { childList: true, subtree: true, characterData: true });
      }
    };
    watch(document);
    // Regions that appear mid-interaction count too: a receipt panel inserted after a write is
    // the commonest place a product "announces" something that is never announced.
    window.__obs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches?.('[aria-live],[role="status"],[role="alert"],[role="log"]')) {
          const t = (n.textContent || "").trim();
          if (t) window.__spoken.push(t.slice(0, 80));
        }
        watch(n);
      }
    });
    window.__obs.observe(document.body, { childList: true, subtree: true });
  });
  await fn();
  return page.evaluate(() => window.__spoken || []);
}

try {
  for (const q of routes.length ? routes : [""]) {
    const url = q ? `${base}${sep(base)}${q}` : base;
    try { await page.goto(url, { waitUntil: "networkidle" }); }
    catch {
      console.log(`screenreader-check: SKIPPED — nothing answered at ${url}. This is not a pass.`);
      await browser.close(); process.exit(0);
    }
    const dead = await page.evaluate((F) => {
      if (document.querySelector("vite-error-overlay")) return "a build error overlay is on screen";
      if (F && !document.querySelector(F)) return `nothing matching "${F}" rendered`;
      return null;
    }, FRAME);
    if (dead) { findings.push(["unnamed-in-tree", url, `this route rendered nothing to read: ${dead}`]); continue; }

    const client = await page.context().newCDPSession(page);
    await client.send("Accessibility.enable");
    /* Resolve each control from the DOM to its OWN node in the accessibility tree, by
     * backendNodeId. The first version matched on text and produced confident nonsense: a row
     * button whose textContent is an avatar initial plus a name plus a project does not equal the
     * platform's computed name, so two correct rows were reported as missing from the tree. An
     * assertion about the tree has to be made against the tree, not against a string that
     * resembles it. This also scopes everything to the product frame — `getFullAXTree` returns
     * the whole document, and the first run filed the harness's own viewport <select> as an
     * unnamed combobox. */
    const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
    const frameNode = FRAME
      ? await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: FRAME }).catch(() => ({ nodeId: 0 }))
      : { nodeId: root.nodeId };
    if (!frameNode.nodeId) { await client.detach().catch(() => {}); continue; }

    const CONTROL_SEL = 'button,a[href],input,select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="tab"],[role="switch"]';
    const { nodeIds } = await client.send("DOM.querySelectorAll", { nodeId: frameNode.nodeId, selector: CONTROL_SEL });

    for (const nodeId of nodeIds) {
      const visible = await client.send("DOM.getBoxModel", { nodeId }).then(() => true).catch(() => false);
      if (!visible) continue;                       // not rendered; not this check's business
      const { nodes: partial } = await client.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false })
        .catch(() => ({ nodes: [] }));
      const self = partial[0];
      const describe = await client.send("DOM.describeNode", { nodeId }).catch(() => null);
      const label = describe?.node?.nodeName?.toLowerCase() +
        (describe?.node?.attributes?.includes("class")
          ? "." + String(describe.node.attributes[describe.node.attributes.indexOf("class") + 1]).split(" ")[0] : "");

      if (!self || self.ignored) {
        findings.push(["hidden-from-tree", url,
          `${label} can be clicked and tabbed to, but the accessibility tree does not contain it — a control that exists for a pointer and not for a screen reader`]);
        continue;
      }
      const name = (self.name?.value || "").trim();
      if (!name) {
        findings.push(["unnamed-in-tree", url,
          `${label} is in the tree as "${self.role?.value ?? "unknown"}" with no name — a screen reader announces the role and nothing else`]);
      }
    }

    /* no-headings — a screen reader user navigates by heading before they read anything. A screen
     * with none is a wall the rotor cannot enter. */
    const { nodeIds: headingIds } = await client
      .send("DOM.querySelectorAll", { nodeId: frameNode.nodeId, selector: 'h1,h2,h3,h4,h5,h6,[role="heading"]' })
      .catch(() => ({ nodeIds: [] }));
    if (!headingIds.length) {
      findings.push(["no-headings", url,
        "the page exposes no heading at all — heading navigation, which is how most screen reader users move, has nothing to land on"]);
    }

    /* tree-order — the platform reads the tree in its own order. Where that contradicts the
     * screen, a sighted assistant and a screen reader user cannot follow each other. */
    const order = await page.evaluate((F) => {
      const frame = document.querySelector(F) || document.body;
      /* Within one scroll region only. Pinned chrome — a confirm bar, a bottom nav — comes last
       * in the DOM and sits at the bottom of the screen no matter where the list has scrolled to,
       * so comparing across regions reported the correct order as a contradiction. Same lesson
       * the keyboard check had to learn; the two now agree about what a region is. */
      const scrollParent = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
        }
        return null;
      };
      const els = [...frame.querySelectorAll("h1,h2,h3,[role='heading'],button,a[href],[role='status'],[role='alert']")]
        .filter((e) => e.offsetParent !== null);
      const pos = els.map((e) => { const r = e.getBoundingClientRect(); return { region: scrollParent(e), y: Math.round(r.top), t: (e.textContent || "").trim().slice(0, 24) }; });
      let worst = null;
      for (let i = 1; i < pos.length; i++) {
        if (pos[i].region !== pos[i - 1].region) continue;
        if (pos[i].y < pos[i - 1].y - 40) { worst = [pos[i - 1], pos[i]]; break; }
      }
      return worst;
    }, FRAME);
    if (order) {
      findings.push(["tree-order", url,
        `DOM order reads "${order[0].t}" (y=${order[0].y}) before "${order[1].t}" (y=${order[1].y}) — the tree and the screen disagree about what comes first`]);
    }

    /* dialog-unnamed, and silent-change. */
    if (ACT && (await page.locator(ACT).count())) {
      const spoken = await announcements(page, async () => {
        await page.locator(ACT).first().click();
        await page.waitForTimeout(500);
      });
      if (await page.locator(MODAL).count()) {
        const named = await page.locator(MODAL).first().evaluate((el) =>
          !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ||
             el.closest('[role="dialog"]')?.getAttribute("aria-label")));
        if (!named) {
          findings.push(["dialog-unnamed", url,
            `${MODAL} opens without an accessible name — a screen reader announces "dialog" and nothing else`]);
        }
        const commit = page.locator(`${MODAL} .confirm-btn, ${MODAL} button[type="submit"]`).last();
        if (await commit.count()) {
          const spoken2 = await announcements(page, async () => {
            await commit.click();
            await page.waitForTimeout(900);
          });
          if (!spoken2.length) {
            findings.push(["silent-change", url,
              "the primary action completed and nothing was announced — a screen reader user gets no confirmation that anything was written"]);
          }
        }
      } else if (!spoken.length) {
        findings.push(["silent-change", url,
          `activating ${ACT} changed the screen and announced nothing`]);
      }
    }
    await client.detach().catch(() => {});
  }
} finally {
  await browser.close();
}

const LIMIT =
  "NOTE  this reads the accessibility tree and watches live regions. It is not a screen reader and it\n" +
  "      cannot listen: whether an announcement is the RIGHT one, whether the reading order makes sense\n" +
  "      in the product's own language, and whether a widget behaves the way its role promises still\n" +
  "      need a person with VoiceOver or NVDA on. A page can pass every rule here and be unusable.";

if (!findings.length) {
  console.log(`screenreader-check: ${routes.length || 1} route(s), 0 findings (${CHECKS.join(", ")})`);
  console.log(LIMIT);
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
console.error(`\n${seen.size} finding(s).`);
console.error(LIMIT);
process.exit(1);
