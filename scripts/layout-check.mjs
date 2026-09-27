/**
 * layout-check.mjs: pica run the way it is INSTALLED, not the way it sits in this repository.
 *
 * Every suite in ci.yml runs from the repository, where core/ and roles/ sit side by side. Users
 * never have that layout. An install puts each package at <cache>/<marketplace>/pica-<name>/<version>/,
 * and after the first update there are two versions of each. The runtime has resolved that layout
 * wrongly at least four times, and every time CI was green, because CI had never seen it:
 *
 *   - pica-status printed "READY 0.6.0", a package named after a version directory
 *   - pica-verify sorted versions as strings and ran 3.2.1 in place of 3.15.1
 *   - proposal-check read the sector base from the lowest version, or from nowhere
 *   - pica-status, with five versions cached, read pica-core/ as the package root and printed
 *     "READY core" five times
 *
 * So this builds that layout from this repository, with an older decoy version beside every
 * package, and runs the entry points from it. Each assertion is about resolution: which package,
 * which version, found at all.
 *
 * Usage: node scripts/layout-check.mjs
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8")).version;
const DECOY = "3.2.1";   // sorts ABOVE any 3.1x.y as a string, and below it as a number

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pica-layout-"));
const cache = path.join(tmp, "cache", "pica");
const pkgs = [["core", path.join(ROOT, "core")],
  ...fs.readdirSync(path.join(ROOT, "roles"), { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => [e.name, path.join(ROOT, "roles", e.name)])];
for (const [name, src] of pkgs) {
  for (const v of [VERSION, DECOY]) {
    const dst = path.join(cache, `pica-${name}`, v);
    fs.cpSync(src, dst, { recursive: true });
    // the decoy is recognisably stale: an empty checks list and a script that fails if ever run
    if (v === DECOY) {
      const m = JSON.parse(fs.readFileSync(path.join(dst, "package.json"), "utf8"));
      fs.writeFileSync(path.join(dst, "package.json"), JSON.stringify({ ...m, checks: [] }, null, 2));
      for (const f of fs.existsSync(path.join(dst, "scripts")) ? fs.readdirSync(path.join(dst, "scripts")) : [])
        if (f.endsWith(".mjs")) fs.writeFileSync(path.join(dst, "scripts", f), 'console.log("DECOY RAN"); process.exit(3);\n');
    }
  }
}
const inst = (pkg, script) => path.join(cache, `pica-${pkg}`, VERSION, "scripts", script);

const project = path.join(tmp, "project");
fs.cpSync(path.join(ROOT, "examples", "approvals"), project, { recursive: true, filter: (p) => !/[\\/](node_modules|\.audit|dist)([\\/]|$)/.test(p) });

const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n      ${detail}`}`); };
const run = (args, opts = {}) => {
  try { return { code: 0, out: execFileSync("node", args, { cwd: project, encoding: "utf8", ...opts }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
};

// pica-status: one row per package, every package, no phantom and no drift
{
  const r = run([inst("core", "pica-status.mjs"), ".pica/state.json"]);
  const rows = [...r.out.matchAll(/^(READY|BLOCKED|PLANNED|UNREADABLE)\s+(\S+)/gm)].map((m) => m[2]);
  check("pica-status lists every package once", rows.length === pkgs.length && new Set(rows).size === rows.length,
    `${rows.length} row(s) for ${pkgs.length} package(s): ${rows.join(", ")}`);
  check("pica-status reports no drift and no decoy", !/MANIFEST DRIFT|DECOY/.test(r.out), r.out.split("\n").slice(-6).join(" | "));
}

// pica-run: resolves the highest version by number, and runs it
{
  const r = run([inst("core", "pica-run.mjs"), "--resolve", "business-analyst", "trace-check.mjs"]);
  check("pica-run resolves the highest version", r.out.trim().includes(path.join(`pica-business-analyst`, VERSION)),
    `resolved to ${r.out.trim() || "(nothing)"}`);
}

// pica-verify: says which version ran, and that is the current one; never runs a decoy script
{
  const r = run([inst("core", "pica-verify.mjs"), ".pica/state.json", "--phase", "analyse"]);
  check("pica-verify runs the current version", new RegExp(`^pica ${VERSION.replace(/\./g, "\\.")} `, "m").test(r.out) && !/DECOY/.test(r.out),
    r.out.split("\n")[0]);
  const j = run([inst("core", "pica-verify.mjs"), ".pica/state.json", "--phase", "analyse", "--json"]);
  let parsed = null; try { parsed = JSON.parse(j.out); } catch {}
  check("pica-verify --json parses on an install", !!parsed && parsed.pica?.every((p) => p.version === VERSION),
    parsed ? JSON.stringify(parsed.pica?.find((p) => p.version !== VERSION)) : j.out.slice(0, 120));
}

// a check that reads a SIBLING package's data finds it in the current version
{
  const r = run([inst("product-manager", "proposal-check.mjs"), ".pica/state.json", "--phase", "design"]);
  check("proposal-check reads the sector base from its sibling", /sector defect\(s\) compared/.test(r.out),
    (r.out.match(/not-forbidden.*$/m) || ["(no not-forbidden row)"])[0]);
}

// a project on its first day: nothing built yet, so nothing may be reported as a fault in the setup.
// 3.19.0 found every browser check reported UNSET here, and the run exiting 1 before intake
{
  const fresh = path.join(tmp, "fresh");
  fs.mkdirSync(path.join(fresh, ".pica"), { recursive: true });
  fs.writeFileSync(path.join(fresh, ".pica", "state.json"), "{}\n");
  const r = run([inst("core", "pica-verify.mjs"), ".pica/state.json"], { cwd: fresh });
  check("pica-verify on a brand-new project exits 0 with no runner fault", r.code === 0 && !/NOT REPORTING HONESTLY|UNSET/.test(r.out),
    `exit ${r.code}: ${r.out.split("\n").filter((l) => /check\(s\):|NOT REPORTING|UNSET/.test(l)).slice(0, 3).join(" | ")}`);
  const st = run([inst("core", "pica-status.mjs"), ".pica/state.json"], { cwd: fresh });
  check("pica-status on a brand-new project lets intake start", /^READY\s+product-manager/m.test(st.out), st.out.split("\n").slice(0, 4).join(" | "));
}

fs.rmSync(tmp, { recursive: true, force: true });
const failed = results.filter((x) => !x).length;
console.log(`\n${failed} failure(s) across ${results.length} assertion(s), run from an installed layout with a decoy ${DECOY} beside ${VERSION}.`);
process.exit(failed ? 1 : 0);
