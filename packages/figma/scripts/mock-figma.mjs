/**
 * mock-figma.mjs: run the three in-Figma scripts outside Figma.
 *
 * `figma-audit.js`, `capture-baseline.js` and `source-parity.js` are pasted as the `code`
 * argument of a `use_figma` call, so for three releases the only way to find out whether
 * they still worked was to paste them into a paid Figma session against a real file. 542
 * lines of audit logic with no way to run it is 542 lines nobody dares edit.
 *
 * They do not need Figma. They need the small part of its API they call, and everything
 * that matters in them, traversal, counting, pairing, comparison, is ordinary
 * JavaScript once that surface exists.
 *
 * This is NOT a Figma emulator and must never grow into one. It implements exactly what
 * those three scripts call, and when one of them starts calling something new, this file
 * gains that one method and nothing else.
 *
 * Usage:
 *   import { makeNode, makeFigma, run } from "./mock-figma.mjs";
 *   const page = makeNode({ id: "1:2", name: "📱 04", type: "PAGE", children: [ ... ] });
 *   const { ret, logs } = await run("./figma-audit.js", makeFigma([page]));
 *
 * The scripts use top-level await because they are async function bodies, so `node --check`
 * rejects all three. `parses()` below is the check that actually applies to them.
 */
import fs from "fs";

const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

/** Does this file parse as the async body Figma will run it as? */
export function parses(file) {
  try {
    new AsyncFn("figma", "console", fs.readFileSync(file, "utf8"));
    return true;
  } catch (e) {
    return e.message;
  }
}

/** One node. Defaults are the shape the three scripts read; override what a test needs. */
export function makeNode(o) {
  const n = {
    id: o.id || "n" + Math.random().toString(36).slice(2, 8),
    name: o.name || "node",
    type: o.type || "FRAME",
    x: o.x ?? 0, y: o.y ?? 0,
    width: o.width ?? 100, height: o.height ?? 40,
    visible: o.visible !== false,
    removed: false,
    children: o.children || [],
    fills: o.fills ?? [], strokes: o.strokes ?? [], effects: o.effects ?? [],
    opacity: o.opacity ?? 1,
    cornerRadius: o.cornerRadius ?? 0,
    boundVariables: o.boundVariables ?? {},
    characters: o.characters, fontSize: o.fontSize, fontName: o.fontName,
    textStyleId: o.textStyleId, fillStyleId: o.fillStyleId,
    textAlignHorizontal: o.textAlignHorizontal || "LEFT",
    layoutMode: o.layoutMode || "NONE",
    itemSpacing: o.itemSpacing ?? 0,
    paddingLeft: o.paddingLeft ?? 0, paddingRight: o.paddingRight ?? 0,
    paddingTop: o.paddingTop ?? 0, paddingBottom: o.paddingBottom ?? 0,
    layoutSizingHorizontal: o.layoutSizingHorizontal || "FIXED",
    layoutSizingVertical: o.layoutSizingVertical || "FIXED",
    layoutAlign: o.layoutAlign, layoutGrow: o.layoutGrow,
    layoutPositioning: o.layoutPositioning,
    primaryAxisSizingMode: o.primaryAxisSizingMode,
    counterAxisSizingMode: o.counterAxisSizingMode,
    clipsContent: o.clipsContent ?? false,
    overflowDirection: o.overflowDirection,
    constraints: o.constraints || { horizontal: "MIN", vertical: "MIN" },
    parent: null,
    mainComponent: o.mainComponent || null,
    componentProperties: o.componentProperties,
    variantProperties: o.variantProperties,
    absoluteBoundingBox: { x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 100, height: o.height ?? 40 },
    ...o.extra,
  };
  n.findAll = (fn) => {
    const out = [];
    (function walk(k) { for (const c of k.children || []) { if (!fn || fn(c)) out.push(c); walk(c); } })(n);
    return out;
  };
  n.findOne = (fn) => n.findAll(fn)[0] || null;
  n.findAllWithCriteria = ({ types }) => n.findAll((c) => types.includes(c.type));
  for (const c of n.children) c.parent = n;
  return n;
}

