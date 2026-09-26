#!/usr/bin/env node
/**
 * Draw the four models the checks already validate.
 *
 * `pica-systems-analyst` produces the TO-BE process, the domain model, the permissions matrix and
 * the state model "as validated data rather than pictures", and that is the right call: a picture
 * cannot be checked, and a hand-drawn one drifts while looking authoritative. But the data then
 * sat in `state.json` and nothing ever drew it, so the only readers were the checks. A model
 * nobody can see is a model nobody argues with.
 *
 * So the pictures are GENERATED, archify-style, the same way `scripts/flow-diagram.mjs` draws
 * pica's own chain: read the validated graph, lay it out, emit self-contained SVG. The diagram
 * cannot disagree with the model because it has no other source. Regenerate it and it is current;
 * there is no second copy to fall behind.
 *
 *   node model-diagram.mjs .pica/state.json --out docs/spec/diagrams [--only state|domain|process|permissions]
 *   node model-diagram.mjs .pica/state.json --svg state        write one SVG to stdout
 */

const CHECKS = ["model-diagram"];

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const file = args.find((a) => !a.startsWith("--")) || ".pica/state.json";
const OUT = arg("--out", "docs/spec/diagrams");
const ONLY = arg("--only", arg("--svg", ""));
const TO_STDOUT = args.includes("--svg");

let state;
try { state = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error(`model-diagram: cannot read ${file} — ${e.message}`); process.exit(1); }

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const arr = (v) => (Array.isArray(v) ? v : []);
const F = `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"`;

/* One palette, read from the project's own tokens when it has them: a diagram that invents its
 * own colours is a second design system nobody approved. */
const T = state.direction?.tokens || {};
const C = {
  bg:     "transparent",
  card:   T.surface   || "#ffffff",
  line:   T.border    || "#c9ccd1",
  ink:    T.ink       || "#16191d",
  muted:  T.inkMuted  || "#606670",
  accent: T.accent    || "#006399",
  warn:   T.attention || "#c0392b",
};

/** Wrap a label to `w` characters, at most `max` lines, the last one elided. */
function wrap(text, w, max = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length > w) { lines.push(cur.trim()); cur = word; }
    else cur = (cur + " " + word).trim();
    if (lines.length === max) break;
  }
  if (cur && lines.length < max) lines.push(cur.trim());
  if (!lines.length) lines.push("");   // never return an empty array: lines[0] became the
                                        // string "undefined" in a permissions cell
  if (lines.length === max && words.join(" ").length > lines.join(" ").length) {
    lines[max - 1] = lines[max - 1].replace(/.{1}$/, "…");
  }
  return lines;
}

/* ---- state lifecycle ------------------------------------------------------------------------
 * Nodes on a ring, edges as arcs, forbidden transitions drawn as what they are: the model records
 * them explicitly (`neverTransitions`) and a diagram that omits them loses the most expensive
 * thing the model knows. */
