/**
 * Full Figma hygiene audit. Paste as the `code` argument of a single use_figma call.
 *
 * Everything should return zero. Configure SCREEN_PREFIXES and SKIP_PREFIXES for the file,
 * then read verification.md for how to interpret the two known false-positive classes
 * (text over sibling artwork, and alpha that never reaches opaque).
 *
 * Notes on why it is written this way:
 *   - setCurrentPageAsync before every traversal, or instance children are invisible
 *   - cornerRadius / fontName can be figma.mixed, so numeric reads are guarded
 *   - SECTION nodes have no layout properties
 *   - variable-bound paints report a stale cached colour, so colours are resolved through aliases
 *   - getMainComponentAsync forces instance reconciliation, which is why detach detection is last
 */

// ---- configure -------------------------------------------------------------
const SCREEN_PREFIXES = ["🧩 03", "📱 04", "🏠 05", "▶️ 06", "📺 07", "🔀 08"];
const SKIP_CONTRAST   = ["🔍 01"];          // capture/audit pages of someone else's UI
const PROTOTYPE_PAGE  = "🔀 08";
const VIEWPORT_H      = 812;
const BANNED_CHARS    = [","];              // project-specific
// ---------------------------------------------------------------------------

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const raw = {}, modeOf = {};
for (const c of cols) for (const id of c.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id);
  raw[id] = v; modeOf[id] = c.defaultModeId;
}
const famVar = Object.values(raw).find(v => v.name === "Font-family");
const wById = {};
for (const id in raw) if (raw[id].name.indexOf("font-weight/") === 0) wById[id] = raw[id].name.split("/")[1];

const aliasId = (bv) => { if (!bv) return null; if (Array.isArray(bv)) return bv.length ? bv[0].id : null; return bv.id || null; };
const resolve = (id, d = 0) => {
  const v = raw[id]; if (!v || d > 8) return null;
  let x = v.valuesByMode[modeOf[id]];
  if (x && x.type === "VARIABLE_ALIAS") return resolve(x.id, d + 1);
  return x && x.r !== undefined ? x : null;
};
const pc = (f) => { const b = f.boundVariables && f.boundVariables.color && f.boundVariables.color.id;
  if (b) { const r = resolve(b); if (r) return r; } return f.color; };
const lum = (c) => { const g = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * g(c.r) + 0.7152 * g(c.g) + 0.0722 * g(c.b); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05); };
const mix = (f, b, a) => ({ r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a) });
const hex = (c) => "#" + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");

const topSolid = (n) => {
  if (!Array.isArray(n.fills)) return null;
  for (let i = n.fills.length - 1; i >= 0; i--) {
    const f = n.fills[i];
    if (f.visible === false) continue;
    if (f.type === "IMAGE" || f.type.indexOf("GRADIENT") === 0) return { image: true };
    if (f.type === "SOLID") return { c: pc(f), a: f.opacity === undefined ? 1 : f.opacity };
  }
  return null;
};
// a node painted over an earlier sibling image cannot be judged from the tree
const overArt = (n) => {
  let cur = n;
  while (cur.parent && cur.parent.type !== "PAGE") {
    const sibs = cur.parent.children || [];
    const i = sibs.indexOf(cur);
    for (let j = 0; j < i; j++) {
      const s = sibs[j];
      if (Array.isArray(s.fills) && s.fills.some(f => f.visible !== false &&
          (f.type === "IMAGE" || f.type.indexOf("GRADIENT") === 0))) return true;
    }
    cur = cur.parent;
  }
  return false;
};
const bgOf = (n) => {
  let p = n.parent, acc = null;
  while (p && p.type !== "PAGE") {
    const s = topSolid(p);
    if (s && s.image) return { image: true };
    if (s) { acc = acc === null ? { c: s.c, a: s.a } : { c: mix(acc.c, s.c, acc.a), a: 1 };
             if (acc.a >= 0.999) return { c: acc.c }; }
    p = p.parent;
  }
  // alpha never reached opaque: composite over the canvas rather than returning the raw colour
  if (acc) return { c: mix(acc.c, { r: 0.9608, g: 0.9608, b: 0.9608 }, acc.a), approx: true };
  return { c: { r: 1, g: 1, b: 1 } };
};

const styles = await figma.getLocalTextStylesAsync();
const sids = styles.map(s => s.id.split(",")[0]);
const hasLocalStyle = (n) => {
  const sid = typeof n.textStyleId === "string" ? n.textStyleId : "";
  return !!(sid && sids.some(i => sid.indexOf(i) === 0));
};

const R = { overflow: [], ovals: [], clippedShadow: 0, clippedRail: 0, overlaps: [], tiny: 0,
  styleless: [], weightUnbound: 0, notCentred: 0, btnNotFill: [], deadEnds: [], hiMissing: [],
  hiOnHug: [], banned: 0, placeholder: [], orphans: [], detached: 0, mixedFont: 0,
  unboundHalfGrey: 0, contrast: {}, fonts: {}, weights: {}, screens: 0, links: 0, instances: [] };

const instanceRefs = [];

