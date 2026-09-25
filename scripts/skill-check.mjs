/**
 * skill-check.mjs: the skills gate, which pica did not have.
 *
 * Every other thing pica ships is held to something. Rules carry enforced-by markers and
 * rule-coverage-check ratchets them. Scripts are proven by the mutation suite. Manifests
 * are held by validate-packages. Skills were the one surface nobody gated — which is the
 * exact shape of defect this project exists to prevent, sitting inside the project.
 *
 * Two classes of skill, and conflating them would fail the honest one:
 *
 *   ENTRY    under core       Claude Code's own trigger surface. Needs a name and a
 *                             description broad enough to route on, and nothing else.
 *   ROLE     under a role     a procedure an agent follows. Carries the full frontmatter,
 *                             and ends by running the check that proves its own output.
 *
 * Six checks:
 *
 *   1. FRONTMATTER   parses, and carries every field its class requires. A skill with no
 *                    `scenarios` cannot be matched to a situation, and one with no
 *                    `estimated_time` gets scheduled by hope.
 *   2. NAME MATCHES  the frontmatter name equals the directory name. They are two places
 *                    recording one fact, and they drift silently.
 *   3. DECLARED      the directory appears in its package's owns.skills. An undeclared
 *                    skill ships without being owned, which is the orphan validate-packages
 *                    catches for every other kind of file.
 *   4. DONE WHEN     every role skill has a `## Done when`. A procedure with no finish
 *                    condition is advice, and advice is what pica is not.
 *   5. SCRIPT RESOLVES  every script path a skill tells you to run exists. A skill citing a
 *                    check that was renamed sends somebody to a file that is not there, and
 *                    claims cover that is gone.
 *   6. NO PLACEHOLDER  no TBD, TODO or FIXME survived into a shipped skill. Filler text is
 *                    matched as "lorem ipsum dolor" rather than as the bare phrase: a skill
 *                    that warns AGAINST lorem contains the words, and an earlier draft
 *                    failed scaffolding-the-demo for saying not to use it. A check that
 *                    fires on correct input is worse than no check.
 *
 * Usage: node scripts/skill-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROLE_FIELDS = ["name", "description", "argument-hint", "intent", "theme",
                     "best_for", "scenarios", "estimated_time"];
const ENTRY_FIELDS = ["name", "description"];

/* A deliberately small parser: the frontmatter pica writes is key: value and "  - item",
   and pulling in a YAML dependency to read eight keys would be a larger risk than this. */
function frontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  const out = {};
  let key = null;
  for (const line of text.slice(4, end).split("\n")) {
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && key) { (out[key] = Array.isArray(out[key]) ? out[key] : []).push(li[1]); continue; }
    const kv = line.match(/^([a-z_-]+):\s*(.*)$/i);
    if (kv) { key = kv[1]; out[key] = kv[2].trim() === "" || kv[2].trim() === ">-" ? [] : kv[2].trim(); }
    else if (key && line.trim() && typeof out[key] === "object" && !out[key].length) out[key] = line.trim();
    else if (key && line.trim() && typeof out[key] === "string") out[key] += " " + line.trim();
  }
  return out;
}

const skills = [];
const packages = [["core", path.join(ROOT, "core")],
  ...fs.readdirSync(path.join(ROOT, "roles")).sort().map((n) => [n, path.join(ROOT, "roles", n)])];
for (const [pkg, dir] of packages) {
  const sd = path.join(dir, "skills");
  if (!fs.existsSync(sd)) continue;
  const declared = (JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).owns?.skills) || [];
  for (const e of fs.readdirSync(sd, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    skills.push({ pkg, name: e.name, dir: path.join(sd, e.name),
                  entry: pkg === "core", declared: declared.includes(e.name) });
  }
}

const findings = [];
const add = (check, where, detail) => findings.push({ check, where, detail });
let badFm = 0, badName = 0, undeclared = 0, noDone = 0, badScript = 0, placeholder = 0;

for (const s of skills) {
  const file = path.join(s.dir, "SKILL.md");
  const where = `${s.pkg}/${s.name}`;
  if (!fs.existsSync(file)) { badFm++; add("frontmatter", where, "no SKILL.md"); continue; }
  const text = fs.readFileSync(file, "utf8");

  const fm = frontmatter(text);
  if (!fm) { badFm++; add("frontmatter", where, "no parseable frontmatter block"); continue; }
  const need = s.entry ? ENTRY_FIELDS : ROLE_FIELDS;
  const missing = need.filter((k) => !fm[k] || (Array.isArray(fm[k]) && !fm[k].length));
  if (missing.length) { badFm++; add("frontmatter", where,
    `missing ${missing.join(", ")}. A skill with no scenarios cannot be matched to a situation, and one with no estimated_time gets scheduled by hope`); }

  if (fm.name && fm.name !== s.name) { badName++; add("name-matches", where,
    `frontmatter says "${fm.name}", the directory says "${s.name}". Two places recording one fact, and they drift in silence`); }

  if (!s.declared) { undeclared++; add("declared", where,
    `not listed in ${s.pkg}/package.json owns.skills. It ships without being owned`); }

  if (!s.entry && !/^##\s+Done when\s*$/m.test(text)) { noDone++; add("done-when", where,
    "no `## Done when`. A procedure with no finish condition is advice, and advice is what pica is not"); }

  for (const m of text.matchAll(/(?:roles\/[a-z-]+|core)\/scripts\/[a-z0-9-]+\.mjs/g)) {
    if (!fs.existsSync(path.join(ROOT, m[0]))) { badScript++; add("script-resolves", `${where} :: ${m[0]}`,
      "the skill tells you to run a script that does not exist. A renamed check leaves the skill claiming cover that is gone"); }
  }

  const body = text.slice(text.indexOf("\n---", 4) + 4);
  const p = body.match(/\b(TBD|TODO|FIXME|XXX|lorem ipsum dolor)\b/i);
  if (p) { placeholder++; add("no-placeholder", where, `contains "${p[1]}" in the body`); }
}

const table = [
  ["frontmatter",     badFm,       `${skills.length} skill(s)`],
  ["name-matches",    badName,     `${skills.length} skill(s)`],
  ["declared",        undeclared,  `${skills.length} skill(s)`],
  ["done-when",       noDone,      `${skills.filter((s) => !s.entry).length} role skill(s)`],
  ["script-resolves", badScript,   `${skills.length} skill(s) scanned for script paths`],
  ["no-placeholder",  placeholder, `${skills.length} skill(s)`],
];
console.log(`skills: ${skills.length} (${skills.filter((s) => s.entry).length} entry, ${skills.filter((s) => !s.entry).length} role)\n`);
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
if (!skills.length) {
  console.error("\nFAIL  no skills found at all. A checker that checks nothing is not a pass.");
  process.exit(1);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
