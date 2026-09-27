/**
 * pica-status.mjs: what can run now, what is blocked, and why.
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

// roles/ is resolved from THIS SCRIPT's own location, not from the working
// directory, by WALKING UP AND VALIDATING rather than by counting path segments.
// State and artifacts belong to the PROJECT, not to pica's own repo, and are
// resolved against process.cwd() below (the default base for a relative path)
// so that this works when run from inside a project directory.
//
// Why validation, not arithmetic: this script ships inside core/scripts/
// in the REPO layout, where "two levels up" happens to land on roles/. But an
// INSTALLED pica-core lives at cache/<marketplace>/pica-core/<version>/scripts/,
// where "two levels up" lands on cache/<marketplace>/pica-core/ -- whose only
// child is the version directory (e.g. "0.6.0"), which itself holds core's OWN
// package.json. Fixed arithmetic can't tell that apart from a real roles/
// directory: it printed "READY 0.6.0", a phantom package named after a version
// string, with exit 0 -- worse than erroring, because it looked like an answer.
// The earlier fix (0af543b) was verified ONLY against the repo layout, which is
// the one layout where a "../.." offset can never be wrong, so this bug shipped
// anyway and was never seen failing.
//
// The fix after that one required a child directory's package.json "name" field
// to equal the child directory's own name -- true in the repo (core/
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
/* 3.19.0: every inference above failed again, both ways at once.
 *
 * Installed, a machine that has updated once holds pica-core/3.18.0 AND pica-core/3.19.0, so
 * pica-core/ has two children that each yield a manifest and QUALIFIED as the package root: the
 * table read "READY core" five times and named no other package. In the repository the walk
 * stopped at the root, where core/ yields a manifest, roles/ yields the first role's manifest from
 * one level down, and examples/ yields the worked example's: the table listed "approvals" as a
 * package and reported every business-analyst file missing from roles/.
 *
 * So nothing is inferred. The two layouts are named, as pica-verify names them, and within an
 * installed package the highest version wins by NUMBER, never by string sort. */
const vcmp = (a, b) => {
  const pa = String(a).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1));
  const pb = String(b).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? -1) - (pb[i] ?? -1); if (d) return d; }
  return 0;
};
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const hasManifest = (d) => fs.existsSync(path.join(d, "package.json"));
function packageDirs() {
  // repository: <root>/core/scripts, with the roles beside core under <root>/roles
  const root = path.resolve(SCRIPT_DIR, "..", "..");
  if (hasManifest(path.join(root, "core")) && fs.existsSync(path.join(root, "roles"))) {
    const roles = fs.readdirSync(path.join(root, "roles"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => path.join(root, "roles", e.name)).filter(hasManifest);
    return { where: root, dirs: [path.join(root, "core"), ...roles] };
  }
  // installed: <cache>/<marketplace>/pica-core/<version>/scripts, siblings pica-<name>/<version>
  const cache = path.resolve(SCRIPT_DIR, "..", "..", "..");
  const dirs = [];
  let entries = [];
  try { entries = fs.readdirSync(cache, { withFileTypes: true }); } catch {}
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith("pica-")) continue;
    const pkg = path.join(cache, e.name);
    const versions = fs.readdirSync(pkg).filter((v) => hasManifest(path.join(pkg, v))).sort(vcmp);
    if (versions.length) dirs.push(path.join(pkg, versions[versions.length - 1]));
  }
  return { where: cache, dirs };
}
const { where: PKG_WHERE, dirs: PKG_DIRS } = packageDirs();
if (PKG_DIRS.length < 2) {
  console.error("FAIL  could not locate pica's packages from " + SCRIPT_DIR + ".");
  console.error(`      Looked for <root>/core + <root>/roles, then pica-*/<version> under ${PKG_WHERE}.`);
  console.error("      Nothing was reported, and that is not an answer.");
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
// top-level state.<key> boolean for a project-level gate (e.g. "intakeApproved"):
// see roles/ux-engineer/commands/pica-wp.md and core/hooks/gate-figma-write.
// state.gates is still honoured if present, for forward compatibility with any
// command that adopts that vocabulary directly, but nothing here depends on it.
const gates = state.gates || {};
const workPackages = state.workPackages || {};

// A bare key (no "=want") checks PRESENCE only, not truthiness: a manifest requiring a
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
// Resolve it against the real work packages instead of looking it up literally: the
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
    missing: [`could not parse ${statePath}: ${stateError}, evaluating every package against empty state`],
  });
}

