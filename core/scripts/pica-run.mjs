/**
 * pica-run.mjs: resolve a package's script and run it, or say precisely why it did not.
 *
 * This replaces a ten-line shell function that was pasted into four command files, and it
 * exists because that function could not work. A slash command's markdown is argument-
 * substituted before the shell ever sees it, so `$1` and `$2` inside a bash block are
 * replaced with the user's words. Invoked as
 *
 *     /picaflow An app that helps staff see today's work ...
 *
 * the resolver became `[ -f "$R/../app/scripts/that" ]`, and every guarded call in the
 * chain then reported SKIPPED. The chain's own documentation names that outcome: "a chain
 * reported as complete with four of its checks silently absent is the exact failure this
 * project exists to prevent." It was reachable by using the command as documented.
 *
 * A file cannot be argument-substituted, so the logic lives here and the markdown carries
 * no positional parameters at all.
 *
 * Two layouts, and only one of them is the one users have:
 *   installed   <cache>/pica-core/<version>/ and <cache>/pica-<pkg>/<version>/
 *   repository  <root>/core/ and <root>/roles/<pkg>/
 * Both are resolved. The installed one is picked by highest version, because a machine
 * mid-upgrade has two and the older one is not the one being run.
 *
 * Usage:
 *   node pica-run.mjs <package> <script.mjs> [args...]
 *   node pica-run.mjs --resolve <package> <script.mjs>   print the path, or nothing
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";


const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const RESOLVE_ONLY = argv[0] === "--resolve";
const [pkg, script, ...rest] = RESOLVE_ONLY ? argv.slice(1) : argv;

if (!pkg || !script) {
  console.error("usage: node pica-run.mjs <package> <script.mjs> [args...]");
  process.exit(2);
}

/* Where a package's directory could be. Order does not decide the winner: every candidate
   is collected and the highest version wins, so a cache holding 3.0.1 beside 3.0.2 runs
   3.0.2 rather than whichever the filesystem listed first. */
function packageDirs(name) {
  const out = [];
  const repo = name === "core" ? CORE : path.join(CORE, "..", "roles", name);
  if (fs.existsSync(repo)) out.push({ dir: repo, version: null });

  /* Installed: <cache>/pica-<name>/<version>. From core that is two levels up. */
  const cache = path.resolve(CORE, "..", "..");
  const holder = path.join(cache, `pica-${name}`);
  if (fs.existsSync(holder)) {
    for (const e of fs.readdirSync(holder, { withFileTypes: true }))
      if (e.isDirectory()) out.push({ dir: path.join(holder, e.name), version: e.name });
  }
  return out;
}

const cmp = (a, b) => {
  const pa = (a || "0").split(".").map(Number), pb = (b || "0").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};

const dirs = packageDirs(pkg);
const withScript = dirs
  .filter((d) => fs.existsSync(path.join(d.dir, "scripts", script)))
  .sort((a, b) => cmp(b.version, a.version));

if (RESOLVE_ONLY) {
  if (withScript.length) process.stdout.write(path.join(withScript[0].dir, "scripts", script));
  process.exit(0);
}

/* Two different absences, and telling them apart matters. "pica-ux-engineer is not
   installed" once sent somebody to install a package they already had, when what was
   missing was one script that version does not ship. Neither is a pass, and both say so. */
if (!withScript.length) {
  if (dirs.length)
    console.log(`SKIPPED ${script}: pica-${pkg} is installed but ships no ${script}. Upgrade it. NOT a pass.`);
  else
    console.log(`SKIPPED ${script}: pica-${pkg} is not installed. NOT a pass.`);
  process.exit(0);
}

const target = path.join(withScript[0].dir, "scripts", script);
const r = spawnSync(process.execPath, [target, ...rest], { stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