for (const pg of figma.root.children) {
  await figma.setCurrentPageAsync(pg);                       // MANDATORY, or instances are invisible
  const isScreen = SCREEN_PREFIXES.some(p => pg.name.indexOf(p) === 0);
  const skipContrast = SKIP_CONTRAST.some(p => pg.name.indexOf(p) === 0);

  const tops = pg.children.map(c => ({ n: c.name, x: c.x, y: c.y, x2: c.x + c.width, y2: c.y + c.height }));
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    const a = tops[i], b = tops[j];
    if (a.x < b.x2 && b.x < a.x2 && a.y < b.y2 && b.y < a.y2)
      R.overlaps.push(pg.name.slice(0, 14) + ": " + a.n + " X " + b.n);
  }
  for (const c of pg.children)
    if (/^(icon\/|Vector|Rectangle|Ellipse|Group)/.test(c.name || "")) R.orphans.push(pg.name.slice(0, 14) + ": " + c.name);

  if (isScreen && pg.name.indexOf(PROTOTYPE_PAGE) !== 0 && pg.name.indexOf("🧩") !== 0)
    R.screens += pg.children.flatMap(c => c.type === "SECTION" ? c.children : [c])
      .filter(n => n.type === "FRAME" && !/annotation|▸/i.test(n.name || "")).length;

  for (const n of pg.findAll(() => true)) {
    let top = n; while (top.parent && top.parent.type !== "PAGE") top = top.parent;
    const where = pg.name.slice(0, 12) + "/" + top.name.slice(0, 24) + "/" + (n.name || "").slice(0, 22);
    const cr = typeof n.cornerRadius === "number" ? n.cornerRadius : null;   // can be figma.mixed

    if (n.reactions && n.reactions.length) R.links += n.reactions.length;
    if (n.type === "INSTANCE") instanceRefs.push(n);
    if (n.width !== undefined && n.height !== undefined && (n.width < 1 || n.height < 1)
        && n.visible !== false && n.type !== "VECTOR") R.tiny++;

    if ((n.type === "ELLIPSE" || (n.type === "FRAME" && cr === 999)) && n.width > 0 && n.height > 0
        && /dot|check|circle|avatar|ring|radio|thumb/i.test(n.name || "")) {
      const r = n.width / n.height;
      if (r > 1.08 || r < 0.92) R.ovals.push(where + " " + n.width.toFixed(1) + "x" + n.height.toFixed(1));
    }

    if (n.type === "FRAME" && n.clipsContent && !n.overflowDirection) {
      if (n.children && n.children.some(c => (c.effects || []).some(e => e.type === "DROP_SHADOW" && e.visible !== false))) R.clippedShadow++;
      if (n.layoutMode === "HORIZONTAL" && n.children && n.children.length > 2) R.clippedRail++;
    }

    if (n.type === "FRAME" && n.layoutMode && n.layoutMode !== "NONE" && n.children
        && !n.overflowDirection && n.layoutWrap !== "WRAP") {
      const kids = n.children.filter(c => c.layoutPositioning !== "ABSOLUTE" && c.visible !== false);
      if (kids.length) {
        const h = n.layoutMode === "HORIZONTAL";
        const content = kids.reduce((a, c) => a + (h ? c.width : c.height), 0)
          + n.itemSpacing * (kids.length - 1)
          + (h ? n.paddingLeft + n.paddingRight : n.paddingTop + n.paddingBottom);
        const box = h ? n.width : n.height;
        const sizing = h ? n.layoutSizingHorizontal : n.layoutSizingVertical;
        if (content - box > 1.5 && sizing === "FIXED") R.overflow.push(where + " +" + Math.round(content - box));
      }
    }

    if (Array.isArray(n.fills)) for (const f of n.fills) {
      if (f.type !== "SOLID" || f.visible === false) continue;
      const half = Math.abs(f.color.r - 0.5) < 0.006 && Math.abs(f.color.g - 0.5) < 0.006 && Math.abs(f.color.b - 0.5) < 0.006;
      if (half && !(f.boundVariables && f.boundVariables.color)) R.unboundHalfGrey++;
    }

    if (n.type === "TEXT") {
      const chars = String(n.characters);
      if (BANNED_CHARS.some(ch => chars.indexOf(ch) >= 0)) R.banned++;
      if (/PASTE HERE|TODO|TBD|FIXME|lorem ipsum/i.test(chars)) R.placeholder.push(where);
      if (n.fontName === figma.mixed) R.mixedFont++;
      else { const k = n.fontName.family + "/" + n.fontName.style; R.fonts[k] = (R.fonts[k] || 0) + 1; }

      const styled = hasLocalStyle(n);
      if (isScreen && n.id.indexOf(";") < 0 && !styled) R.styleless.push(where + " @" + n.fontSize);
      const w = wById[aliasId(n.boundVariables && n.boundVariables.fontWeight)];
      if (w) R.weights[w] = (R.weights[w] || 0) + 1;
      else if (!styled) R.weightUnbound++;

      if (!skipContrast && n.visible !== false && chars.trim()) {
        const chain = []; let p = n;
        while (p.parent && p.parent.type !== "PAGE") { chain.push(p.name); p = p.parent; }
        if (/disabled/i.test(chain.join("/")) || /disabled/i.test(top.name)) continue;
        const fg = topSolid(n); if (!fg || fg.image) continue;
        const bg = bgOf(n); if (bg.image) continue;
        if (overArt(n)) continue;                            // measure these from the render instead
        const eff = fg.a < 0.999 ? mix(fg.c, bg.c, fg.a) : fg.c;
        const size = typeof n.fontSize === "number" ? n.fontSize : 14;
        const need = (size >= 18 || (size >= 14 && /semibold|bold/.test(w || ""))) ? 3 : 4.5;
        const r = ratio(eff, bg.c);
        if (r < need - 0.02) {
          const k = hex(eff) + " on " + hex(bg.c) + " @" + size + " = " + r.toFixed(2) + " need " + need + (bg.approx ? " (alpha approx)" : "");
          R.contrast[k] = R.contrast[k] || { count: 0, eg: [] };
          R.contrast[k].count++;
          if (R.contrast[k].eg.length < 2) R.contrast[k].eg.push(where + " '" + chars.slice(0, 20) + "'");
        }
      }
    }

    if (n.type === "INSTANCE" && /^btn$/.test(n.name)) {
      for (const t of n.findAllWithCriteria({ types: ["TEXT"] }))
        if (t.textAlignHorizontal !== "CENTER") R.notCentred++;
      const p = n.componentProperties || {};
      if ((p.size ? p.size.value : null) === "l" && n.parent && n.parent.layoutMode
          && n.parent.layoutMode !== "NONE" && n.layoutSizingHorizontal !== "FILL") R.btnNotFill.push(where);
    }
  }

  const frames = pg.children.flatMap(c => c.type === "SECTION" ? c.children : [c])
    .filter(n => n.type === "FRAME" && Math.round(n.width) === 375);
  for (const f of frames) {
    const hi = f.findOne(n => n.type === "INSTANCE" && n.name === "home-indicator");
    if (Math.round(f.height) === VIEWPORT_H && !hi) R.hiMissing.push(f.name);
    if (Math.round(f.height) !== VIEWPORT_H && hi) R.hiOnHug.push(f.name);
  }

  if (pg.name.indexOf(PROTOTYPE_PAGE) === 0) {
    for (const f of pg.children.flatMap(c => c.type === "SECTION" ? c.children : []).filter(n => n.type === "FRAME")) {
      let out = 0;
      for (const n of f.findAll(() => true)) if (n.reactions && n.reactions.length) out += n.reactions.length;
      if (f.reactions && f.reactions.length) out += f.reactions.length;
      if (out === 0) R.deadEnds.push(f.name);
    }
  }
}

