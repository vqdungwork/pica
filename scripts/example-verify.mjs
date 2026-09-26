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
 * The example is copied to a temporary directory, its boards and its served demo captured with the
 * real producer (the second is the build build-diff compares against the first), and handed to
 * pica-verify, whose exit code is this script's: non-zero on any failed check and on any fault in
 * the runner itself, including a check that applies and was never told where the app is.
 *
 * Usage: node scripts/example-verify.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync, spawnSync, spawn } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, "examples", "approvals");
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "pica-example-"));
fs.cpSync(src, dir, { recursive: true, filter: (p) => !/[\\/](node_modules|\.audit)([\\/]|$)/.test(p) });

/* The specification, from the state, with pica's own generators: the diagrams, then the page that
 * places them. document-check and figure-placement-check read these, and a generator that broke
 * would otherwise be noticed by the first client who opened the page. */
for (const [pkg, script, ...rest] of [
  ["systems-analyst", "model-diagram.mjs", ".pica/state.json", "--out", "docs/spec/diagrams"],
  ["business-analyst", "assemble-spec.mjs", ".pica/state.json", "--out", "docs/spec/index.html"],
]) {
  try { execFileSync("node", [path.join(ROOT, "roles", pkg, "scripts", script), ...rest], { cwd: dir, stdio: "ignore" }); }
  catch { console.log(`NOTE  ${script} failed, so the checks that read the specification will abstain below.`); }
}

const capture = [path.join(ROOT, "roles", "ux-engineer", "scripts", "capture-html-reference.mjs"),
  "--dir", "html", "--out", ".audit"];
try { capture.push("--playwright", path.dirname(createRequire(import.meta.url).resolve("playwright"))); } catch {}
try { execFileSync("node", capture, { cwd: dir, stdio: "ignore" }); }
catch {
  console.log("NOTE  the capture could not be produced, so every check that reads it will abstain below.");
}

/* The demo, captured as the build build-diff compares against the boards. It is served the way the
 * project declares, and captured at the routes that carry the boards' states. */
const runners = JSON.parse(fs.readFileSync(path.join(dir, ".pica", "runners.json"), "utf8"));
const [bin, ...rest] = runners.serve.cmd.split(/\s+/);
const server = spawn(bin, rest, { cwd: path.join(dir, runners.serve.cwd || "."), stdio: "ignore" });
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(runners.serve.url)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const demo = [capture[0], "--url", `${runners.serve.url}?scr=queue`, "--url", `${runners.serve.url}?scr=queue&state=held`, "--url", `${runners.serve.url}?scr=queue&state=empty`,
    "--out", ".audit", "--as", "demo-reference.json", ...capture.slice(5)];
  execFileSync("node", demo, { cwd: dir, stdio: "ignore" });
} catch {
  console.log("NOTE  the demo could not be captured, so build-diff will abstain below.");
} finally {
  // wait for the port to be released: pica-verify serves the same project on the same port next
  await new Promise((r) => { server.once("exit", r); server.kill(); });
}

const r = spawnSync("node", [path.join(ROOT, "core", "scripts", "pica-verify.mjs"), path.join(dir, ".pica", "state.json")],
  { stdio: "inherit" });
fs.rmSync(dir, { recursive: true, force: true });
process.exit(r.status ?? 1);
