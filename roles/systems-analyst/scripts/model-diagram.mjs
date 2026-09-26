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

/* The reader's own language, from the project's own glossary.
 *
 * Every diagram drew `work item`, `assignee`, `unconfirmed`, `r`, `cru` — English nouns and CRUD
 * letters — inside a Vietnamese document, for a reader who knows the business and not the
 * notation. The translations were already in `state.glossary` (`term` → `vi`) and no diagram had
 * ever looked at them. A permissions matrix reading `cru` with no key anywhere on the page is not
 * a dense notation, it is an unanswered question printed twenty times.
 *
 * The English stays in brackets where a developer will need it, because both readers exist. */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const arr = (v) => (Array.isArray(v) ? v : []);
const F = `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"`;

/* One palette, read from the project's own tokens when it has them: a diagram that invents its
 * own colours is a second design system nobody approved. */
const GLOSS = new Map(arr(state.glossary).filter((g) => g.vi).map((g) => [String(g.term).toLowerCase(), g.vi]));
const vi = (t) => {
  /* Exact match only. Substring replacement produced half-Vietnamese field names — "confirmed at"
   * became "đã xác nhận at", "project memberships" became "dự án memberships" — which is worse
   * than leaving them English: a reader cannot tell whether it is a term they do not know or a
   * translation that broke. A field name is a field name; the ENTITY carries the translation. */
  const raw = String(t ?? "").trim();
  return GLOSS.get(raw.toLowerCase()) ?? raw;
};
/* CRUD letters, written out. `c r u d` is four words a reader already has. */
const CRUD = { c: "tạo", r: "xem", u: "sửa", d: "xoá" };
const crud = (v) => {
  const t = String(v ?? "").trim();
  if (!t) return "";
  if (!/^[crud]+$/i.test(t)) return t;
  return t.toLowerCase().split("").map((ch) => CRUD[ch]).filter(Boolean).join(" · ");
};

const T = state.direction?.tokens || {};
/* Every colour is a CSS variable with the light value as its fallback.
 *
 * An SVG generated with baked-in hex is a light-mode drawing wherever it is pasted. Inlined into
 * a page that had switched to dark, these diagrams kept painting #16191d text on #ffffff cards —
 * which the dark figure background then rendered as near-black on near-black. The page was
 * correct, every check passed, and not one diagram was readable.
 *
 * `var()` works in a presentation attribute only when the SVG is INLINE in the document, which is
 * exactly how the spec page carries it. Opened on its own as a file, nothing defines the
 * variables and the fallback applies, so the standalone .svg stays a correct light drawing. The
 * host page overrides --fig-* under its own dark block; it does not have to know these names
 * beyond that. */
