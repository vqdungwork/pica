/**
 * thin-state-check.mjs: every check, on the state a project actually has in its first weeks.
 *
 * The mutation suite runs every check on a COMPLETE project, broken in one place. A new project is
 * the opposite: correct and almost empty. A check that reads a field without guarding it is fine on
 * the fixture and throws a stack trace on day one, which a runner has to guess the meaning of and a
 * person reads as pica being broken. 3.19.0 found geometry-diff doing exactly that on a missing
 * capture. This runs every node check on an empty state and on the state left by intake, discovery
 * and analysis, and fails on anything that crashes instead of reporting or abstaining.
 *
 * Usage: node scripts/thin-state-check.mjs
 */
import fs from "fs"; import path from "path"; import os from "os"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const full = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/approvals/.pica/state.json"), "utf8"));
const pick = (keys) => Object.fromEntries(keys.filter((k) => k in full).map((k) => [k, full[k]]));
const STATES = {
  empty: {},
  intake: pick(["field", "industry", "applications", "archetype", "exclusions", "briefPath", "deadline"]),
  discover: pick(["field", "industry", "applications", "archetype", "audience", "discovery", "stakeholders"]),
  analyse: pick(["field", "industry", "applications", "archetype", "audience", "discovery", "stakeholders", "glossary", "businessRules", "useCases", "problem", "nfr", "requirements", "domainModel", "domainConstraints", "asIs", "toBe"]),
};
const pkgs = [["core", path.join(ROOT, "core")], ...fs.readdirSync(path.join(ROOT, "roles")).map((n) => [n, path.join(ROOT, "roles", n)])];
const SUB = { "<state>": ".pica/state.json", "<ref>": ".audit/html-reference.json", "<src>": "src", "<tokens>": "tokens/tokens.json",
  "<review>": "html/review.html", "<designSystem>": "html/design-system.html", "<structureDir>": "html/structure" };
let crashes = 0, runs = 0;
for (const [sname, st] of Object.entries(STATES)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pica-thin-")); fs.mkdirSync(path.join(dir, ".pica"));
  fs.writeFileSync(path.join(dir, ".pica/state.json"), JSON.stringify(st));
  for (const [, pdir] of pkgs) {
    const m = JSON.parse(fs.readFileSync(path.join(pdir, "package.json"), "utf8"));
    for (const c of m.checks || []) {
      if (!c.args || (c.runsIn && c.runsIn !== "node")) continue;
      if (/<(servedDemo|buildCmd|buildOut|srcDir)>/.test(c.args)) continue;   // need a served demo; covered elsewhere
      const args = c.args.split(/\s+/).map((a) => SUB[a] ?? a);
      let out = "", code = 0; runs++;
      try { out = execFileSync("node", [path.join(pdir, "scripts", c.run), ...args], { cwd: dir, encoding: "utf8", stdio: "pipe" }); }
      catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status; }
      if (/TypeError|ReferenceError|SyntaxError|RangeError|at file:\/\/|node:internal|Cannot read prop/.test(out) || ![0, 1, 2].includes(code)) {
        crashes++; console.log(`CRASH  ${sname.padEnd(8)} ${m.name}/${c.run}  exit=${code}\n       ${out.split("\n").find((l) => /Error|at file/.test(l)) || out.split("\n")[0]}`);
      }
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${crashes} crash(es) in ${runs} run(s) across ${Object.keys(STATES).length} thin state(s).`);
process.exit(crashes ? 1 : 0);
