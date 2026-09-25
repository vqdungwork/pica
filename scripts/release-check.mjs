/**
 * release-check.mjs: what must be true before a tag becomes a release.
 *
 * 3.0.0 was tagged on a commit whose CI run had failed, published before the run
 * reported, and stayed the latest release for a day carrying a plugin Claude Code would
 * not install. Three fixes landed on main within the hour and none was in the tag.
 *
 * Nothing prevented any of that, and nothing about the FIX prevented it either: the
 * manifest check added in 3.0.1 would have caught the bad manifest on main, where it was
 * already caught. It would not have stopped a green tree being tagged and a red one being
 * released, because no check had ever been pointed at the tag.
 *
 * That is what this is for. It asserts the three things a tag must satisfy, and it is run
 * by release.yml AFTER the full suite has passed against the tagged tree, so by the time
 * it speaks the tree is already proven:
 *
 *   1. the tag names a version every manifest agrees with. count-test holds the manifests
 *      against EACH OTHER; nothing held them against the tag, so v3.0.1 could have been
 *      cut on manifests reading 3.0.0 and every suite would have stayed green.
 *   2. the CHANGELOG has a section for that version. A release whose notes nobody wrote
 *      is a release nobody thought about.
 *   3. the version is not one already released. Re-tagging in place is how the broken
 *      3.0.0 would have been "fixed" silently, leaving anyone who installed it with a
 *      version string that means two different trees.
 *
 * Usage:
 *   node scripts/release-check.mjs v3.0.1          assert, and print the notes to stdout
 *   node scripts/release-check.mjs v3.0.1 --notes  print ONLY the notes (for gh release)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const NOTES_ONLY = args.includes("--notes");
const tag = args.find((a) => !a.startsWith("--"));

if (!tag) {
  console.error("usage: node scripts/release-check.mjs <tag> [--notes]");
  process.exit(2);
}

/* The tag is the authority on which version is being released: it is what people install
   and what the release is named after. Everything else is checked against it. */
const version = tag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`FAIL  "${tag}" is not vMAJOR.MINOR.PATCH, so there is no version to check against`);
  process.exit(2);
}

const findings = [];
const say = (...a) => { if (!NOTES_ONLY) console.log(...a); };

/* ---- 1. every manifest agrees with the tag -------------------------------- */
const manifests = [
  path.join(ROOT, ".claude-plugin", "plugin.json"),
  path.join(ROOT, "core", ".claude-plugin", "plugin.json"),
  ...fs.readdirSync(path.join(ROOT, "roles"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(ROOT, "roles", e.name, ".claude-plugin", "plugin.json")),
];

for (const m of manifests) {
  if (!fs.existsSync(m)) { findings.push(`${path.relative(ROOT, m)} does not exist`); continue; }
  const v = JSON.parse(fs.readFileSync(m, "utf8")).version;
  if (v !== version) findings.push(`${path.relative(ROOT, m)} says ${v}, the tag says ${version}`);
}

/* The marketplace mirrors every plugin's version, and it is the file the installer reads
   to decide what it is fetching. A marketplace left behind hands people the old tree
   under the new name. */
const market = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
for (const p of market.plugins || [])
  if (p.version !== version) findings.push(`marketplace lists ${p.name} at ${p.version}, the tag says ${version}`);

say(`manifests checked: ${manifests.length} + ${(market.plugins || []).length} marketplace entries`);

/* ---- 2. the CHANGELOG has a section for it -------------------------------- */
const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
const lines = changelog.split("\n");
const start = lines.findIndex((l) => l.trim() === `## ${version}`);
let notes = "";

if (start === -1) {
  findings.push(`CHANGELOG.md has no "## ${version}" section, so this release has no notes anyone wrote`);
} else {
  let end = lines.slice(start + 1).findIndex((l) => /^## /.test(l));
  end = end === -1 ? lines.length : start + 1 + end;
  notes = lines.slice(start + 1, end).join("\n").trim();
  if (!notes) findings.push(`CHANGELOG.md has "## ${version}" and nothing under it`);
  say(`changelog section: ${notes.split("\n").length} line(s)`);
}

/* ---- 3. the version has not been released before -------------------------- */
/* Re-tagging in place is the quiet version of the failure this file exists to stop: the
   tag moves, the release note stays, and two different trees ship under one version. The
   tag object itself is not checked here because the tag is what triggered this run: what
   must not already exist is a RELEASE, and release.yml passes that in. */
if (process.env.RELEASE_EXISTS === "true")
  findings.push(`a release for ${tag} already exists. Cut a new patch rather than moving a published version`);

/* ---- report --------------------------------------------------------------- */
if (findings.length) {
  for (const f of findings) console.error(`FINDING  ${f}`);
  console.error(`\n${findings.length} finding(s). This tag is not releasable.`);
  process.exit(1);
}

if (NOTES_ONLY) process.stdout.write(notes + "\n");
else console.log(`\n0 finding(s). ${tag} is releasable.`);
