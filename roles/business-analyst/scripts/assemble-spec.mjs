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

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#f4f5f6;--card:#fff;--ink:#16191d;--muted:#606670;--line:#dcdfe3;--strong:#c9ccd1;--accent:#006399;--warn:#c0392b;--r:10px}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0e1013;--card:#171a1f;--ink:#f2f3f5;--muted:#9aa1ab;--line:#262b32;--strong:#39404a;--accent:#3aa0de}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1100px;margin:0 auto;padding:32px 16px 96px}
h1{font-size:clamp(24px,4vw,32px);margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 24px}
.docs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}
.doc{background:var(--card);border-radius:var(--r);padding:14px 16px;border:1px solid var(--line)}
.doc b{display:block;font-size:18px}
.doc .q{color:var(--accent);font-weight:600;font-size:13px}
.doc .who{color:var(--muted);font-size:12px;margin-top:4px}
.doc .n{float:right;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;margin-bottom:8px;border-bottom:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
button.f{font:inherit;font-size:13px;padding:7px 13px;min-height:36px;border:1px solid var(--strong);background:var(--card);color:var(--ink);border-radius:999px;cursor:pointer}
button.f[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.count{color:var(--muted);font-size:13px;margin-left:auto}
section.reg{margin:26px 0}
section.reg h2{font-size:15px;margin:0 0 2px;display:flex;align-items:baseline;gap:10px}
section.reg .phase{color:var(--muted);font-weight:400;font-size:12px}
section.reg .tags{margin-left:auto;display:flex;gap:5px}
.tag{font-size:10px;font-weight:700;letter-spacing:.04em;padding:2px 7px;border-radius:4px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
ul.items{list-style:none;margin:10px 0 0;padding:0;background:var(--card);border-radius:var(--r);border:1px solid var(--line);overflow:hidden}
li.item{padding:12px 16px;border-top:1px solid var(--line);display:grid;grid-template-columns:96px 1fr;gap:4px 14px}
li.item:first-child{border-top:none}
li.item[data-open=1]{background:color-mix(in srgb,var(--warn) 7%,transparent)}
li.item:target,li.item[data-lit]{background:color-mix(in srgb,var(--accent) 12%,transparent)}
.id{font:600 12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--accent);cursor:pointer;align-self:start}
.head{font-weight:600;font-size:13px;color:var(--muted)}
.body{grid-column:2}
.meta{grid-column:2;color:var(--muted);font-size:12px;display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
.meta span{background:color-mix(in srgb,var(--ink) 6%,transparent);padding:1px 7px;border-radius:4px}
.refs{grid-column:2;margin-top:5px;font-size:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.refs a{font:600 11px/1.6 ui-monospace,Menlo,monospace;color:var(--accent);text-decoration:none;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);padding:1px 6px;border-radius:4px}
.refs a:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}
.refs .lbl{color:var(--muted)}
.dia{margin:26px 0}
.dia figure{margin:0 0 18px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px;overflow-x:auto}
/* A 23-step process across four lanes is ~1900px wide. Capping it at 100% of the column shrank
   it into a grey smear: technically present, unreadable, and worse than absent because it looks
   answered. Wide diagrams scroll sideways at their own size; narrow ones still fit.
   (No backticks in comments inside this template literal — one ended the string an hour ago and
   this is the second time.) */
.dia svg{height:auto;display:block;max-width:none}
.dia figure{scrollbar-width:thin}
@media(min-width:900px){.dia svg{max-width:100%}.dia figure.wide svg{max-width:none}}
.dia figcaption{color:var(--muted);font-size:12px;margin-top:8px}
.note{background:var(--card);border-left:3px solid var(--accent);border-radius:0 var(--r) var(--r) 0;padding:12px 16px;margin:20px 0;font-size:14px}
.warnnote{border-left-color:var(--warn)}
.chain{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-bottom:22px}
.chain-head{font-size:13px;color:var(--muted);margin-bottom:12px}
ol.hops{list-style:none;margin:0;padding:0;display:flex;align-items:flex-end;gap:4px;flex-wrap:wrap}
ol.hops li{display:flex;align-items:center;gap:4px}
.hop{display:grid;gap:2px;justify-items:start;min-width:74px;padding:6px 9px;border:1px solid transparent;border-radius:8px;background:none;font:inherit;color:inherit;cursor:pointer;text-align:left}
.hop:hover{border-color:var(--strong);background:color-mix(in srgb,var(--accent) 7%,transparent)}
.hop:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hopn{font-size:21px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.hopl{font-size:11px;color:var(--muted)}
.hopbar{width:100%;height:3px;border-radius:2px;background:color-mix(in srgb,var(--accent) 18%,transparent);position:relative;margin-top:3px}
.hopbar::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--f);background:var(--accent);border-radius:2px}
.arrow{color:var(--strong);font-size:13px}
.more{display:block;width:100%;min-height:44px;border:none;border-top:1px solid var(--line);background:none;font:inherit;font-size:13px;color:var(--accent);cursor:pointer;padding:10px 16px;text-align:left}
.more:hover{background:color-mix(in srgb,var(--accent) 8%,transparent)}
section.reg[data-dense] li.item[data-over]{display:none}
section.reg[data-dense][data-expanded] li.item[data-over]{display:grid}
section.reg[data-dense][data-expanded] .more{color:var(--muted)}
@media(max-width:620px){
  li.item{grid-template-columns:1fr}.body,.meta,.refs{grid-column:1}
  /* Four full-height cards ate the whole first screen on a phone: the reader met four labels and
     no content. Two columns, compact, so the map is above the fold with them. */
  .docs{grid-template-columns:1fr 1fr;gap:8px}
  .doc{padding:10px 12px}.doc b{font-size:15px}.doc .n{font-size:18px}.doc .who{display:none}
  .wrap{padding-top:20px}h1{font-size:22px}.sub{font-size:13px}
  .hop{min-width:62px}.hopn{font-size:17px}
}
</style></head><body><div class="wrap">
<h1>${esc(title)}</h1>
<p class="sub">Gom từ <code>.pica/state.json</code> — cùng một nguồn các check đọc, nên trang này không thể mâu thuẫn với chúng. Sinh lại là cập nhật; không có bản sao nào để lệch.</p>

<div class="docs">${Object.entries(DOC_META).map(([d, [q, who]]) => `
  <div class="doc"><span class="n">${docCount(d) || "—"}</span><span class="q">${q}?</span><b>${d}</b><div class="who">${esc(who)}</div></div>`).join("")}</div>

${openCount ? `<div class="note warnnote"><b>${openCount} mục chưa chốt.</b> Được tô riêng bên dưới. Một luật ghi là “chưa chốt” tốt hơn một luật bịa ra — nhưng nó phải được nhìn thấy, không nằm im trong sổ giả định.</div>` : ""}

<div class="bar">
  <button class="f" data-doc="ALL" aria-pressed="true">Tất cả</button>
  ${Object.keys(DOC_META).map((d) => `<button class="f" data-doc="${d}" aria-pressed="false">${d}</button>`).join("")}
  <button class="f" data-doc="OPEN" aria-pressed="false">Chưa chốt</button>
  <span class="count" id="count"></span>
</div>

${chainHtml()}

${diagrams.length ? `<div class="dia">
<p class="sub">Mô hình — vẽ từ chính dữ liệu các check đã kiểm, không có nguồn thứ hai.</p>
${diagrams.map((d) => {
  const w = Number((d.svg.match(/width="(\d+)"/) || [])[1] || 0);
  const label = d.name.startsWith("state-")
    ? `Vòng đời · ${d.name.replace(/^state-/, "").replace(/-/g, " ")}`
    : d.name === "permissions" ? "Ma trận quyền · vai trò × đối tượng"
    : d.name === "process" ? "Quy trình TO-BE · theo vai trò"
    : d.name;
  return `<figure${w > 900 ? ' class="wide"' : ""}>${d.svg}<figcaption>${esc(label)}${w > 900 ? " — cuộn ngang để xem hết" : ""}</figcaption></figure>`;
}).join("")}</div>` : ""}

${built.map((reg) => `
<section class="reg" data-key="${reg.key}" data-docs="${reg.docs.join(" ")}"${reg.dense ? " data-dense" : ""}>
  <h2>${esc(reg.title)} <span class="phase">${esc(reg.phase)}</span>
    <span class="tags">${reg.docs.map((d) => `<span class="tag">${d}</span>`).join("")}</span></h2>
  <ul class="items">${reg.items.map((it, idx) => {
    const cites = arr(it.refs).filter((r) => defined.has(r));
    const citedHere = citedBy.get(it.id) || [];
    const over = reg.dense && idx >= 6 && !it.open;
    return `<li class="item" id="${esc(it.id)}" data-id="${esc(it.id)}"${it.open ? ' data-open="1"' : ""}${over ? " data-over" : ""}>
      <span class="id" data-jump="${esc(it.id)}">${esc(it.id)}</span>
      ${it.head ? `<span class="head">${esc(it.head)}</span>` : "<span></span>"}
      <div class="body">${esc(it.body)}</div>
      ${arr(it.meta).length ? `<div class="meta">${arr(it.meta).map((m) => `<span>${esc(m)}</span>`).join("")}</div>` : ""}
      ${(cites.length || citedHere.length) ? `<div class="refs">
        ${cites.length ? `<span class="lbl">dựa trên</span>${cites.map((r) => `<a href="#${esc(r)}">${esc(r)}</a>`).join("")}` : ""}
        ${citedHere.length ? `<span class="lbl">${cites.length ? "· " : ""}được dùng bởi</span>${[...new Set(citedHere)].map((r) => `<a href="#${esc(r)}">${esc(r)}</a>`).join("")}` : ""}
      </div>` : ""}
    </li>`;
  }).join("")}${reg.dense && reg.items.length > 6 ? `<button class="more" data-more>Còn ${reg.items.length - Math.min(6, reg.items.filter((i) => !i.open).length ? 6 : 0)} mục nữa — mở ra</button>` : ""}</ul>
</section>`).join("")}

</div><script>
const items = [...document.querySelectorAll("li.item")];
const secs  = [...document.querySelectorAll("section.reg")];
const count = document.getElementById("count");
function apply(doc){
  for (const b of document.querySelectorAll("button.f")) b.setAttribute("aria-pressed", String(b.dataset.doc === doc));
  let shown = 0;
  for (const s of secs){
    const inDoc = doc === "ALL" || doc === "OPEN" || s.dataset.docs.split(" ").includes(doc);
    let any = false;
    for (const li of s.querySelectorAll("li.item")){
      const ok = inDoc && (doc !== "OPEN" || li.dataset.open === "1");
      li.hidden = !ok; if (ok){ any = true; shown++; }
    }
    s.hidden = !any;
  }
  count.textContent = shown + " mục";
}
document.querySelectorAll("button.f").forEach(b => b.onclick = () => apply(b.dataset.doc));
// Clicking an id lights every place that cites it — the matrix as navigation, both directions.
document.addEventListener("click", e => {
  const j = e.target.closest("[data-jump]"); if (!j) return;
  const id = j.dataset.jump;
  // An ATTRIBUTE, not a class. The classList.add(...) form is the exact shape pica's own
  // rule-coverage extractor reads as a declared check id, so this page's highlight class was
  // filed as a check with no rule behind it. A generated file has to stay out of the way of
  // the tools that read generated files — including a backtick in this comment, which ended
  // the template literal it lives inside.
  items.forEach(li => li.removeAttribute("data-lit"));
  document.querySelectorAll('a[href="#'+id+'"]').forEach(a => a.closest("li.item")?.setAttribute("data-lit",""));
  document.getElementById(id)?.setAttribute("data-lit","");
});
document.querySelectorAll("[data-more]").forEach(btn => btn.onclick = () => {
  const sec = btn.closest("section.reg");
  const open = sec.hasAttribute("data-expanded");
  if (open) { sec.removeAttribute("data-expanded"); btn.textContent = btn.dataset.closed; }
  else { btn.dataset.closed = btn.textContent; sec.setAttribute("data-expanded",""); btn.textContent = "Thu lại"; }
});
// A hop on the map jumps to its register and opens it — the map is a way IN, not an ornament.
document.querySelectorAll(".hop").forEach(h => h.onclick = () => {
  apply("ALL");
  const sec = [...secs].find(s => s.dataset.key === h.dataset.hop);
  if (!sec) return;
  sec.setAttribute("data-expanded","");
  const btn = sec.querySelector("[data-more]"); if (btn) btn.textContent = "Thu lại";
  sec.scrollIntoView({behavior:"smooth", block:"start"});
});
// Say "scroll sideways" only where it is TRUE, measured, and re-decided on resize. A fixed width
// threshold captioned two diagrams that fitted comfortably as needing a scroll they did not need,
// and left the one that did need it unmarked on a phone. A caption that tells a reader to do
// something unnecessary is a caption they learn to disbelieve.
function hintScroll(){
  for (const f of document.querySelectorAll(".dia figure")){
    const over = f.scrollWidth > f.clientWidth + 1;
    f.querySelector("figcaption").textContent = f.dataset.label + (over ? " — cuộn ngang để xem hết" : "");
  }
}
addEventListener("resize", hintScroll);
hintScroll();
apply("ALL");
</script></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const per = Object.keys(DOC_META).map((d) => `${d} ${docCount(d)}`).join(" · ");
console.log(`[assemble-spec] wrote ${OUT} — ${built.reduce((n, r) => n + r.items.length, 0)} items, ${diagrams.length} diagram(s), ${openCount} open (${per})`);
