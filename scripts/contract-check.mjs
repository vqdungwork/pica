/**
 * contract-check.mjs: the manifests against each other.
 *
 * Every package declares what it `requires` and what it `produces`, and pica-status.mjs
 * resolves that graph to decide whether a package is READY or BLOCKED. Nothing has ever
 * checked the graph itself, so the declarations drifted from the chain they describe and
 * from each other. Walking them by hand found seven distinct defects, every one of which
 * is invisible at runtime because a missing producer simply leaves a package BLOCKED and
 * a duplicate producer simply picks one.
 *
 * The failures this prevents, each observed in 1.2.4:
 *
 *   - `docs/contract.md` declared by two producers, core and analyst. The resolver
 *     attributes a requirement to whichever it sees first, which invented an edge from
 *     research to analyst that reverses the documented chain order.
 *   - `state.field` required by analyst and discover and produced by nobody: the main
 *     thread writes it at intake and never declared so.
 *   - `state.measured` referenced by the flow and declared by no package at all.
 *   - `model` requiring `state.estimate`, which the chain produces three phases later.
 *   - Two figma checks declaring no phase and no args, so pica-verify reports them as
 *     unplaceable and they have never run.
 *
 * Six assertions:
 *
 *   1. SINGLE PRODUCER   no state key or artifact is produced by two packages.
 *   2. REQUIREMENT MET   everything required is produced by some package.
 *   3. GATE GRANTED      every required gate is granted by some package.
 *   4. GATE NOT SELF     no package grants a gate it also requires.
 *   5. CHECK PLACED      every declared check carries a phase and args, so pica-verify
 *                        can place it. A check nothing can place has never run.
 *   6. NO CYCLE          the producer graph is acyclic.
 *
 * Value predicates and gate parameters are stripped before matching: `figmaInScope=true`
 * is the key `figmaInScope`, and `htmlApproved:<wp>` is the gate `htmlApproved`. Matching
 * the decorated form is how a satisfied requirement reads as unmet.
 *
 * Fails closed: zero packages found is an error, not a pass.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG_DIR = path.join(ROOT, "packages");

if (!fs.existsSync(PKG_DIR)) {
  console.error(`FAIL  no packages/ under ${ROOT}. Nothing was checked, and that is not a pass.`);
  process.exit(2);
}

/* ---- load ---------------------------------------------------------------- */
const manifests = [];
for (const name of fs.readdirSync(PKG_DIR).sort()) {
  const file = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(file)) continue;
  try {
    manifests.push({ dir: name, m: JSON.parse(fs.readFileSync(file, "utf8")) });
  } catch (e) {
    console.error(`FAIL  packages/${name}/package.json did not parse (${e.message}).`);
    console.error("      Nothing was checked, and that is not a pass.");
    process.exit(2);
  }
}
if (manifests.length < 2) {
  console.error(`FAIL  found ${manifests.length} manifest(s) under packages/. Fewer than two cannot`);
  console.error("      describe a graph, so nothing was checked and that is not a pass.");
  process.exit(2);
}

/* `key=value` is a predicate on a key; `gate:<param>` is a parameterised gate. Both
   resolve to the bare name, or every decorated requirement reads as unmet. */
const bare = (s) => String(s || "").split("=")[0].split(":")[0].trim();
const arr = (x) => (Array.isArray(x) ? x : []);
const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const name = (e) => e.m.name || e.dir;
const req = (e) => e.m.requires || {};
const prod = (e) => e.m.produces || {};
const grants = (e) =>
  arr(e.m.definitionOfDone).filter((d) => d && d.type === "gate").map((d) => bare(d.grants));

/* ---- 1. SINGLE PRODUCER -------------------------------------------------- */
const producers = new Map(); // "state:key" | "art:path" -> [pkg]
for (const e of manifests) {
  for (const s of arr(prod(e).state)) push(`state:${bare(s)}`, name(e));
  for (const a of arr(prod(e).artifacts)) push(`artifact:${a}`, name(e));
}
function push(key, pkg) {
  if (!producers.has(key)) producers.set(key, []);
  if (!producers.get(key).includes(pkg)) producers.get(key).push(pkg);
}

let dupBad = 0;
for (const [key, pkgs] of [...producers].sort()) {
  if (pkgs.length < 2) continue;
  dupBad++;
  fail("single-producer", key,
    `produced by ${pkgs.join(" and ")}. A requirement on it resolves to whichever the walk ` +
    `sees first, so the edge it creates is arbitrary. Give it one owner.`);
}

/* ---- 2. REQUIREMENT MET -------------------------------------------------- */
let unmetBad = 0;
for (const e of manifests) {
  for (const s of arr(req(e).state)) {
    if (producers.has(`state:${bare(s)}`)) continue;
    unmetBad++;
    fail("requirement-met", `${name(e)} requires state.${bare(s)}`,
      "and no package declares it produces that. Either a package writes it and has not said so, " +
      "or the requirement can never be satisfied and the package is permanently BLOCKED.");
  }
  for (const a of arr(req(e).artifacts)) {
    if (producers.has(`artifact:${a}`)) continue;
    unmetBad++;
    fail("requirement-met", `${name(e)} requires ${a}`,
      "and no package declares it produces that artifact.");
  }
}

