/**
 * command-script-check.mjs: every script a command invokes must exist, in the package the
 * command names.
 *
 * `picaflow.md` ran `capture-html-reference.mjs` out of `pica-html` for two releases after
 * 3.0.0 deleted `pica-html` and moved that script into `pica-ux-engineer`. The guarded
 * runner did exactly what it promised — printed SKIPPED and carried on — so the chain
 * completed, reported itself complete, and the capture on which EIGHT measured checks
 * depend was never produced. The command's own words: "a chain reported as complete with
 * four of its checks silently absent is the exact failure this project exists to prevent."
 *
 * Nothing caught it because nothing had ever read a command file as code. validate-packages
 * holds that a DECLARED script exists; this holds that an INVOKED one does. A package name
 * inside a bash block is a bare string, and a bare string survives a rename — the same
 * class as `path.join(ROOT, "packages")` in mutate.mjs, `./packages/discover` in the
 * marketplace, `agents: ["./agents"]` in ux-researcher, and the seven-of-twelve agent list
 * in knowledge-gen. This is the fifth, and the first that was silent rather than red.
 *
 * It reads the three forms the commands use, and fails on any other it does not recognise
 * rather than passing over it:
 *
 *   node "$pica" <package> <script.mjs> [args]     via core/scripts/pica-run.mjs
 *   node .../<package>/scripts/<script.mjs>        a direct path
 *   node ${CLAUDE_PLUGIN_ROOT}/scripts/<script.mjs>  the command's own package
 *
 * A package named here must exist under roles/ (or be "core"), and must ship the script.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const findings = [];

const pkgDir = (name) => name === "core" ? path.join(ROOT, "core") : path.join(ROOT, "roles", name);

/* Every command file the repository ships, found rather than listed: a list kept here is
   one more bare string that a rename can leave behind. */
const commandFiles = [];
for (const base of [path.join(ROOT, "core", "commands"),
                    ...fs.readdirSync(path.join(ROOT, "roles"), { withFileTypes: true })
                      .filter((e) => e.isDirectory())
                      .map((e) => path.join(ROOT, "roles", e.name, "commands"))]) {
  if (!fs.existsSync(base)) continue;
  for (const f of fs.readdirSync(base)) if (f.endsWith(".md")) commandFiles.push(path.join(base, f));
}

if (!commandFiles.length) {
  console.error("FAIL  no command files found. A validator that validates nothing is not a pass.");
  process.exit(2);
}

let checked = 0;

for (const file of commandFiles) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");

  let inBash = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) { inBash = /^```(bash|sh|zsh)/.test(line); return; }
    if (!inBash) return;
    if (/^\s*#/.test(line)) return;

    /* form 1: the resolver. The variable holding its path is not read here — what matters
       is the package and the script, which is what a rename breaks. */
    let m = line.match(/node\s+"\$\{?\w+\}?"\s+([a-z][a-z-]*)\s+([\w.-]+\.mjs)/);
    if (m) {
      checked++;
      const [, pkg, script] = m;
      if (!fs.existsSync(pkgDir(pkg)))
        findings.push(`${rel}:${i + 1} invokes ${script} from "${pkg}", and no such package exists`);
      else if (!fs.existsSync(path.join(pkgDir(pkg), "scripts", script)))
        findings.push(`${rel}:${i + 1} invokes ${script} from "${pkg}", which ships no such script`);
      return;
    }

    /* form 3: the command's own package, by ${CLAUDE_PLUGIN_ROOT}. */
    m = line.match(/\$\{?CLAUDE_PLUGIN_ROOT\}?\/scripts\/([\w.-]+\.mjs)/);
    if (m && !/pica-run\.mjs/.test(line)) {
      checked++;
      if (!fs.existsSync(path.join(path.dirname(path.dirname(file)), "scripts", m[1])))
        findings.push(`${rel}:${i + 1} invokes ${m[1]} from its own package, which ships no such script`);
      return;
    }

    /* form 2: a direct path into a package's scripts directory. */
    m = line.match(/(?:roles\/)?([a-z][a-z-]*)\/scripts\/([\w.-]+\.mjs)/);
    if (m && !/pica-run\.mjs/.test(line)) {
      checked++;
      const [, pkg, script] = m;
      if (fs.existsSync(pkgDir(pkg)) && !fs.existsSync(path.join(pkgDir(pkg), "scripts", script)))
        findings.push(`${rel}:${i + 1} invokes ${pkg}/scripts/${script}, which does not exist`);
      return;
    }

    /* Anything else that names a script is a form this file cannot read, and the header has always
       promised to FAIL on one rather than pass over it. It passed over `pica_find html
       capture-html-reference.mjs` for releases: a shell function no block defines, naming a package
       deleted in 3.0.0, so /pica-evaluate's build-versus-design step could not have run. */
    m = line.match(/([\w.-]+\.mjs)\b/);
    if (m && !/pica-run\.mjs/.test(line))
      findings.push(`${rel}:${i + 1} names ${m[1]} in a form this check cannot resolve. Invoke it as ` +
        '`node "$pica" <package> <script.mjs>`, so a rename is caught here rather than on a user\'s machine');
  });
}

/* Fails closed. A run that recognised no invocation at all has not checked the commands,
   it has only read them, and the two look identical in a green table. */
if (!checked) {
  console.error("FAIL  no script invocation was recognised in any command file. Either the");
  console.error("      commands stopped invoking scripts, or this check stopped reading them.");
  process.exit(2);
}

console.log(`command files: ${commandFiles.length}`);
console.log(`script invocations checked: ${checked}`);

if (findings.length) {
  console.error("");
  for (const f of findings) console.error(`FINDING  ${f}`);
  console.error(`\n${findings.length} finding(s).`);
  process.exit(1);
}
console.log("\n0 finding(s).");
