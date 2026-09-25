/**
 * validate-packages.mjs: the restructure's own check.
 *
 * Asserts six things, each of which was a real failure mode in earlier pica releases:
 *   1. every package.json parses and has the required fields, each with a real shape:
 *      a null or empty contract field passes an `in` check while asserting nothing. This
 *      includes "requires" and "produces": both must be objects, and "requires" must have
 *      "state", "artifacts" and "gates" as arrays while "produces" must have "state" and
 *      "artifacts" as arrays: these are the two fields pica-status.mjs reads, and
 *      `"requires":null,"produces":null` used to pass this check while asserting nothing.
 *   2. every package has its plugin manifest at .claude-plugin/plugin.json, the
 *      location Claude Code actually reads, and that manifest parses and has a "name",
 *      and every component path in it obeys the schema the INSTALLER enforces rather
 *      than the one this file used to imagine. 3.0.0 shipped a plugin declaring
 *      "agents": ["./agents"]: internally consistent, green here, and refused by Claude
 *      Code with `agents.0: Invalid input`. Agents are .md files and directories are not
 *      accepted; skills are directories; and every path must exist inside the plugin root.
 *   3. every file a package CLAIMS to own actually exists
 *   4. every shipped rule/script/command/hook/agent is owned by exactly one package
 *   5. every declared check resolves to a script that exists
 *   6. every definitionOfDone entry has a valid type, and a "human" entry names no script
 *   7. every relative markdown link in a rule or a skill resolves to a file that exists.
 *      0.6.0 shipped 26 broken links out of the design-flow skill: every rule reference in
 *      the map: because moving the skill into pica-core changed its depth and nothing
 *      checked. Ownership validation cannot see this: the files were all present and all
 *      owned. Links out of a skill are resolved against the SHIPPED layout, where
 *      core/skills/<s> is installed at <root>/skills/<s>, not against the repo.
 *
 * Fails closed: zero packages found is an error, not a pass.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
/* Two directories hold packages now: the runtime at <root>/core, and the eleven roles under
 * <root>/roles. Everything that used to read one directory reads both, so core is never
 * silently dropped from validation. */
