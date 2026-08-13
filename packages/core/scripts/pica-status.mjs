/**
 * pica-status.mjs — what can run now, what is blocked, and why.
 *
 * A report, never a gate: it exits 0 even when everything is blocked, because its job is
 * to explain state, not to enforce it. Enforcement lives in each command's requires check
 * and in the write-gate hook.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const WP_PLACEHOLDER = "<wp>";

const statePath = process.argv[2] || ".pica/state.json";

// packages/ is resolved from THIS SCRIPT's own location, not from the working
// directory, by WALKING UP AND VALIDATING rather than by counting path segments.
// State and artifacts belong to the PROJECT, not to pica's own repo, and are
// resolved against process.cwd() below (the default base for a relative path)
// so that this works when run from inside a project directory.
//
// Why validation, not arithmetic: this script ships inside packages/core/scripts/
// in the REPO layout, where "two levels up" happens to land on packages/. But an
// INSTALLED pica-core lives at cache/<marketplace>/pica-core/<version>/scripts/,
// where "two levels up" lands on cache/<marketplace>/pica-core/ -- whose only
// child is the version directory (e.g. "0.6.0"), which itself holds core's OWN
// package.json. Fixed arithmetic can't tell that apart from a real packages/
// directory: it printed "READY 0.6.0", a phantom package named after a version
// string, with exit 0 -- worse than erroring, because it looked like an answer.
// The earlier fix (0af543b) was verified ONLY against the repo layout, which is
// the one layout where a "../.." offset can never be wrong, so this bug shipped
// anyway and was never seen failing.
//
// So: walk upward from this script's own directory. At each level, consider the
// level itself and any child named "packages" as a candidate. A candidate
// QUALIFIES only if it contains at least two subdirectories that each hold a
// package.json whose "name" field equals that subdirectory's own name --
// e.g. packages/core/package.json's name is "core", matching directory "core".
// That rejects the version-directory false positive: core's manifest name is
// "core" but the directory holding it is "0.6.0", a mismatch that doesn't count,
// and pica-core/ itself has only one child ("0.6.0"), not two qualifying ones.
// A resolver that cannot find a qualifying candidate says so and exits 2; it
// never prints a package list derived from a directory that did not qualify.
function qualifies(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  let matches = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const mp = path.join(dir, e.name, "package.json");
    if (!fs.existsSync(mp)) continue;
    let m;
    try { m = JSON.parse(fs.readFileSync(mp, "utf8")); } catch { continue; }
    if (m && m.name === e.name) matches++;
    if (matches >= 2) return true;
  }
  return false;
}

function findPackagesDir(startDir) {
  const tried = [];
  let dir = path.resolve(startDir);
  for (;;) {
    for (const c of [dir, path.join(dir, "packages")]) {
      if (tried.includes(c)) continue;
      tried.push(c);
      if (fs.existsSync(c) && qualifies(c)) return { dir: c, tried };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached the filesystem root
    dir = parent;
  }
  return { dir: null, tried };
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const { dir: PKG_DIR, tried } = findPackagesDir(SCRIPT_DIR);

if (!PKG_DIR) {
  console.error("no packages/ directory found: no candidate qualified.");
  console.error("A candidate must contain at least two subdirectories each holding a package.json");
  console.error('whose "name" matches that subdirectory\'s own name. Walking up from:');
  console.error(`  ${SCRIPT_DIR}`);
  console.error("Checked:");
  for (const t of tried) console.error(`  ${t}`);
  process.exit(2);
}

let state = {};
let stateError = null;
if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch (e) {
    stateError = e.message;
    state = {};
  }
}

// NOTHING writes state.gates. What the commands actually write is
// state.workPackages.<wp>.<key> for a per-package gate (e.g. "htmlApproved") and a
// top-level state.<key> boolean for a project-level gate (e.g. "intakeApproved") —
// see packages/html/commands/pica-wp.md and packages/core/hooks/gate-figma-write.
// state.gates is still honoured if present, for forward compatibility with any
// command that adopts that vocabulary directly, but nothing here depends on it.
const gates = state.gates || {};
const workPackages = state.workPackages || {};

// A bare key (no "=want") checks PRESENCE only, not truthiness — a manifest requiring a
// bare boolean key would read as satisfied even when that key is explicitly set to
// `false`. Today's convention is to spell booleans as "key=true" for that reason.
const stateHas = (expr) => {
  const [key, want] = expr.split("=");
  const val = key.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
  if (want === undefined) return val !== undefined && val !== null;
  return String(val) === want;
};

// A bare gate (no work-package template): satisfied by the legacy state.gates
// vocabulary if present, otherwise by a top-level boolean of that exact name.
const gateGranted = (name) => Boolean(gates[name]?.granted) || Boolean(state[name]);

// A per-work-package gate for one specific wp: satisfied by the legacy
// state.gates vocabulary under its resolved name, otherwise by
// workPackages.<wp>.<key>, where `key` is the template with "<wp>" and its
// separator removed (e.g. "htmlApproved:<wp>" -> key "htmlApproved").
const wpGateGranted = (resolvedName, key, wp) =>
  Boolean(gates[resolvedName]?.granted) || Boolean(workPackages[wp]?.[key]);

// A required gate name may be a template over work packages, e.g. "htmlApproved:<wp>".
// Resolve it against the real work packages instead of looking it up literally — the
// literal string "<wp>" never appears as a real gate key. Returns the list of missing
// gate names: empty if the requirement is satisfied.
const resolveGate = (template) => {
  if (!template.includes(WP_PLACEHOLDER)) return gateGranted(template) ? [] : [template];

  const idx = template.indexOf(WP_PLACEHOLDER);
  const prefix = template.slice(0, idx);
  const suffix = template.slice(idx + WP_PLACEHOLDER.length);
  const key = prefix.replace(/[:.]$/, ""); // "htmlApproved:" -> "htmlApproved"

  let wps = Object.keys(workPackages);
  if (!wps.length) {
    wps = Object.keys(gates)
      .filter((k) => k.startsWith(prefix) && k.endsWith(suffix) && k.length > prefix.length + suffix.length)
      .map((k) => k.slice(prefix.length, k.length - suffix.length));
  }

  if (!wps.length) return [template];

  const resolved = wps.map((wp) => `${prefix}${wp}${suffix}`);
  const satisfied = wps.some((wp) => wpGateGranted(`${prefix}${wp}${suffix}`, key, wp));
  return satisfied ? [] : resolved;
};

const rows = [];
if (stateError) {
  rows.push({
    name: statePath,
    verdict: "UNREADABLE",
    missing: [`could not parse ${statePath}: ${stateError} — evaluating every package against empty state`],
  });
}

for (const name of fs.readdirSync(PKG_DIR).filter((d) => !d.startsWith("_"))) {
  const mp = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(mp)) continue;

  let m;
  try {
    m = JSON.parse(fs.readFileSync(mp, "utf8"));
  } catch (e) {
    rows.push({ name, verdict: "UNREADABLE", missing: [`could not parse package.json: ${e.message}`] });
    continue;
  }

  if (m.status === "coming-soon") { rows.push({ name, verdict: "PLANNED", missing: [] }); continue; }

  const missing = [];
  for (const g of (m.requires?.gates || [])) for (const gm of resolveGate(g)) missing.push(`gate ${gm}`);
  for (const s of (m.requires?.state || [])) if (!stateHas(s)) missing.push(`state ${s}`);
  for (const a of (m.requires?.artifacts || [])) if (!fs.existsSync(a)) missing.push(`artifact ${a}`);

  rows.push({ name, verdict: missing.length ? "BLOCKED" : "READY", missing });
}

for (const r of rows) {
  console.log(`${r.verdict.padEnd(8)} ${r.name}`);
  for (const m of r.missing) console.log(r.verdict === "UNREADABLE" ? `         ${m}` : `         missing ${m}`);
}
console.log(`\n${rows.filter((r) => r.verdict === "READY").length} ready, `
          + `${rows.filter((r) => r.verdict === "BLOCKED").length} blocked, `
          + `${rows.filter((r) => r.verdict === "PLANNED").length} planned.`);