/* ---- 3 & 4. GATES -------------------------------------------------------- */
const grantedBy = new Map();
for (const e of manifests)
  for (const g of grants(e)) {
    if (!grantedBy.has(g)) grantedBy.set(g, []);
    grantedBy.get(g).push(name(e));
  }

let gateBad = 0, selfBad = 0;
for (const e of manifests) {
  const mine = new Set(grants(e));
  for (const w of arr(req(e).gates)) {
    const g = bare(w);
    if (!grantedBy.has(g)) {
      gateBad++;
      fail("gate-granted", `${name(e)} requires gate "${w}"`,
        "and no package grants it, so this package can never become READY.");
    }
    if (mine.has(g)) {
      selfBad++;
      fail("gate-not-self", `${name(e)} both grants and requires "${w}"`,
        "No package may grant a gate it benefits from.");
    }
  }
}

/* ---- 5. CHECK PLACED ----------------------------------------------------- *
 * A check that runs somewhere pica cannot invoke declares `runsIn`, and figma's two
 * console scripts already did: the manifests said so and no consumer read it, so
 * pica-verify reported them as unplaceable when their placement was never in doubt.
 * Such a check needs no phase and no args; it needs a `passes` line, because an
 * abstention that cannot say what passing looks like is not an abstention, it is a gap. */
let placedBad = 0, checksSeen = 0, manualSeen = 0;
for (const e of manifests) {
  for (const c of arr(e.m.checks)) {
    checksSeen++;
    if (c.runsIn) {
      manualSeen++;
      if (!c.passes) {
        placedBad++;
        fail("check-placed", `${name(e)}/${c.run || "(unnamed)"}`,
          `runs in "${c.runsIn}" and declares no "passes". A check pica cannot invoke abstains, ` +
          "and an abstention that cannot say what passing looks like is a gap wearing a reason.");
      }
      continue;
    }
    const missing = [];
    if (!c.phase) missing.push("phase");
    if (!c.args) missing.push("args");
    if (!missing.length) continue;
    placedBad++;
    fail("check-placed", `${name(e)}/${c.run || "(unnamed)"}`,
      `declares no ${missing.join(" and no ")} and no "runsIn", so pica-verify cannot place it ` +
      "and it has never run. A check that cannot be placed is not a pass.");
  }
}
if (!checksSeen) fail("check-placed", "packages", "declare no checks at all, which cannot be right.");

/* ---- 6. NO CYCLE --------------------------------------------------------- */
const edges = new Map(); // pkg -> Set(pkg it depends on)
for (const e of manifests) {
  const deps = new Set();
  for (const s of arr(req(e).state))
    for (const p of producers.get(`state:${bare(s)}`) || []) if (p !== name(e)) deps.add(p);
  for (const a of arr(req(e).artifacts))
    for (const p of producers.get(`artifact:${a}`) || []) if (p !== name(e)) deps.add(p);
  edges.set(name(e), deps);
}
let cycleBad = 0;
const WHITE = 0, GREY = 1, BLACK = 2;
const colour = new Map([...edges.keys()].map((k) => [k, WHITE]));
const stack = [];
const seen = new Set();
const visit = (n) => {
  colour.set(n, GREY);
  stack.push(n);
  for (const d of edges.get(n) || []) {
    if (colour.get(d) === GREY) {
      const loop = stack.slice(stack.indexOf(d)).concat(d).join(" -> ");
      if (!seen.has(loop)) {
        seen.add(loop);
        cycleBad++;
        fail("no-cycle", loop, "is a cycle in the producer graph. No ordering satisfies it.");
      }
      continue;
    }
    if (colour.get(d) === WHITE) visit(d);
  }
  stack.pop();
  colour.set(n, BLACK);
};
for (const n of edges.keys()) if (colour.get(n) === WHITE) visit(n);

/* ---- report -------------------------------------------------------------- */
console.log(`packages: ${manifests.map(name).join(", ")}`);
console.log(`declarations: ${producers.size} produced, ${checksSeen} check(s)\n`);

const table = [
  ["single-producer", dupBad, `${producers.size} key(s) and artifact(s) declared`],
  ["requirement-met", unmetBad, "every requires entry has a declared producer"],
  ["gate-granted", gateBad, `${grantedBy.size} gate(s) granted`],
  ["gate-not-self", selfBad, "no package grants a gate it requires"],
  ["check-placed", placedBad, `${checksSeen} check(s) declared, ${manualSeen} of them run outside pica`],
  ["no-cycle", cycleBad, `${manifests.length} package(s) in the graph`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
