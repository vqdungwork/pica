/**
 * Appearance baseline. Paste as the `code` argument of a single use_figma call.
 *
 * Run it BEFORE any bulk mutation — token binding, colour snapping, value rounding — and again after,
 * then diff. A pass that changes what a node renders is a defect even when every structural check
 * still returns zero.
 *
 * Why this exists: a token-binding pass on one file bound ~2,000 properties, reported "0 remaining
 * unbound" on every page, and had flattened 38 translucent surfaces to opaque. Six full-screen scrims
 * went solid black and hid the content behind every bottom sheet. Nothing was deleted, every node read
 * visible: true, and every existence check passed. Only a before/after comparison of resolved colour
 * would have caught it.
 *
 * The Plugin API cannot read Figma version history, so if you skip this the original values are gone.
 *
 * Usage
 *   1. run, save the returned JSON as .pica/baseline-<label>.json
 *   2. do the mutation pass
 *   3. run again, diff the two by `k`
 *   4. every entry whose value changed is a defect until it is a recorded decision
 *
 * Diff locally rather than in Figma; it costs no calls.
 */

// ---- configure -------------------------------------------------------------
const PAGES = null;          // null = every page, or ["📱 04", "▶️ 06"] to scope it
// ---------------------------------------------------------------------------

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const raw = {}, modeOf = {};
for (const c of cols) for (const id of c.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id);
  raw[id] = v; modeOf[id] = c.defaultModeId;
}

// resolve through the alias chain: a bound paint's cached `color` is stale
const resolve = (id, d = 0) => {
  const v = raw[id]; if (!v || d > 8) return null;
  const x = v.valuesByMode[modeOf[id]];
  if (x && x.type === "VARIABLE_ALIAS") return resolve(x.id, d + 1);
  return x && x.r !== undefined ? x : null;
};

/**
 * Effective RGBA of one paint, as an integer string.
 *
 * Alpha is the whole point. A bound paint takes its alpha from the variable, so a token carrying
 * a: 0.45 yields 0.45 and an opaque token yields 1 no matter what the paint's own opacity was before
 * binding. Recording alpha separately from RGB is what makes the flattening visible in a diff.
 */
const rgba = (f) => {
  const bid = f.boundVariables && f.boundVariables.color && f.boundVariables.color.id;
  const rv = bid ? resolve(bid) : null;
  const c = rv || f.color;
  const a = rv && rv.a !== undefined ? rv.a : (f.opacity === undefined ? 1 : f.opacity);
  return [c.r, c.g, c.b, a].map(x => Math.round(x * 1000) / 1000).join(",");
};

const safe = (n, k) => { try { const v = n[k]; return v === undefined ? null : v; } catch (e) { return null; } };
const out = [];
let nodes = 0;

for (const pg of figma.root.children) {
  if (PAGES && !PAGES.some(p => pg.name.indexOf(p) === 0)) continue;
  // loadAsync, not setCurrentPageAsync: this is a shallow property read across every page, and one
  // call is the point. See ../rules/figma-mcp.md.
  try { if (pg.loadAsync) await pg.loadAsync(); } catch (e) { out.push({ k: pg.name, err: "load" }); continue; }

  for (const n of pg.findAll(() => true)) {
    if (n.type === "SECTION") continue;
    nodes++;
    for (const key of ["fills", "strokes"]) {
      const arr = safe(n, key);
      if (!Array.isArray(arr)) continue;
      arr.forEach((f, i) => {
        if (f.type !== "SOLID" || f.visible === false) return;
        out.push({ k: n.id + "|" + key + "|" + i, v: rgba(f) });
      });
    }
    // node opacity is untouched by paint binding, but a bulk pass can still hit it
    const o = safe(n, "opacity");
    if (typeof o === "number" && o < 1) out.push({ k: n.id + "|nodeOpacity", v: String(Math.round(o * 1000) / 1000) });
  }
}

/**
 * Returned compact deliberately: one short string per paint. A 20KB result truncates mid-JSON, and a
 * large file has thousands of paints, so scope with PAGES if this comes back truncated rather than
 * enriching the shape.
 */
return { nodesScanned: nodes, paints: out.length, baseline: out };
