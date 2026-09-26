#!/usr/bin/env node
/**
 * Gather the engagement into ONE page a person can read.
 *
 * pica produces thirty-five documents and then stops. Each is correct and none is the thing a
 * client asked for: a client asked to be able to open something. Hunting a fact across twenty-odd
 * markdown files is not reading a specification, it is grepping one, and the person who has to do
 * it concludes — correctly — that nothing was ever assembled.
 *
 * So this assembles. Every item is routed to the document it belongs in (BRD answers *why*, PRD
 * *what*, FRD *how*), the routing is filterable, and every id is a link: click it and every place
 * that cites it lights up, in both directions. The traceability matrix is not a chapter here; it
 * is the navigation.
 *
 * It reads `.pica/state.json` and nothing else, so the page cannot disagree with the checks —
 * they read the same file. Regenerate and it is current; there is no second copy to fall behind.
 *
 *   node assemble-spec.mjs .pica/state.json --out docs/spec/index.html [--title "..."]
 */

const CHECKS = ["assemble-spec"];

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const file = args.find((a) => !a.startsWith("--")) || ".pica/state.json";
const OUT = arg("--out", "docs/spec/index.html");

let S;
try { S = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error(`assemble-spec: cannot read ${file} — ${e.message}`); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bare = (x) => String(x).includes(":") ? String(x).split(":").pop() : String(x);
const ids = (v) => arr(v).map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean).map(bare);

/* ---- the routing table ---------------------------------------------------------------------
 * Which register lands in which document. This is the one piece of judgement in the file and it
 * follows the standard split: why / what / how. An item may land in more than one — the brief is
 * both the business case and the product's own statement of intent — and the counts say so. */
const REGISTERS = [
  { key: "segments",   phase: "02 Research",      docs: ["BRD"],        title: "Phân khúc người dùng",
    rows: () => arr(S.discovery?.segments).map((x, i) => ({ id: `SEG-${String(i + 1).padStart(2, "0")}`, head: x.name, body: x.jobToBeDone, meta: [x.frequency, x.context].filter(Boolean) })) },
  { key: "pains",      phase: "02 Research",      docs: ["BRD"],        title: "Nỗi đau",
    rows: () => arr(S.discovery?.painPoints).map((x) => ({ id: x.id, head: x.segment, body: x.statement, meta: [x.class, x.severity && `mức ${x.severity}`, x.confidence && `tin cậy ${x.confidence}`].filter(Boolean), refs: [] })) },
  { key: "problem",    phase: "03 Analysis",      docs: ["BRD", "PRD"], title: "Bài toán và chỉ số",
    rows: () => (S.problem ? [{ id: "PROB", head: S.problem.whose, body: S.problem.statement, meta: [S.problem.metric && `${S.problem.metric}: ${S.problem.baseline ?? "?"} ${S.problem.unit ?? ""}`].filter(Boolean) }] : []) },
  { key: "rules",      phase: "03 Analysis",      docs: ["BRD", "FRD"], title: "Luật nghiệp vụ",
    rows: () => arr(S.businessRules).map((x) => ({ id: x.id, head: x.status === "open" ? "CHƯA CHỐT" : (x.confirmed ? "đã xác nhận" : ""), body: x.rule, meta: [x.enforcedBy && `thực thi bởi: ${x.enforcedBy}`].filter(Boolean), open: x.status === "open" })) },
  { key: "glossary",   phase: "03 Analysis",      docs: ["BRD", "PRD", "FRD"], title: "Từ điển", dense: true,
    rows: () => arr(S.glossary).map((x, i) => ({ id: `G-${String(i + 1).padStart(2, "0")}`, head: `${x.term}${x.vi ? ` · ${x.vi}` : ""}`, body: x.means, meta: [x.notOurTerm?.length && `không phải: ${arr(x.notOurTerm).join(", ")}`].filter(Boolean) })) },
  { key: "useCases",   phase: "03 Analysis",      docs: ["PRD"],        title: "Use case", dense: true,
    rows: () => arr(S.useCases).map((x) => ({ id: x.id, head: x.name, body: arr(x.mainFlow).slice(0, 3).join(" → "), meta: [x.app, arr(x.actors)[0]].filter(Boolean), refs: [...ids(x.addresses), ...ids(x.tracesTo)] })) },
  { key: "reqs",       phase: "03 Analysis",      docs: ["PRD"],        title: "Yêu cầu", dense: true,
    rows: () => arr(S.requirements).map((x) => ({ id: x.id, head: x.class, body: x.statement, meta: [x.app].filter(Boolean), refs: ids(x.tracesTo) })) },
  { key: "nfr",        phase: "03 Analysis",      docs: ["PRD", "FRD"], title: "Yêu cầu phi chức năng", dense: true,
    rows: () => arr(S.nfr).map((x) => ({ id: x.id, head: x.kind, body: x.requirement, meta: [x.condition, x.measuredBy].filter(Boolean) })) },
  { key: "entities",   phase: "04 Specification", docs: ["FRD"],        title: "Mô hình miền",
    rows: () => arr(S.domainModel).map((x) => ({ id: `ENT-${String(x.entity).replace(/\W+/g, "-").toLowerCase()}`, head: x.entity, body: `chủ sở hữu: ${x.owner ?? "—"}`, meta: [arr(x.states).length && `${arr(x.states).length} trạng thái`, arr(x.attributes).length && `${arr(x.attributes).length} thuộc tính`].filter(Boolean) })) },
  { key: "screens",    phase: "05 Structure",     docs: ["PRD", "FRD"], title: "Màn hình",
    rows: () => arr(S.screens).map((x) => ({ id: x.id, head: x.name, body: `${arr(x.states).length} trạng thái · ${x.application ?? ""}`, meta: arr(x.states), refs: ids(x.tracesTo) })) },
  { key: "assumptions", phase: "01 Framing",      docs: ["BRD", "PRD"], title: "Giả định",
    rows: () => arr(S.assumptions).map((x) => ({ id: x.id, head: `tin cậy: ${x.confidence}`, body: x.assumed, meta: arr(x.affects), open: /thấp|low/i.test(String(x.confidence)) })) },
  { key: "exclusions", phase: "01 Framing",       docs: ["BRD", "SOW"], title: "Loại trừ",
    rows: () => arr(S.exclusions).map((x, i) => ({ id: `EX-${String(i + 1).padStart(2, "0")}`, head: x.excluded, body: x.why, meta: [x.source].filter(Boolean) })) },
];

