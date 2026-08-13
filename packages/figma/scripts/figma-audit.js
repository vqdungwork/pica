/**
 * Full Figma hygiene audit. Paste as the `code` argument of a single use_figma call.
 *
 * Everything should return zero. Configure the block below for the file, then read
 * the core package's rules/review-discipline.md for how to interpret the known false-positive classes
 * (text over sibling artwork, alpha that never reaches opaque, and documentation frames that carry
 * component names).
 *
 * Notes on why it is written this way:
 *   - setCurrentPageAsync before every traversal, or instance children are invisible. This is the one
 *     place worth spending a page switch per page: page.loadAsync() is cheaper and fine for shallow
 *     reads, but this audit needs deep instance traversal. See ../rules/figma-mcp.md.
 *   - cornerRadius / fontName can be figma.mixed, so numeric reads are guarded
 *   - SECTION nodes have no layout properties; COMPONENT_SET geometry is editor chrome
 *   - variable-bound paints report a stale cached colour, so colours are resolved through aliases
 *   - token colours are keyed by RGBA, not RGB, so a 45% scrim is not mistaken for opaque black
 *   - binding strokeWeight leaves strokeWeight itself undefined, so all five keys are checked
 *   - getMainComponentAsync forces instance reconciliation, which is why detach detection is last
 *
 * This audit proves structure. It does NOT prove appearance was preserved: run
 * capture-baseline.js before any bulk mutation and diff after, or a pass can flatten every
 * translucent surface in the file and still return zero here.
 */

// ---- configure -------------------------------------------------------------
const SCREEN_PREFIXES = ["🧩 03", "📱 04", "🏠 05", "▶️ 06", "📺 07", "🔀 08"];
const SKIP_CONTRAST   = ["🔍 01"];          // capture/audit pages of someone else's UI
const PROTOTYPE_PAGE  = "🔀 08";
const VIEWPORT_H      = 812;
const SCREEN_W        = 375;                // mobile portrait width; landscape is height === SCREEN_W
const BANNED_CHARS    = [","];              // project-specific

// Pages whose geometry is documentation rather than product. Token-binding checks are SKIPPED here:
// a spec table's cell padding and a cover's 96px margin are not design-system values, and reporting
// them means the audit can never return zero, which turns every run into noise.
const DOC_PAGES = ["📕", "🔍 01", "📋 09"];

// Populated from .pica/state.json before pasting. State is authoritative; this block is a copy the
// Figma sandbox can see, because it has no filesystem access.
const EXCLUSIONS = [];                      // short names the brief ruled out, e.g. ["settings", "profile"]
const DEVIATIONS = [];                      // [{ node, prop, html, figma, why, by }]

// Deliberate raw values, copied from .pica/state.json rawValueExemptions where the reasons live.
// State is authoritative; never edit this block alone or the two drift and the reasons are lost.
// Anything raw and NOT listed here is reported, which is what makes "raw only where no token exists"
// an auditable rule rather than an aspiration.
const RAW_EXEMPT = {
  radius:  [],
  padding: [2, 18, 48, 56, 60],             // rail hairline; pl-next; Foundations swatch gutter and
                                            // label inset; landscape fs- inset
  stroke:  [],                              // SVG icon artwork weights are excluded structurally, not listed
  fill:    ["#1877f2", "#1976d2", "#ffc107", "#4caf50", "#ff3d00",    // third-party brand marks
            "#b8b8b8"],                     // media placeholder grey
};
/**
 * Icon-ish names, matched on word boundaries.
 *
 * Substring matching is wrong here: `play` matches `replay-grid` and `replay-card`, so a grid of replay
 * cards reported itself as an un-centred icon row. Anchor each term.
 */
const ICON_RE = /(^|[^a-z])(icon|chevron|arrow|eye|clear|close|check|caret|play|pause|search|toggle)([^a-z]|$)/i;

