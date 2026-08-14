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
// The fix after that one required a child directory's package.json "name" field
// to equal the child directory's own name -- true in the repo (packages/core/
// name "core") and NEVER true once installed, because the installed directory
// is "pica-core" while the manifest still says "core". That rule could never
// qualify the very install shape packaging exists to support, so it always fell
// through to exit 2 there. Fixed closed, but useless for its actual purpose.
//
// So the rule is structural, not name-based, and manifests may sit one level
// deeper than the child itself: installed, the layout is
// <cache>/<marketplace>/pica-core/0.6.0/package.json, not
// <cache>/<marketplace>/pica-core/package.json. A child directory YIELDS A
// MANIFEST if either <child>/package.json or <child>/<anything>/package.json
// exists, parses, and has "name", "status", "owns", "requires" and "produces"
// as fields. A candidate directory QUALIFIES if at least two of its child
// directories each yield a manifest.
//
// That still rejects the phantom case naturally: pica-core/ has exactly one
// child (the version directory), which yields exactly one manifest (core's
// own) -- one match, not two, so it fails and the walk continues up to
// <cache>/<marketplace>/, whose three-plus package children each yield a
// manifest and which wins on its own structure. A resolver that cannot find a
// qualifying candidate says so and exits 2; it never prints a package list
// derived from a directory that did not qualify.
const CHILD_MANIFEST_FIELDS = ["name", "status", "owns", "requires", "produces"];

// Existence only: the FIRST of <child>/package.json or <child>/<anything>/package.json
// that exists on disk, regardless of whether it parses or has the fields above.
function locateManifestPath(childDir) {
  const direct = path.join(childDir, "package.json");
  if (fs.existsSync(direct)) return direct;
  let entries;
  try { entries = fs.readdirSync(childDir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const nested = path.join(childDir, e.name, "package.json");
    if (fs.existsSync(nested)) return nested;
  }
  return null;
}

// A child "yields a manifest" only when the located file also parses and carries every
// field pica-status.mjs and the qualifying rule depend on.
function readChildManifest(childDir) {
  const mp = locateManifestPath(childDir);
  if (!mp) return null;
  let m;
  try { m = JSON.parse(fs.readFileSync(mp, "utf8")); } catch { return null; }
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  return { path: mp, data: m };
}

function qualifies(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  let matches = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const found = readChildManifest(path.join(dir, e.name));
    if (found && CHILD_MANIFEST_FIELDS.every((f) => f in found.data)) matches++;
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
  console.error("A candidate must contain at least two subdirectories that each yield a package.json");
  console.error('(at <child>/package.json or <child>/<anything>/package.json) parsing with "name",');
  console.error('"status", "owns", "requires" and "produces" as fields. Walking up from:');
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

// Reported by MANIFEST name ("core", "html"), not directory name ("pica-core"), so
// output is identical whether this runs against the repo layout or an installed one.
for (const dirName of fs.readdirSync(PKG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)) {
  const childDir = path.join(PKG_DIR, dirName);
  const mp = locateManifestPath(childDir);
  if (!mp) continue;

  let m;
  try {
    m = JSON.parse(fs.readFileSync(mp, "utf8"));
  } catch (e) {
    rows.push({ name: dirName, verdict: "UNREADABLE", missing: [`could not parse package.json: ${e.message}`] });
    continue;
  }

  const name = m.name || dirName;

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