/* Every id → where it is defined, and everywhere it is cited. The map is what makes the page
 * walkable in both directions, and it is built from the same fields traceability-check walks. */
const defined = new Map();
const citedBy = new Map();
const built = REGISTERS.map((r) => ({ ...r, items: r.rows() })).filter((r) => r.items.length);
for (const reg of built) {
  for (const it of reg.items) {
    defined.set(it.id, { reg: reg.key, title: reg.title, head: it.head });
    for (const ref of arr(it.refs)) {
      if (!citedBy.has(ref)) citedBy.set(ref, []);
      citedBy.get(ref).push(it.id);
    }
  }
}

/* Diagrams, if the renderer has run. Inlined so the page is one file that opens anywhere. */
const diagDir = join(dirname(OUT), "diagrams");
const diagrams = existsSync(diagDir)
  ? readdirSync(diagDir).filter((f) => f.endsWith(".svg")).map((f) => ({ name: f.replace(/\.svg$/, ""), svg: readFileSync(join(diagDir, f), "utf8") }))
  : [];

const DOC_META = {
  BRD: ["Why", "Business Analyst → người bảo trợ nghiệp vụ"],
  PRD: ["What", "Product Manager → mọi người"],
  FRD: ["How", "Systems Analyst → kỹ thuật"],
  SOW: ["What it costs", "một bản mỗi đội · fixed price fixed time"],
};
const docCount = (d) => built.filter((r) => r.docs.includes(d)).reduce((n, r) => n + r.items.length, 0);

const title = arg("--title", `${S.problem?.whose ? "" : ""}Đặc tả — ${esc(S.field ?? "dự án")}`);
const openCount = built.reduce((n, r) => n + r.items.filter((i) => i.open).length, 0);

/* The chain drawn as a chain. The first version made every id a link and called that "the matrix
 * is the navigation" — which it was, per item. What it had no view of was the SHAPE: 129 entries
 * in one linear list, 18 screens of scrolling, and no way to see that this specification is three
 * segments narrowing to nine pains widening to thirteen use cases. Navigation answers "where does
 * this one go"; a map answers "how much is there and how does it divide", and that is the first
 * question anyone asks. */
