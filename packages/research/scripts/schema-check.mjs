/**
 * schema-check.mjs — the research gate. Runs at the end of step 1.7, before the
 * measurement table is handed to the Product Designer at 3.1.
 *
 * Research fails quietly. A lazy unit and a careful one have the same shape, so a
 * table with one guessed row looks exactly like a table with none, and the guess is
 * indistinguishable from the measurement forever afterwards.
 *
 * Six checks:
 *
 *   1. SAMPLE SIZE     at least 3 products. A field cannot be characterised from two.
 *                      PASS: >= 3.
 *   2. FOUNDATIONS     all 9 recorded per product, or null WITH a reason.
 *                      PASS: 0 silently missing.
 *   3. TYPE ROLES      typography recorded by role, not as bare sizes. 16px is body in
 *                      one product and a caption in another, so sizes alone are not
 *                      comparable.  PASS: every product has named roles.
 *   4. PROVENANCE      every product carries a source URL and a method.
 *                      PASS: 0 unsourced.
 *   5. SHIPPED         no concept sites in the measurement table. A Dribbble shot has
 *                      no empty state and no error, so measuring it measures something
 *                      that never existed.  PASS: 0 concept sources.
 *   6. TRADITION       every product named to a tradition, or "none" WITH a reason.
 *                      PASS: 0 unnamed.
 *
 * Exit 0 only when every check passes. A check that could not run is a failure.
 *
 * THE SHAPE THIS READS IS DOCUMENTED IN design-vocabulary.md, under "The shape
 * measured.json has to be in". For three releases it was not, and `nullReasons` existed
 * only in this file, so anyone writing the artefact by hand produced something this
 * rejected for a reason it could not explain. If the shape changes here, change it there
 * in the same commit.
 *
 * Usage: node schema-check.mjs <research.json>
 */
import fs from "fs";

const [, , path] = process.argv;
if (!path) {
  console.error("usage: node schema-check.mjs <research.json>");
  process.exit(2);
}

