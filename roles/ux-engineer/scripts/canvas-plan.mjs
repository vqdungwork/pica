#!/usr/bin/env node
/**
 * Lay every screen out on a canvas, grouped by the requirement that asked for it.
 *
 * pica delivers a demo you step through one URL at a time. That is the right thing for judging a
 * flow and the wrong thing for judging a SCOPE: a client cannot see how much was designed, or how
 * it divides, by clicking through twelve addresses one after another. Seeing all of it at once,
 * arranged, is a different question answered — and it is the question a client asks first.
 *
 * The arrangement is the argument. Rows are requirement families, and the row label is the ids
 * themselves, so the canvas is the traceability view: a screen's position states what asked for
 * it. Exclusions become a pinned note beside the boards rather than a document nobody opens, and
 * each hard stop becomes a note saying what must be true before anything past it is worth
 * building. None of that is decoration — it is the part of a specification a picture can carry
 * and prose cannot.
 *
 * Emits `canvas.json` in the Design-artifact shape: boards at {x,y,w,h}, notes, an explicit
 * presentation order. Positions are computed from the screen inventory, so adding a screen moves
 * the layout rather than leaving it stale.
 *
 *   node canvas-plan.mjs .pica/state.json --out canvas.json [--title "…"] [--viewport desktop]
 */

const CHECKS = ["canvas-plan"];

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const file = args.find((a) => !a.startsWith("--")) || ".pica/state.json";
const OUT = arg("--out", "canvas.json");
const VP = arg("--viewport", "desktop");

let S;
try { S = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error(`canvas-plan: cannot read ${file} — ${e.message}`); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const screens = arr(S.screens);
if (!screens.length) {
  console.log("canvas-plan: SKIPPED — state carries no screens. This is not a pass.");
  process.exit(0);
}

const vp = arr(S.viewports).find((v) => v.name === VP) || arr(S.viewports)[0] || { w: 1440, h: 900 };
const W = vp.w, H = vp.h, GAP_X = 80, GAP_Y = 400, PER_ROW = 4;

/* Rows are requirement FAMILIES, not applications and not build order. A family is the set of
 * screens a group of requirements asked for; naming the row with those ids is what turns the
 * layout into an argument about scope rather than an arrangement of pictures. */
const familyOf = (scr) => {
  const refs = arr(scr.tracesTo).map(String);
  const uc = refs.find((r) => /^UC-/.test(r)) || refs[0] || "—";
  return uc.replace(/^(UC-[A-Z]*-?\d+).*$/, "$1");
};
const groupLabel = (family) => {
  const uc = arr(S.useCases).find((u) => u.id === family);
  return uc?.group || uc?.name || family;
};

const rows = new Map();
for (const s of screens) {
  const key = groupLabel(familyOf(s));
  if (!rows.has(key)) rows.set(key, []);
  rows.get(key).push(s);
}

const boards = {}, order = [], notes = {};
let y = 0, maxX = 0;
let ri = 0;
for (const [label, list] of rows) {
  notes[`row-${ri}`] = { kind: "title1", maxW: 6000, text: `${label} · ${list.length} màn`, w: 240, x: 0, y: y - 300 };
  list.forEach((s, i) => {
    const col = i % PER_ROW, band = Math.floor(i / PER_ROW);
    const bx = col * (W + GAP_X), by = y + band * (H + GAP_Y);
    /* A variant gets its own board file. Keying by bare id drew ten boards for eleven
     * screens, silently, because the second RP-02 overwrote the first in the object. */
    const key = String(s.id).replace(/[^A-Za-z0-9_.#@-]/g, "-");
    let fname = `${key}.dc.html`;
    for (let n = 2; boards[fname]; n++) fname = `${key}-${n}.dc.html`;
    boards[fname] = {
      x: bx, y: by, w: W, h: H, is_interactive: true,
      title: `${s.id} · ${s.name}${arr(s.states).length ? ` (${arr(s.states).length} trạng thái)` : ""}`,
    };
    order.push(fname);
    maxX = Math.max(maxX, bx + W);
    if (band === Math.floor((list.length - 1) / PER_ROW)) y = Math.max(y, by + H + GAP_Y);
  });
  ri++;
}

/* The notes column: what a reader needs beside the boards, not in a file they will not open. */
const NX = maxX + 160;
let ny = 0;
const note = (key, color, text) => { notes[key] = { color, text, w: 360, x: NX, y: ny }; ny += 460; };

note("how", "blue",
  `Mỗi màn ở đây là bản chạy được — bấm Play rồi click thẳng vào.\n\n` +
  `${screens.length} màn · ${screens.reduce((n, s) => n + arr(s.states).length, 0)} trạng thái · ` +
  `${arr(S.viewports).map((v) => `${v.name} ${v.w}×${v.h}`).join(" · ")}.\n\n` +
  `Hàng được đặt tên theo use case đã yêu cầu ra màn đó, nên vị trí của một màn nói nó có mặt vì điều gì.`);

if (arr(S.exclusions).length) {
  note("scope", "gray",
    `Cố ý KHÔNG có, đã thống nhất từ đầu:\n\n` +
    arr(S.exclusions).map((e) => `· ${e.excluded}${e.why ? ` — ${e.why}` : ""}`).join("\n\n"));
}

const openItems = [
  ...arr(S.businessRules).filter((r) => r.status === "open").map((r) => `${r.id} — ${r.rule}`),
  ...arr(S.assumptions).filter((a) => /thấp|low/i.test(String(a.confidence))).map((a) => `${a.id} — ${a.assumed}`),
];
if (openItems.length) {
  note("open", "orange",
    `${openItems.length} thứ chưa chốt. Mọi thứ đứng trên chúng là tạm.\n\n` +
    openItems.slice(0, 4).map((t) => `· ${String(t).slice(0, 220)}`).join("\n\n"));
}

if (S.problem?.metric) {
  note("metric", "teal",
    `Chỉ số đang nhắm:\n\n${S.problem.metric}\n\n` +
    `Nền: ${S.problem.baseline ?? "chưa đo"} ${S.problem.unit ?? ""}` +
    `${S.problem.baselineMeasuredOn ? `\nĐo ngày ${S.problem.baselineMeasuredOn}` : ""}\n\n` +
    `Một màn không di chuyển được con số này là một màn cần được hỏi lại.`);
}

const canvas = {
  v: 3,
  attachments: {},
  boards,
  createdOnFiles: { at: new Date().toISOString(), v: 1 },
  designSystems: [],
  launch: { view: "canvas" },
  notes,
  order,
  pages: [],
  title: arg("--title", `${S.field ?? "Dự án"} — ${screens.length} màn`),
};

mkdirSync(dirname(OUT) || ".", { recursive: true });
writeFileSync(OUT, JSON.stringify(canvas, null, 2) + "\n");
console.log(`[canvas-plan] wrote ${OUT} — ${Object.keys(boards).length} board(s) in ${rows.size} row(s), ${Object.keys(notes).length} note(s), ${W}×${H}`);
for (const [label, list] of rows) console.log(`  ${String(list.length).padStart(2)}  ${label}`);