const v = (name, fallback) => `var(--fig-${name}, ${fallback})`;
const C = {
  bg:     "transparent",
  card:   v("card",   T.surface   || "#ffffff"),
  line:   v("line",   T.border    || "#c9ccd1"),
  ink:    v("ink",    T.ink       || "#16191d"),
  muted:  v("muted",  T.inkMuted  || "#606670"),
  accent: v("accent", T.accent    || "#006399"),
  warn:   v("warn",   T.attention || "#c0392b"),
  band:   v("band",   "rgba(0,0,0,.028)"),   // the alternating swimlane stripe
  own:    v("own",    "#eaf2f8"),            // an entity this system owns
  head:   v("head",   "#f2f1ef"),            // the title strip of one it only mirrors
  /* Ink that sits ON the accent, not beside it. White works on a dark blue and fails on a light
   * one — and the accent flips between the two with the theme, so a fixed #fff is a contrast
   * failure waiting for the reader to switch. It is a token for the same reason the accent is. */
  onAccent:  v("on-accent",  "#ffffff"),
  onAccent2: v("on-accent-2", "rgba(255,255,255,.78)"),
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
  L.push(`<text x="20" y="30" font-size="15" font-weight="700" fill="${C.ink}">${esc(vi(entity.entity || entity.name))}</text>`);
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
    const label = wrap(vi(s.name), 14, 2);
    const w = Math.max(88, label[0].length * 8 + 26), h = 20 + label.length * 15;
    L.push(`<g data-node="${esc(s.name)}" tabindex="0" role="button" aria-label="${esc(vi(s.name))}">`);
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
    wrap(vi(o), 17, 2).forEach((ln, k) =>
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
      const txt = unanswered ? "?" : none ? "không có quyền" : crud(Array.isArray(v) ? v.join("") : v);
      const empty = unanswered;
      L.push(`<rect x="${x + 4}" y="${y + 3}" width="${colW - 8}" height="${rowH - 6}" rx="5" fill="${empty ? "none" : C.card}" stroke="${empty ? C.warn : C.line}" ${empty ? 'stroke-dasharray="4 3"' : ""}/>`);
      L.push(`<text x="${x + colW / 2}" y="${y + 21}" text-anchor="middle" font-size="11" fill="${unanswered ? C.warn : none ? C.muted : C.ink}" font-style="${none ? "italic" : "normal"}">${esc(wrap(txt, 18, 1)[0])}</text>`);
    });
  });
  L.push(`<text x="20" y="${H - 16}" font-size="11" fill="${C.muted}">“?” viền đứt = chưa ai trả lời. “không có quyền” = đã trả lời, và câu trả lời là không.</text>`);
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
  /* VERTICAL. A swimlane diagram is drawn horizontally by convention, and the convention assumes
   * paper that is wider than it is tall. A web page is the opposite: it has one short axis and one
   * unbounded one. Drawn sideways, a 23-step process is either cut off, scrolled sideways (which
   * the reader will not do) or scaled down until the labels are unreadable — which is what
   * happened: the figure was placed, and nobody could read a word of it.
   *
   * So the lanes are COLUMNS and the process runs DOWN the page. Width stays inside the column,
   * height grows into the axis the page already has. The rule generalises: draw a diagram along
   * the page's long axis, not along the tradition's. */
  const outs = new Map();
  const labelledOuts = new Map();
  for (const e of edges) {
    outs.set(e.from, (outs.get(e.from) || 0) + 1);
    if (String(e.label ?? e.condition ?? "").trim()) labelledOuts.set(e.from, (labelledOuts.get(e.from) || 0) + 1);
  }
  /* A node with two ways out is not automatically a decision. Two unlabelled edges leaving a step
   * mean both things happen — parallel work, and drawing a diamond there tells the reader to
   * choose when nobody chooses. What makes it a choice is that the branches are NAMED: "có" and
   * "không" are the conditions under which each is taken.
   *
   * The first version of this read "more than one edge out" and turned six nodes into diamonds
   * where three were real. Labelled branches, or a declared type, and nothing else. */
  const isGateway = (n) => /gateway|decision|xor/i.test(n.type || "") || (labelledOuts.get(n.id) || 0) > 1;

  /* Start and end are likewise facts about the graph: nothing arrives, or nothing leaves. A reader
   * who cannot see where a process begins has to find it by elimination. */
  const hasIn = new Set(edges.map((e) => e.to));
  const hasOut = new Set(edges.map((e) => e.from));

  /* Two branches get their labels on the curves, where the eye already is. THREE OR MORE DO NOT.
   *
   * Four branches leaving one diamond reconverge within a hundred pixels, so four labels on four
   * curves collide however they are staggered — and pushing them apart moves each one away from
   * the curve it belongs to, until one ends up below a step three rows further down and appears
   * to label that. No placement rule fixes a fork that crowded; the drawing is the wrong shape
   * for it.
   *
   * So a fork of three or more gets a legend under the diamond: one line per branch, the condition
   * and the number of the step it leads to. It always fits, it never collides, and a reader can
   * check the branches against each other instead of chasing four curves. */
  const LEGEND_AT = 3;
  const legendNodes = new Set([...labelledOuts.entries()].filter(([, n]) => n >= LEGEND_AT).map(([id]) => id));

  /* Steps are numbered by the order a reader meets them: down the page, then across the lanes.
   * Without a number the only way to say "this step" out loud is to read its whole label. */
  const seq = new Map();
  [...nodes]
    .sort((a, b) => (order.get(a.id) - order.get(b.id)) || (laneIndex(a.lane) - laneIndex(b.lane)))
    .forEach((n, i) => seq.set(n.id, i + 1));

  const stages = Math.max(0, ...order.values()) + 1;
  const nodeW = 142, nodeH = 54, rowH = 96, left = 16, topPad = 96;
  /* A lane is capped at TWO columns. Laying every simultaneous step side by side made the drawing
   * 1538px wide, which the page then scaled to 60% and the labels became unreadable — the same
   * failure as drawing it sideways, arrived at from the other direction. Width is the scarce axis;
   * height is not. So the third and later step in one cell drops to a half-row below. */
  const MAXCOL = 2;

  // how many nodes share one (lane, stage) cell — that decides how wide the lane must be
  const cell = new Map();
  for (const n of nodes) {
    const k = `${laneIndex(n.lane)}:${order.get(n.id)}`;
    cell.set(k, (cell.get(k) || 0) + 1);
  }
  const laneCols = laneNames.map((_, li) =>
    Math.min(MAXCOL, Math.max(1, ...[...cell.entries()].filter(([k]) => k.startsWith(`${li}:`)).map(([, v]) => v))));
  // a cell that overflows its columns needs vertical room, so the stage it sits in grows
  const stageRows = new Array(stages).fill(1);
  for (const [k, v] of cell) {
    const d = Number(k.split(":")[1]);
    stageRows[d] = Math.max(stageRows[d], Math.ceil(v / MAXCOL));
  }
  // a stage holding a legend needs room for it, or the legend lands on the next row of steps
  const stageLegend = new Array(stages).fill(0);
  for (const id of legendNodes) {
    const d = order.get(id);
    if (d !== undefined) stageLegend[d] = Math.max(stageLegend[d], (labelledOuts.get(id) || 0) * 16 + 14);
  }
  const stageY = [];
  let ay0 = topPad + 30;
  stageRows.forEach((r, d) => { stageY[d] = ay0; ay0 += (r - 1) * (rowH * 0.62) + rowH + stageLegend[d]; });
  const laneX = [];
  let ax = left;
  laneCols.forEach((c, li) => { laneX[li] = ax; ax += c * nodeW + 28; });
  const W = ax + left;
  const H = ay0 + 20;

  const L = [];
  L.push(`<defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.line}"/></marker></defs>`);
  L.push(`<text x="${left}" y="30" font-size="15" font-weight="700" fill="${C.ink}">Quy trình TO-BE${toBe?.notation ? ` · ${esc(toBe.notation)}` : ""}</text>`);
  L.push(`<text x="${left}" y="50" font-size="12" fill="${C.muted}">${nodes.length} bước qua ${laneNames.length} vai trò · đọc từ trên xuống</text>`);

  const laneBands = [];
  laneNames.forEach((ln, li) => {
    const w = laneCols[li] * nodeW + 16;
    laneBands.push(`<rect x="${laneX[li] - 8}" y="${topPad - 34}" width="${w}" height="${H - topPad + 22}" rx="10" fill="${li % 2 ? C.band : "none"}"/>`);
    wrap(ln, Math.floor(w / 7.2), 2).forEach((t, k) =>
      laneBands.push(`<text x="${laneX[li] + w / 2 - 8}" y="${topPad - 14 + k * 14}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.muted}">${esc(t)}</text>`));
  });

  /* A decision is a node with more than one way out — that is what makes it a decision, and it is
   * true whether or not anybody set `type: "gateway"` on it. On one project not a single node
   * carried a type, so every diamond in a 23-step process was drawn as a plain box and the reader
   * had no way to see where the process branched. Read the shape from the graph, and treat the
   * declared type as confirmation rather than as the only evidence. */
  const pos = new Map();
  const used = new Map();
  for (const n of nodes) {
    const li = laneIndex(n.lane), d = order.get(n.id);
    const k = used.get(`${li}:${d}`) || 0; used.set(`${li}:${d}`, k + 1);
    const cx = laneX[li] + (k % laneCols[li]) * nodeW + nodeW / 2 - 4;
    const cy = stageY[d] + Math.floor(k / laneCols[li]) * (rowH * 0.62);
    pos.set(n.id, { x: cx, y: cy });
    const gateway = isGateway(n);
    const start = !hasIn.has(n.id), end = !hasOut.has(n.id);
    // a vertical box is wider than a horizontal one was, so three lines of 22 chars fit and the
    // mid-word truncation that made every label end in "…" disappears
    const label = wrap(n.name || n.id, 21, 3);
    L.push(`<g data-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(seq.get(n.id))}. ${esc(n.name || n.id)}${gateway ? " (điểm rẽ)" : ""}">`);
    const w2 = nodeW / 2 - 8, h2 = nodeH / 2;
    if (gateway) {
      L.push(`<path d="M${cx} ${cy - h2 - 5} L${cx + w2} ${cy} L${cx} ${cy + h2 + 5} L${cx - w2} ${cy} z" fill="${C.card}" stroke="${C.accent}" stroke-width="1.5"/>`);
    } else {
      // a start and an end are pills; everything between them is a rectangle. Shape alone tells
      // the reader where to put their finger down and where the process is finished.
      const r = start || end ? h2 : 7;
      L.push(`<rect x="${cx - w2}" y="${cy - h2}" width="${w2 * 2}" height="${nodeH}" rx="${r}" fill="${C.card}" stroke="${start || end ? C.accent : C.line}" stroke-width="${start || end ? 1.5 : 1}"/>`);
    }
    const y0 = cy - (label.length - 1) * 6.5 + 4;
    label.forEach((l2, i) =>
      L.push(`<text x="${cx}" y="${y0 + i * 13}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.ink}">${esc(l2)}</text>`));
    // the number sits outside the shape so it never competes with the label for room
    L.push(`<circle cx="${cx - w2}" cy="${cy - h2 + 2}" r="9" fill="${C.accent}"/>`);
    L.push(`<text x="${cx - w2}" y="${cy - h2 + 5.5}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.onAccent}">${seq.get(n.id)}</text>`);
    L.push(`</g>`);
  }

  /* THE BRANCH LABELS. Eight edges carried `label: "co"` / `"khong"` and not one was drawn. The
   * reader saw a decision with two arrows leaving it and nothing to say which was yes — which is
   * the single thing a decision exists to communicate. The data had the answer the whole time.
   *
   * Only branches are labelled. Putting a label on every edge, including the twenty that just say
   * "then", is how a diagram turns back into a wall of text. */
  const branchLabel = (e) => {
    const t = String(e.label ?? e.condition ?? e.name ?? "").trim();
    if (!t || (labelledOuts.get(e.from) || 0) < 2 || legendNodes.has(e.from)) return "";
    return vi(t) || t;
  };

  const branchLabels = [];
  for (const e of edges) {
    const a = pos.get(e.from), b = pos.get(e.to);
    if (!a || !b) continue;
    const ay = a.y + nodeH / 2 + 2, by = b.y - nodeH / 2 - 2;
    // an edge that goes UP (a loop back) leaves and re-enters from the side, so it never runs
    // through the boxes between them
    if (by < ay) {
      const side = Math.max(a.x, b.x) + nodeW / 2 - 4;
      L.push(`<path data-edge="${esc(e.from)}|${esc(e.to)}" d="M${a.x + nodeW / 2 - 10} ${a.y} C${side + 24} ${a.y} ${side + 24} ${b.y} ${b.x + nodeW / 2 - 10} ${b.y}" fill="none" stroke="${C.line}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#pa)"/>`);
      continue;
    }
    const mid = (ay + by) / 2;
    L.push(`<path data-edge="${esc(e.from)}|${esc(e.to)}" d="M${a.x} ${ay} C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${by}" fill="none" stroke="${C.line}" stroke-width="1.4" marker-end="url(#pa)"/>`);
    const lab = branchLabel(e);
    if (lab) {
      /* Put the label ON its own curve, and stagger the siblings.
       *
       * Placing every branch of one decision at the same fraction of its curve stacked them: at a
       * three-way fork the three labels landed within a few pixels of each other and read as one
       * line of gibberish. They have to be evaluated on the actual Bézier — the curve is what the
       * reader's eye follows — and each sibling pushed a little further along than the last, so
       * they separate exactly where the branches themselves separate.  */
      const sibs = edges.filter((x) => x.from === e.from && branchLabel(x));
      const i = sibs.indexOf(e);
      const t = Math.min(0.72, 0.34 + i * 0.13);
      const u = 1 - t;
      const lx = a.x * (u * u * u + 3 * u * u * t) + b.x * (3 * u * t * t + t * t * t);
      const ly = ay * u * u * u + mid * 3 * u * u * t + mid * 3 * u * t * t + by * t * t * t;
      branchLabels.push({ from: e.from, to: e.to, text: lab, x: lx, y: ly, w: lab.length * 6.1 + 14, h: 19 });
    }
  }

  /* Then separate them, here, where the coordinates are.
   *
   * Staggering the siblings along their curves was not enough: at a four-way fork the branches
   * converge again within a hundred pixels and three of the four labels still overlapped, plus two
   * landed on top of a step box. Guessing a placement rule and hoping is not a method when the
   * generator already knows every rectangle on the canvas. So: lay them out, then push apart until
   * nothing intersects anything — the other labels, and the steps themselves.
   *
   * Twenty passes, moving the lower one down by half the overlap each time. It converges because
   * every move strictly reduces the total overlap, and if it somehow did not, a label slightly out
   * of place beats a hang. */
  const obstacles = [...pos.entries()].map(([, q]) => ({ x: q.x, y: q.y, w: nodeW - 14, h: nodeH + 14 }));
  for (const id of legendNodes) {
    const q = pos.get(id);
    if (q) obstacles.push({ x: q.x, y: q.y + nodeH / 2 + 14 + ((labelledOuts.get(id) || 0) * 16 + 10) / 2, w: nodeW, h: (labelledOuts.get(id) || 0) * 16 + 14 });
  }
  const hits = (a, b) =>
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < branchLabels.length; i++) {
      const a = branchLabels[i];
      for (const b of [...branchLabels.slice(0, i), ...obstacles]) {
        if (!hits(a, b)) continue;
        a.y += ((a.h + b.h) / 2 - Math.abs(a.y - b.y)) / 2 + 1.5;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const id of legendNodes) {
    const q = pos.get(id);
    if (!q) continue;
    const rows = edges.filter((e) => e.from === id && String(e.label ?? e.condition ?? "").trim())
      .map((e) => ({ t: vi(String(e.label ?? e.condition).trim()) || String(e.label ?? e.condition).trim(), n: seq.get(e.to), to: e.to }))
      .sort((a, b) => a.n - b.n);
    const lw = Math.max(...rows.map((r) => r.t.length)) * 6.1 + 60;
    const lx = Math.max(12, Math.min(W - lw - 12, q.x - lw / 2));
    const ly = q.y + nodeH / 2 + 14;
    L.push(`<g data-legend="${esc(id)}">`);
    L.push(`<rect x="${lx}" y="${ly}" width="${lw}" height="${rows.length * 16 + 10}" rx="8" fill="${C.card}" stroke="${C.accent}" stroke-width=".9"/>`);
    rows.forEach((r, i) => {
      const y = ly + 18 + i * 16;
      L.push(`<text x="${lx + 11}" y="${y}" font-size="10.5" fill="${C.muted}">→</text>`);
      // the step number is right-aligned in its own column, so a two-digit number does not run
      // into the condition beside it
      L.push(`<text x="${lx + 40}" y="${y}" text-anchor="end" font-size="10.5" font-weight="700" fill="${C.accent}">${r.n}</text>`);
      L.push(`<text x="${lx + 48}" y="${y}" font-size="10.5" fill="${C.ink}">${esc(r.t)}</text>`);
    });
    L.push(`</g>`);
  }

  for (const b of branchLabels) {
    L.push(`<g data-branch="${esc(b.from)}|${esc(b.to)}">`);
    L.push(`<rect x="${b.x - b.w / 2}" y="${b.y - b.h / 2}" width="${b.w}" height="${b.h}" rx="9.5" fill="${C.card}" stroke="${C.accent}" stroke-width=".9"/>`);
    L.push(`<text x="${b.x}" y="${b.y + 4}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${C.ink}">${esc(b.text)}</text>`);
    L.push(`</g>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Quy trình TO-BE">`,
    L[0], L[1], L[2],          // defs and the two title lines
    ...laneBands,              // bands behind everything
    ...L.slice(3),
    "</svg>",
  ].join("\n");
}


/* ---- entity relationship diagram ------------------------------------------------------------
 * Crow's foot notation, which is what a BA hands over and what a developer expects to receive:
 * a dash for one, a crow's foot for many, a circle for optional. The first version invented its
 * own `0..1` boxes floating on the line — a notation with an audience of one — and ran every line
 * centre to centre so they crossed in the middle of the drawing.
 *
 * Published practice for making one readable is short: space the entities, minimise crossings,
 * and put a VERB on the line. "belongs to one project" is the sentence a person who knows the
 * business can confirm or correct; an unlabelled line between two boxes is not.
 *
 * Layout is fixed to four quadrants rather than computed, because with this many entities a
 * chosen layout beats a generic one: the two ends of every relationship end up adjacent, and only
 * one line is diagonal.
 */
function erdDiagram(entities) {
  if (!entities.length) return null;
  const W = 900, boxW = 300, gapX = 180, gapY = 96;
  const owned = (e) => /owned here|worklog|app này/i.test(String(e.owner || ""));

  // Owned entity last: it is the one the reader should end on, and putting it bottom-right keeps
  // its two relationships adjacent to their targets.
  const ordered = [...entities].sort((a, b) => Number(owned(a)) - Number(owned(b)));
  const heights = ordered.map((e) => 54 + Math.min(arr(e.attributes).length, 6) * 15 + (arr(e.attributes).length > 6 ? 16 : 0));
  const rowH = Math.max(...heights);
  const pos = new Map();
  ordered.forEach((e, i) => {
    const c = i % 2, r = Math.floor(i / 2);
    pos.set(e.entity, { x: 40 + c * (boxW + gapX), y: 86 + r * (rowH + gapY), w: boxW, h: heights[i] });
  });
  const H = 86 + Math.ceil(ordered.length / 2) * (rowH + gapY) + 30;

  const target = (txt) => {
    const t = String(txt).toLowerCase();
    return ordered.map((e) => e.entity).find((n) => t.includes(String(n).toLowerCase()));
  };
  /* The sentence says the cardinality; the symbol draws it. */
  const kind = (txt) => {
    const t = String(txt).toLowerCase();
    const many = /more|nhiều|\*/.test(t);
    const optional = /zero|không|no\b/.test(t);
    return { many, optional };
  };
  /* The verb, taken from the front of the sentence: "belongs to one project" → "belongs to". */
  const VERB = {
    "belongs to": "thuộc về", "assigned to": "được giao cho", "has": "có",
    "referenced by": "được tham chiếu bởi", "references exactly": "tham chiếu đúng",
    "member of": "là thành viên của", "references": "tham chiếu",
  };
  const verb = (txt) => {
    const v = String(txt).replace(/\s*(zero or one|zero or more|one or more|one|many|nhiều|một)\s.*$/i, "").trim();
    return VERB[v.toLowerCase()] || v;
  };

  /* Crow's foot, drawn at the target end of a line. */
  const foot = (x, y, dx, dy, k) => {
    const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;                                   // perpendicular
    const out = [];
    const tipX = x, tipY = y;
    if (k.many) {
      const bx = tipX - ux * 13, by = tipY - uy * 13;
      out.push(`<path d="M${tipX.toFixed(1)} ${tipY.toFixed(1)} L${(bx + px * 7).toFixed(1)} ${(by + py * 7).toFixed(1)} M${tipX.toFixed(1)} ${tipY.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} M${tipX.toFixed(1)} ${tipY.toFixed(1)} L${(bx - px * 7).toFixed(1)} ${(by - py * 7).toFixed(1)}" stroke="${C.ink}" stroke-width="1.3" fill="none"/>`);
    } else {
      const bx = tipX - ux * 13, by = tipY - uy * 13;
      out.push(`<path d="M${(bx + px * 6).toFixed(1)} ${(by + py * 6).toFixed(1)} L${(bx - px * 6).toFixed(1)} ${(by - py * 6).toFixed(1)}" stroke="${C.ink}" stroke-width="1.3"/>`);
    }
    if (k.optional) {
      const cx = tipX - ux * 21, cy = tipY - uy * 21;
      out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${C.card}" stroke="${C.ink}" stroke-width="1.3"/>`);
    }
    return out.join("");
  };
  /* Meet the box on its nearest edge, so no line runs through a neighbour. */
  const edge = (b, tx, ty) => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) / b.w > Math.abs(dy) / b.h) {
      return { x: dx > 0 ? b.x + b.w : b.x, y: cy };
    }
    return { x: cx, y: dy > 0 ? b.y + b.h : b.y };
  };

  const L = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Mô hình dữ liệu">`];
  L.push(`<text x="40" y="34" font-size="15" font-weight="700" fill="${C.ink}">Dữ liệu và quan hệ</text>`);
  L.push(`<text x="40" y="54" font-size="12" fill="${C.muted}">Gạch ngang = một · chân quạ = nhiều · vòng tròn = có thể không có. Chỉ ${ordered.filter(owned).length} trong ${ordered.length} thực thể do app này sở hữu.</text>`);

  const drawn = new Set();
  for (const e of ordered) {
    const a = pos.get(e.entity); if (!a) continue;
    for (const rel of arr(e.relationships)) {
      const to = target(rel); if (!to || to === e.entity) continue;
      const b = pos.get(to); if (!b) continue;
      const key = [e.entity, to].sort().join("|");
      if (drawn.has(key)) continue;
      drawn.add(key);
      const p1 = edge(a, b.x + b.w / 2, b.y + b.h / 2);
      const p2 = edge(b, a.x + a.w / 2, a.y + a.h / 2);
      /* A diagonal bows away from the middle. Five relationships between four entities cannot be
       * drawn on a grid without a crossing — published practice says minimise, not eliminate —
       * but two straight diagonals overlap along their shared centre, while two arcs bowing
       * opposite ways cross once, cleanly, at a visible angle. */
      const diag = Math.abs(p1.x - p2.x) > 20 && Math.abs(p1.y - p2.y) > 20;
      const bow = diag ? (p1.x < p2.x ? 1 : -1) * 54 : 0;
      const mx0 = (p1.x + p2.x) / 2 + bow, my0 = (p1.y + p2.y) / 2 - bow * 0.35;
      L.push(`<path d="M${p1.x} ${p1.y} ${diag ? `Q${mx0.toFixed(0)} ${my0.toFixed(0)} ` : "L"}${p2.x} ${p2.y}" stroke="${C.line}" stroke-width="1.3" fill="none"/>`);
      L.push(foot(p2.x, p2.y, p2.x - p1.x, p2.y - p1.y, kind(rel)));
      L.push(foot(p1.x, p1.y, p1.x - p2.x, p1.y - p2.y, { many: false, optional: false }));
      const v = verb(rel);
      if (v) {
        const mx = diag ? (p1.x + p2.x) / 2 + bow * 0.5 : (p1.x + p2.x) / 2;
        const my = diag ? (p1.y + p2.y) / 2 - bow * 0.18 : (p1.y + p2.y) / 2;
        const t = v.slice(0, 26);
        L.push(`<rect x="${mx - t.length * 3.1 - 6}" y="${my - 9}" width="${t.length * 6.2 + 12}" height="18" rx="4" fill="${C.card}"/>`);
        L.push(`<text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="10.5" fill="${C.muted}">${esc(t)}</text>`);
      }
    }
  }
  for (const e of ordered) {
    const b = pos.get(e.entity); if (!b) continue;
    const own = owned(e);
    L.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${own ? C.own : C.card}" stroke="${own ? C.accent : C.line}" stroke-width="${own ? 1.8 : 1.2}"/>`);
    L.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="30" rx="6" fill="${own ? C.accent : C.head}"/>`);
    L.push(`<rect x="${b.x}" y="${b.y + 22}" width="${b.w}" height="8" fill="${own ? C.accent : C.head}"/>`);
    L.push(`<text x="${b.x + 12}" y="${b.y + 20}" font-size="12.5" font-weight="700" fill="${own ? C.onAccent : C.ink}">${esc(vi(e.entity))}</text>`);
    L.push(`<text x="${b.x + b.w - 12}" y="${b.y + 20}" text-anchor="end" font-size="9.5" fill="${own ? C.onAccent2 : C.muted}" font-family="ui-monospace,Menlo,monospace">${esc(e.entity)}</text>`);
    arr(e.attributes).slice(0, 6).forEach((a, i) => {
      const nm = vi(typeof a === "string" ? a : (a.name || ""));
      L.push(`<text x="${b.x + 12}" y="${b.y + 48 + i * 15}" font-size="10.5" fill="${C.muted}">${esc(String(nm).slice(0, 36))}</text>`);
    });
    if (arr(e.attributes).length > 6) {
      L.push(`<text x="${b.x + 12}" y="${b.y + 48 + 6 * 15}" font-size="10" fill="${C.muted}">+${arr(e.attributes).length - 6} trường nữa</text>`);
    }
  }
  L.push("</svg>");
  return L.join("\n");
}

/* ---- use case diagram -----------------------------------------------------------------------
 * "Interactions between users and the system", the second model BABOK names. A reader who knows
 * the business reads this one first: it is the only picture that answers "what can each person
 * actually do", and it answers it without a word of notation.
 */
function useCaseDiagram(useCases) {
  const real = useCases.filter((u) => !/INT|SYS/.test(String(u.id)));
  if (!real.length) return null;
  const human = (a) => !/hệ thống|system|8project|tiến trình/i.test(String(a));
  const actors = [...new Set(real.flatMap((u) => arr(u.actors).filter(human)))];
  if (!actors.length) return null;
  const byActor = actors.map((a) => ({ actor: a, ucs: real.filter((u) => arr(u.actors).includes(a)) }));
  const W = 900, ucW = 340, rowH = 44;
  const total = byActor.reduce((n, g) => n + g.ucs.length, 0);
  const H = 84 + total * rowH + byActor.length * 26 + 30;
  const L = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Mô hình use case">`];
  L.push(`<text x="30" y="34" font-size="15" font-weight="700" fill="${C.ink}">Ai làm được gì</text>`);
  L.push(`<text x="30" y="54" font-size="12" fill="${C.muted}">${actors.length} vai · ${real.length} việc họ làm được. Mỗi đường là một quyền, không phải một màn hình.</text>`);
  let y = 86;
  for (const g of byActor) {
    const ay = y + (g.ucs.length * rowH) / 2 - 6;
    L.push(`<circle cx="60" cy="${ay - 16}" r="9" fill="none" stroke="${C.accent}" stroke-width="1.6"/>`);
    L.push(`<path d="M60 ${ay - 7} L60 ${ay + 10} M51 ${ay} L69 ${ay} M60 ${ay + 10} L52 ${ay + 21} M60 ${ay + 10} L68 ${ay + 21}" stroke="${C.accent}" stroke-width="1.6" fill="none"/>`);
    L.push(`<text x="60" y="${ay + 38}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.ink}">${esc(wrap(g.actor, 16, 1)[0])}</text>`);
    g.ucs.forEach((u, i) => {
      const uy = y + i * rowH;
      L.push(`<path d="M78 ${ay} C150 ${ay} 150 ${uy + 15} 230 ${uy + 15}" stroke="${C.line}" stroke-width="1.2" fill="none"/>`);
      L.push(`<g data-node="${esc(u.id)}" tabindex="0" role="button" aria-label="${esc(u.name)}">`);
      // Two lines rather than an ellipsis: a use case whose name is cut off is the one thing on
      // this diagram a reader most needs to read, and "Phát hiện người trống việc hoặc việ…" is
      // not a use case, it is a hint that one exists.
      const ln = wrap(u.name, 40, 2);
      L.push(`<rect x="230" y="${uy}" width="${ucW}" height="${ln.length > 1 ? 34 : 30}" rx="${ln.length > 1 ? 12 : 15}" fill="${C.card}" stroke="${C.line}"/>`);
      ln.forEach((t, k) => L.push(`<text x="244" y="${uy + (ln.length > 1 ? 15 : 20) + k * 13}" font-size="11.5" fill="${C.ink}">${esc(t)}</text>`));
      L.push(`</g>`);
      L.push(`<text x="${230 + ucW + 12}" y="${uy + 20}" font-size="10.5" font-weight="600" fill="${C.muted}" font-family="ui-monospace,Menlo,monospace">${esc(u.id)}</text>`);
    });
    y += g.ucs.length * rowH + 26;
  }
  L.push("</svg>");
  return L.join("\n");
}


