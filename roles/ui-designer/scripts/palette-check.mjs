/**
 * palette-check.mjs: the palette gate. Runs at step 6, BEFORE the tiles are shown to
 * anyone and long before a screen is built.
 *
 * contrast-check already measures rendered text against its rendered background. It runs
 * on a capture, which means it runs after the demo exists. By then a palette that cannot
 * reach 4.5:1 has been applied to every screen, and the fix is not a palette edit — it is
 * the demo again.
 *
 * This check asks the same question one phase earlier, of the palette itself, while
 * changing it costs an afternoon.
 *
 * Some traditions cannot pass at any care level. Neumorphism sets a control's fill equal
 * to the page's fill, so the boundary ratio is 1:1 by construction, and a blurred shadow
 * is a gradient with no measurable edge. Offering a style that cannot pass the gate is
 * offering a style you cannot build.
 *
 * Four checks:
 *
 *   1. PALETTE DECLARED  every direction carries a palette with named roles, not a list
 *                        of hexes. "#0B5FFF" is a colour; "accent" is a decision.
 *                        PASS: every direction has >= 1 named role.
 *   2. PAIRS STATED      which foreground sits on which background is declared. Contrast
 *                        is a property of a PAIR, so an undeclared pairing cannot be
 *                        checked and will be decided by whoever builds first.
 *                        PASS: every direction declares >= 1 pair.
 *   3. CONTRAST PROVED   every declared pair meets the floor for its use: 4.5 for body
 *                        text, 3 for large text, 3 for interface components and
 *                        graphical objects.  PASS: 0 pairs under their floor.
 *   4. TRADEOFF         every direction states what it serves badly. A client choosing
 *                        between options with no stated cost is choosing on taste with no
 *                        information.  PASS: every direction carries one.
 *   5. CHOICE RECORDED   recommended, offered and chosen are all present. Where the three
 *                        diverge is the only free signal about whether the sector knowledge
 *                        is any good, and it costs nothing to keep.
 *                        PASS: all three recorded once a choice exists.
 *   6. TILE COMPLETE    a tile that carries only colour and type is a moodboard, and a
 *                        moodboard is insufficient to establish a visual language. Each
 *                        direction declares the interface it shows: a control, an input,
 *                        a container, an icon set and one real fragment from the screen
 *                        inventory.  PASS: every direction declares >= 4 of the five.
 *   7. RESERVED          no hue the sector reserves is spent on a non-semantic role. In
 *                        finance red means declined and green means in credit; an accent
 *                        that borrows either destroys the signal.
 *                        PASS: 0 reserved hues used decoratively.
 *
 * Usage: node palette-check.mjs <state.json> [industries.json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const statePath = process.argv[2];
if (!statePath) { console.error("usage: palette-check.mjs <state.json> [industries.json]"); process.exit(2); }
let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) { console.error(`FAIL  cannot read ${statePath}: ${e.message}`); process.exit(2); }

const dirs = Array.isArray(state.proposals?.directions) ? state.proposals.directions
           : Array.isArray(state.directions) ? state.directions : null;
if (!dirs) {
  console.log("NOT MEASURED  no directions found in state. Nothing was checked.");
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

/* WCAG 2.x relative luminance and contrast ratio. */
const srgb = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const hex = (h) => {
  const s = String(h).trim().replace(/^#/, "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  if (!/^[0-9a-f]{6}$/i.test(f)) return null;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const lum = (rgb) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const FLOOR = { body: 4.5, "large-text": 3, ui: 3, graphic: 3 };

const findings = [];
const add = (check, where, detail) => findings.push({ check, where, detail });

/* Where a sibling package's data file is, in either layout, and never by string sort.
 *
 * In the repository the packages are roles/<name>; installed, each is pica-<name>/<version>.
 * This used to look for roles/analyst — a directory renamed to business-analyst long ago — so from
 * the repository the sector base was never found, and in the cache it sorted versions as strings,
 * which picks 3.16.0 over 3.16.1 and 3.2.1 over 3.15.1. A stale sector base is read silently. */
const vcmp = (a, b) => {
  const pa = String(a).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1));
  const pb = String(b).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
};
const siblingData = (pkg, rel) => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repo = path.join(here, "..", "..", pkg, rel);
  if (fs.existsSync(repo)) return repo;
  const dir = path.join(here, "..", "..", "..", `pica-${pkg}`);
  try {
    const vs = fs.readdirSync(dir).filter((v) => fs.existsSync(path.join(dir, v, rel))).sort(vcmp);
    return vs.length ? path.join(dir, vs[vs.length - 1], rel) : null;
  } catch { return null; }
};

/* the sector's reserved hues, if the knowledge base is reachable */
let reserved = [];
/* Resolved from where this script is installed, not from the project: the old default was a path
 * relative to the working directory, which is the project, so on every real project the sector's
 * reserved hues were never read and reserved-respected checked nothing. */
