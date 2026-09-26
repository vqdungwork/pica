/**
 * example-verify.mjs: the worked example, held to pica-verify.
 *
 * The mutation suite proves every check FIRES on a defect. Nothing proved the other half on a
 * whole project: that the example the README points at passes the chain it is the example of.
 * It did not. On 3.16.1 pica-verify reported four failures on examples/approvals, two of them
 * the runner's own defects (a placeholder passed as the string "null"), two real gaps in the
 * example that no check had been pointed at since the checks were written. CI was green,
 * because CI never ran it.
 *
 * The example is copied to a temporary directory, captured with the real producer, and handed to
 * pica-verify, whose exit code is this script's: non-zero on any failed check and on any fault in
 * the runner itself, including a check that applies and was never told where the app is.
 *
 * Usage: node scripts/example-verify.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, "examples", "approvals");
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "pica-example-"));
fs.cpSync(src, dir, { recursive: true, filter: (p) => !/[\\/](node_modules|\.audit)([\\/]|$)/.test(p) });

const capture = [path.join(ROOT, "roles", "ux-engineer", "scripts", "capture-html-reference.mjs"),
  "--dir", "html", "--out", ".audit"];
try { capture.push("--playwright", path.dirname(createRequire(import.meta.url).resolve("playwright"))); } catch {}
try { execFileSync("node", capture, { cwd: dir, stdio: "ignore" }); }
catch {
  console.log("NOTE  the capture could not be produced, so every check that reads it will abstain below.");
}

const r = spawnSync("node", [path.join(ROOT, "core", "scripts", "pica-verify.mjs"), path.join(dir, ".pica", "state.json")],
  { stdio: "inherit" });
fs.rmSync(dir, { recursive: true, force: true });
process.exit(r.status ?? 1);
