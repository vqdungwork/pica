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
};/* ---- the page -------------------------------------------------------------------------------
 * A reference document, not a database export.
 *
 * What this replaces dumped eight registers of 129 entries into one scrolling column. Every entry
 * was correct and the result was unreadable to the only people whose opinion decides anything:
 * the ones who know the business and not the notation. They do not want to find a fact. They want
 * to SEE what a person can do, where they go, and what the system holds — and to recognise their
 * own operation in it.
 *
 * So the page is a narrative in parts, and the parts that matter are GRIDS in which colour is the
 * information. One legend, used everywhere: where a step happens, and where a screen's data comes
 * from, are the same question in two places. A reader who learns "grey is 8project, blue is this
 * app, olive is outside any system" can then read every grid on the page at a glance — and see,
 * without reading a word, how much of their day this product actually touches.
 *
 * Nothing scrolls sideways. A diagram that has to be scrolled is a diagram nobody sees whole,
 * which defeats the reason for drawing it: the process grid wraps, the lifecycle fits its column,
 * and the one genuinely wide picture is drawn to the width available rather than to its own.
 *
 * COLOUR   paper #fbfaf8 · ink #1a1c1e · rule #e3e1dd. Four semantic hues and no others:
 *          slate #5c6166 (8project, mirrored), blue #005a8d (this app, owned),
 *          olive #6b6420 (outside any system), amber #a15c00 (not settled).
 * TYPE     Source Serif 4 headings (a document somebody signs), IBM Plex Sans body,
 *          IBM Plex Mono for references. Prose held to 68 characters.
 * LAYOUT   Parts down the page, each opening with one sentence and then a grid. Light only.
 */

/* Where a thing happens, or where its data comes from — one vocabulary for both. */
const laneKind = (lane) => {
  const s = String(lane || "").toLowerCase();
  if (/8project|plane|upstream/.test(s)) return "mirror";
  if (/ngoài|ngoai|outside|manual/.test(s)) return "outside";
  return "app";
};
const KIND = {
  mirror:  { label: "8project — nguồn ngoài, chỉ đọc", css: "k-mirror" },
  app:     { label: "worklog / reporting — app này làm", css: "k-app" },
  outside: { label: "Ngoài hệ thống — người làm, không app nào", css: "k-outside" },
  open:    { label: "Chưa chốt", css: "k-open" },
};

/* The journey: the TO-BE steps, ordered by depth, grouped by who does them. This is the
 * "what can a person do, and where do they go" picture, and it is a grid rather than a graph
 * because a grid fits the page and a 23-node graph does not. */
const jNodes = arr(S.toBe?.nodes), jEdges = arr(S.toBe?.edges);
const jLanes = arr(S.toBe?.lanes).map((l) => (typeof l === "string" ? { id: l, name: l } : l));
const depthOf = (() => {
  const memo = new Map();
  const d = (id, seen = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    const ins = jEdges.filter((e) => e.to === id);
    const v = ins.length ? Math.max(...ins.map((e) => d(e.from, seen) + 1)) : 0;
    memo.set(id, v); return v;
  };
  jNodes.forEach((n) => d(n.id));
  return memo;
})();
const laneOf = (n) => jLanes.find((l) => l.id === n.lane || l.name === n.lane) || { id: n.lane, name: n.lane || "—" };
const journey = jLanes.map((l) => ({
  lane: l,
  kind: laneKind(l.name || l.id),
  steps: jNodes.filter((n) => laneOf(n).id === l.id).sort((a, b) => depthOf.get(a.id) - depthOf.get(b.id)),
})).filter((g) => g.steps.length);

const isGateway = (n) => /gateway|decision|xor/i.test(n.type || "") || /\?$/.test(String(n.name || "").trim());
const nextOf = (id) => jEdges.filter((e) => e.from === id).map((e) => jNodes.find((n) => n.id === e.to)).filter(Boolean);

/* A screen's data, in the same vocabulary: what it mirrors, what it owns, what it works out. */
const screenKinds = (s) => {
  const ds = s.dataSource || {};
  return [
    ...arr(ds.mirrored).map((x) => ({ kind: "mirror", text: x })),
    ...arr(ds.owned).map((x) => ({ kind: "app", text: x })),
    ...arr(ds.computed).map((x) => ({ kind: "app", text: x, computed: true })),
  ];
};