const PKG_DIRS = [path.join(ROOT, "core"), path.join(ROOT, "roles")];
const pkgPath = (name) => name === "core" ? path.join(ROOT, "core") : path.join(ROOT, "roles", name);
const pkgNames = () => ["core", ...fs.readdirSync(path.join(ROOT, "roles"), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort()];

const REQUIRED = ["name", "status", "description", "owns", "requires", "produces", "checks", "definitionOfDone"];
const VALID_STATUS = ["stable", "coming-soon"];
const findings = [];

if (!PKG_DIRS.every((d) => fs.existsSync(d))) {
  console.error("FAIL  core/ or roles/ does not exist. Nothing to validate.");
  process.exit(2);
}

const dirs = pkgNames();

if (!dirs.length) {
  console.error("FAIL  roles/ contains no packages. A validator that validates nothing is not a pass.");
  process.exit(2);
}

const owned = new Map();   // repo-relative path -> package name

/* 2b. the component paths, against the schema the INSTALLER enforces.
 *
 * 3.0.0 was tagged and released with `"agents": ["./agents"]` in pica-ux-researcher, and
 * Claude Code refused to install that plugin: `agents.0: Invalid input`. Every check in
 * this file was green at the time, because the only thing asked of a plugin.json was that
 * it parsed and carried a "name". The directory it named existed, so nothing objected.
 *
 * That is the shape of the failure worth naming: the manifest was internally consistent
 * and uninstallable, and internal consistency is all this file had ever been asking for.
 * It was the fourth time a bare string survived a rename, and the first time the cost was
 * a release nobody could install.
 *
 * The rules are the manifest reference's, not this file's guesses:
 *   agents     .md FILES. "Directories aren't accepted" is the documented wording
 *   skills     directories, and "." or "./" for the plugin root
 *   commands   a flat .md file or a directory, or an object map that names no path
 *   hooks      a .json file, or the hooks object inline
 * and for every one of them: the path must exist and must resolve inside the plugin root.
 *
 * This does not make `claude plugin validate` redundant, and CI runs that too. That
 * command is the authority and knows fields this does not; this runs with no install, on
 * every machine, and holds the one rule that has already cost a release.
 */
const COMPONENT_RULES = {
  agents:   { form: "file", ext: ".md",   note: "directories aren't accepted" },
  skills:   { form: "dir",                note: "each entry names a directory of skills" },
  commands: { form: "either", ext: ".md", note: "a flat .md file or a directory" },
  hooks:    { form: "either", ext: ".json", note: "a .json file or the hooks object inline" },
};

function checkComponentPaths(name, pm, root) {
  for (const [key, rule] of Object.entries(COMPONENT_RULES)) {
    if (!(key in pm)) continue;
    const raw = pm[key];

    /* commands may be an object map of command name to source/content, and hooks may be
       the hooks object itself. Neither names a path, so there is nothing to resolve. */
    if (raw && typeof raw === "object" && !Array.isArray(raw)) continue;

    const entries = Array.isArray(raw) ? raw : [raw];
    entries.forEach((entry, i) => {
      const where = `${name}: .claude-plugin/plugin.json ${key}.${i}`;

      if (typeof entry !== "string" || entry.length === 0) {
        findings.push(`${where} is ${JSON.stringify(entry)}, which is not a path`);
        return;
      }
      /* A path containing ".." is reported by the installer as a traversal attempt, and a
         path resolving outside the plugin root does not load at all. */
      if (entry.split(/[\\/]/).includes("..")) {
        findings.push(`${where} contains "..", which the installer reads as a path traversal attempt`);
        return;
      }

      const abs = path.resolve(root, entry);
      if (abs !== root && !abs.startsWith(root + path.sep)) {
        findings.push(`${where} resolves outside the plugin root, so it will not load: ${entry}`);
        return;
      }
      if (!fs.existsSync(abs)) {
        findings.push(`${where} names ${entry}, which does not exist`);
        return;
      }

      const isDir = fs.statSync(abs).isDirectory();
      if (rule.form === "file" && isDir) {
        findings.push(`${where} names the directory ${entry}, and ${rule.note}. ` +
          `Name each file instead, as in "./${key}/<file>${rule.ext}"`);
        return;
      }
      if (rule.form === "dir" && !isDir) {
        findings.push(`${where} names the file ${entry}, and ${rule.note}`);
        return;
      }
      if (!isDir && rule.ext && !abs.endsWith(rule.ext))
        findings.push(`${where} names ${entry}, and ${key} files must end in ${rule.ext}`);
    });
  }
}


for (const name of dirs) {
  const manifestPath = path.join(pkgPath(name), "package.json");
  if (!fs.existsSync(manifestPath)) { findings.push(`${name}: no package.json`); continue; }

  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (e) { findings.push(`${name}: package.json does not parse, ${e.message}`); continue; }

  for (const f of REQUIRED) if (!(f in m)) findings.push(`${name}: missing required field "${f}"`);

  /* A manifest that merely HAS these fields is not a manifest that says anything: null and
     empty values pass an `in` check while carrying no actual contract. Each contract field
     has a real shape, and a value outside it is treated the same as the field being absent. */
  if (m.description !== undefined && (typeof m.description !== "string" || m.description.length === 0))
    findings.push(`${name}: "description" must be a non-empty string, got ${JSON.stringify(m.description)}`);
  if (m.owns !== undefined && (typeof m.owns !== "object" || m.owns === null || Array.isArray(m.owns)))
    findings.push(`${name}: "owns" must be an object, got ${JSON.stringify(m.owns)}`);
  if (m.checks !== undefined && !Array.isArray(m.checks))
    findings.push(`${name}: "checks" must be an array, got ${JSON.stringify(m.checks)}`);
  if (m.definitionOfDone !== undefined && !Array.isArray(m.definitionOfDone))
    findings.push(`${name}: "definitionOfDone" must be an array, got ${JSON.stringify(m.definitionOfDone)}`);

  /* "requires" and "produces" are the two fields pica-status.mjs actually reads to decide
     whether a package is READY or BLOCKED. A null (or otherwise shapeless) value passed the
     `in` check above while asserting nothing: pica-status.mjs would then read `undefined`
     off it and treat every requirement as vacuously satisfied. Each must be an object, and
     each of its own array-valued sub-fields must actually be an array. */
  if (m.requires !== undefined) {
    if (typeof m.requires !== "object" || m.requires === null || Array.isArray(m.requires)) {
      findings.push(`${name}: "requires" must be an object, got ${JSON.stringify(m.requires)}`);
    } else {
      for (const f of ["state", "artifacts", "gates"])
        if (!Array.isArray(m.requires[f]))
          findings.push(`${name}: "requires.${f}" must be an array, got ${JSON.stringify(m.requires[f])}`);
    }
  }
  if (m.produces !== undefined) {
    if (typeof m.produces !== "object" || m.produces === null || Array.isArray(m.produces)) {
      findings.push(`${name}: "produces" must be an object, got ${JSON.stringify(m.produces)}`);
    } else {
      for (const f of ["state", "artifacts"])
        if (!Array.isArray(m.produces[f]))
          findings.push(`${name}: "produces.${f}" must be an array, got ${JSON.stringify(m.produces[f])}`);
    }
  }

  if (m.name !== name) findings.push(`${name}: manifest name is "${m.name}", directory is "${name}"`);
  if (!VALID_STATUS.includes(m.status)) findings.push(`${name}: status "${m.status}" is not one of ${VALID_STATUS.join(", ")}`);

  /* Claude Code reads a plugin's manifest from .claude-plugin/plugin.json, not from
     plugin.json at the package root. A package.json passing every check above with no
     plugin.json in the right place is a package Claude Code cannot actually install. */
  const pluginManifest = path.join(pkgPath(name), ".claude-plugin", "plugin.json");
  if (!fs.existsSync(pluginManifest)) {
    findings.push(`${name}: no .claude-plugin/plugin.json, Claude Code will not find this package's manifest`);
  } else {
    try {
      const pm = JSON.parse(fs.readFileSync(pluginManifest, "utf8"));
      if (!pm || typeof pm !== "object" || Array.isArray(pm) || !pm.name)
        findings.push(`${name}: .claude-plugin/plugin.json has no "name" field`);
      else checkComponentPaths(name, pm, pkgPath(name));
    } catch (e) {
      findings.push(`${name}: .claude-plugin/plugin.json does not parse, ${e.message}`);
    }
  }

  for (const kind of ["commands", "rules", "scripts", "hooks", "agents"]) {
    for (const file of (m.owns?.[kind] || [])) {
      const rel = path.join(name === "core" ? "core" : path.join("roles", name), kind, file);
      if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: owns ${kind}/${file}, which does not exist`);
      if (owned.has(rel)) findings.push(`${rel} is owned by both ${owned.get(rel)} and ${name}`);
      owned.set(rel, name);
    }
  }

  /* A skill is a DIRECTORY containing SKILL.md, not a file: `owns.skills` names the
     directory, and existence means roles/<pkg>/skills/<name>/SKILL.md is present. */
  for (const skill of (m.owns?.skills || [])) {
    const rel = path.join(name === "core" ? "core" : path.join("roles", name), "skills", skill);
    const skillFile = path.join(rel, "SKILL.md");
    if (!fs.existsSync(path.join(ROOT, skillFile))) findings.push(`${name}: owns skills/${skill}, which has no SKILL.md`);
    if (owned.has(rel)) findings.push(`${rel} is owned by both ${owned.get(rel)} and ${name}`);
    owned.set(rel, name);
  }

  for (const c of (m.checks || [])) {
    if (!c.run || !c.passes) { findings.push(`${name}: a check is missing "run" or "passes"`); continue; }
    const rel = path.join(name === "core" ? "core" : path.join("roles", name), "scripts", c.run);
    if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: check "${c.run}" has no script at ${rel}`);
  }

  for (const d of (m.definitionOfDone || [])) {
    if (!["check", "human", "gate", "artifact"].includes(d.type))
      findings.push(`${name}: definitionOfDone entry has invalid type "${d.type}"`);
    if (d.type === "human" && d.run)
      findings.push(`${name}: a "human" definition-of-done item must not name a script, that is the point of the type`);
  }
}

/* Every shipped file must be owned. An orphan means a rule nobody is responsible for.
   hooks/ is included alongside commands/rules/scripts: core's hook files went
   unvalidated and unowned until this scan reached them too.

   agents/ joined them for the same reason and one worse: nine agent files shipped with
   no package claiming them AND no plugin.json declaring them, so none of them loaded.
   A directory this validator does not know about is a directory that can be wrong
   forever, which is the whole failure mode it was written to end. */
for (const name of dirs) {
  for (const kind of ["commands", "rules", "scripts", "hooks", "agents"]) {
    const dir = path.join(pkgPath(name), kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const rel = path.join(name === "core" ? "core" : path.join("roles", name), kind, f);
      if (!owned.has(rel)) findings.push(`${rel} exists but no package.json claims it`);
    }
  }

  /* skills/ holds directories, each a skill named by its own directory (containing
     SKILL.md), not files: scanned the same way but by directory name. */
  const skillsDir = path.join(pkgPath(name), "skills");
  if (fs.existsSync(skillsDir)) {
    for (const f of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!f.isDirectory()) continue;
      const rel = path.join(name === "core" ? "core" : path.join("roles", name), "skills", f.name);
      if (!owned.has(rel)) findings.push(`${rel} exists but no package.json claims it`);
    }
  }
}

