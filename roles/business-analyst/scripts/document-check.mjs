#!/usr/bin/env node
// Two things about the assembled document that nothing else looks at: the order a reader counts
// along in, and whether the document decided its own appearance.
//
// A document whose parts run 1, 2, 3, 4, 3b, 5 tells the reader their own sense of order is wrong.
// It happens whenever a section is inserted by editing the generator rather than by reading the
// rendered page — which is every time, because the generator is where the work is done.
//
// Nothing else catches it. Every diagram is placed, every link resolves, every id exists, and the
// document still reads as though a page fell out of the printer in the wrong order.
import { readFileSync, existsSync } from "node:fs";

const page = process.argv[2] ?? "docs/spec/index.html";
const CHECKS = ["document-theme-not-pinned", "duplicate-section-number", "sections-out-of-order"];
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!existsSync(page)) {
  console.log(`document-check: ${page} does not exist yet, so nothing was read. This is an abstention, not a pass.`);
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

/* A handover document is not an application. Two people reading the same spec on the same call
 * must see the same page, and whether one of them has their laptop set to dark is not a fact
 * about the document — it is a fact about their laptop. An app follows the reader's preference;
 * a deliverable does not, any more than a PDF would.
 *
 * So the document pins a theme on its root element rather than inheriting one. It may pin dark if
 * that is the decision; what it may not do is leave the answer to the reader's operating system
 * and then be handed to a client who opens it somewhere unexpected. */
const root = (html.match(/<html[^>]*>/i) || [""])[0];
if (/prefers-color-scheme/.test(html) && !/data-theme\s*=\s*["'](light|dark)["']/i.test(root))
  fail("document-theme-not-pinned",
    "the page reacts to prefers-color-scheme and pins no data-theme on <html>, so what a client " +
    "sees depends on their own system setting. A deliverable decides its own appearance");

/* The runner's row contract: one `pass|FAIL  <id>  N finding(s)   (scope)` per assertion, so
 * pica-verify counts what was verified rather than reporting a clean run as "0 assertion(s)". */
for (const id of CHECKS) {
  const n = fails.filter((x) => x.startsWith(`  [${id}]`)).length;
  console.log(`${n ? "FAIL" : "pass"}  ${id.padEnd(28)} ${String(n).padStart(3)} finding(s)   (${"document-check"})`);
}
if (fails.length) {
  console.error("document-check FAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`document-check: ${numbered.length} numbered part(s) in order, theme pinned to ${(/data-theme\s*=\s*["\']([a-z]+)/i.exec(root) || [0, "nothing"])[1]}`);