function stateDiagram(entity) {
  const states = arr(entity.states).map((s) => (typeof s === "string" ? { name: s } : s));
  if (!states.length) return null;
  const W = 980, H = 440, cx = 640, cy = H / 2 + 20, r = 148;
  const pos = new Map();
  states.forEach((s, i) => {
    const a = (-Math.PI / 2) + (i / states.length) * Math.PI * 2;
    pos.set(s.name, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  });
  /* Stop every edge at the node's edge, not at its centre. Drawn centre-to-centre, the arrowhead
   * lands UNDER the box that is painted over it afterwards — so a lifecycle diagram renders as a
   * web of undirected lines, which is the one thing a lifecycle diagram must not be. Found by
   * rendering it to PNG and looking; the SVG source had the marker on every path. */
  const BOX = { w: 108, h: 34 };
  const clip = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.min(Math.abs((BOX.w / 2 + 8) / (dx / len || 1e-6)), Math.abs((BOX.h / 2 + 8) / (dy / len || 1e-6)));
    return { x: to.x - (dx / len) * t, y: to.y - (dy / len) * t };
  };
  const L = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="${esc(entity.entity || entity.name)} lifecycle">`];
  L.push(`<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.line}"/></marker>
  <marker id="x" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.warn}"/></marker></defs>`);
  L.push(`<text x="20" y="30" font-size="15" font-weight="700" fill="${C.ink}">${esc(entity.entity || entity.name)}</text>`);
  L.push(`<text x="20" y="50" font-size="12" fill="${C.muted}">${states.length} trạng thái · ${arr(entity.neverTransitions).length} chuyển đổi bị cấm</text>`);

  for (const s of states) {
    const from = pos.get(s.name);
    for (const t of arr(s.to)) {
      const to = pos.get(t);
      if (!to || !from) continue;
      const a0 = clip(to, from), b0 = clip(from, to);
      const mx = (a0.x + b0.x) / 2 + (b0.y - a0.y) * 0.13;
      const my = (a0.y + b0.y) / 2 - (b0.x - a0.x) * 0.13;
      L.push(`<path data-edge="${esc(s.name)}|${esc(t)}" d="M${a0.x.toFixed(1)} ${a0.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b0.x.toFixed(1)} ${b0.y.toFixed(1)}" fill="none" stroke="${C.line}" stroke-width="1.4" marker-end="url(#a)" opacity=".85"/>`);
    }
  }
  /* Forbidden transitions are recorded as PROSE — "confirmed -> unconfirmed (revocation) — BR-07
   * makes confirmation terminal" — because the reason is the valuable half and an arrow cannot
   * carry it. So: draw the arrow when the sentence names two states this entity actually has, and
   * print every sentence in a panel regardless. Guessing a {from,to} shape the model never used
   * drew nothing at all while the legend cheerfully announced "1 chuyển đổi bị cấm". */
  const forbidden = arr(entity.neverTransitions).map((nt) => (typeof nt === "string" ? nt : `${nt.from || nt.state} -> ${nt.to}`));
  for (const line of forbidden) {
    const m = String(line).match(/([^->\n]+?)\s*(?:->|→)\s*([^\s(—]+)/);
    if (!m) continue;
    const from = pos.get(m[1].trim()), to = pos.get(m[2].trim());
    if (!from || !to) continue;
    const a0 = clip(to, from), b0 = clip(from, to);
    L.push(`<path d="M${a0.x.toFixed(1)} ${a0.y.toFixed(1)} L${b0.x.toFixed(1)} ${b0.y.toFixed(1)}" fill="none" stroke="${C.warn}" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#x)"/>`);
  }
  for (const s of states) {
    const p = pos.get(s.name);
    const label = wrap(s.name, 14, 2);
    const w = Math.max(88, label[0].length * 8 + 26), h = 20 + label.length * 15;
    L.push(`<g data-node="${esc(s.name)}" tabindex="0" role="button" aria-label="${esc(s.name)}">`);
    L.push(`<rect x="${(p.x - w / 2).toFixed(1)}" y="${(p.y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="6" fill="${C.card}" stroke="${C.line}"/>`);
    label.forEach((ln, i) =>
      L.push(`<text x="${p.x.toFixed(1)}" y="${(p.y - h / 2 + 15 + i * 15).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="${C.ink}">${esc(ln)}</text>`));
    L.push(`</g>`);
  }
  if (forbidden.length) {
    const px = 20, pw = 300;
    let py = 78;
    L.push(`<text x="${px}" y="${py}" font-size="12" font-weight="700" fill="${C.warn}">Không bao giờ xảy ra</text>`);
    py += 8;
    for (const line of forbidden) {
      for (const ln of wrap(line, 44, 4)) { py += 15; L.push(`<text x="${px}" y="${py}" font-size="11" fill="${C.muted}">${esc(ln)}</text>`); }
      py += 6;
    }
    L.push(`<line x1="${px}" y1="${px + 2}" x2="${px}" y2="${py - 4}" stroke="${C.warn}" stroke-width="0" />`);
  }
  L.push("</svg>");
  return L.join("\n");
}