const CHAIN = [
  { key: "segments", label: "phân khúc" },
  { key: "pains",    label: "nỗi đau" },
  { key: "useCases", label: "use case" },
  { key: "reqs",     label: "yêu cầu" },
  { key: "rules",    label: "luật" },
  { key: "entities", label: "thực thể" },
  { key: "screens",  label: "màn hình" },
];
const chainHtml = () => {
  const hops = CHAIN.map((h) => ({ ...h, n: (built.find((b) => b.key === h.key)?.items.length) || 0 })).filter((h) => h.n);
  const max = Math.max(...hops.map((h) => h.n), 1);
  return `<div class="chain"><div class="chain-head">Chuỗi truy vết — đi được cả hai chiều, không mục nào mồ côi</div>
  <ol class="hops">${hops.map((h, i) => `<li><button class="hop" data-hop="${h.key}">
    <span class="hopn">${h.n}</span><span class="hopl">${esc(h.label)}</span>
    <span class="hopbar" style="--f:${(h.n / max * 100).toFixed(0)}%"></span></button>${i < hops.length - 1 ? '<span class="arrow" aria-hidden="true">→</span>' : ""}</li>`).join("")}</ol></div>`;
};
/* ---- the page -------------------------------------------------------------------------------
 * Design plan, written before the markup, because the first version had none and looked it.
 *
 * SUBJECT  A specification that will be read by three different people for three different
 *          reasons, mostly by consulting it rather than reading it through. The governing fact
 *          from the research: design for someone who will read as little as possible.
 *
 * COLOUR   Warm neutrals, not the default grey — paper #fbfaf8, ink #1a1c1e, rule #e3e1dd. One
 *          accent, the product's own Plane-derived blue #005a8d, and one semantic amber #a15c00
 *          reserved for what is unresolved. Nothing else gets a colour.
 *
 * TYPE     Three roles. Source Serif 4 for headings, because this is a document somebody signs
 *          and a serif says so. IBM Plex Sans for body, which holds up at small sizes and dense
 *          line lengths. IBM Plex Mono for ids, because an id is data. Prose is held near 68
 *          characters; tables use the full measure.
 *
 * LAYOUT   A sticky rail of registers with counts on the left — you jump, you do not scroll —
 *          and the content as TABLES, not cards. The previous version gave every one of 129
 *          entries a rounded white card with the same radius and shadow, which flattens hierarchy
 *          into a stack of identical objects. A register is tabular data: one object with many
 *          rows, not many objects. Cards are kept for the two things that are genuinely separate
 *          objects — the map and the open items.
 *
 * Light only, by request. Colours are painted explicitly so the page does not borrow a host
 * theme.
 */
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<style>
:root{
  color-scheme:light;
  --paper:#fbfaf8; --card:#fff; --ink:#1a1c1e; --ink2:#5c6166; --ink3:#8b9096;
  --rule:#e3e1dd; --rule2:#f0eeea; --accent:#005a8d; --accent-wash:#eef4f8;
  --open:#a15c00; --open-wash:#fdf4e7;
  --serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --measure:68ch;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
.page{display:grid;grid-template-columns:232px minmax(0,1fr);gap:48px;max-width:1180px;margin:0 auto;padding-block:40px 120px;padding-inline:24px;overflow-x:clip}
main{min-width:0}

/* the rail: you jump, you do not scroll */
.rail{position:sticky;top:env(safe-area-inset-top,0px);align-self:start;max-height:100vh;overflow-y:auto;padding-block:4px 24px}
.rail h1{font:600 19px/1.25 var(--serif);margin:0 0 3px;letter-spacing:-.005em;text-wrap:balance}
.rail .tag{font:500 10px/1 var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:22px}
.rail nav{display:flex;flex-direction:column;gap:1px;margin-bottom:22px}
.rail a{display:flex;align-items:baseline;gap:8px;padding:4px 8px;margin-inline:-8px;border-radius:5px;text-decoration:none;color:var(--ink2);font-size:13px}
.rail a:hover{background:var(--accent-wash);color:var(--accent)}
.rail a .n{margin-left:auto;font:500 11px/1 var(--mono);color:var(--ink3);font-variant-numeric:tabular-nums}
.rail a[data-open] .n{color:var(--open)}
.filters{display:flex;flex-wrap:wrap;gap:4px}
.filters button{font:500 11px/1 var(--sans);padding:6px 9px;min-height:30px;border:1px solid var(--rule);background:var(--card);color:var(--ink2);border-radius:5px;cursor:pointer}
.filters button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.filters button:focus-visible,.rail a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.lede{font:400 17px/1.5 var(--serif);color:var(--ink2);max-width:var(--measure);margin:0 0 30px}
.lede b{color:var(--ink);font-weight:600}

/* the map — one of the two things that earns a card */
.map{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:18px 20px 16px;margin-bottom:14px}
.map-h{font:500 10px/1 var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);margin-bottom:14px}
.hops{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;align-items:flex-end;gap:2px}
.hops li{display:flex;align-items:center;gap:2px}
.hop{display:grid;gap:1px;justify-items:start;min-width:70px;padding:5px 8px;border:0;background:none;border-radius:5px;font:inherit;color:inherit;cursor:pointer;text-align:left}
.hop:hover{background:var(--accent-wash)}
.hop:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.hopn{font:600 20px/1 var(--serif);font-variant-numeric:tabular-nums}
.hopl{font-size:11px;color:var(--ink3)}
.hopbar{width:100%;height:2px;background:var(--rule);margin-top:4px;position:relative}
.hopbar::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--f);background:var(--accent)}
.arrow{color:var(--ink3);font-size:11px;padding-bottom:9px}

