/**
 * proto.js: the prototype router.
 *
 * pica declares this attribute vocabulary and ships no implementation of it, so every
 * project has invented one. This is that implementation, written once, in the example, so
 * the next project copies it instead. Its presence on a file is what makes the file
 * interactive rather than a board, and it is what `flow-check` reads.
 *
 * No build step, no dependency, no framework. It is 100 lines because the whole point of
 * a prototype is that a person can click it today.
 *
 *   <section class="scr" data-scr="id" [data-back]>   a screen
 *   <div class="sheetwrap" data-sheetwrap="id">       a sheet
 *   data-go="id"        push a screen, so back returns here
 *   data-tab="id"       switch root, RESETTING the stack
 *   data-sheet="id"     open a sheet
 *   data-pane="id"      switch a pane inside the current screen
 *   data-href="f.html[?scr=id]"  another application, optionally deep
 *   data-popback        return to where the user came from
 *   data-flow           on a screen: hide the tab bar, because a task is not a place
 *
 * Two behaviours worth stating, both of which were navigation defects somewhere before
 * they were rules:
 *
 *   data-tab RESETS the stack and data-go does not. A tab that pushed left a back
 *   control pointing into a task the user had already left.
 *
 *   An entry point lights the tab that OWNS the screen, not the tab that was last
 *   active. A row that opened another role's screen and left the wrong tab lit is the
 *   defect with no geometric signature: the destination renders perfectly.
 */
(function () {
  "use strict";
  const tag = document.currentScript;
  const NAV = JSON.parse(tag.getAttribute("data-nav") || "[]");
  const HOME = tag.getAttribute("data-home") || (NAV[0] && NAV[0].id);
  const roots = NAV.map((n) => n.id);

  const screens = () => [...document.querySelectorAll("[data-scr]")];
  const sheets = () => [...document.querySelectorAll("[data-sheetwrap]")];
  const byId = (id) => document.querySelector(`[data-scr="${id}"]`);

  /* The stack is the whole reason back can be correct. A prototype that only shows
   * screens cannot be wrong about where back goes, and cannot be tested for it either. */
  let stack = [];

  function paint() {
    const id = stack[stack.length - 1] || HOME;
    for (const s of screens()) s.hidden = s.dataset.scr !== id;

    /* The tab that owns this screen, never the one last touched. A screen declares its
     * owner with data-owner; a root screen owns itself. */
    const cur = byId(id);
    const owner = (cur && cur.dataset.owner) || (roots.includes(id) ? id : null);
    for (const t of document.querySelectorAll("[data-tab]"))
      t.setAttribute("aria-current", t.dataset.tab === owner ? "page" : "false");

    /* A task is not a place: inside one, the tab bar goes away rather than inviting the
     * user to abandon what they started. */
    for (const nav of document.querySelectorAll("[data-navbar]"))
      nav.hidden = Boolean(cur && cur.hasAttribute("data-flow"));

    /* Back exists only when there is somewhere to go back to, and it says where. */
    for (const b of document.querySelectorAll("[data-popback]")) {
      b.hidden = stack.length < 2;
      const prev = stack[stack.length - 2];
      const label = prev && byId(prev) ? (byId(prev).dataset.title || prev) : "";
      if (label) b.setAttribute("aria-label", `Back to ${label}`);
    }
    /* data-current, never data-scr: an <html data-scr> is itself a screen to every
     * `[data-scr]` query in this file, so after the first move byId() returned the document
     * root and paint() hid it. The prototype went blank on its second click, and every check
     * still passed, because each loads a route fresh and none clicks twice. */
    document.documentElement.dataset.current = id;
  }

  /* A screen that changes without a word is a screen change a screen-reader user never hears
   * about: the click "did nothing". One polite region, told the new screen's title on every move. */
  const live = document.createElement("div");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  document.body.append(live);
  const announce = () => {
    const cur = byId(stack[stack.length - 1] || HOME);
    live.textContent = cur ? `Now on ${cur.dataset.title || cur.dataset.scr}` : "";
  };

  function go(id, { reset = false } = {}) {
    if (!byId(id)) { console.warn(`proto: no screen "${id}"`); return; }
    stack = reset ? [id] : stack.concat(id);
    paint();
    announce();
  }

  function sheet(id) {
    const el = document.querySelector(`[data-sheetwrap="${id}"]`);
    if (!el) { console.warn(`proto: no sheet "${id}"`); return; }
    el.hidden = false;
    el.querySelector("[data-sheet-close], button, [href]")?.focus();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-tab],[data-sheet],[data-pane],[data-popback],[data-sheet-close],[data-href]");
    if (!t) return;
    const d = t.dataset;
    if (d.href !== undefined) return;             // a real link: let the browser have it
    e.preventDefault();
    if (d.go) return go(d.go);
    if (d.tab) return go(d.tab, { reset: true }); // resetting is the difference
    if (d.sheet) return sheet(d.sheet);
    if (d.pane) {
      const scope = t.closest("[data-scr]") || document;
      for (const p of scope.querySelectorAll("[data-paneid]")) p.hidden = p.dataset.paneid !== d.pane;
      for (const b of scope.querySelectorAll("[data-pane]"))
        b.setAttribute("aria-current", b.dataset.pane === d.pane ? "true" : "false");
      return;
    }
    if (d.sheetClose !== undefined) { t.closest("[data-sheetwrap]").hidden = true; return; }
    if (d.popback !== undefined) { if (stack.length > 1) stack.pop(); paint(); announce(); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = sheets().find((s) => !s.hidden);
    if (open) { open.hidden = true; return; }
    if (stack.length > 1) { stack.pop(); paint(); announce(); }
  });

  /* ?scr=id lands deep, which is what a cross-application link does. The stack is seeded
   * with the owning root beneath it, so back goes somewhere that makes sense rather than
   * nowhere: a deep link that bounced through the launcher was a real defect. */
  const params = new URLSearchParams(location.search);
  const want = params.get("scr");

  /* The URL is the review instrument, so a parameter this router does not read, or a screen it
   * does not have, is REFUSED rather than answered with the home screen. Falling back quietly
   * hands a reviewer who typed `?viewport=mobile` a confident screenshot of the wrong state.
   * `fit` is read by pica's browser checks; a project adds its own with data-params="a,b". */
  const KNOWN = ["scr", "fit", ...(tag.getAttribute("data-params") || "").split(",").map((p) => p.trim()).filter(Boolean)];
  const unknown = [...params.keys()].filter((k) => !KNOWN.includes(k));
  const refusal = unknown.length ? `This prototype does not read ${unknown.map((k) => `"${k}"`).join(", ")}. It reads: ${KNOWN.join(", ")}.`
    : want && !byId(want) ? `There is no screen "${want}". Screens: ${[...new Set(screens().map((s) => s.dataset.scr))].join(", ")}.`
    : "";
  if (refusal) {
    const main = document.createElement("main");
    main.setAttribute("role", "alert");
    main.className = "scr";
    main.innerHTML = "<h1>Not a route</h1><p></p>";
    main.querySelector("p").textContent = refusal;
    document.body.replaceChildren(main);
    return;
  }

  for (const s of sheets()) s.hidden = true;
  if (want && byId(want)) {
    const owner = byId(want).dataset.owner;
    stack = owner && owner !== want ? [owner, want] : [want];
  } else {
    stack = [HOME];
  }
  paint();
})();
