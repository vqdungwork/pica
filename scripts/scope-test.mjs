/**
 * scope-test.mjs — a check must report on the project it was pointed at.
 *
 * git discovers a repository by walking UP from cwd, so every git-backed check has a
 * failure mode that looks exactly like a pass: pointed at a directory that is not itself
 * a repository, it silently answers about whichever repository encloses it.
 *
 * impl-check did this until 1.2.3. Pointed at examples/approvals it reported branch age
 * for pica's own branches, resolved owner/repo from pica's remote to query branch
 * protection over the network, and — the one that matters — ran its credential scan with
 * `git ls-files` over a directory that had nothing committed, found nothing, and reported
 * "0 tracked files" as a PASS. A secrets scan that scans nothing and passes is precisely
 * the fail-open impl-check's own header forbids.
 *
 * The README had rationalised the visible half of this: it said impl-check "reads this
 * repository's git instead and reports it not ready to release, which it is". It was
 * right about pica by accident, having measured something else.
 *
 * So this asserts the property rather than the symptom: refuse a non-root directory, and
 * leave a genuine repository root working exactly as before.
 *
 * Usage: node scripts/scope-test.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMPL = path.join(ROOT, "packages", "impl", "scripts", "impl-check.mjs");
const EXAMPLE = path.join(ROOT, "examples", "approvals");

let failures = 0;
const ok = (m) => console.log(`  pass  ${m}`);
const bad = (m, detail) => { failures++; console.log(`  FAIL  ${m}`); if (detail) console.log(detail.replace(/^/gm, "        ")); };

const run = (dir, state) => {
  try {
    return { out: execFileSync("node", [IMPL, dir, state], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), code: 0 };
  } catch (e) {
    return { out: (e.stdout || "") + (e.stderr || ""), code: e.status };
  }
};

if (!fs.existsSync(EXAMPLE)) {
  console.error("FAIL  examples/approvals is missing, and it is what this points at.");
  process.exit(2);
}

/* ---- 1. a subdirectory of a repository is refused ------------------------ *
 * examples/approvals is inside pica's repository and is not one itself, which is the
 * exact shape that used to be read silently. */
console.log("a non-root directory is refused, not silently read");
{
  const { out, code } = run(EXAMPLE, path.join(EXAMPLE, ".pica", "state.json"));
  if (/is not the root of a git repository/.test(out) && code === 2) ok(`refused, exit ${code}`);
  else if (/branch-age/.test(out)) bad("reported branch-age from the enclosing repository", out.split("\n").filter((l) => /branch-age/.test(l)).slice(0, 4).join("\n"));
  else bad(`neither refused nor reported (exit ${code})`, out.split("\n").slice(0, 5).join("\n"));

  /* The fail-open, asserted directly: it must never pass having scanned nothing. */
  if (/pass\s+secrets.*\(0 tracked files\)/.test(out)) bad("secrets passed having scanned nothing");
  else ok("no vacuous secrets pass");
}

/* ---- 2. a genuine repository root still works ---------------------------- *
 * The fix must refuse the wrong thing without refusing the right one. */
console.log("a genuine repository root is unaffected");
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pica-scope-"));
  execFileSync("rsync", ["-a", "--exclude", ".git", EXAMPLE + "/", d + "/"]);
  const who = ["-c", "user.email=scope@example.invalid", "-c", "user.name=pica scope test"];
  const q = { cwd: d, stdio: "ignore" };
  execFileSync("git", ["init", "-q", "-b", "main"], q);
  execFileSync("git", [...who, "add", "-A"], q);
  execFileSync("git", [...who, "commit", "-q", "-m", "the example, as its own repository"], q);

  const { out } = run(d, path.join(d, ".pica", "state.json"));
  if (/(pass|FAIL)\s+branch-age/.test(out)) ok(`branch-age ran: ${(out.match(/.*branch-age.*/) || [""])[0].trim()}`);
  else bad("branch-age did not run against a real repository root", out.split("\n").slice(0, 6).join("\n"));

  if (/(pass|FAIL)\s+secrets/.test(out)) ok(`secrets ran: ${(out.match(/.*\bsecrets\b.*/) || [""])[0].trim()}`);
  else bad("secrets did not run against a real repository root");

  fs.rmSync(d, { recursive: true, force: true });
}

console.log(`\n${failures} failure(s).`);
process.exit(failures ? 1 : 0);