let doc;
try {
  doc = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (e) {
  console.error(`FAIL  ${path} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

/* Two commands invoke this with two different files: /pica passes
 * docs/research/measured.json, /picaflow passes .pica/state.json. Both are legitimate and
 * carry the same table, but a report that does not say which one it read leaves a reader
 * checking the wrong file when the count surprises them. */
const source = doc.products ? "products" : doc.measured ? "measured" : null;
const products = doc.products || doc.measured || [];

/* An empty table is not a clean run. Reporting zero findings on nothing measured is
 * the silence-reads-as-success failure this project has a rule against. */
if (!Array.isArray(products) || !products.length) {
  console.error("FAIL  no products in the measurement table. Research did not run.");
  process.exit(2);
}

const FOUNDATIONS = ["typography", "colour", "spacing", "elevation", "motion",
                     "iconography", "grid", "density", "accessibility"];
const TYPE_ROLES = ["display", "heading", "body", "label", "caption"];

/* Hosts that publish concepts rather than shipped products. A concept has no error
 * state, no empty state and no forty-character name, so its numbers describe a
 * situation that never occurred. Kept here rather than in config because it is a
 * statement about what those sites are, not a project preference. */
const CONCEPT_HOSTS = ["dribbble.com", "behance.net", "pinterest.", "figma.com/community"];

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- 1. sample size ----------------------------------------------------- */
let sample = 0;
if (products.length < 3) {
  sample = 1;
  fail("sample-size", "the table",
    `${products.length} product(s). Three is the floor: with two, agreement and coincidence look identical`);
}

/* ---- 2. foundations ----------------------------------------------------- *
 * A missing value is allowed. A missing value with no reason is not: it is
 * indistinguishable from a value nobody looked for. */
let missing = 0;
for (const p of products) {
  const name = p.product || p.name || "(unnamed)";
  for (const f of FOUNDATIONS) {
    if (!(f in p)) {
      missing++;
      fail("foundations", name, `${f} absent. Record it, or record null with a reason`);
    } else if (p[f] === null && !(p.nullReasons || {})[f]) {
      missing++;
      fail("foundations", name, `${f} is null with no reason. Not measured and not measurable look the same`);
    }
  }
}

/* ---- 3. type roles ------------------------------------------------------ */
let bareSizes = 0;
for (const p of products) {
  const name = p.product || p.name || "(unnamed)";
  const t = p.typography;
  if (t === null || t === undefined) continue;          // already reported by check 2
  const roles = Object.keys(t || {}).map((k) => k.toLowerCase());
  const named = TYPE_ROLES.filter((r) => roles.includes(r));
  if (!named.length) {
    bareSizes++;
    fail("type-roles", name,
      `typography carries no named roles (${TYPE_ROLES.join(", ")}). Sizes alone are not comparable between products`);
  }
}

/* ---- 4. provenance ------------------------------------------------------ */
let unsourced = 0;
for (const p of products) {
  const name = p.product || p.name || "(unnamed)";
  if (!p.url || !String(p.url).trim()) {
    unsourced++;
    fail("provenance", name, "no source URL. The number cannot be re-checked, so it cannot be defended");
  }
  if (!p.method || !String(p.method).trim()) {
    unsourced++;
    fail("provenance", name, "no method recorded. A lazy unit and a careful one have the same shape without it");
  }
}

/* ---- 5. shipped, not concept -------------------------------------------- */
let concepts = 0;
for (const p of products) {
  const name = p.product || p.name || "(unnamed)";
  const url = String(p.url || "").toLowerCase();
  const hit = CONCEPT_HOSTS.find((h) => url.includes(h));
  if (hit) {
    concepts++;
    fail("shipped", name,
      `measured from ${hit}, which publishes concepts. A concept has no error state and no long content, so its numbers describe a product that was never built`);
  }
}

/* ---- 6. tradition named ------------------------------------------------- */
let unnamed = 0;
for (const p of products) {
  const name = p.product || p.name || "(unnamed)";
  /* "none" is a real answer here and a void everywhere else in this repository, and one
   * word meaning two things across scripts is the kind of contradiction that survives
   * every careful re-reading. So a deliberate "none" is now distinguishable from an
   * emptied field the same way every other deliberate exception here is: it carries a
   * reason. A rule with no register is a preference. */
  const t = String(p.tradition || "").trim();
  const deliberateNone = /^(none|no tradition)$/i.test(t);
  if (!("tradition" in p) || !t) {
    unnamed++;
    fail("tradition", name,
      'no tradition named. Write one, or "none" with a traditionWhy. This is what stops a direction being called something invented');
  } else if (deliberateNone && !String(p.traditionWhy || "").trim()) {
    unnamed++;
    fail("tradition", name,
      '"none" with no traditionWhy. A product that follows no named tradition is a finding worth stating; ' +
      'an emptied field looks identical, and nothing can tell them apart without the reason');
  }
}

/* ---- agreement table ---------------------------------------------------- *
 * Reported rather than enforced: where a field agrees is a convention, where it
 * splits is a decision that belongs to a human. Both are the point of the exercise. */
const agree = [], split = [];
for (const f of FOUNDATIONS) {
  const vals = products.map((p) => JSON.stringify(p[f])).filter((v) => v && v !== "null");
  if (vals.length < 2) continue;
  (new Set(vals).size === 1 ? agree : split).push(f);
}

/* ---- report ------------------------------------------------------------- */
console.log(`products measured: ${products.length}   (from the "${source}" key of ${path})`);
console.log(`agreed on:         ${agree.length ? agree.join(", ") : "nothing"}`);
console.log(`split on:          ${split.length ? split.join(", ") : "nothing"}`);
console.log("");

const table = [
  ["sample-size", sample, `${products.length} products, 3 is the floor`],
  ["foundations", missing, `${products.length * FOUNDATIONS.length} values expected`],
  ["type-roles", bareSizes, `${products.length} products`],
  ["provenance", unsourced, `${products.length} products`],
  ["shipped", concepts, `${products.length} sources`],
  ["tradition", unnamed, `${products.length} products`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(14)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

if (!findings.length && !split.length)
  console.log("\nNOTE  the field agrees on everything measured. Either it is unusually settled, or the sample is too similar to be informative.");

console.log(`\n${findings.length} finding(s). Research ${findings.length ? "is NOT ready to hand to design" : "passes the schema gate"}.`);
process.exit(findings.length ? 1 : 0);