// last, because it forces instance reconciliation and can discard unpersisted overrides
for (const n of instanceRefs) { try { await n.getMainComponentAsync(); } catch (e) { R.detached++; } }

/**
 * Impossible family/style pairs.
 * A style string carried over from another family (one family spells it "Semi Bold", another "Semibold")
 * leaves the node resolving to a face that does not exist, and it renders as a missing font.
 * listAvailableFontsAsync cannot help here because locally installed families are invisible to the
 * runtime, so detect it structurally: if one normalised weight has more than one spelling in the
 * file, the minority spelling is wrong.
 */
const spellings = {};
for (const pair in R.fonts) {
  const [fam, sty] = pair.split("/");
  const norm = fam + "|" + sty.toLowerCase().replace(/[\s_-]/g, "");
  (spellings[norm] = spellings[norm] || []).push({ pair, n: R.fonts[pair] });
}
const conflicting = Object.values(spellings)
  .filter(v => v.length > 1)
  .map(v => v.sort((a, b) => b.n - a.n))
  .map(v => ({ keep: v[0].pair + " x" + v[0].n, suspect: v.slice(1).map(x => x.pair + " x" + x.n) }));

const cap = (a, k = 6) => Array.isArray(a) ? { count: a.length, sample: a.slice(0, k) } : a;
return {
  fontFamily: famVar ? famVar.valuesByMode[modeOf[famVar.id]] : "n/a",
  fonts: R.fonts, weights: R.weights,
  conflictingWeightSpellings: conflicting,   // must be empty
  screens: R.screens, prototypeLinks: R.links,
  overflow: cap(R.overflow), ovals: cap(R.ovals),
  clippedShadow: R.clippedShadow, clippedRail: R.clippedRail,
  overlaps: cap(R.overlaps), tinyNodes: R.tiny,
  stylelessScreenText: cap(R.styleless), weightUnbound: R.weightUnbound,
  buttonLabelsNotCentred: R.notCentred, sizeLNotFilling: cap(R.btnNotFill),
  prototypeDeadEnds: cap(R.deadEnds),
  homeIndicatorMissing: cap(R.hiMissing), homeIndicatorOnHug: cap(R.hiOnHug),
  bannedChars: R.banned, placeholderText: cap(R.placeholder),
  orphanNodes: cap(R.orphans), detachedInstances: R.detached,
  mixedFontNodes: R.mixedFont, unboundHalfGreyFills: R.unboundHalfGrey,
  contrastFailures: R.contrast,
};