// Annotation frames are documentation wherever they live. Their label rows are BASELINE or MIN by
// design and their spacing is prose layout, so token and alignment checks skip them.
const isAnnotation = (n) => {
  let top = n;
  while (top.parent && top.parent.type !== "PAGE") top = top.parent;
  return /^▸|annotation/i.test(top.name || "");
};

/**
 * True overlay names only.
 *
 * An earlier draft included pill|track|ring|badge|duration|count|watch and produced 8 findings of which
 * 6 were false: brand-coloured badges (secondary/300, error-700) and status rings (#eaeafc, #f7f7f7)
 * are legitimately opaque. Element names do not tell you whether something is translucent.
 *
 * The reliable signal is the same-colour child, which proves the element is invisible. Everything else
 * is a candidate for review, not a defect — the real gate on flattening is the baseline diff in
 * capture-baseline.js, because it compares against what the file used to render.
 */
const OVERLAY_RE = /scrim|overlay|backdrop|buffer/i;
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

// ---- token scales, for geometry binding -------------------------------------
// resolve() only returns colours; geometry needs the raw resolved value whatever its type
const resolveAny = (id, d = 0) => {
  const v = raw[id]; if (!v || d > 8) return null;
  const x = v.valuesByMode[modeOf[id]];
  if (x && x.type === "VARIABLE_ALIAS") return resolveAny(x.id, d + 1);
  return x;
};
const numScale = (name) => {
  const s = new Set(), c = cols.find(x => x.name === name);
  if (c) for (const id of c.variableIds) { const v = resolveAny(id); if (typeof v === "number") s.add(v); }
  return s;
};
const SPACING = numScale("Spacing"), RADIUS_S = numScale("Radius"), BORDER_S = numScale("Border");

// every token colour keyed by RGBA, so alpha is part of the identity. Keying on RGB alone is what
// let a bulk binding pass flatten every translucent scrim in a file.
const COLKEY = new Set();
for (const id in raw) {
  const v = resolveAny(id);
  if (v && v.r !== undefined)
    COLKEY.add([v.r, v.g, v.b, v.a === undefined ? 1 : v.a].map(x => Math.round(x * 255)).join(","));
}
const paintRGBA = (f) => [f.color.r, f.color.g, f.color.b, f.opacity === undefined ? 1 : f.opacity]
  .map(x => Math.round(x * 255)).join(",");

// binding strokeWeight writes the four per-side keys and leaves strokeWeight itself undefined
const SW_KEYS = ["strokeWeight", "strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight"];
const swBound = (n) => { const bv = n.boundVariables || {}; return SW_KEYS.some(k => bv[k]); };
const RADII = ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"];
const PADS  = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"];
const isIconArt = (n) => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION" || n.type === "LINE";

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
  banned: 0, placeholder: [], orphans: [], detached: 0, mixedFont: 0,
  unboundHalfGrey: 0, contrast: {}, fonts: {}, weights: {}, screens: 0, links: 0, instances: [],
  // 0.2.0: geometry token binding, translucency integrity, vertical alignment
  radiusUnbound: [], paddingUnbound: [], strokeWeightUnbound: [], colourUnbound: [],
  rawUnregistered: [], flattened: [], iconRowNotCentred: [], textRidingHigh: [],
  unequalSiblings: [], chromeUnpinned: [], screenFrames: 0,
  // 0.2.0: published-number recount, and the exclusions register
  claims: [], componentCount: 0, topFrameNames: [], staleCounts: [], excludedBuilt: [] };

const instanceRefs = [];

