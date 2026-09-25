/**
 * state-contract-check.mjs: the state contract, held in both directions.
 *
 * contract-check already holds `requires` against `produces`: a package cannot need a key
 * nobody declares. What nothing held is the other side of the same contract — the `needs`
 * a CHECK declares, and the keys a package produces that no check ever reads.
 *
 * Both gaps have already cost this project once each.
 *
 * `proposals` was required by ui-designer and produced by nobody for an entire release. It
 * stayed invisible because check-level needs are not validated the way package requires are,
 * and it only surfaced when a restructure forced the requirement to be declared.
 *
 * `stack` and `environments` were declared as produced by solution-architect on the day that
 * role was written, while architecture-check reads them nested inside `architecture`. Two
 * keys that no longer existed, announced as outputs, from the newest role in the repository.
 *
 * Three checks:
 *
 *   1. PRODUCED READ   every key a package produces is read by some check, or is named in
 *                      state-carried.json with a reason. A key written and never read is
 *                      either dead weight or an unwritten check, and the difference has to
 *                      be somebody's decision rather than an accident.
 *   2. NEED PRODUCED   every need a check declares is satisfiable. A need is an ALTERNATION:
 *                      "problem|trigger|commercialConstraint" holds if any one of the three
 *                      is produced, so it fails only when none is. An earlier draft split the
 *                      alternation and demanded each branch, which reported three defects on
 *                      a correct manifest — a check that fires on correct input is worse than
 *                      no check.
 *   3. CARRIED HONEST  every entry in state-carried.json is still unread, and still exists.
 *                      An allowlist that outlives its reason is a hole with a comment on it.
 *
 * The allowlist is a ratchet, like rule-coverage-baseline.json: the count may fall and never
 * rise. Adding a key to it is a decision, and it is recorded where the next person sees it.
 *
 * Usage: node scripts/state-contract-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (k) => String(k).split(".")[0].split("=")[0].trim();

const pkgs = [["core", path.join(ROOT, "core")],
  ...fs.readdirSync(path.join(ROOT, "roles")).sort().map((n) => [n, path.join(ROOT, "roles", n)])];

const produced = new Map();   // key -> package
const needed = new Map();     // key -> Set of "pkg/check"
const needGroups = [];        // the alternations, kept whole
for (const [name, dir] of pkgs) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  for (const k of m.produces?.state || []) if (!produced.has(base(k))) produced.set(base(k), name);
  for (const c of m.checks || [])
    for (const n of c.needs || []) {
      if (String(n).startsWith("@")) continue;
      const alts = String(n).split("|").map(base);
      needGroups.push({ alts, by: `${name}/${c.run}` });
      for (const alt of alts) needed.set(alt, (needed.get(alt) || new Set()).add(`${name}/${c.run}`));
    }
}

const carriedRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/state-carried.json"), "utf8"));
const carried = new Map();
for (const [group, v] of Object.entries(carriedRaw)) {
  if (group === "_note") continue;
  if (!v.why || !String(v.why).trim() || !Array.isArray(v.keys)) {
    console.error(`FAIL  state-carried.json group "${group}" has no reason or no keys.`);
    process.exit(2);
  }
  for (const k of v.keys) carried.set(k, group);
}

const findings = [];
const add = (check, where, detail) => findings.push({ check, where, detail });

let unread = 0;
for (const [k, pkg] of produced)
  if (!needed.has(k) && !carried.has(k)) {
    unread++; add("produced-read", `${pkg} produces "${k}"`,
      "no check reads it and state-carried.json does not name it. Either write the check, or add it with a reason — a key written and never read is a decision nobody made");
  }

let unwritten = 0;
const reported = new Set();
for (const g of needGroups) {
  if (g.alts.some((a) => produced.has(a))) continue;
  const id = g.alts.join("|") + g.by;
  if (reported.has(id)) continue;
  reported.add(id);
  unwritten++; add("need-produced", `"${g.alts.join(" or ")}" needed by ${g.by}`,
    "no package declares producing any of them. The check will abstain on every project forever and report that as honesty");
}

let stale = 0;
for (const [k, group] of carried) {
  if (!produced.has(k)) { stale++; add("carried-honest", `"${k}" (${group})`,
    "listed as carried, but no package produces it any more. An allowlist that outlives its reason is a hole with a comment on it"); }
  else if (needed.has(k)) { stale++; add("carried-honest", `"${k}" (${group})`,
    `is now read by ${[...needed.get(k)].sort().join(", ")}. Remove it from state-carried.json — the ratchet only falls`); }
}

const table = [
  ["produced-read",  unread,    `${produced.size} key(s) produced, ${carried.size} carried by decision`],
  ["need-produced",  unwritten, `${needGroups.length} need(s) declared by checks`],
  ["carried-honest", stale,     `${carried.size} allowlisted`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
const notYet = (carriedRaw["not-yet-checked"]?.keys || []).length;
if (notYet) console.log(`\nNOTE  ${notYet} key(s) are carried as "not-yet-checked". They are named rather than\n      invisible, but an operator reading them still cannot tell whether they hold.`);

console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
