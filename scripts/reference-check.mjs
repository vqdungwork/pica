/**
 * reference-check.mjs: every file an agent or a skill tells you to load must exist.
 *
 * Nine agents — nearly every role pica ships — instructed their reader to
 * "Load `roles/estimate/rules/estimation.md` for the method." That file exists nowhere in this
 * repository. The `estimate` role was removed before 3.0.0 and the nine references to it survived
 * the rename, because a path inside prose is a bare string and a rename only touches paths inside
 * code. Every role's estimation step has therefore been running on nothing since 3.0.0, and
 * nothing said so.
 *
 * This is the sixth instance of one class of defect in this repository, and the first five each
 * got their own check written after the fact:
 *
 *   path.join(ROOT, "packages")       in mutate.mjs        caught by CI, after the release
 *   ./packages/discover               in the marketplace   caught by hand
 *   agents: ["./agents"]              in ux-researcher     caught by the installer refusing it
 *   a seven-of-twelve agent list      in knowledge-gen     caught by CI, after the release
 *   capture from `pica-html`          in picaflow          caught by command-script-check
 *   roles/estimate/rules/estimation   in nine agents       caught by reading one agent closely
 *
 * validate-packages holds that a DECLARED file exists. command-script-check holds that an INVOKED
 * script exists. This holds the third form: a file a human is TOLD to read. All three are the same
 * failure wearing different clothes — a path that only a person ever resolves.
 *
 * Fails closed: a run that recognised no reference at all has not checked the prose, it has only
 * read it, and the two are indistinguishable in a green table.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const findings = [];
let checked = 0;

/* Every file that instructs a reader: agents, skills, rules and commands all carry "load this"
   prose. Found rather than listed — a list here would be one more bare string. */
const sources = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) sources.push(p);
  }
};
for (const base of ["roles", "core"]) walk(path.join(ROOT, base));

if (!sources.length) {
  console.error("FAIL  no markdown found under roles/ or core/. Nothing to check.");
  process.exit(2);
}

/* A repo-relative path to a file inside the packages. Deliberately narrow: it matches what a
   reference actually looks like, not every string containing a slash. */
const REF = /(?:^|[\s`"'(])((?:roles|core|packages)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\.(?:md|mjs|json|css|js))/g;

for (const file of sources) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(REF)) {
    const ref = m[1];
    checked++;
    if (!fs.existsSync(path.join(ROOT, ref)))
      findings.push(`${rel} points at ${ref}, which does not exist`);
  }
}

console.log(`files read: ${sources.length}`);
console.log(`references checked: ${checked}`);

if (!checked) {
  console.error("FAIL  no reference was recognised in any file. Either the documents stopped");
  console.error("      citing paths, or this check stopped reading them.");
  process.exit(2);
}

if (findings.length) {
  console.error("");
  const seen = new Set();
  for (const f of findings) { if (!seen.has(f)) { seen.add(f); console.error(`FINDING  ${f}`); } }
  console.error(`\n${seen.size} finding(s).`);
  process.exit(1);
}
console.log("\n0 finding(s).");
