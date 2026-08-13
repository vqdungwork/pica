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
// directory. This script ships inside packages/core/scripts/, so packages/ is
// always two levels up from here, regardless of where the command is invoked from.
// State and artifacts belong to the PROJECT, not to pica's own repo, and are
// resolved against process.cwd() below (the default base for a relative path)
// so that this works when run from inside a project directory.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(SCRIPT_DIR, "..", "..");

if (!fs.existsSync(PKG_DIR)) {
  console.error(`no packages/ directory found at ${PKG_DIR}`);
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
