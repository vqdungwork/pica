/**
 * pica-status.mjs — what can run now, what is blocked, and why.
 *
 * A report, never a gate: it exits 0 even when everything is blocked, because its job is
 * to explain state, not to enforce it. Enforcement lives in each command's requires check
 * and in the write-gate hook.
 */
import fs from "fs";
import path from "path";

const WP_PLACEHOLDER = "<wp>";

const statePath = process.argv[2] || ".pica/state.json";
const PKG_DIR = path.join(process.cwd(), "packages");

if (!fs.existsSync(PKG_DIR)) { console.error("no packages/ directory"); process.exit(2); }

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
const gates = state.gates || {};

const has = (g) => Boolean(gates[g]?.granted);

// A bare key (no "=want") checks PRESENCE only, not truthiness — a manifest requiring a
// bare boolean key would read as satisfied even when that key is explicitly set to
// `false`. Today's convention is to spell booleans as "key=true" for that reason.
const stateHas = (expr) => {
  const [key, want] = expr.split("=");
  const val = key.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
  if (want === undefined) return val !== undefined && val !== null;
  return String(val) === want;
};

// A required gate name may be a template over work packages, e.g. "htmlApproved:<wp>".
// Resolve it against the real work packages instead of looking it up literally — the
// literal string "<wp>" never appears as a real gate key. Returns the list of missing
// gate names: empty if the requirement is satisfied.
const resolveGate = (template) => {
  if (!template.includes(WP_PLACEHOLDER)) return has(template) ? [] : [template];

  const idx = template.indexOf(WP_PLACEHOLDER);
  const prefix = template.slice(0, idx);
  const suffix = template.slice(idx + WP_PLACEHOLDER.length);

  let wps = Object.keys(state.workPackages || {});
  if (!wps.length) {
    wps = Object.keys(gates)
      .filter((k) => k.startsWith(prefix) && k.endsWith(suffix) && k.length > prefix.length + suffix.length)
      .map((k) => k.slice(prefix.length, k.length - suffix.length));
  }

  if (!wps.length) return [template];

  const resolved = wps.map((wp) => `${prefix}${wp}${suffix}`);
  return resolved.some((g) => has(g)) ? [] : resolved;
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