/* ---- permissions matrix: role × object, every cell answered -------------------------------- */
function permissionsDiagram(rp) {
  const roles = Object.keys(rp || {});
  if (!roles.length) return null;
  const objects = [...new Set(roles.flatMap((r) => Object.keys(rp[r] || {})))];
  if (!objects.length) return null;
  const colW = 150, rowH = 34, left = 210, top = 96;
  const W = left + objects.length * colW + 24, H = top + roles.length * rowH + 50;
  const L = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Ma trận quyền">`];
  L.push(`<text x="20" y="30" font-size="15" font-weight="700" fill="${C.ink}">Ma trận quyền</text>`);
  L.push(`<text x="20" y="50" font-size="12" fill="${C.muted}">${roles.length} vai trò × ${objects.length} đối tượng — mọi ô phải có câu trả lời</text>`);
  objects.forEach((o, i) => {
    const x = left + i * colW + colW / 2;
    wrap(o, 17, 2).forEach((ln, k) =>
      L.push(`<text x="${x}" y="${top - 26 + k * 14}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.muted}">${esc(ln)}</text>`));
  });
  roles.forEach((r, ri) => {
    const y = top + ri * rowH;
    L.push(`<text x="20" y="${y + 21}" font-size="12" font-weight="600" fill="${C.ink}">${esc(wrap(r, 30, 1)[0])}</text>`);
    objects.forEach((o, ci) => {
      const x = left + ci * colW;
      const v = rp[r]?.[o];
      /* Three states, not two. A missing key is a question nobody answered; an empty string is
       * the answer "none", deliberately given. Drawing them the same way loses the distinction
       * the matrix exists to record — and it is the distinction that matters, because one is a
       * gap to chase and the other is a decision to respect. */
      const unanswered = v == null;
      const none = !unanswered && String(v).trim() === "";
      const txt = unanswered ? "?" : none ? "không có quyền" : Array.isArray(v) ? v.join(" ") : String(v);
      const empty = unanswered;
      L.push(`<rect x="${x + 4}" y="${y + 3}" width="${colW - 8}" height="${rowH - 6}" rx="5" fill="${empty ? "none" : C.card}" stroke="${empty ? C.warn : C.line}" ${empty ? 'stroke-dasharray="4 3"' : ""}/>`);
      L.push(`<text x="${x + colW / 2}" y="${y + 21}" text-anchor="middle" font-size="11" fill="${unanswered ? C.warn : none ? C.muted : C.ink}" font-style="${none ? "italic" : "normal"}">${esc(wrap(txt, 18, 1)[0])}</text>`);
    });
  });
  L.push(`<text x="20" y="${H - 16}" font-size="11" fill="${C.muted}">“?” viền đứt = chưa ai trả lời. “không có quyền” = đã trả lời, và câu trả lời là không. Hai thứ khác nhau.</text>`);
  L.push("</svg>");
  return L.join("\n");
}