/* 6b. the marketplace listing matches each plugin's own manifest.

   Two files carried a description for the same plugin and nothing compared them. Six
   packages were listed in the marketplace with NO description at all, four more had a
   stale one, and the bundle advertised a check count two releases old: which is the first
   sentence anyone reads before installing.

   plugin.json is the source. The marketplace mirrors it, and here that mirroring is
   checked rather than remembered. */
{
  const mkPath = path.join(ROOT, ".claude-plugin", "marketplace.json");
  let mk = null;
  try { mk = JSON.parse(fs.readFileSync(mkPath, "utf8")); } catch (e) {
    findings.push(`.claude-plugin/marketplace.json could not be read (${e.message})`);
  }
  if (mk) {
    const listed = new Map((mk.plugins || []).map((p) => [p.name, p]));
    const manifests = [path.join(ROOT, ".claude-plugin", "plugin.json"),
      ...dirs.map((d) => path.join(pkgPath(d), ".claude-plugin", "plugin.json"))];
    for (const mp of manifests) {
      if (!fs.existsSync(mp)) continue;
      let pj;
      try { pj = JSON.parse(fs.readFileSync(mp, "utf8")); } catch { continue; }
      const row = listed.get(pj.name);
      if (!row) { findings.push(`${pj.name} has a plugin.json and is not listed in the marketplace`); continue; }
      if (!row.description) findings.push(`${pj.name} is listed in the marketplace with no description`);
      else if (row.description !== pj.description)
        findings.push(`${pj.name}: the marketplace description differs from its own plugin.json`);
      if (row.version && pj.version && row.version !== pj.version)
        findings.push(`${pj.name}: marketplace says version ${row.version}, plugin.json says ${pj.version}`);
      listed.delete(pj.name);
    }
    for (const name of listed.keys())
      findings.push(`the marketplace lists "${name}", which has no plugin.json`);
  }
}

