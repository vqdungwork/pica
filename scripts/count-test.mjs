/**
 * count-test.mjs: the numbers this repository states about itself, recounted.
 *
 * Three releases in a row shipped a wrong count. 1.2.1 fixed the check count "in the two
 * places I fixed earlier and not in the four I missed". 1.2.2 found six, including the
 * version badge reading 0.9.5 and the banner, the first image anyone sees, claiming 8
 * specialists and 116 checks. 1.2.3 bumped thirty manifests and left the version badge on
 * 1.2.2 again, which is the same defect a fourth time.
 *
 * The counts were never hard to get right. Nothing recomputed them, so every one of them
 * was a sentence somebody had to remember to edit.
 *
 * Truth is derived from code, never from prose:
 *
 *   version      every manifest, which must also agree with itself
 *   checks       the README's own enumeration table, summed: the table headed "Listed so
 *                the number can be recounted rather than trusted" is the register, and
 *                this is what recounts it
 *   specialists  agents declared across the package manifests
 *   commands     .md files the manifests own
 *   sectors      industries.json, with its aka names and its refused-as-ambiguous entries
 *
 * Then every place that states one of those numbers must agree: four badges, the What
 * ships table, the prose, and the banner SVG.
 *
 * Usage: node scripts/count-test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let failures = 0;
const ok = (m) => console.log(`  pass  ${m}`);
const bad = (m) => { failures++; console.log(`  FAIL  ${m}`); };

/* Asserts that every stated occurrence equals the derived truth. A claim site that
 * matches nothing is itself a failure: the wording changed and this stopped watching it,
 * which is how a check quietly becomes decorative. */
const claim = (label, truth, text, re) => {
  /* First defined group, so a pattern may carry alternatives for the same claim written
   * two ways: "**154 checks**" in a table and "154 automated checks" in a sentence. */
  const found = [...text.matchAll(re)].map((m) => m.slice(1).find((g) => g !== undefined));
  if (!found.length) return bad(`${label}: no occurrence found, the wording moved and this stopped checking it`);
  const wrong = found.filter((f) => f !== String(truth));
  if (wrong.length) bad(`${label}: says ${[...new Set(wrong)].join(", ")}, code says ${truth}`);
  else ok(`${label}: ${truth} (${found.length} place${found.length > 1 ? "s" : ""})`);
};

const README = read("README.md");
const BANNER = read("assets/banner.svg");

/* ---- derive ------------------------------------------------------------- */
const pkgDir = path.join(ROOT, "packages");
const pkgs = fs.readdirSync(pkgDir).filter((d) => fs.existsSync(path.join(pkgDir, d, "package.json")));

let agents = 0, commands = 0, rules = 0;
for (const p of pkgs) {
  const m = JSON.parse(fs.readFileSync(path.join(pkgDir, p, "package.json"), "utf8"));
  const o = m.owns || {};
  agents += (o.agents || []).length;
  commands += (o.commands || []).length;
  rules += (o.rules || []).length;
}

const industries = JSON.parse(read("packages/analyst/data/industries.json"));
const sectors = Object.keys(industries.industries).length;
const ambiguous = Object.keys(industries.ambiguous).length;
const names = Object.values(industries.industries).reduce((n, v) => n + (v.aka || []).length, 0) + sectors;

/* The enumeration table is the register for the check count. Summing it is the whole
 * point of it being a table rather than a number.
 *
 * Scoped to that one table deliberately: "Install only the parts you need" further down
 * has rows of the same shape whose number is a package's rule count, not a check count.
 * Summing every row that looks like a row gave 183 across 29 rows and would have demanded
 * the badge be changed to a number that means nothing. */
const tableStart = README.indexOf("Listed so the number can be recounted rather than trusted");
if (tableStart < 0) { console.error("FAIL  the check enumeration table's heading has moved, and it is the register."); process.exit(2); }
const tableText = README.slice(tableStart).split(/\n(?=[^|])/)[1] || README.slice(tableStart);
const tableRows = [...tableText.matchAll(/^\| `[a-z0-9-]+` \| (\d+) \|/gm)].map((m) => Number(m[1]));
const checks = tableRows.reduce((a, b) => a + b, 0);

/* ---- version: the manifests must agree before anything is compared to them ---- */
console.log("the manifests agree with each other");
{
  const files = [".claude-plugin/plugin.json", ...pkgs.map((p) => `packages/${p}/.claude-plugin/plugin.json`)];
  const versions = new Map();
  for (const f of files) {
    const v = JSON.parse(read(f)).version;
    versions.set(v, (versions.get(v) || 0) + 1);
  }
  const market = JSON.parse(read(".claude-plugin/marketplace.json"));
  for (const p of market.plugins || []) versions.set(p.version, (versions.get(p.version) || 0) + 1);

  if (versions.size !== 1) bad(`manifests disagree: ${[...versions.entries()].map(([v, n]) => `${v}×${n}`).join(", ")}`);
  else ok(`every manifest and marketplace entry says ${[...versions.keys()][0]}`);
  var VERSION = [...versions.keys()].sort().pop();
}

console.log("\nthe enumeration table is the register");
if (!tableRows.length) bad("the check table was not found: it is where the count comes from");
else ok(`${tableRows.length} scripts listed, summing to ${checks}`);

/* ---- every place that states a number ----------------------------------- */
console.log("\nREADME badges");
claim("version badge", VERSION, README, /badge\/version-([0-9.]+)/g);
claim("checks badge", checks, README, /badge\/checks-(\d+)/g);
claim("specialists badge", agents, README, /badge\/specialists-(\d+)/g);
claim("industries badge", sectors, README, /badge\/industries-(\d+)/g);

console.log("\nREADME prose and the What ships table");
claim("plugins", pkgs.length + 1, README, /\*\*(\d+) plugins\*\*/g);
claim("commands", commands, README, /\*\*(\d+) commands\*\*/g);
claim("rule modules", rules, README, /\*\*(\d+) rule modules\*\*/g);
claim("checks stated", checks, README, /\*\*(\d+) checks\*\*|(\d+) automated checks/g);
claim("sectors stated", sectors, README, /\*\*(\d+) sectors\*\*/g);
claim("specialists stated", agents, README, /\*\*(\d+) specialists\*\*/g);
claim("sector names", names, README, /(\d+) names resolving/g);
claim("refused as ambiguous", ambiguous, README, /(\d+) deliberately refused/g);

console.log("\nthe banner, which is the first thing anyone sees");
claim("banner specialists", agents, BANNER, /(\d+) specialists/g);
claim("banner industries", sectors, BANNER, /(\d+) industries/g);
claim("banner checks", checks, BANNER, /(\d+) checks/g);

console.log(`\n${failures} failure(s).`);
process.exit(failures ? 1 : 0);