const openThings = [
  ...arr(S.businessRules).filter((r) => r.status === "open").map((r) => ({ id: r.id, t: r.rule })),
  ...arr(S.assumptions).filter((a) => /thấp|low/i.test(String(a.confidence))).map((a) => ({ id: a.id, t: a.assumed })),
];

const APPENDIX = new Set(["rules", "reqs", "nfr", "glossary", "useCases", "exclusions", "assumptions"]);
const appendix = built.filter((r) => APPENDIX.has(r.key));

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<style>
:root{
  color-scheme:light;
  --paper:#fbfaf8; --card:#fff; --ink:#1a1c1e; --ink2:#4e5459; --ink3:#868b91;
  --rule:#e3e1dd; --rule2:#efedea;
  --mirror:#5c6166; --mirror-bg:#f3f2f0;
  --app:#005a8d;    --app-bg:#eaf2f8;
  --outside:#6b6420; --outside-bg:#f6f4e6;
  --open:#a15c00;   --open-bg:#fdf3e6;
  --serif:"Source Serif 4",Georgia,serif;
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  --measure:68ch;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.62 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:980px;margin:0 auto;padding-block:48px 120px;padding-inline:24px}
h1{font:700 clamp(30px,5vw,42px)/1.08 var(--serif);margin:0 0 14px;letter-spacing:-.015em;text-wrap:balance}
h2{font:600 clamp(21px,3vw,27px)/1.2 var(--serif);margin:0 0 8px;letter-spacing:-.01em;text-wrap:balance}
h3{font:600 15px/1.3 var(--sans);margin:0 0 10px}
p{max-width:var(--measure)}
.eyebrow{font:600 10.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--outside);margin:0 0 9px}
.deck{font:400 18px/1.55 var(--serif);color:var(--ink2);max-width:var(--measure);margin:0 0 18px}
.deck b{color:var(--ink);font-weight:600}
.meta{font-size:13px;color:var(--ink3);margin:0 0 30px}
.meta b{color:var(--ink2);font-weight:600}
hr{border:0;border-top:2px solid var(--outside);margin:0 0 30px}

