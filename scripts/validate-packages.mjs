/**
 * validate-packages.mjs — the restructure's own check.
 *
 * Asserts four things, each of which was a real failure mode in earlier pica releases:
 *   1. every package.json parses and has the required fields
 *   2. every file a package CLAIMS to own actually exists
 *   3. every shipped rule/script/command is owned by exactly one package
 *   4. every declared check resolves to a script that exists
 *
 * Fails closed: zero packages found is an error, not a pass.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG_DIR = path.join(ROOT, "packages");
const REQUIRED = ["name", "status", "owns", "requires", "produces", "checks", "definitionOfDone"];
const VALID_STATUS = ["stable", "coming-soon"];
const findings = [];

if (!fs.existsSync(PKG_DIR)) {
  console.error("FAIL  packages/ does not exist. Nothing to validate.");
  process.exit(2);
}

const dirs = fs.readdirSync(PKG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

if (!dirs.length) {
  console.error("FAIL  packages/ contains no packages. A validator that validates nothing is not a pass.");
  process.exit(2);
}

const owned = new Map();   // repo-relative path -> package name

for (const name of dirs) {
  const manifestPath = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(manifestPath)) { findings.push(`${name}: no package.json`); continue; }

  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (e) { findings.push(`${name}: package.json does not parse — ${e.message}`); continue; }

  for (const f of REQUIRED) if (!(f in m)) findings.push(`${name}: missing required field "${f}"`);
  if (m.name !== name) findings.push(`${name}: manifest name is "${m.name}", directory is "${name}"`);
  if (!VALID_STATUS.includes(m.status)) findings.push(`${name}: status "${m.status}" is not one of ${VALID_STATUS.join(", ")}`);

  for (const kind of ["commands", "rules", "scripts"]) {
    for (const file of (m.owns?.[kind] || [])) {
      const rel = path.join("packages", name, kind, file);
      if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: owns ${kind}/${file}, which does not exist`);
      if (owned.has(rel)) findings.push(`${rel} is owned by both ${owned.get(rel)} and ${name}`);
      owned.set(rel, name);
    }
  }

  for (const c of (m.checks || [])) {
    if (!c.run || !c.passes) { findings.push(`${name}: a check is missing "run" or "passes"`); continue; }
    const rel = path.join("packages", name, "scripts", c.run);
    if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: check "${c.run}" has no script at ${rel}`);
  }

  for (const d of (m.definitionOfDone || [])) {
    if (!["check", "human", "gate", "artifact"].includes(d.type))
      findings.push(`${name}: definitionOfDone entry has invalid type "${d.type}"`);
    if (d.type === "human" && d.run)
      findings.push(`${name}: a "human" definition-of-done item must not name a script — that is the point of the type`);
  }
}

/* Every shipped file must be owned. An orphan means a rule nobody is responsible for. */
for (const name of dirs) {
  for (const kind of ["commands", "rules", "scripts"]) {
    const dir = path.join(PKG_DIR, name, kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const rel = path.join("packages", name, kind, f);
      if (!owned.has(rel)) findings.push(`${rel} exists but no package.json claims it`);
    }
  }
}

console.log(`packages: ${dirs.join(", ")}`);
console.log(`files owned: ${owned.size}`);
for (const f of findings) console.log(`FINDING  ${f}`);
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