/* ---- context diagram ------------------------------------------------------------------------
 * The first picture in a BA's pack and the one pica never had: the system in the middle, every
 * external thing it touches around it, and the direction of each arrow. It answers, in one look
 * and with no notation, the question an executive asks first — "what does this thing plug into,
 * and what does it send where".
 *
 * It is also the cheapest check on scope there is. An external system nobody named is missing
 * from the picture, and a picture with more boxes than the contract mentions is a scope dispute
 * found early instead of late.
 */
function contextDiagram(state) {
  const apps = arr(state.applications).map((a) => a.name || a).filter(Boolean);
  if (!apps.length) return null;
  const externals = [];
  for (const it of arr(state.integrationsNamed)) {
    externals.push({ name: it.system, dir: String(it.direction || "đọc"), kind: "system" });
  }
  if (state.identity?.provider) {
    externals.push({ name: `${state.identity.provider}${state.identity.sso ? ` (${state.identity.sso})` : ""}`, dir: "đăng nhập", kind: "system" });
  }
  const actors = [...new Set(arr(state.stakeholders).map((s) => s.role).filter(Boolean))].slice(0, 5);
  if (!externals.length && !actors.length) return null;

  const W = 900, cx = W / 2;
  const leftN = actors.length, rightN = externals.length;
  const rowH = 74, pad = 110;
  const H = pad + Math.max(leftN, rightN, 2) * rowH + 70;
  const cy = pad + (Math.max(leftN, rightN, 2) * rowH) / 2 - 10;
  const coreW = 250, coreH = Math.min(150, 64 + apps.length * 26);

  const L = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${F} role="img" aria-label="Sơ đồ bối cảnh">`];
  L.push(`<defs><marker id="cx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.muted}"/></marker></defs>`);
  L.push(`<text x="30" y="34" font-size="15" font-weight="700" fill="${C.ink}">Hệ thống này chạm vào những gì</text>`);
  L.push(`<text x="30" y="54" font-size="12" fill="${C.muted}">${actors.length} vai người dùng · ${externals.length} hệ thống ngoài. Mũi tên chỉ chiều dữ liệu đi.</text>`);

  // the system under discussion, in the middle
  L.push(`<rect x="${cx - coreW / 2}" y="${cy - coreH / 2}" width="${coreW}" height="${coreH}" rx="10" fill="${C.accent}"/>`);
  L.push(`<text x="${cx}" y="${cy - coreH / 2 + 26}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.onAccent}">Hệ thống sẽ xây</text>`);
  apps.forEach((a, i) =>
    L.push(`<text x="${cx}" y="${cy - coreH / 2 + 52 + i * 24}" text-anchor="middle" font-size="14" font-weight="600" fill="${C.onAccent}">${esc(a)}</text>`));

  const side = (items, x, anchor, dirLabel) => items.forEach((it, i) => {
    const y = pad + i * rowH + 18;
    const bw = 210, bx = anchor === "start" ? x : x - bw;
    const nm = wrap(it.name ?? it, 26, 2);
    const bh = nm.length > 1 ? 58 : 46;
    L.push(`<rect x="${bx}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8" fill="${C.card}" stroke="${C.line}"/>`);
    nm.forEach((t, k) => L.push(`<text x="${bx + bw / 2}" y="${y - bh / 2 + 18 + k * 14}" text-anchor="middle" font-size="12" font-weight="600" fill="${C.ink}">${esc(t)}</text>`));
    const lab = it.dir ?? dirLabel;
    if (lab) L.push(`<text x="${bx + bw / 2}" y="${y + bh / 2 - 8}" text-anchor="middle" font-size="10.5" fill="${C.muted}">${esc(lab)}</text>`);
    const from = anchor === "start" ? bx + bw : bx;
    const to = anchor === "start" ? cx - coreW / 2 : cx + coreW / 2;
    const mid = (from + to) / 2;
    L.push(`<path d="M${from} ${y} C${mid} ${y} ${mid} ${cy} ${to} ${cy}" fill="none" stroke="${C.line}" stroke-width="1.4" marker-end="url(#cx)"/>`);
  });
  side(actors.map((a) => ({ name: a })), 30, "start", "dùng");
  side(externals, W - 30, "end", "");
  L.push("</svg>");
  return L.join("\n");
}

const built = {};
for (const e of arr(state.stateModel)) {
  const svg = stateDiagram(e);
  if (svg) built[`state-${String(e.entity || e.name).replace(/\W+/g, "-").toLowerCase()}`] = svg;
}
const perm = permissionsDiagram(state.rolesPermissions); if (perm) built["permissions"] = perm;
const proc = processDiagram(state.toBe);                 if (proc) built["process"] = proc;
const erd  = erdDiagram(arr(state.domainModel));         if (erd)  built["erd"] = erd;
const ucd  = useCaseDiagram(arr(state.useCases));        if (ucd)  built["usecases"] = ucd;
const ctx  = contextDiagram(state);                      if (ctx)  built["context"] = ctx;

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