.howto{background:#f6f5f2;border:1px solid var(--rule);border-radius:10px;padding:18px 22px;margin-bottom:54px}
.howto p{margin:0 0 11px;font-size:14px;max-width:var(--measure)}
.howto p:last-child{margin-bottom:0}
.ref{display:inline-block;font:600 11px/1.5 var(--mono);background:var(--outside);color:#fff;padding:1px 7px;border-radius:4px}

section.part{margin-bottom:58px;scroll-margin-top:16px}

/* the legend — one vocabulary, used by every grid below */
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.chip{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;padding:6px 12px;border:1px solid var(--rule);background:var(--card);border-radius:999px;color:var(--ink2)}
.dot{width:9px;height:9px;border-radius:2px;flex:0 0 auto}
.k-mirror .dot,.dot.k-mirror{background:var(--mirror)}
.k-app .dot,.dot.k-app{background:var(--app)}
.k-outside .dot,.dot.k-outside{background:var(--outside)}
.k-open .dot,.dot.k-open{background:var(--open)}

/* the grids — nothing here scrolls sideways */
.lane{margin-bottom:26px}
.lane-h{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
.lane-h .who{font:600 15px/1.3 var(--sans)}
.lane-h .n{font:500 11.5px/1 var(--mono);color:var(--ink3)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.step{background:var(--card);border:1px solid var(--rule);border-left:3px solid var(--rule);border-radius:9px;padding:11px 13px;min-height:84px;display:flex;flex-direction:column;gap:5px}
.step .no{font:500 10px/1 var(--mono);color:var(--ink3);letter-spacing:.04em}
.step .nm{font-size:13.5px;line-height:1.38;font-weight:500}
.step .tail{margin-top:auto;font-size:11.5px;color:var(--ink3);display:flex;align-items:center;gap:6px}
.step.k-mirror{border-left-color:var(--mirror);background:var(--mirror-bg)}
.step.k-app{border-left-color:var(--app);background:var(--app-bg)}
.step.k-outside{border-left-color:var(--outside);background:var(--outside-bg)}
.step.gate{border-style:dashed}
.step.gate .nm::after{content:" ↳ rẽ nhánh";color:var(--ink3);font-weight:400;font-size:11.5px}

.scr{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:13px 15px;display:flex;flex-direction:column;gap:7px}
.scr .id{font:600 11px/1 var(--mono);color:var(--app)}
.scr .nm{font-size:14.5px;font-weight:600;line-height:1.3}
.scr .sts{font-size:11.5px;color:var(--ink3)}
.scr ul{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.scr li{display:flex;gap:7px;align-items:flex-start;font-size:12px;line-height:1.4;color:var(--ink2)}
.scr li .dot{margin-top:5px}

.ent{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:14px 16px}
.ent h3{margin-bottom:3px;font-size:15px}
.ent .own{font-size:11.5px;color:var(--ink3);margin-bottom:9px}
.ent .attrs{display:flex;flex-wrap:wrap;gap:4px}
.ent .attrs span{font:500 11px/1 var(--mono);background:#f4f3f1;border-radius:4px;padding:4px 7px;color:var(--ink2)}
.ent .rel{font-size:12px;color:var(--ink2);margin-top:9px;padding-top:9px;border-top:1px solid var(--rule2)}

.seg{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:15px 17px}
.seg .who{font:600 15px/1.3 var(--sans);margin-bottom:3px}
.seg .jtbd{font-size:13px;color:var(--ink2);margin-bottom:10px}
.seg .pain{font-size:12.5px;color:var(--ink2);display:flex;gap:7px;padding:5px 0;border-top:1px solid var(--rule2)}
.seg .pain .pid{font:600 10.5px/1.6 var(--mono);color:var(--ink3);flex:0 0 auto}

.openlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.openc{background:var(--open-bg);border:1px solid #f0dfc4;border-left:3px solid var(--open);border-radius:9px;padding:12px 14px}
.openc .id{font:600 10.5px/1 var(--mono);color:var(--open)}
.openc p{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:#6d4200}

/* figures fit the column; nothing scrolls sideways */
.fig{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:14px;margin:0 0 14px}
.fig svg{width:100%;height:auto;display:block}
.fig figcaption{font-size:11.5px;color:var(--ink3);margin-top:9px}
.fig svg [data-node]{cursor:pointer}
.fig svg [data-edge]{pointer-events:none}
figure[data-focus] svg [data-node],figure[data-focus] svg [data-edge]{opacity:.15;transition:opacity .18s}
figure[data-focus] svg [data-node][data-on],figure[data-focus] svg [data-edge][data-on]{opacity:1}
figure[data-focus] svg [data-node][data-seed] rect{stroke:var(--app);stroke-width:2}
.fbar{display:none;align-items:center;gap:9px;margin-top:9px;font-size:12px;color:var(--ink2);flex-wrap:wrap}
figure[data-focus] .fbar{display:flex}
.fbar button{font:500 11px/1 var(--sans);border:1px solid var(--rule);background:var(--card);color:var(--ink2);border-radius:5px;padding:5px 9px;min-height:30px;cursor:pointer}
.fbar button:hover{border-color:var(--app);color:var(--app)}

/* the appendix: registers, closed by default */
details.app{border-top:1px solid var(--rule);padding-top:14px;margin-top:14px}
details.app summary{cursor:pointer;font:600 14px/1.4 var(--sans);list-style:none;display:flex;align-items:baseline;gap:10px;min-height:34px}
details.app summary::-webkit-details-marker{display:none}
details.app summary::before{content:"▸";color:var(--ink3);font-size:11px}
details.app[open] summary::before{content:"▾"}
details.app summary .n{margin-left:auto;font:500 11.5px/1 var(--mono);color:var(--ink3)}
details.app table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
details.app tr{border-top:1px solid var(--rule2)}
details.app td{padding:8px 10px 8px 0;vertical-align:top}
details.app td:first-child{width:96px}
details.app td:first-child b{font:600 11px/1.5 var(--mono);color:var(--app);font-weight:600}
details.app tr[data-open]{background:var(--open-bg)}

@media (max-width:640px){
  .wrap{padding-block:28px 80px;padding-inline:16px}
  .grid{grid-template-columns:1fr 1fr;gap:8px}
  .step{min-height:76px;padding:9px 10px}
  .step .nm{font-size:12.5px}
  .openlist{grid-template-columns:1fr}
  details.app td:first-child{width:auto;display:block;padding-bottom:2px}
  details.app td{display:block;padding-right:0}
}
@media print{details.app{display:block}details.app[open]{}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style></head><body><div class="wrap">

<p class="eyebrow">${esc(S.field ?? "Dự án")} · tài liệu tham chiếu</p>
<h1>${esc(title)}</h1>
<p class="deck">${esc(String(S.asIs || S.problem?.statement || "").slice(0, 300))}</p>
<p class="meta"><b>Phạm vi</b> ${arr(S.applications).map((a) => esc(a.name)).join(" · ") || "—"} &nbsp;·&nbsp; <b>Trạng thái</b> ${S.scopeFrozen ? "đã chốt phạm vi" : "chưa chốt phạm vi"}${openCount ? ` · ${openCount} điểm chưa xác nhận` : ""}</p>
<hr>

<div class="howto">
  <p><b>Mọi mục đều có mã tham chiếu</b>, ví dụ <span class="ref">BR-01</span> <span class="ref">UC-04</span> <span class="ref">WL-02</span>. Góp ý có thể nêu theo mã thay vì mô tả bằng lời — một câu như <i>“BR-01: ngày tính từ 6 giờ sáng”</i> là đủ để sửa.</p>
  <p><b>Điểm chưa xác nhận được tô cam</b>, không điền đại một con số nghe có lý.</p>
  <p><b>Màu ở mọi lưới bên dưới mang cùng một nghĩa:</b> nơi một việc xảy ra, và nơi dữ liệu của một màn hình đến từ, là cùng một câu hỏi.</p>
</div>

<div class="legend">
  ${Object.entries(KIND).map(([k, v]) => `<span class="chip ${v.css}"><span class="dot ${v.css}"></span>${esc(v.label)}</span>`).join("")}
</div>

${journey.length ? `<section class="part">
  <p class="eyebrow">Phần 1</p>
  <h2>Một ngày chạy thế nào</h2>
  <p class="deck">${jNodes.length} bước, chia theo ai làm. Xám là việc 8project đã làm sẵn; xanh là việc app này thêm vào; ô-liu là việc con người làm và không hệ thống nào chạm tới.</p>
  ${journey.map((g) => `<div class="lane">
    <div class="lane-h"><span class="who">${esc(g.lane.name || g.lane.id)}</span><span class="n">${g.steps.length} bước</span></div>
    <div class="grid">${g.steps.map((n, i) => {
      const nx = nextOf(n.id);
      return `<div class="step ${KIND[g.kind].css}${isGateway(n) ? " gate" : ""}">
        <span class="no">${String(i + 1).padStart(2, "0")}</span>
        <span class="nm">${esc(String(n.name || n.id).replace(/\s*\([^)]*\)\s*$/, ""))}</span>
        ${nx.length ? `<span class="tail">→ ${esc(nx.map((x) => String(x.name || x.id).split(/[,(—-]/)[0].trim()).slice(0, 2).join(" · ").slice(0, 44))}</span>` : `<span class="tail">kết thúc</span>`}
      </div>`;
    }).join("")}</div>
  </div>`).join("")}
</section>` : ""}

${arr(S.discovery?.segments).length ? `<section class="part">
  <p class="eyebrow">Phần 2</p>
  <h2>Ai dùng, và đau ở đâu</h2>
  <p class="deck">Mỗi nhóm người dùng, việc họ cần xong, và những nỗi đau đã ghi nhận được cho nhóm đó.</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">
  ${arr(S.discovery.segments).map((sg) => {
    const pains = arr(S.discovery.painPoints).filter((pp) => pp.segment === sg.name);
    return `<div class="seg">
      <div class="who">${esc(sg.name)}</div>
      <div class="jtbd">${esc(sg.jobToBeDone || "")}</div>
      ${pains.map((pp) => `<div class="pain"><span class="pid">${esc(pp.id)}</span><span>${esc(String(pp.statement).slice(0, 150))}</span></div>`).join("")}
    </div>`;
  }).join("")}
  </div>
</section>` : ""}

${diagrams.some((d) => d.name === "usecases") ? `<section class="part">
  <p class="eyebrow">Phần 2b</p>
  <h2>Ai làm được gì</h2>
  <p class="deck">Mỗi đường là một việc một vai làm được. Không phải màn hình, không phải tính năng — là quyền làm một việc.</p>
  <figure class="fig" data-label="Ai làm được gì">${diagrams.find((d) => d.name === "usecases").svg}</figure>
</section>` : ""}

${arr(S.screens).length ? `<section class="part">
  <p class="eyebrow">Phần 3</p>
  <h2>Những màn hình, và mỗi màn lấy dữ liệu từ đâu</h2>
  <p class="deck">${arr(S.screens).length} màn, ${arr(S.screens).reduce((n, s) => n + arr(s.states).length, 0)} trạng thái. Chấm xám là dữ liệu soi từ 8project; chấm xanh là dữ liệu app này sở hữu hoặc tự tính.</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
  ${arr(S.screens).map((s) => `<div class="scr">
    <span class="id">${esc(s.id)}</span>
    <span class="nm">${esc(s.name)}</span>
    <span class="sts">${arr(s.states).length} trạng thái · ${esc(s.application || "")}</span>
    <ul>${screenKinds(s).slice(0, 4).map((x) => `<li><span class="dot ${KIND[x.kind].css}"></span><span>${esc(String(x.text).slice(0, 62))}${x.computed ? " <i>(tính ra)</i>" : ""}</span></li>`).join("")}</ul>
  </div>`).join("")}
  </div>
</section>` : ""}

${diagrams.some((d) => d.name === "erd") ? `<section class="part">
  <p class="eyebrow">Phần 4</p>
  <h2>Dữ liệu, và cái gì liên quan cái gì</h2>
  <p class="deck">Bốn thực thể. Chỉ một do app này sở hữu — phần còn lại là bản soi chỉ đọc của 8project, và app này không bao giờ ghi ngược lên.</p>
  <figure class="fig" data-label="Dữ liệu và quan hệ">${diagrams.find((d) => d.name === "erd").svg}</figure>
</section>` : ""}

${arr(S.domainModel).length && !diagrams.some((d) => d.name === "erd") ? `<section class="part">
  <p class="eyebrow">Phần 4</p>
  <h2>Hệ thống giữ những gì</h2>
  <p class="deck">Bốn thực thể. Chỉ một trong số đó do app này sở hữu — phần còn lại là bản soi của 8project, và app này không bao giờ ghi ngược lên.</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
  ${arr(S.domainModel).map((e) => `<div class="ent">
    <h3>${esc(e.entity)}</h3>
    <div class="own"><span class="dot ${/worklog|app|này/i.test(String(e.owner)) ? "k-app" : "k-mirror"}" style="display:inline-block;margin-right:5px"></span>${esc(e.owner || "—")}</div>
    <div class="attrs">${arr(e.attributes).slice(0, 9).map((a) => `<span>${esc(typeof a === "string" ? a : a.name || "")}</span>`).join("")}</div>
    ${arr(e.relationships).length ? `<div class="rel">${arr(e.relationships).slice(0, 3).map((r) => esc(typeof r === "string" ? r : `${r.to ?? ""} ${r.kind ?? ""}`)).join(" · ")}</div>` : ""}
  </div>`).join("")}
  </div>
</section>` : ""}

${diagrams.length ? `<section class="part">
  <p class="eyebrow">Phần 5</p>
  <h2>Vòng đời và quyền</h2>
  <p class="deck">Một việc đi qua những trạng thái nào, ai được làm gì. Bấm một trạng thái để chỉ xem đường đi của nó.</p>
  ${diagrams.filter((d) => !["process", "erd", "usecases"].includes(d.name)).map((d) => {
    const label = d.name.startsWith("state-") ? `Vòng đời · ${d.name.replace(/^state-/, "").replace(/-/g, " ")}`
      : d.name === "permissions" ? "Ma trận quyền · vai trò × đối tượng" : d.name;
    return `<figure class="fig" data-label="${esc(label)}">${d.svg}<figcaption>${esc(label)}</figcaption>
      <div class="fbar"><span class="fname"></span><button data-back>← trước</button><button data-fwd>sau →</button><button data-clear>bỏ chọn</button></div></figure>`;
  }).join("")}
</section>` : ""}

${openThings.length ? `<section class="part">
  <p class="eyebrow">Phần 6</p>
  <h2>Chưa chốt</h2>
  <p class="deck">Ghi ra thay vì điền đại. Mọi thứ đứng trên những điểm này đều là tạm.</p>
  <div class="openlist">${openThings.map((o) => `<div class="openc"><span class="id">${esc(o.id)}</span><p>${esc(String(o.t).slice(0, 240))}</p></div>`).join("")}</div>
</section>` : ""}

${appendix.length ? `<section class="part">
  <p class="eyebrow">Phụ lục</p>
  <h2>Sổ tra cứu</h2>
  <p class="deck">Mở ra khi cần tra một mã cụ thể. Không ai phải đọc hết phần này.</p>
  ${appendix.map((reg) => `<details class="app"><summary>${esc(reg.title)}<span class="n">${reg.items.length}</span></summary>
    <table><tbody>${reg.items.map((it) => `<tr id="${esc(it.id)}"${it.open ? " data-open" : ""}>
      <td><b>${esc(it.id)}</b></td>
      <td>${esc(String(it.body).slice(0, 400))}${arr(it.refs).filter((r) => defined.has(r)).length ? `<br><span style="font:500 10.5px/1.6 var(--mono);color:var(--ink3)">${arr(it.refs).filter((r) => defined.has(r)).map(esc).join(" · ")}</span>` : ""}</td>
    </tr>`).join("")}</tbody></table></details>`).join("")}
</section>` : ""}

</div>
<script>
document.querySelectorAll("figure.fig").forEach(fig => {
  const svg = fig.querySelector("svg"); if (!svg) return;
  const nodes = [...svg.querySelectorAll("[data-node]")];
  const edges = [...svg.querySelectorAll("[data-edge]")].map(el => { const [from,to]=el.dataset.edge.split("|"); return {el,from,to}; });
  if (!nodes.length) return;
  const name = fig.querySelector(".fname"); let seed = null;
  const reach = id => { const seen=new Set([id]); const q=[id];
    while(q.length){ const cur=q.shift(); for(const e of edges) if(e.from===cur && !seen.has(e.to)){ seen.add(e.to); q.push(e.to);} } return seen; };
  function paint(){
    if(!seed){ fig.removeAttribute("data-focus"); nodes.forEach(n=>{n.removeAttribute("data-on");n.removeAttribute("data-seed");}); edges.forEach(e=>e.el.removeAttribute("data-on")); return; }
    const on = reach(seed); fig.setAttribute("data-focus","");
    nodes.forEach(n=>{ n.toggleAttribute("data-on", on.has(n.dataset.node)); n.toggleAttribute("data-seed", n.dataset.node===seed); });
    edges.forEach(e=>e.el.toggleAttribute("data-on", on.has(e.from)&&on.has(e.to)));
    if (name) name.textContent = (nodes.find(n=>n.dataset.node===seed)?.getAttribute("aria-label")||seed) + " — " + (on.size-1) + " bước phía sau";
  }
  nodes.forEach(n => { const go=()=>{ seed = seed===n.dataset.node ? null : n.dataset.node; paint(); };
    n.addEventListener("click", go);
    n.addEventListener("keydown", e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } }); });
  // Not every figure has a step bar — the use-case and data models are focusable but have no
  // route to walk. Assuming the controls exist threw on load and killed the script for ALL
  // figures, so the two that DID have controls silently stopped working too.
  const on = (sel, fn) => { const el = fig.querySelector(sel); if (el) el.onclick = fn; };
  on("[data-clear]", () => { seed=null; paint(); });
  on("[data-fwd]",   () => { const nx=edges.find(e=>e.from===seed); if(nx){seed=nx.to;paint();} });
  on("[data-back]",  () => { const pv=edges.find(e=>e.to===seed); if(pv){seed=pv.from;paint();} });
});
</script></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const per = Object.keys(DOC_META).map((d) => `${d} ${docCount(d)}`).join(" · ");
console.log(`[assemble-spec] wrote ${OUT} — ${built.reduce((n, r) => n + r.items.length, 0)} items, ${diagrams.length} diagram(s), ${openCount} open (${per})`);