const indPath = process.argv[3] || siblingData("business-analyst", path.join("data", "industries.json"));
try {
  const ind = JSON.parse(fs.readFileSync(indPath, "utf8")).industries[state.industry?.key];
  reserved = (ind?.colour?.reserved || []).map((r) => String(r.hue).toLowerCase());
} catch { /* absent: the reserved check reports its own scope as 0 rather than passing quietly */ }

let undeclared = 0, unpaired = 0, failed = 0, spent = 0, pairsSeen = 0, noTradeoff = 0, thinTile = 0;
const TILE = ["control", "input", "container", "icons", "fragment"];

for (const d of dirs) {
  const name = d?.name || d?.id || "(unnamed direction)";
  const roles = d?.palette && typeof d.palette === "object" ? d.palette : null;
  if (!roles || !Object.keys(roles).length) {
    undeclared++; add("palette-declared", name, "no palette with named roles. A list of hexes is not a palette");
    continue;
  }
  const pairs = Array.isArray(d.pairs) ? d.pairs : [];
  if (!pairs.length) {
    unpaired++; add("pairs-stated", name,
      "no foreground/background pairs declared. Contrast is a property of a pair, so this cannot be proved and will be settled by whoever builds first");
  }
  for (const p of pairs) {
    const fg = hex(roles[p?.fg] ?? p?.fg), bg = hex(roles[p?.bg] ?? p?.bg);
    if (!fg || !bg) { failed++; add("contrast-proved", `${name} :: ${p?.fg} on ${p?.bg}`, "one side is not a resolvable colour"); continue; }
    pairsSeen++;
    const use = p?.use || "body";
    const need = FLOOR[use] ?? 4.5;
    const got = ratio(fg, bg);
    if (got < need) { failed++; add("contrast-proved", `${name} :: ${p.fg} on ${p.bg} (${use})`,
      `${got.toFixed(2)}:1 against a floor of ${need}:1`); }
  }
  const shows = Array.isArray(d?.tile) ? d.tile.map((x) => String(x).toLowerCase()) : [];
  const have = TILE.filter((k) => shows.some((s) => s.includes(k)));
  if (have.length < 4) {
    thinTile++; add("tile-complete", name,
      `declares ${have.length} of ${TILE.length} interface elements (${TILE.join(", ")}). ` +
      "A tile carrying only colour and type is a moodboard, and the client reacts to a collage rather than to the product");
  }
  if (!d?.servesBadly || !String(d.servesBadly).trim()) {
    noTradeoff++; add("tradeoff-stated", name,
      "does not state what it serves badly. An option with no stated cost is chosen on taste, and re-opened in three weeks");
  }
  for (const [role, value] of Object.entries(roles)) {
    if (/^(status|state|semantic|feedback)/i.test(role)) continue;
    const named = String(value).toLowerCase();
    for (const r of reserved)
      if (named === r || new RegExp(`\\b${r}\\b`).test(role.toLowerCase())) {
        spent++; add("reserved-respected", `${name} :: ${role}`,
          `spends "${r}", which this sector reserves for a status meaning. The signal stops being unambiguous`);
      }
  }
}

/* 5. CHOICE RECORDED — only once a choice has been made; before that there is nothing to record */
const rec = state.proposals?.recommended ?? state.direction?.recommended;
const chosen = state.proposals?.chosen ?? state.direction?.chosen ?? state.direction?.name;
let unrecorded = 0;
if (chosen) {
  if (!rec) { unrecorded++; add("choice-recorded", "proposals.recommended",
    "a direction was chosen but none was recommended. Without it you cannot tell whether the default is being overridden"); }
  if (!dirs.length) { unrecorded++; add("choice-recorded", "proposals.directions", "a choice exists but the options offered were not kept"); }
}

const table = [
  ["palette-declared",   undeclared, `${dirs.length} direction(s)`],
  ["pairs-stated",       unpaired,   `${dirs.length} direction(s)`],
  ["contrast-proved",    failed,     `${pairsSeen} pair(s) measured`],
  ["tile-complete",      thinTile,   `${dirs.length} direction(s)`],
  ["tradeoff-stated",    noTradeoff, `${dirs.length} direction(s)`],
  ["choice-recorded",    unrecorded, chosen ? "a choice has been made" : "no choice yet, nothing to record"],
  ["reserved-respected", spent,      `${reserved.length} reserved hue(s) known`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(18)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
if (!reserved.length)
  console.log("\nNOTE  the sector's reserved hues could not be read, so reserved-respected measured nothing.");

console.log(`\n${findings.length} finding(s). The palette ${findings.length ? "is NOT ready to be offered" : "can be offered"}.`);
process.exit(findings.length ? 1 : 0);
