#!/usr/bin/env node
// A document whose parts run 1, 2, 3, 4, 3b, 5 tells the reader their own sense of order is wrong.
// It happens whenever a section is inserted by editing the generator rather than by reading the
// rendered page — which is every time, because the generator is where the work is done.
//
// Nothing else catches it. Every diagram is placed, every link resolves, every id exists, and the
// document still reads as though a page fell out of the printer in the wrong order.
import { readFileSync, existsSync } from "node:fs";

const page = process.argv[2] ?? "docs/spec/index.html";
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!existsSync(page)) {
  console.log(`section-order-check: ${page} does not exist yet`);
  process.exit(0);
}
const html = readFileSync(page, "utf8");
const labels = [...html.matchAll(/<p class="eyebrow">([^<]+)<\/p>/g)].map((m) => m[1].trim());

// "Phần 3b" sorts after "Phần 3" and before "Phần 4": a number, then an optional letter
const rank = (t) => {
  const m = /(?:phần|part|section)\s*(\d+)\s*([a-z])?/i.exec(t);
  return m ? Number(m[1]) * 100 + (m[2] ? m[2].toLowerCase().charCodeAt(0) - 96 : 0) : null;
};
const numbered = labels.map((t) => ({ t, r: rank(t) })).filter((x) => x.r !== null);

for (let i = 1; i < numbered.length; i++) {
  if (numbered[i].r < numbered[i - 1].r)
    fail("sections-out-of-order",
      `"${numbered[i].t}" comes after "${numbered[i - 1].t}" in the page. A reader counting along the document finds the count going backwards`);
}
const seen = new Map();
for (const { t, r } of numbered) {
  if (seen.has(r)) fail("duplicate-section-number", `"${t}" and "${seen.get(r)}" carry the same number`);
  seen.set(r, t);
}
// a gap is not a defect on its own — a section may be absent because the project has no material
// for it — but a document that starts at 2 lost its first part somewhere
if (numbered.length && numbered[0].r >= 200)
  fail("sections-out-of-order", `the first numbered part is "${numbered[0].t}". Something before it was dropped`);

if (fails.length) {
  console.error("section-order-check FAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`section-order-check: ${numbered.length} numbered part(s), in order`);
