/**
 * pica-status.mjs — what can run now, what is blocked, and why.
 *
 * A report, never a gate: it exits 0 even when everything is blocked, because its job is
 * to explain state, not to enforce it. Enforcement lives in each command's requires check
 * and in the write-gate hook.
 */
import fs from "fs";
import path from "path";

const statePath = process.argv[2] || ".pica/state.json";
const PKG_DIR = path.join(process.cwd(), "packages");

if (!fs.existsSync(PKG_DIR)) { console.error("no packages/ directory"); process.exit(2); }
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};
const gates = state.gates || {};

const has = (g) => Boolean(gates[g]?.granted);
const stateHas = (expr) => {
  const [key, want] = expr.split("=");
  const val = key.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
  if (want === undefined) return val !== undefined && val !== null;
  return String(val) === want;
};

const rows = [];
for (const name of fs.readdirSync(PKG_DIR).filter((d) => !d.startsWith("_"))) {
  const mp = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));

  if (m.status === "coming-soon") { rows.push({ name, verdict: "PLANNED", missing: [] }); continue; }

  const missing = [];
  for (const g of (m.requires?.gates || [])) if (!has(g)) missing.push(`gate ${g}`);
  for (const s of (m.requires?.state || [])) if (!stateHas(s)) missing.push(`state ${s}`);
  for (const a of (m.requires?.artifacts || [])) if (!fs.existsSync(a)) missing.push(`artifact ${a}`);

  rows.push({ name, verdict: missing.length ? "BLOCKED" : "READY", missing });
}

for (const r of rows) {
  console.log(`${r.verdict.padEnd(8)} ${r.name}`);
  for (const m of r.missing) console.log(`         missing ${m}`);
}
console.log(`\n${rows.filter((r) => r.verdict === "READY").length} ready, `
          + `${rows.filter((r) => r.verdict === "BLOCKED").length} blocked, `
          + `${rows.filter((r) => r.verdict === "PLANNED").length} planned.`);