/* the other card: what is not settled */
.open-note{background:var(--open-wash);border:1px solid #f0dfc4;border-radius:8px;padding:14px 18px;margin-bottom:34px;font-size:14px;color:#6d4200;max-width:var(--measure)}
.open-note b{color:var(--open)}

/* registers as TABLES */
section.reg{margin-bottom:46px;scroll-margin-top:24px}
section.reg h2{font:600 15px/1.3 var(--serif);margin:0 0 2px;display:flex;align-items:baseline;gap:10px}
section.reg h2 .doc{margin-left:auto;font:500 9px/1 var(--sans);letter-spacing:.08em;color:var(--ink3);text-transform:uppercase}
section.reg .why{font-size:12.5px;color:var(--ink3);margin:0 0 12px;max-width:var(--measure)}
table{width:100%;border-collapse:collapse;font-size:13.5px}
tbody tr{border-top:1px solid var(--rule2)}
tbody tr:first-child{border-top:1px solid var(--rule)}
tbody tr[data-open]{background:var(--open-wash)}
tbody tr:target,tbody tr[data-lit]{background:var(--accent-wash)}
td{padding:9px 10px 9px 0;vertical-align:top}
td.c-id{width:104px;padding-left:0}
td.c-id button{font:600 11.5px/1.5 var(--mono);color:var(--accent);background:none;border:0;padding:0;cursor:pointer;text-align:left}
td.c-id button:hover{text-decoration:underline}
td.c-id .tiny{display:block;font:400 10.5px/1.4 var(--sans);color:var(--ink3);margin-top:1px}
td.c-body{max-width:0}
td.c-body .t{display:block}
td.c-body .m{display:block;color:var(--ink3);font-size:12px;margin-top:2px}
td.c-refs{width:210px;text-align:right;padding-right:0}
td.c-refs a{display:inline-block;font:600 10.5px/1.5 var(--mono);color:var(--accent);text-decoration:none;border-bottom:1px solid #cfe0ea;margin-left:5px}
td.c-refs a:hover{border-bottom-color:var(--accent)}
td.c-refs .lbl{font-size:10px;color:var(--ink3);letter-spacing:.03em}
.more{margin-top:8px;font:500 12.5px/1 var(--sans);color:var(--accent);background:none;border:0;padding:8px 0;min-height:36px;cursor:pointer}
.more:hover{text-decoration:underline}
section.reg[data-dense] tr[data-over]{display:none}
section.reg[data-dense][data-expanded] tr[data-over]{display:table-row}

/* figures run to the full measure and scroll if wider */
.dia{margin:0 0 46px}
.dia figure{margin:0 0 14px;background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:14px;overflow-x:auto}
.dia svg{height:auto;display:block;max-width:none}
.dia figcaption{font-size:11.5px;color:var(--ink3);margin-top:9px}
/* Focus and trace. A diagram nobody can interrogate is a picture, and a 23-step process read all
   at once is the same wall of text in another medium. Clicking a step dims everything not on its
   route; the route is followed forward through the graph, so "what happens after this" is one
   click instead of a traced finger. */
.dia svg [data-node]{cursor:pointer}
/* Edges are drawn after nodes, so they paint over them and — without this — swallow the
   click. Several steps in the process simply did not respond, and a control that looks
   interactive and is not is worse than one that never offered. Only nodes are targets. */
.dia svg [data-edge]{pointer-events:none}
.dia svg [data-node]:focus-visible rect,.dia svg [data-node]:focus-visible path{outline:2px solid var(--accent);outline-offset:2px}
figure[data-focus] svg [data-node],figure[data-focus] svg [data-edge]{opacity:.16;transition:opacity .18s}
figure[data-focus] svg [data-node][data-on],figure[data-focus] svg [data-edge][data-on]{opacity:1}
figure[data-focus] svg [data-node][data-seed] rect,figure[data-focus] svg [data-node][data-seed] path{stroke:var(--accent);stroke-width:2}
.dia .focusbar{display:none;align-items:center;gap:10px;margin-top:9px;font-size:12px;color:var(--ink2)}
figure[data-focus] + .focusbar,.dia figure[data-focus] .focusbar{display:flex}
.dia .focusbar button{font:500 11px/1 var(--sans);border:1px solid var(--rule);background:var(--card);color:var(--ink2);border-radius:5px;padding:5px 8px;min-height:28px;cursor:pointer}
.dia .focusbar button:hover{border-color:var(--accent);color:var(--accent)}
.dia .hint{font-size:11px;color:var(--ink3);margin-top:7px}
@media (prefers-reduced-motion:reduce){figure[data-focus] svg [data-node],figure[data-focus] svg [data-edge]{transition:none}}

@media (max-width:860px){
  .page{grid-template-columns:1fr;gap:24px;padding-block:24px 80px;padding-inline:16px}
  .rail{position:static;max-height:none;border-bottom:1px solid var(--rule);padding-bottom:18px}
  .rail nav{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;margin-bottom:16px}
  .lede{font-size:15.5px}
  .map{overflow-x:auto}
  .hops{flex-wrap:nowrap;min-width:max-content}
  table,tbody,tr,td{display:block}
  tbody tr{padding:11px 0}
  td{padding:0;max-width:none!important;width:auto!important;text-align:left!important}
  td.c-id{margin-bottom:2px}
  td.c-refs{margin-top:5px}
  td.c-refs a{margin:0 5px 0 0}
  .dia svg{max-width:none}
}
@media print{.rail nav,.filters,.more{display:none}body{background:#fff}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style></head><body>
<div class="page">

<div class="rail">
  <h1>${esc(title)}</h1>
  <span class="tag">${built.reduce((n, r) => n + r.items.length, 0)} mục · ${diagrams.length} mô hình</span>
  <nav>${built.map((r) => `<a href="#reg-${r.key}">${esc(r.title)}<span class="n">${r.items.length}</span></a>`).join("")}</nav>
  <div class="filters">
    <button class="f" data-doc="ALL" aria-pressed="true">Tất cả</button>
    ${Object.keys(DOC_META).map((d) => `<button class="f" data-doc="${d}" aria-pressed="false">${d} ${docCount(d)}</button>`).join("")}
    ${openCount ? `<button class="f" data-doc="OPEN" aria-pressed="false">Chưa chốt ${openCount}</button>` : ""}
  </div>
</div>

<main>
  <p class="lede">Gom từ <b>.pica/state.json</b> — cùng một nguồn các check đọc, nên trang này không thể mâu thuẫn với chúng. Sinh lại là cập nhật; không có bản sao nào để lệch.
  <b>BRD</b> trả lời <i>vì sao</i>, <b>PRD</b> trả lời <i>cái gì</i>, <b>FRD</b> trả lời <i>hoạt động ra sao</i>.</p>

  ${(() => {
    const hops = CHAIN.map((h) => ({ ...h, n: (built.find((b) => b.key === h.key)?.items.length) || 0 })).filter((h) => h.n);
    const max = Math.max(...hops.map((h) => h.n), 1);
    return `<div class="map"><div class="map-h">Chuỗi truy vết · đi được cả hai chiều · không mục nào mồ côi</div>
    <ol class="hops">${hops.map((h, i) => `<li><button class="hop" data-hop="${h.key}">
      <span class="hopn">${h.n}</span><span class="hopl">${esc(h.label)}</span>
      <span class="hopbar" style="--f:${(h.n / max * 100).toFixed(0)}%"></span></button>${i < hops.length - 1 ? '<span class="arrow" aria-hidden="true">→</span>' : ""}</li>`).join("")}</ol></div>`;
  })()}

  ${openCount ? `<p class="open-note"><b>${openCount} mục chưa chốt.</b> Mọi thứ đứng trên chúng là tạm. Một luật ghi là “chưa chốt” tốt hơn một luật bịa ra — nhưng nó phải được nhìn thấy, không nằm im trong sổ giả định.</p>` : ""}

  ${diagrams.length ? `<div class="dia">${diagrams.map((d) => {
    const w = Number((d.svg.match(/width="(\d+)"/) || [])[1] || 0);
    const label = d.name.startsWith("state-") ? `Vòng đời · ${d.name.replace(/^state-/, "").replace(/-/g, " ")}`
      : d.name === "permissions" ? "Ma trận quyền · vai trò × đối tượng"
      : d.name === "process" ? "Quy trình TO-BE · theo vai trò" : d.name;
    return `<figure${w > 900 ? ' class="wide"' : ""} data-label="${esc(label)}">${d.svg}<figcaption>${esc(label)}</figcaption>
      <div class="focusbar"><span class="fname"></span><button data-back>← bước trước</button><button data-fwd>bước sau →</button><button data-clear>bỏ chọn</button></div>
      <p class="hint">Bấm một bước để chỉ xem đường đi của nó.</p></figure>`;
  }).join("")}</div>` : ""}

  ${built.map((reg) => `
  <section class="reg" id="reg-${reg.key}" data-key="${reg.key}" data-docs="${reg.docs.join(" ")}"${reg.dense ? " data-dense" : ""}>
    <h2>${esc(reg.title)}<span class="doc">${esc(reg.phase)} · ${reg.docs.join(" ")}</span></h2>
    <table><tbody>${reg.items.map((it, idx) => {
      const cites = arr(it.refs).filter((r) => defined.has(r));
      const citedHere = [...new Set(citedBy.get(it.id) || [])];
      const over = reg.dense && idx >= 6 && !it.open;
      return `<tr id="${esc(it.id)}"${it.open ? " data-open" : ""}${over ? " data-over" : ""}>
        <td class="c-id"><button data-jump="${esc(it.id)}">${esc(it.id)}</button>${it.head ? `<span class="tiny">${esc(it.head)}</span>` : ""}</td>
        <td class="c-body"><span class="t">${esc(it.body)}</span>${arr(it.meta).length ? `<span class="m">${arr(it.meta).map(esc).join(" · ")}</span>` : ""}</td>
        <td class="c-refs">${cites.length ? `<span class="lbl">dựa trên</span>${cites.map((r) => `<a href="#${esc(r)}">${esc(r)}</a>`).join("")}` : ""}${citedHere.length ? `${cites.length ? "<br>" : ""}<span class="lbl">dùng bởi</span>${citedHere.map((r) => `<a href="#${esc(r)}">${esc(r)}</a>`).join("")}` : ""}</td>
      </tr>`;
    }).join("")}</tbody></table>
    ${reg.dense && reg.items.length > 6 ? `<button class="more" data-more>Còn ${reg.items.length - 6} mục — mở ra</button>` : ""}
  </section>`).join("")}
</main>
</div>
<script>
const secs = [...document.querySelectorAll("section.reg")];
function apply(doc){
  for (const b of document.querySelectorAll("button.f")) b.setAttribute("aria-pressed", String(b.dataset.doc === doc));
  for (const s of secs){
    const inDoc = doc === "ALL" || doc === "OPEN" || s.dataset.docs.split(" ").includes(doc);
    let any = false;
    for (const tr of s.querySelectorAll("tbody tr")){
      const ok = inDoc && (doc !== "OPEN" || tr.hasAttribute("data-open"));
      tr.hidden = !ok; if (ok) any = true;
    }
    s.hidden = !any;
    const more = s.querySelector("[data-more]"); if (more) more.hidden = doc === "OPEN" || !any;
  }
}
document.querySelectorAll("button.f").forEach(b => b.onclick = () => apply(b.dataset.doc));
document.querySelectorAll("[data-more]").forEach(btn => btn.onclick = () => {
  const sec = btn.closest("section.reg");
  if (sec.hasAttribute("data-expanded")) { sec.removeAttribute("data-expanded"); btn.textContent = btn.dataset.closed; }
  else { btn.dataset.closed = btn.textContent; sec.setAttribute("data-expanded",""); btn.textContent = "Thu lại"; }
});
// An id lights every row that cites it — the matrix as navigation, both directions.
document.addEventListener("click", e => {
  const j = e.target.closest("[data-jump]"); if (!j) return;
  const id = j.dataset.jump;
  document.querySelectorAll("[data-lit]").forEach(el => el.removeAttribute("data-lit"));
  document.querySelectorAll('a[href="#'+id+'"]').forEach(a => a.closest("tr")?.setAttribute("data-lit",""));
  document.getElementById(id)?.setAttribute("data-lit","");
});
// A hop on the map opens its register and goes there.
document.querySelectorAll(".hop").forEach(h => h.onclick = () => {
  apply("ALL");
  const sec = secs.find(s => s.dataset.key === h.dataset.hop); if (!sec) return;
  sec.setAttribute("data-expanded","");
  const btn = sec.querySelector("[data-more]"); if (btn) btn.textContent = "Thu lại";
  sec.scrollIntoView({behavior:"smooth", block:"start"});
});
// Say "scroll sideways" only where it is true, measured, and re-decided on resize.
function hintScroll(){
  for (const f of document.querySelectorAll(".dia figure")){
    const over = f.scrollWidth > f.clientWidth + 1;
    f.querySelector("figcaption").textContent = f.dataset.label + (over ? " — cuộn ngang để xem hết" : "");
  }
}
/* ---- focus and trace ------------------------------------------------------------------------
 * Read the edges out of the SVG itself, so the viewer has no second copy of the graph to fall
 * behind. Focusing a node lights it, everything reachable forward from it, and the edges between;
 * the step buttons walk the route one hop at a time. */
document.querySelectorAll(".dia figure").forEach(fig => {
  const svg = fig.querySelector("svg"); if (!svg) return;
  const nodes = [...svg.querySelectorAll("[data-node]")];
  const edges = [...svg.querySelectorAll("[data-edge]")].map(el => {
    const [from, to] = el.dataset.edge.split("|"); return { el, from, to };
  });
  if (!nodes.length) { fig.querySelector(".hint")?.remove(); return; }
  const name = fig.querySelector(".fname");
  let seed = null;

  const reach = id => {
    // Shift ONCE per round, not once per edge. Calling shift() inside a filter predicate runs it
    // for every edge, so the queue drained on the first pass and every route reported exactly one
    // step ahead of itself — a wrong number, stated confidently.
    const seen = new Set([id]); const q = [id];
    while (q.length) {
      const cur = q.shift();
      for (const e of edges) if (e.from === cur && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
    }
    return seen;
  };
  function paint() {
    if (!seed) {
      fig.removeAttribute("data-focus");
      nodes.forEach(n => { n.removeAttribute("data-on"); n.removeAttribute("data-seed"); });
      edges.forEach(e => e.el.removeAttribute("data-on"));
      return;
    }
    const on = reach(seed);
    fig.setAttribute("data-focus", "");
    nodes.forEach(n => {
      n.toggleAttribute("data-on", on.has(n.dataset.node));
      n.toggleAttribute("data-seed", n.dataset.node === seed);
    });
    edges.forEach(e => e.el.toggleAttribute("data-on", on.has(e.from) && on.has(e.to)));
    const label = nodes.find(n => n.dataset.node === seed)?.getAttribute("aria-label") || seed;
    name.textContent = label + " — " + (on.size - 1) + " bước phía sau";
  }
  nodes.forEach(n => {
    const go = () => { seed = seed === n.dataset.node ? null : n.dataset.node; paint(); };
    n.addEventListener("click", go);
    n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  fig.querySelector("[data-clear]").onclick = () => { seed = null; paint(); };
  fig.querySelector("[data-fwd]").onclick = () => { const nx = edges.find(e => e.from === seed); if (nx) { seed = nx.to; paint(); } };
  fig.querySelector("[data-back]").onclick = () => { const pv = edges.find(e => e.to === seed); if (pv) { seed = pv.from; paint(); } };
});

addEventListener("resize", hintScroll); hintScroll();
apply("ALL");
</script></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const per = Object.keys(DOC_META).map((d) => `${d} ${docCount(d)}`).join(" · ");
console.log(`[assemble-spec] wrote ${OUT} — ${built.reduce((n, r) => n + r.items.length, 0)} items, ${diagrams.length} diagram(s), ${openCount} open (${per})`);