// Reported by MANIFEST name ("core", "html"), not directory name ("pica-core"), so
// output is identical whether this runs against the repo layout or an installed one.
for (const childDir of PKG_DIRS) {
  const dirName = path.basename(childDir);
  const mp = path.join(childDir, "package.json");

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

  rows.push({ name, verdict: missing.length ? "BLOCKED" : "READY", missing, dir: childDir, manifest: m });
}

for (const r of rows) {
  console.log(`${r.verdict.padEnd(8)} ${r.name}`);
  for (const m of r.missing) console.log(r.verdict === "UNREADABLE" ? `         ${m}` : `         missing ${m}`);
}
/* A manifest drifts. All four that existed before 0.8.0 had an `owns` that disagreed with
 * the directory beside it, and one of them claimed no scripts while shipping a check the
 * flow depends on. Nothing noticed, because nothing compared them.
 *
 * The comparison is free: the directory is right there. Reported rather than fatal, since
 * this script explains state and does not enforce it, but reported LOUDLY, because a
 * manifest nobody trusts is a manifest nobody reads. */
const drift = [];
for (const r of rows) {
  const dir = r.dir;
  if (!dir) continue;
  const declared = r.manifest?.owns || {};
  for (const [kind, glob] of [["commands", ".md"], ["rules", ".md"], ["scripts", ""], ["agents", ".md"]]) {
    let onDisk = [];
    try {
      onDisk = fs.readdirSync(path.join(dir, kind))
        .filter((f) => !f.startsWith(".") && (!glob || f.endsWith(glob))).sort();
    } catch { onDisk = []; }
    const said = [...(declared[kind] || [])].sort();
    const missing = onDisk.filter((f) => !said.includes(f));
    const phantom = said.filter((f) => !onDisk.includes(f));
    if (missing.length) drift.push(`${r.name}: ${kind} on disk and not in the manifest: ${missing.join(", ")}`);
    if (phantom.length) drift.push(`${r.name}: ${kind} in the manifest and not on disk: ${phantom.join(", ")}`);
  }
}
/* The flow states two rules about gates and nothing checked either:
 *   "No package may grant a gate it benefits from."
 *   Implicit in that: a gate somebody requires has to be granted by somebody.
 *
 * Writing six new manifests broke both at once. `clientApproved` was invented in two of
 * them and granted nowhere, which leaves those packages permanently BLOCKED with no way
 * to unblock them: the deadlock shape this repository has already found twice. And
 * `html` granted the gate the flow says core grants.
 *
 * Neither is expensive to check, and neither was checked. */
const gate = (g) => String(g || "").split(":")[0];
const grantsBy = new Map();
const wantsBy = new Map();
for (const r of rows) {
  if (!r.manifest) continue;
  grantsBy.set(r.name, (r.manifest.definitionOfDone || [])
    .filter((d) => d && d.type === "gate").map((d) => d.grants));
  wantsBy.set(r.name, r.manifest.requires?.gates || []);
}
const granted = new Set([...grantsBy.values()].flat().map(gate));
const arch = [];
for (const [name, wants] of wantsBy) {
  for (const w of wants) {
    if (!granted.has(gate(w))) arch.push(`${name} requires gate "${w}" and no package grants it, so it can never become READY`);
    if ((grantsBy.get(name) || []).some((g) => gate(g) === gate(w)))
      arch.push(`${name} both grants and requires "${w}". No package may grant a gate it benefits from`);
  }
}
if (arch.length) {
  console.log("\nGATE ARCHITECTURE");
  for (const a2 of arch) console.log(`  ${a2}`);
  console.log("  A gate nobody grants is a package nobody can unblock.");
}

if (drift.length) {
  console.log("\nMANIFEST DRIFT");
  for (const d of drift) console.log(`  ${d}`);
  console.log("  A manifest that disagrees with its own directory is a manifest nobody can rely on.");
}

console.log(`\n${rows.filter((r) => r.verdict === "READY").length} ready, `
          + `${rows.filter((r) => r.verdict === "BLOCKED").length} blocked, `
          + `${rows.filter((r) => r.verdict === "PLANNED").length} planned.`);
