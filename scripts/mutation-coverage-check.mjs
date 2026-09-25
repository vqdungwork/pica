/**
 * mutation-coverage-check.mjs: which checks the mutation suite actually proves.
 *
 * The README's strongest claim is that every check "has been seen to fail on the defect it
 * was written for", and mutate.mjs is what makes that claim verifiable. Its summary line
 * reads `100 caught · 0 missed · 0 skipped`, which a reader takes as complete.
 *
 * It is 24 of 39. Fifteen declared checks have no mutation at all, so they are proven in
 * NEITHER direction: never seen to fire on a defect, and never seen to pass on correct
 * input. The word doing the load-bearing work is `exercised`, in mutate.mjs's own closing
 * line "clean on every script exercised" — true, and true of a subset nobody counts.
 *
 * This is not hypothetical. `architecture-check` is one of the fifteen, and its
 * `data-governed` assertion read `e?.name` off a domainModel whose canonical field is
 * `entity`. It failed unconditionally on every correctly-shaped domain model, for three
 * releases, while the mutation suite reported 100 caught · 0 missed. The fixture carries
 * no `architecture` key, so the check abstained rather than ran — honestly, and into a
 * silence nothing counted.
 *
 * A check with no mutation is not a check that is wrong. It is a check nobody can say
 * anything about, and the table does not distinguish the two.
 *
 * It RATCHETS, like rule-coverage-check, for the same reason: a suite that is red from
 * the day it lands teaches everyone to ignore the red. Today's gap is recorded in
 * mutation-coverage-baseline.json and only a number that gets WORSE fails. Adding a check
 * without adding a mutation for it is the thing this stops.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BASELINE = path.join(ROOT, "scripts", "mutation-coverage-baseline.json");

/* Every check any package declares. Read from the manifests rather than a list kept here:
   a list here is one more bare string a rename can leave behind, which is the class of
   defect this repository has now shipped five of. */
const manifests = [path.join(ROOT, "core", "package.json"),
  ...fs.readdirSync(path.join(ROOT, "roles"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(ROOT, "roles", e.name, "package.json"))];

const declared = new Map();   // check id -> owning package
for (const m of manifests) {
  if (!fs.existsSync(m)) continue;
  const pkg = JSON.parse(fs.readFileSync(m, "utf8"));
  for (const c of pkg.checks || []) {
    const run = c.run;
    if (run) declared.set(String(run).replace(/\.mjs$/, ""), pkg.name);
  }
}

if (!declared.size) {
  console.error("FAIL  no checks are declared in any manifest. Either the manifests stopped");
  console.error("      declaring checks, or this check stopped reading them.");
  process.exit(2);
}

const suite = fs.readFileSync(path.join(ROOT, "scripts", "mutate.mjs"), "utf8");
const uncovered = [...declared.entries()]
  .filter(([id]) => !suite.includes(id))
  .map(([id, pkg]) => `${pkg}/${id}`)
  .sort();

console.log(`checks declared: ${declared.size}`);
console.log(`with a mutation: ${declared.size - uncovered.length}`);
console.log(`proven in neither direction: ${uncovered.length}`);

/* Fails closed. A run that found no manifests to read has not measured coverage, it has
   only failed to look, and the two are indistinguishable in a green table. */
const base = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, "utf8"))
  : { uncovered: uncovered.length, checks: uncovered };

if (process.argv.includes("--write-baseline")) {
  fs.writeFileSync(BASELINE, JSON.stringify({ uncovered: uncovered.length, checks: uncovered }, null, 2) + "\n");
  console.log(`\nbaseline written: ${uncovered.length} uncovered`);
  process.exit(0);
}

if (uncovered.length > base.uncovered) {
  console.error("");
  const added = uncovered.filter((c) => !(base.checks || []).includes(c));
  for (const c of added)
    console.error(`FINDING  ${c} is declared as a check and has no mutation. It has never been seen`);
  console.error(`         to fire on a defect, and never seen to pass on correct input.`);
  console.error(`\n${uncovered.length} uncovered, baseline is ${base.uncovered}. It got worse.`);
  process.exit(1);
}

if (uncovered.length < base.uncovered)
  console.log(`\n0 finding(s). Improved: ${base.uncovered} → ${uncovered.length}. Lower the baseline with --write-baseline.`);
else
  console.log(`\n0 finding(s). Nothing regressed. ${uncovered.length} still proven in neither direction:\n  ${uncovered.join("\n  ")}`);