/* 7. relative markdown links resolve, and no link crosses a package boundary.

   This check carried a model of the layout that stopped being true at 0.6.0. It resolved
   the skill from <repo>/skills/<name>, which was the shipped location back when the whole
   repository was ONE plugin. Since the split, roles/core IS the plugin root: the file's
   repo location and its shipped location are the same path, so the base is its own
   directory like every other markdown file here.

   The consequence of the stale model was worse than a wrong base. It made
   ../../roles/<pkg>/rules/x.md look correct, and that form resolves in NEITHER layout:
   not in the repo, where it lands on core/roles/..., and not installed, where a
   sibling package is a separate plugin directory named pica-<pkg> and there is no roles/
   at all. Thirty-eight links in the map of the whole flow pointed at nothing, in every
   layout, for three releases.

   So cross-package links are now rejected outright rather than resolved. A rule in another
   package is named as a repo path in a code span, which is true wherever the reader is,
   instead of as a link that promises a click it cannot deliver. */
const mdLink = /\]\((\.[^)#\s]+)/g;
const mdFiles = [];
for (const name of dirs) {
  const rulesDir = path.join(pkgPath(name), "rules");
  if (fs.existsSync(rulesDir))
    for (const f of fs.readdirSync(rulesDir))
      if (f.endsWith(".md")) mdFiles.push({ file: path.join(rulesDir, f), base: rulesDir });
  const skillsDir = path.join(pkgPath(name), "skills");
  if (fs.existsSync(skillsDir))
    for (const d of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(skillsDir, d.name, "SKILL.md");
      if (fs.existsSync(f))
        mdFiles.push({ file: f, base: path.join(skillsDir, d.name) });
    }
}
if (!mdFiles.length) findings.push("no rule or skill markdown found: the link check validated nothing");
let linksChecked = 0;
for (const { file, base } of mdFiles) {
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = mdLink.exec(text)) !== null) {
    linksChecked++;
    const target = path.resolve(base, m[1]);
    if (!fs.existsSync(target)) {
      findings.push(`${path.relative(ROOT, file)} links to ${m[1]}, which does not resolve`);
      continue;
    }
    /* A link that leaves its own package resolves in the repo and breaks the moment
       somebody installs that package on its own, which is the whole point of the split. */
    /* Two roots now, so "which package owns this file" is asked of both: core/ is a package
       in its own right and roles/<name> is the rest. A file under neither has no owner and
       is not a cross-package link. */
    const ownerOf = (f) => {
      const c = path.relative(path.join(ROOT, "core"), f);
      if (!c.startsWith("..") && !path.isAbsolute(c)) return "core";
      const r = path.relative(path.join(ROOT, "roles"), f);
      if (!r.startsWith("..") && !path.isAbsolute(r)) return r.split(path.sep)[0];
      return null;
    };
    const owner = ownerOf(file);
    const targetOwner = ownerOf(target);
    if (targetOwner !== null && owner !== null && targetOwner !== owner)
      findings.push(`${path.relative(ROOT, file)} links to ${m[1]} in package "${targetOwner}". ` +
        `A single-package install has no sibling to resolve it against: name it as a repo path instead`);
  }
}
if (!linksChecked) findings.push("0 markdown links checked: the link check did nothing");

console.log(`packages: ${dirs.join(", ")}`);
console.log(`markdown links checked: ${linksChecked}`);
console.log(`files owned: ${owned.size}`);
for (const f of findings) console.log(`FINDING  ${f}`);
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
