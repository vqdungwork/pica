#!/usr/bin/env node
/* Does the thing actually build?
 *
 * On one project every check in the suite — smoke, navigation, e2e, target sizes, copy, route
 * guard, axe, layout coherence, visual baselines, a 376-render sweep — ran against the DEV SERVER
 * and passed. The production build had been broken for the whole engagement by a single stray
 * closing brace in a stylesheet, which the dev server tolerates and the bundler's minifier does
 * not. Nobody had ever run the build.
 *
 * A demo that does not build cannot be handed over, published, deployed or shared. It is not a
 * deliverable, whatever the other checks say about it.
 *
 * Usage: build-check.mjs --cmd "npm run build" --cwd demo --out demo/dist [--entry index.html]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
/* The build command is a fact about the project, so the project may state it once in
 * .pica/runners.json rather than have every caller repeat it. Flags win when given. */
let cfg = {};
try { cfg = (JSON.parse(readFileSync(".pica/runners.json", "utf8")).build) || {}; } catch {}
const cmd = arg("--cmd", "") || cfg.cmd || "";
const cwd = arg("--cwd", "") || cfg.cwd || ".";
const out = arg("--out", "") || cfg.out || "";
const entry = arg("--entry", "") || cfg.entry || "index.html";
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!cmd) {
  console.log('build-check: SKIPPED — no --cmd given, so nothing was built. This is not a pass. ' +
    'Declare it in .pica/runners.json: {"build":{"cmd":"npm run build","cwd":"demo","out":"demo/dist"}}');
  process.exit(0);
}

const [bin, ...rest] = cmd.split(/\s+/);
const res = await new Promise((resolve) =>
  execFile(bin, rest, { cwd, maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 },
    (err, stdout, stderr) => resolve({ code: err ? (err.code ?? 1) : 0, out: (stdout || "") + (stderr || "") })));

if (res.code !== 0) {
  // the bundler's own message is the useful part; a wrapper that hides it wastes the reader's time
  const lines = res.out.trim().split("\n");
  const signal = lines.filter((l) => /error|failed|✗|Error:/i.test(l)).slice(0, 6);
  fail("build-fails", `\`${cmd}\` exited ${res.code}.\n` +
    (signal.length ? signal.map((l) => "         " + l.trim()).join("\n") : "         " + lines.slice(-4).join("\n         ")));
} else if (out) {
  if (!existsSync(out)) {
    fail("build-produces-nothing", `\`${cmd}\` succeeded and ${out} does not exist`);
  } else {
    const walk = (d) => readdirSync(d, { withFileTypes: true })
      .flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
    const files = walk(out);
    if (!files.some((f) => f.endsWith(entry)))
      fail("build-produces-nothing", `${out} holds ${files.length} file(s) and no ${entry}. A build with no entry point is not servable`);
    const bytes = files.reduce((t, f) => t + statSync(f).size, 0);
    console.log(`build-check: \`${cmd}\` ok — ${files.length} file(s), ${(bytes / 1024).toFixed(0)}KB in ${out}`);
  }
}

if (fails.length) {
  console.error(`FAIL  build-check  ${fails.length} finding(s)   (${cmd})\n` + fails.join("\n"));
  process.exit(1);
}
console.log(`pass  build-check  0 finding(s)   (${cmd})`);
