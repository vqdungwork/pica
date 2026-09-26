#!/usr/bin/env node
// A diagram that was rendered and never placed is a diagram nobody drew. The generator reports
// "wrote 7 diagram(s)" and every check passes, while the reader opens the page and sees six.
//
// This closes the gap between producing a figure and putting it in front of someone.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const page = process.argv[2] ?? "docs/spec/index.html";
const dir = process.argv[3] ?? "docs/spec/diagrams";
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!existsSync(page)) {
  console.log(`figure-placement-check: ${page} does not exist yet — nothing to place into`);
  process.exit(0);
}
if (!existsSync(dir)) {
  console.log(`figure-placement-check: ${dir} does not exist yet — no figures rendered`);
  process.exit(0);
}

const html = readFileSync(page, "utf8");
const svgs = readdirSync(dir).filter((f) => f.endsWith(".svg"));
if (!svgs.length) fail("no-figures", `${dir} holds no diagram, so the document is text alone`);

// a figure is placed either by reference (<img src>) or by being inlined; for the inline case the
// diagram's own title is what proves it, since the SVG source is rewritten on the way in
for (const f of svgs) {
  const name = basename(f, ".svg");
  const src = readFileSync(join(dir, f), "utf8");
  const title = (src.match(/<title[^>]*>([^<]+)<\/title>/) || src.match(/font-weight="[67]\d\d"[^>]*>([^<]{6,})</) || [])[1];
  const placed = html.includes(f) || html.includes(`data-figure="${name}"`) || (title && html.includes(title.trim()));
  if (!placed)
    fail("figure-rendered-but-not-placed",
      `${f} was rendered and the assembled page does not show it. Either place it or stop generating it`);
}

// Placed is not the same as legible. An SVG wider than the column it sits in is scaled down by the
// browser, and its type shrinks with it: a 968px drawing in a 932px column keeps its 11px labels at
// 10.6px, while a 1538px one drops them to 6.7px and the figure becomes a grey texture. This is how
// a diagram passes every check and still tells the reader nothing.
//
// The threshold is 9px because that is roughly where Vietnamese diacritics stop resolving.
const COLUMN = Number(process.env.PICA_FIGURE_COLUMN ?? 900);
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const w = Number((src.match(/viewBox="0 0 ([\d.]+)/) || [])[1]);
  if (!w) continue;
  const sizes = [...src.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1])).filter((n) => n > 0);
  if (!sizes.length) continue;
  const scale = Math.min(1, COLUMN / w);
  const smallest = Math.min(...sizes) * scale;
  if (smallest < 9)
    fail("figure-too-wide-to-read",
      `${f} is ${Math.round(w)}px wide in a ${COLUMN}px column, so its smallest label renders at ` +
      `${smallest.toFixed(1)}px. Draw it along the page's long axis — down, not across — or split it`);
}

// A generated SVG carries whatever colours the generator wrote. Inlined into a page that has a
// dark theme, a literal hex is a light-mode drawing pasted onto a dark document: #16191d text on
// a #ffffff card, both of which the dark surface then renders as black on black. The page is
// correct, the contrast checks look at CSS and see nothing, and every diagram is unreadable.
//
// The fix is a variable with the light value as its fallback — var(--fig-ink, #16191d) — so the
// host page can retheme it and a standalone .svg still opens correctly. So a bare literal is the
// defect, and a literal inside a var() fallback is not.
for (const f of svgs) {
  const src = readFileSync(join(dir, f), "utf8");
  const bare = [...src.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))"/g)]
    .map((m) => m[1])
    // white and black ON a coloured shape are legitimate: they follow that shape, not the theme
    .filter((c) => !/^#(fff|ffffff|000|000000)$/i.test(c));
  if (bare.length)
    fail("figure-hardcodes-a-colour",
      `${f} paints ${[...new Set(bare)].slice(0, 4).join(", ")} as a literal. In a themed page that is a ` +
      `light drawing on whatever background the reader has. Use var(--fig-<role>, <light hex>)`);
}

// and the reverse: a figure the page frames but has no caption is a picture with no question
const framed = [...html.matchAll(/<figure[^>]*>/g)];
for (const tag of framed) {
  if (!/data-label=|<figcaption/.test(tag[0]) && !html.slice(html.indexOf(tag[0])).slice(0, 4000).includes("<figcaption"))
    fail("figure-without-a-caption", `a <figure> carries no label, so the reader must infer what it answers`);
}

if (fails.length) {
  console.error("figure-placement-check FAILED\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`figure-placement-check: ${svgs.length} figure(s) rendered, ${svgs.length} placed in ${basename(page)}`);
