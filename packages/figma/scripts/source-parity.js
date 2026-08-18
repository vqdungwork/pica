/**
 * Content parity against the client's own file. Paste as the `code` argument of one use_figma call.
 *
 * For a REBUILD (see ../rules/figma-rebuild.md), the arbiter is not HTML — it is the untouched source
 * pages. This proves what the structural audit cannot: that every screen still says what the source
 * says, in the same places.
 *
 * It answers four questions and fails closed on each:
 *   1. contamination — does any instance on a SOURCE page point at a master you created?   must be 0
 *   2. pairing       — is every source screen matched to a rebuilt one by canvas position? name the misses
 *   3. text parity   — per screen, which visible strings are missing or extra?             must be 0
 *   4. displaced     — which nodes sit at their screen's origin where the source has them elsewhere?
 *
 * Why position and not name: duplicate screen names are normal in a client file (four screens called
 * "Detail objednávky" on the project this came from) and renames are part of the job. Keep the rebuilt
 * screens at the source's canvas coordinates and pairing is exact.
 *
 * A distance of 0 with different strings is the finding that matters: right geometry, wrong content.
 * Nothing else in this plugin detects it.
 */

// ---- configure -------------------------------------------------------------
const SOURCE_PAGE_IDS  = ["1:2", "1:3"];    // the client's untouched pages
const REBUILD_PAGE_IDS = ["36:2", "36:3"];  // your rebuilt screens, paired by index
const COMPONENTS_PAGE  = "13:5";            // where your masters live
const MAX_PAIR_DIST    = 32;                // px, for matching a text to its source counterpart
const EXPECTED_OFFSET  = { x: 0, y: 0 };    // assert the two page sets share a coordinate system

// Strings the rebuild legitimately splits or merges, with the registered deviation that explains it.
// Anything here is reported separately, never silently dropped.
const DEVIATIONS = [
  // { pattern: "^\\w+ \\(\\d+\\)$", why: "DEV-TABBAR: one text run became label + count" },
];

// ---- helpers ---------------------------------------------------------------
const T = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
const K = n => (T(() => n.children, null) || []);
const AR = v => Array.isArray(v) ? v : [];
const vis = x => T(() => x.visible, true) !== false;
const chainVis = (x, root) => { let p = x; while (p && p !== root) { if (!vis(p)) return false; p = p.parent; } return true; };
const devRe = DEVIATIONS.map(d => ({ re: new RegExp(d.pattern), why: d.why }));
const explained = s => { for (const d of devRe) if (d.re.test(s)) return d.why; return null; };

const page = id => figma.root.children.find(p => p.id === id);
for (const id of SOURCE_PAGE_IDS.concat(REBUILD_PAGE_IDS, [COMPONENTS_PAGE])) {
  const p = page(id);
  if (!p) throw new Error("configure: no page " + id);   // fail closed on a bad id
  await p.loadAsync();
}

// screens = frames at page level or inside a section
const screens = id => {
  const out = [], st = [...K(page(id))];
  while (st.length) {
    const n = st.pop();
    if (n.type === "SECTION") { K(n).forEach(c => st.push(c)); continue; }
    if (n.type !== "FRAME") continue;
    const b = T(() => n.absoluteBoundingBox, null); if (!b) continue;
    out.push({ n, key: Math.round(b.x) + "_" + Math.round(b.y), name: n.name, b });
  }
  return out;
};
const textsOf = root => {
  const o = [], q = [root], sb = root.absoluteBoundingBox;
  while (q.length) {
    const x = q.pop(); K(x).forEach(c => q.push(c));
    if (x.type !== "TEXT" || !chainVis(x, root)) continue;
    const s = String(T(() => x.characters, "")).trim(); if (!s) continue;
    const b = x.absoluteBoundingBox;
    o.push({ n: x, t: s, x: Math.round(b.x - sb.x), y: Math.round(b.y - sb.y) });
  }
  return o.sort((a, b) => Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x);
};

// ---- 1. contamination ------------------------------------------------------
const mine = {};
{ const st = [...K(page(COMPONENTS_PAGE))];
  while (st.length) { const n = st.pop();
    if (n.type === "COMPONENT") { mine[n.id] = n.name; continue; }
    K(n).forEach(c => st.push(c)); } }
const contamination = [];
for (const id of SOURCE_PAGE_IDS) {
  const st = [...K(page(id))];
  while (st.length) { const n = st.pop();
    if (n.type === "INSTANCE") {
      const m = T(() => n.mainComponent, null);
      if (m && mine[m.id]) contamination.push(id + " " + n.id + " " + n.name + " → " + mine[m.id]);
      continue; }
    K(n).forEach(c => st.push(c)); }
}