for (const pg of figma.root.children) {
  await figma.setCurrentPageAsync(pg);                       // MANDATORY, or instances are invisible
  const isScreen = SCREEN_PREFIXES.some(p => pg.name.indexOf(p) === 0);
  const skipContrast = SKIP_CONTRAST.some(p => pg.name.indexOf(p) === 0);
  const isDocPage = DOC_PAGES.some(p => pg.name.indexOf(p) === 0);

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
    if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") R.componentCount++;
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

    // ---- geometry token binding (0.2.0) ------------------------------------
    // COMPONENT_SET is the variant-set wrapper: its radius and padding are editor chrome, not design.
    // Documentation pages are skipped: see DOC_PAGES.
    if (!isDocPage && !isAnnotation(n) && n.type !== "COMPONENT_SET" && n.type !== "SECTION") {
      const bv = n.boundVariables || {};

      for (const k of RADII) {
        const v = n[k];
        if (typeof v !== "number" || v <= 0 || bv[k]) continue;
        if (RADIUS_S.has(v)) R.radiusUnbound.push(where + " " + k.replace("Radius", "") + "=" + v);
        else if (RAW_EXEMPT.radius.indexOf(v) < 0) R.rawUnregistered.push(where + " radius " + v);
      }

      if (n.layoutMode && n.layoutMode !== "NONE") for (const k of PADS) {
        const v = n[k];
        if (typeof v !== "number" || v <= 0 || bv[k]) continue;
        if (SPACING.has(v)) R.paddingUnbound.push(where + " " + k.replace("padding", "") + "=" + v);
        else if (RAW_EXEMPT.padding.indexOf(v) < 0) R.rawUnregistered.push(where + " padding " + v);
      }

      // icon artwork carries SVG-import weights (1.17, 1.83, 2.08) that are internals, not borders
      if (!isIconArt(n) && Array.isArray(n.strokes) && n.strokes.length
          && typeof n.strokeWeight === "number" && n.strokeWeight > 0 && !swBound(n)) {
        if (BORDER_S.has(n.strokeWeight)) R.strokeWeightUnbound.push(where + " w=" + n.strokeWeight);
        else if (RAW_EXEMPT.stroke.indexOf(n.strokeWeight) < 0)
          R.rawUnregistered.push(where + " strokeWeight " + n.strokeWeight);
      }

      for (const key of ["fills", "strokes"]) {
        if (!Array.isArray(n[key])) continue;
        for (const f of n[key]) {
          if (f.type !== "SOLID" || f.visible === false) continue;
          if (f.boundVariables && f.boundVariables.color) continue;
          if (isIconArt(n)) continue;
          if (COLKEY.has(paintRGBA(f))) R.colourUnbound.push(where + " " + key + " " + hex(f.color));
          else if (RAW_EXEMPT.fill.indexOf(hex(f.color)) < 0)
            R.rawUnregistered.push(where + " " + key + " " + hex(f.color));
        }
      }

      /**
       * Flattened translucency: a bound paint that resolved to opaque while sitting over artwork.
       *
       * ADVISORY, not a zero-gate. Names do not tell you what should be translucent, so this returns
       * candidates for review. The actual gate is the baseline diff in capture-baseline.js.
       *
       * The screen frame itself is excluded — a top-level frame is 375x812 and opaque by definition,
       * whereas a full-bleed scrim is a child of one. Without this, every screen containing a white
       * status-bar glyph reported itself.
       */
      const topLevel = !n.parent || n.parent.type === "PAGE" || n.parent.type === "SECTION";
      if (!topLevel && Array.isArray(n.fills) && n.fills.length) {
        const f = n.fills.find(x => x.type === "SOLID" && x.visible !== false);
        const opaque = f && (f.opacity === undefined || f.opacity >= 0.999);
        if (f && opaque && f.boundVariables && f.boundVariables.color && overArt(n)) {
          let sameColourChild = false;
          try {
            sameColourChild = n.findAll(k => k.type === "VECTOR" || k.type === "TEXT").some(k => {
              const kf = (k.fills || []).find(x => x.type === "SOLID" && x.visible !== false);
              return kf && (kf.opacity === undefined || kf.opacity >= 0.999) && hex(pc(kf)) === hex(pc(f));
            });
          } catch (e) { /* stale node id during traversal; name check still applies */ }
          if (sameColourChild || OVERLAY_RE.test(n.name || ""))
            R.flattened.push(where + " " + hex(pc(f)) + (sameColourChild ? " (child same colour)" : ""));
        }
      }
    }

    // ---- vertical alignment (0.2.0) ---------------------------------------
    /**
     * A row holding an icon should centre it — unless the icon is wrapped in a *-slot, which is the
     * documented pattern for centring on a field rather than on the whole control. A slot-wrapped row
     * is deliberately MAX-aligned, so flagging it is wrong.
     * Documentation pages are excluded: their label rows are BASELINE or MIN by design.
     */
    if (!isDocPage && !isAnnotation(n) && n.type === "FRAME" && n.layoutMode === "HORIZONTAL"
        && n.counterAxisAlignItems !== "CENTER") {
      const kids = n.children || [];
      const hasIcon = kids.some(c => c.type === "VECTOR" || ICON_RE.test(c.name || ""));
      const slotted = kids.some(c => /-slot$/i.test(c.name || ""));
      if (hasIcon && !slotted) R.iconRowNotCentred.push(where + " " + n.counterAxisAlignItems);
    }

    if (n.type === "TEXT" && n.textAutoResize === "NONE" && n.textAlignVertical === "TOP") {
      const seg = n.getStyledTextSegments(["lineHeight"])[0];
      const lh = seg && seg.lineHeight && seg.lineHeight.unit === "PIXELS" ? seg.lineHeight.value : null;
      if (lh && Math.abs(n.height % lh) > 0.01)
        R.textRidingHigh.push(where + " h=" + Math.round(n.height) + " lh=" + lh);
    }

    /**
     * A row of peers should be one height, achieved with FILL rather than luck.
     *
     * "Three or more children of differing height" alone is far too loose: it flagged 29 rows that were
     * simply mixed content — a rail of 221px cards beside a 24px label, a top bar of 44px buttons beside
     * a 1px divider. Those are not peers.
     *
     * Peers share a name stem: `tab Overview` / `tab Exercises` / `tab TV`, `seg-one` / `seg-two`.
     * Require that, and the check finds nav tabs and segmented controls and nothing else.
     */
    if (!isDocPage && !isAnnotation(n) && n.type === "FRAME" && n.layoutMode === "HORIZONTAL") {
      const kids = (n.children || []).filter(c => c.type === "FRAME" || c.type === "INSTANCE");
      if (kids.length >= 3) {
        const stem = (s) => String(s || "").trim().toLowerCase().split(/[\s\-_/]+/)[0];
        const stems = new Set(kids.map(c => stem(c.name)));
        const arePeers = stems.size === 1 && [...stems][0].length > 1;
        const hs = [...new Set(kids.map(c => Math.round(c.height)))];
        if (arePeers && hs.length > 1 && kids.some(c => c.layoutSizingVertical !== "FILL"))
          R.unequalSiblings.push(where + " " + hs.join("/"));
      }
    }

    if (n.type === "TEXT") {
      const chars = String(n.characters);
      if (BANNED_CHARS.some(ch => chars.indexOf(ch) >= 0)) R.banned++;
      if (/PASTE HERE|TODO|TBD|FIXME|lorem ipsum/i.test(chars)) R.placeholder.push(where);
      if (/\d/.test(chars) && chars.length < 400) R.claims.push({ where, text: chars });
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

  /**
   * Home indicator, 0.2.0: required on EVERY screen frame, hug included, and bottom-pinned.
   *
   * Two changes from 0.1.0. The hug exception is gone, because a missing element reads as an
   * oversight rather than a decision. And a frame is a screen if EITHER dimension is the portrait
   * width, so landscape and hug frames are both in the population — a filter keyed on 375x812
   * silently excluded them and then reported full coverage.
   */
  const frames = pg.children.flatMap(c => c.type === "SECTION" ? c.children : [c])
    .filter(n => n.type === "FRAME" && !/annotation|▸/i.test(n.name || "")
      && (Math.round(n.width) === SCREEN_W || Math.round(n.height) === SCREEN_W)
      && Math.max(n.width, n.height) >= 300);
  R.screenFrames += frames.length;
  for (const c of pg.children.flatMap(c2 => c2.type === "SECTION" ? c2.children : [c2]))
    if (c.type === "FRAME") R.topFrameNames.push(c.name || "");
  for (const f of frames) {
    const hi = (f.children || []).find(c => /home-indicator/i.test(c.name || ""));
    if (!hi) { R.hiMissing.push(f.name + " " + Math.round(f.width) + "x" + Math.round(f.height)); continue; }
    const con = hi.constraints;
    const gap = Math.round(f.height - (hi.y + hi.height));
    if (!con || con.vertical !== "MAX" || Math.abs(gap) > 1)
      R.chromeUnpinned.push(f.name + " " + (con ? con.horizontal + "/" + con.vertical : "no-constraints")
        + " gap=" + gap);
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
 * Recount every number published in the file.
 *
 * 0.1.0 listed this check and never implemented it, so a cover claiming "45 designed screens" while
 * counting five annotation boards passed. Now it reads the claims out of the text and recounts.
 *
 * Only claims it can verify are checked. An unrecognised noun is ignored rather than guessed at.
 */
const CLAIM_RE = /(\d[\d,]*)\s*(?:\+\s*)?(designed\s+)?(screens?|frames?|components?|variables?|tokens?|prototype\s+links?|links?)\b/gi;
const actual = {
  screens: R.screens,
  frames: R.screens,
  components: R.componentCount,
  variables: Object.keys(raw).length,
  tokens: Object.keys(raw).length,
  links: R.links,
  "prototype links": R.links,
};
for (const c of R.claims) {
  let m;
  CLAIM_RE.lastIndex = 0;
  while ((m = CLAIM_RE.exec(c.text)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    const noun = m[3].toLowerCase().replace(/\s+/g, " ");
    const real = actual[noun];
    if (real === undefined || !isFinite(n)) continue;
    if (n !== real) R.staleCounts.push(c.where + ' claims ' + n + ' ' + noun + ', file has ' + real);
  }
}

// Anything the brief ruled out must not exist in the file.
if (EXCLUSIONS.length) {
  for (const nm of R.topFrameNames) {
    const low = nm.toLowerCase();
    for (const ex of EXCLUSIONS) if (low.indexOf(String(ex).toLowerCase()) >= 0)
      R.excludedBuilt.push(nm + ' matches exclusion "' + ex + '"');
  }
}

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
  screenFramesSeen: R.screenFrames,          // print the denominator, do not trust a percentage
  homeIndicatorMissing: cap(R.hiMissing), chromeUnpinned: cap(R.chromeUnpinned),
  // geometry token binding
  radiusUnbound: cap(R.radiusUnbound), paddingUnbound: cap(R.paddingUnbound),
  strokeWeightUnbound: cap(R.strokeWeightUnbound), colourUnbound: cap(R.colourUnbound),
  rawUnregistered: cap(R.rawUnregistered, 10),
  // advisory: candidates for review, not a zero-gate. The gate is the capture-baseline.js diff.
  flattenedTranslucencyCandidates: cap(R.flattened),
  iconRowNotCentred: cap(R.iconRowNotCentred),
  textRidingHigh: cap(R.textRidingHigh), unequalSiblingHeights: cap(R.unequalSiblings),
  staleCounts: cap(R.staleCounts), excludedButBuilt: cap(R.excludedBuilt),
  bannedChars: R.banned, placeholderText: cap(R.placeholder),
  orphanNodes: cap(R.orphans), detachedInstances: R.detached,
  mixedFontNodes: R.mixedFont, unboundHalfGreyFills: R.unboundHalfGrey,
  contrastFailures: R.contrast,
};