/* ---- TO-BE process: lanes and nodes, drawn from the validated graph ------------------------ */
function processDiagram(toBe) {
  const nodes = arr(toBe?.nodes), edges = arr(toBe?.edges), lanes = arr(toBe?.lanes);
  if (!nodes.length) return null;
  /* A lane may be declared by name and referenced by id. Resolve BOTH, and never fall back to
   * lane 0 — `Math.max(0, indexOf(...))` put all twenty-three steps in the first lane and left
   * two lanes visibly empty, which reads as a process where one role does everything. An
   * unmatched lane gets its own band and says so, because a silent default is the defect. */
  const laneDefs = lanes.length
    ? lanes.map((l) => (typeof l === "string" ? { id: l, name: l } : { id: l.id ?? l.name, name: l.name ?? l.id }))
    : [...new Set(nodes.map((n) => n.lane).filter(Boolean))].map((x) => ({ id: x, name: x }));
  const laneNames = laneDefs.map((l) => l.name);
  const laneIndex = (v) => {
    const i = laneDefs.findIndex((l) => l.id === v || l.name === v);
    if (i >= 0) return i;
    laneDefs.push({ id: v ?? "(không khai báo)", name: `${v ?? "(không khai báo)"} — lane không có trong khai báo` });
    laneNames.push(laneDefs[laneDefs.length - 1].name);
    return laneDefs.length - 1;
  };
  /* Column = topological DEPTH, not position in the array. Giving every node its own column
   * turned a 23-step process into a 4570px horizontal ribbon in which nothing was parallel and
   * no branch rejoined — the layout said "23 things in a row" about a graph whose whole point is
   * that three roles act at the same time. Depth is the longest path from any start node, so
   * steps that happen at the same stage share a column and a branch visibly rejoins. */
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) if (incoming.has(e.to)) incoming.set(e.to, incoming.get(e.to) + 1);
  const order = new Map();
  const depth = (id, seen = new Set()) => {
    if (order.has(id)) return order.get(id);
    if (seen.has(id)) return 0;                       // a cycle: settle it at its first sighting
    seen.add(id);
    const ins = edges.filter((e) => e.to === id);
    const d = ins.length ? Math.max(...ins.map((e) => depth(e.from, seen) + 1)) : 0;
    order.set(id, d);
    return d;
  };
  for (const n of nodes) depth(n.id);
  let col = Math.max(0, ...order.values()) + 1;
  const colW = 190, laneH = 96, left = 170;
  const laneRows = new Map();
  const W = left + col * colW + 30;
  let H = 0;   // set once the lane heights are known, below
  const L = [];
  L.push(`<defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.line}"/></marker></defs>`);
  L.push(`<text x="20" y="30" font-size="15" font-weight="700" fill="${C.ink}">Quy trình TO-BE${toBe?.notation ? ` · ${esc(toBe.notation)}` : ""}</text>`);
  L.push(`<text x="20" y="50" font-size="12" fill="${C.muted}">${nodes.length} bước qua ${laneNames.length} vai trò</text>`);
  const pos = new Map();
  const laneBands = [];
  /* Two nodes at the same depth in the same lane would draw on top of each other, so they stack
   * and the lane grows to fit. A lane whose height is fixed while its content is not is how a
   * diagram comes to hide a step entirely. */
  const slot = new Map();
  for (const n of nodes) {
    const li = laneIndex(n.lane);
    const key = `${li}:${order.get(n.id)}`;
    const k = slot.get(key) || 0;
    slot.set(key, k + 1);
    laneRows.set(li, Math.max(laneRows.get(li) || 1, k + 1));
  }
  const laneTop = new Map();
  let acc = 80;
  laneNames.forEach((_, li) => { laneTop.set(li, acc); acc += (laneRows.get(li) || 1) * 78 + 18; });
  const slot2 = new Map();
  for (const n of nodes) {
    const li = laneIndex(n.lane);
    const key = `${li}:${order.get(n.id)}`;
    const k = slot2.get(key) || 0; slot2.set(key, k + 1);
    const x = left + order.get(n.id) * colW, y = laneTop.get(li) + 34 + k * 78;
    pos.set(n.id, { x: x + 78, y });
    const gateway = /gateway|decision|xor/i.test(n.type || "");
    const label = wrap(n.name || n.id, 20, 2);
    /* `data-node` and `data-edge` are what turn a drawing into a graph a reader can interrogate:
     * focus one step and everything not connected to it dims, so a 23-step process across three
     * roles can be read one question at a time instead of all at once. Archify's own lesson, and
     * the half that was skipped the first time — generating the SVG was the easy part. */
    L.push(`<g data-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.name || n.id)}">`);
    if (gateway) {
      L.push(`<path d="M${x + 78} ${y - 26} L${x + 112} ${y} L${x + 78} ${y + 26} L${x + 44} ${y} z" fill="${C.card}" stroke="${C.accent}" stroke-width="1.4"/>`);
    } else {
      L.push(`<rect x="${x + 16}" y="${y - 26}" width="124" height="52" rx="7" fill="${C.card}" stroke="${C.line}"/>`);
    }
    label.forEach((l2, i) =>
      L.push(`<text x="${x + 78}" y="${y - 4 + i * 14 + (label.length === 1 ? 5 : 0)}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.ink}">${esc(l2)}</text>`));
    L.push(`</g>`);
  }
  for (const e of edges) {
    const a = pos.get(e.from), b = pos.get(e.to);
    if (!a || !b) continue;
    const mid = (a.x + b.x) / 2;
    L.push(`<path data-edge="${esc(e.from)}|${esc(e.to)}" d="M${a.x + 62} ${a.y} C${mid} ${a.y} ${mid} ${b.y} ${b.x - 62} ${b.y}" fill="none" stroke="${C.line}" stroke-width="1.4" marker-end="url(#pa)"/>`);
  }
  /* The canvas is sized AFTER the lanes are measured, not before. A height guessed from
   * `lanes.length * 96` clipped every lane that had to stack, and the clipped part looked like it
   * did not exist. */
  H = acc + 24;
  laneNames.forEach((ln, li) => {
    const y = laneTop.get(li) - 12, h = (laneRows.get(li) || 1) * 78 + 18;
    laneBands.push(`<rect x="0" y="${y}" width="${W}" height="${h}" fill="${li % 2 ? "rgba(0,0,0,.025)" : "none"}"/>`);
    laneBands.push(`<text x="20" y="${y + 22}" font-size="12" font-weight="700" fill="${C.muted}">${esc(wrap(ln, 20, 1)[0])}</text>`);
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Quy trình TO-BE">`,
    L[0], L[1], L[2],          // defs and the two title lines
    ...laneBands,              // bands behind everything
    ...L.slice(3),
    "</svg>",
  ].join("\n");
}

const built = {};
for (const e of arr(state.stateModel)) {
  const svg = stateDiagram(e);
  if (svg) built[`state-${String(e.entity || e.name).replace(/\W+/g, "-").toLowerCase()}`] = svg;
}
const perm = permissionsDiagram(state.rolesPermissions); if (perm) built["permissions"] = perm;
const proc = processDiagram(state.toBe);                 if (proc) built["process"] = proc;

if (TO_STDOUT) {
  const key = Object.keys(built).find((k) => k.includes(ONLY)) || Object.keys(built)[0];
  if (!key) { console.error("model-diagram: nothing to draw"); process.exit(1); }
  process.stdout.write(built[key]);
  process.exit(0);
}
if (!Object.keys(built).length) {
  console.log("model-diagram: SKIPPED — state carries no stateModel, rolesPermissions or toBe to draw. This is not a pass.");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(built)) writeFileSync(join(OUT, `${name}.svg`), svg + "\n");
console.log(`model-diagram: wrote ${Object.keys(built).length} diagram(s) to ${OUT} — ${Object.keys(built).join(", ")}`);