// ---- 2..4 per page pair ----------------------------------------------------
const unpaired = [], parity = [], displaced = [], offsets = [];
let missTotal = 0, extraTotal = 0, explainedTotal = 0, screensCompared = 0;

for (let i = 0; i < SOURCE_PAGE_IDS.length; i++) {
  const S = screens(SOURCE_PAGE_IDS[i]);
  const R = {}; screens(REBUILD_PAGE_IDS[i]).forEach(s => { R[s.key] = s; });

  for (const s of S) {
    const r = R[s.key];
    if (!r) { unpaired.push(SOURCE_PAGE_IDS[i] + ' "' + s.name.slice(0, 44) + '"'); continue; }
    screensCompared++;
    offsets.push(Math.round(r.b.x - s.b.x) + "," + Math.round(r.b.y - s.b.y));

    const st = textsOf(s.n), rt = textsOf(r.n);
    const sc = {}, rc = {};
    st.forEach(z => sc[z.t] = (sc[z.t] || 0) + 1);
    rt.forEach(z => rc[z.t] = (rc[z.t] || 0) + 1);

    const miss = [], extra = [], notes = [];
    Object.keys(sc).forEach(k => { const d = sc[k] - (rc[k] || 0); if (d <= 0) return;
      const why = explained(k); if (why) { explainedTotal += d; notes.push(k.slice(0, 28) + " — " + why); }
      else miss.push('"' + k.slice(0, 34) + '"' + (d > 1 ? " ×" + d : "")); });
    Object.keys(rc).forEach(k => { const d = rc[k] - (sc[k] || 0); if (d <= 0) return;
      const why = explained(k); if (why) { explainedTotal += d; return; }
      extra.push('"' + k.slice(0, 34) + '"' + (d > 1 ? " ×" + d : "")); });

    // right place, wrong words
    const sameSpot = [];
    for (const z of rt) {
      let best = null, bd = 1e9;
      for (const o of st) { const d = Math.abs(o.y - z.y) + Math.abs(o.x - z.x); if (d < bd) { bd = d; best = o; } }
      if (best && bd <= MAX_PAIR_DIST && best.t !== z.t && !explained(z.t))
        sameSpot.push("@" + z.x + "," + z.y + ' "' + z.t.slice(0, 24) + '" → "' + best.t.slice(0, 24) + '" (d' + bd + ")");
    }

    missTotal += miss.length; extraTotal += extra.length;
    if (miss.length || extra.length || sameSpot.length)
      parity.push({ screen: s.name.slice(0, 46), missing: miss.slice(0, 8), extra: extra.slice(0, 8),
                    rightPlaceWrongWords: sameSpot.slice(0, 8), explained: notes.slice(0, 3) });

    // nodes at the screen origin that the source places elsewhere
    const srcBySize = {};
    { const q = [s.n]; while (q.length) { const x = q.pop(); K(x).forEach(c => q.push(c));
        const b = T(() => x.absoluteBoundingBox, null); if (!b || x === s.n) continue;
        const k = Math.round(b.width) + "x" + Math.round(b.height);
        (srcBySize[k] = srcBySize[k] || []).push(Math.round(b.x - s.b.x) + "," + Math.round(b.y - s.b.y)); } }
    { const q = [...K(r.n)];
      while (q.length) { const x = q.pop(); K(x).forEach(c => q.push(c));
        if (!vis(x)) continue;
        const b = T(() => x.absoluteBoundingBox, null); if (!b) continue;
        if (Math.round(b.x - r.b.x) !== 0 || Math.round(b.y - r.b.y) !== 0) continue;
        if (Math.round(b.width) >= Math.round(r.b.width) - 2) continue;   // full-bleed chrome is fine
        const at = srcBySize[Math.round(b.width) + "x" + Math.round(b.height)] || [];
        if (at.length && at.indexOf("0,0") < 0)
          displaced.push(r.name.slice(0, 30) + " " + x.id + ' "' + x.name + '" source has it at ' + at[0]); } }
  }
}

const badOffset = offsets.filter(o => o !== EXPECTED_OFFSET.x + "," + EXPECTED_OFFSET.y);
if (!screensCompared) throw new Error("fail closed: 0 screens compared — check the page ids");

return {
  screensCompared,
  contamination: contamination.length, contaminationDetail: contamination.slice(0, 10),
  unpairedSourceScreens: unpaired,
  coordinateOffsetsSeen: Array.from(new Set(offsets)).slice(0, 5),
  screensOffExpectedOffset: badOffset.length,
  missingStrings: missTotal, extraStrings: extraTotal, explainedByDeviation: explainedTotal,
  displacedToOrigin: displaced.length, displacedDetail: displaced.slice(0, 10),
  parity: parity.slice(0, 20),
};