/** A figma global carrying the pages given. */
export function makeFigma(pages, extras = {}) {
  const all = [];
  const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
  pages.forEach(walk);
  for (const p of pages) p.loadAsync = async () => {};
  const byId = new Map(all.map((n) => [n.id, n]));
  return {
    root: { children: pages },
    currentPage: pages[0],
    mixed: Symbol("figma.mixed"),
    getNodeByIdAsync: async (id) => byId.get(id) || null,
    setCurrentPageAsync: async () => {},
    loadFontAsync: async () => {},
    notify: () => {},
    getLocalTextStylesAsync: async () => extras.textStyles || [],
    getLocalPaintStylesAsync: async () => extras.paintStyles || [],
    getLocalEffectStylesAsync: async () => extras.effectStyles || [],
    variables: {
      getLocalVariableCollectionsAsync: async () => extras.collections || [],
      getLocalVariablesAsync: async () => extras.variables || [],
      getVariableByIdAsync: async (id) => (extras.variables || []).find((v) => v.id === id) || null,
      getVariableCollectionByIdAsync: async (id) => (extras.collections || []).find((c) => c.id === id) || null,
    },
    _all: all,
  };
}

/** Run one of the three scripts. Returns its value and anything it logged. */
export async function run(file, figma) {
  const logs = [];
  const con = {
    log: (...a) => logs.push(a.map(String).join(" ")),
    warn: (...a) => logs.push("WARN " + a.map(String).join(" ")),
    error: (...a) => logs.push("ERR " + a.map(String).join(" ")),
  };
  const ret = await new AsyncFn("figma", "console", fs.readFileSync(file, "utf8"))(figma, con);
  return { ret, logs: logs.join("\n") };
}

/* ---- self-test ------------------------------------------------------------
 * `node mock-figma.mjs` runs all three scripts against a fixture and asserts each
 * reports the defect it exists for. A harness nobody runs proves nothing, and a harness
 * that only proves the scripts do not throw proves almost nothing.
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const here = new URL(".", import.meta.url).pathname;
  const P = (c, a) => ({ type: "SOLID", color: { r: c[0], g: c[1], b: c[2] }, opacity: a ?? 1, visible: true });
  const fails = [];
  const check = (name, ok, detail) => {
    console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
    if (!ok) fails.push(name);
  };

  for (const f of ["figma-audit.js", "capture-baseline.js", "source-parity.js"]) {
    const r = parses(here + f);
    check(`${f} parses as an async body`, r === true, r);
  }

  /* capture-baseline: a scrim whose alpha was rounded to 1 is the defect it was written
   * for, and every structural check passes through it. */
  const scrim = (a) => makeNode({ id: "p", name: "P", type: "PAGE", children: [
    makeNode({ id: "f", name: "Home", type: "FRAME", width: 375, height: 812, fills: [P([1,1,1])], children: [
      makeNode({ id: "sh", name: "Scrim", type: "RECTANGLE", width: 375, height: 812, fills: [P([0,0,0], a)] }),
    ] }) ] });
  const b0 = (await run(here + "capture-baseline.js", makeFigma([scrim(0.4)]))).ret.baseline;
  const b1 = (await run(here + "capture-baseline.js", makeFigma([scrim(1)]))).ret.baseline;
  const seen = new Map(b0.map((x) => [x.k, x.v]));
  const changed = b1.filter((x) => seen.get(x.k) !== x.v);
  check("capture-baseline sees a scrim forced opaque", changed.length === 1, JSON.stringify(changed));

  /* Node opacity is a separate channel from paint alpha and a bulk pass hits both. The
   * first version of this self-test only asserted the paint, so removing the opacity
   * capture entirely still reported "all pass": a test that could not see the thing it
   * was watching, which is the failure this whole repository keeps finding in itself. */
  const dim = (op) => makeNode({ id: "p", name: "P", type: "PAGE", children: [
    makeNode({ id: "f", name: "Home", type: "FRAME", width: 375, height: 812, fills: [P([1,1,1])], children: [
      makeNode({ id: "ov", name: "Overlay", type: "RECTANGLE", width: 375, height: 812,
        fills: [P([0,0,0])], opacity: op }),
    ] }) ] });
  const o0 = (await run(here + "capture-baseline.js", makeFigma([dim(0.5)]))).ret.baseline;
  const o1 = (await run(here + "capture-baseline.js", makeFigma([dim(1)]))).ret.baseline;
  const hadOpacity = o0.some((x) => x.k.endsWith("|nodeOpacity") && x.v === "0.5");
  const m0 = new Map(o0.map((x) => [x.k, x.v]));
  const opChanged = o1.filter((x) => m0.get(x.k) !== x.v).concat(
    o0.filter((x) => !o1.some((y) => y.k === x.k)));
  check("capture-baseline records node opacity", hadOpacity, JSON.stringify(o0));
  check("capture-baseline sees node opacity change", opChanged.length === 1, JSON.stringify(opChanged));

  /* figma-audit: an ellipse named like a circle and sized like an oval, against the same
   * ellipse sized like a circle, which must NOT be reported. */
  const withEllipse = (w, h) => makeNode({ id: "pg", name: "📱 04", type: "PAGE", children: [
    makeNode({ id: "s", name: "Home", type: "FRAME", width: 375, height: 812, x: 0, y: 0,
      fills: [P([1,1,1])], layoutMode: "VERTICAL", primaryAxisSizingMode: "FIXED",
      counterAxisSizingMode: "FIXED", children: [
        makeNode({ id: "e", name: "Avatar", type: "ELLIPSE", width: w, height: h, fills: [P([0,0,0])] }),
      ] }) ] });
  const oval = (await run(here + "figma-audit.js", makeFigma([withEllipse(12, 8)]))).ret;
  const circle = (await run(here + "figma-audit.js", makeFigma([withEllipse(8, 8)]))).ret;
  check("figma-audit reports an oval", oval.ovals.count === 1, JSON.stringify(oval.ovals));
  check("figma-audit does NOT report a circle", circle.ovals.count === 0, JSON.stringify(circle.ovals));

  /* source-parity: a string the rebuild dropped. */
  const T = (id, s, y) => makeNode({ id, name: s.slice(0, 8), type: "TEXT", characters: s, x: 16, y, width: 200, height: 20, fontSize: 16 });
  const pair = (rebuild) => makeFigma([
    makeNode({ id: "1:2", name: "Source", type: "PAGE", children: [
      makeNode({ id: "sf", name: "Home", type: "FRAME", width: 375, height: 812, children: [
        T("a", "Send a payment", 24), T("b", "Recent activity", 80) ] }) ] }),
    makeNode({ id: "36:2", name: "Rebuild", type: "PAGE", children: [
      makeNode({ id: "rf", name: "Home", type: "FRAME", width: 375, height: 812, children: rebuild }) ] }),
    makeNode({ id: "13:5", name: "Components", type: "PAGE", children: [] }),
  ]);
  const spSrc = fs.readFileSync(here + "source-parity.js", "utf8")
    .replace('const SOURCE_PAGE_IDS  = ["1:2", "1:3"];', 'const SOURCE_PAGE_IDS  = ["1:2"];')
    .replace('const REBUILD_PAGE_IDS = ["36:2", "36:3"];', 'const REBUILD_PAGE_IDS = ["36:2"];');
  const tmp = `${process.env.TMPDIR || "/tmp"}/pica-source-parity-selftest.js`;
  fs.writeFileSync(tmp, spSrc);
  const whole = (await run(tmp, pair([T("ra", "Send a payment", 24), T("rb", "Recent activity", 80)]))).ret;
  const dropped = (await run(tmp, pair([T("ra", "Send a payment", 24)]))).ret;
  fs.unlinkSync(tmp);
  check("source-parity is clean on an identical rebuild", whole.missingStrings === 0 && whole.extraStrings === 0,
    JSON.stringify({ m: whole.missingStrings, e: whole.extraStrings }));
  check("source-parity sees a dropped string", dropped.missingStrings === 1, JSON.stringify(dropped.missingStrings));

  console.log(`\n${fails.length ? `${fails.length} failure(s): ${fails.join(", ")}` : "all pass"}`);
  process.exit(fails.length ? 1 : 0);
}
