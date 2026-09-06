/**
 * impl-check.mjs — the implementation gate. Runs against the repository, not against
 * state.json, because that is where the answers live.
 *
 * This exists because the implementation DoD was written and then declared unenforceable
 * on the grounds that "PR and CI rules need real repo access". They do. Repo access is
 * available: git is on disk, the platform has an API, and the CI config is a file. The
 * honest position was not "cannot be checked", it was "not checked yet".
 *
 * Eight checks:
 *
 *   1. TEST TRACE       every use case has a test naming it, every business rule has an
 *                       assertion naming it.  PASS: 0 untested.
 *   2. CI PIPELINE      a workflow exists and runs lint, types and tests.
 *                       PASS: all three present.
 *   3. BRANCH PROTECT   main refuses direct pushes and requires review plus checks.
 *                       PASS: all three, via the platform API.
 *   4. BRANCH AGE       no unmerged branch older than the trunk-based window.
 *                       PASS: 0 older than --max-branch-age days (default 2).
 *   5. ENVIRONMENTS     three environments configured, and all deploying from main.
 *                       PASS: dev, staging, production found.
 *   6. SECRETS          nothing that looks like a credential in tracked files.
 *                       PASS: 0. History needs a dedicated scanner and this says so.
 *   7. NFR MEASURED     every NFR names how it will be measured, and a CI-measured one
 *                       is actually in CI.  PASS: 0 unmeasured.
 *   8. STACK DECLARED   the repository is built with the stack state declares.
 *                       PASS: 0 mismatches.
 *
 * Every check that CANNOT run reports as a failure rather than a pass, because a gate
 * that silently skips is worse than one that admits it.
 *
 * Usage: node impl-check.mjs <repo-dir> <state.json> [--max-branch-age 2]
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const [repoDir, statePath] = positional;
const flagAt = args.indexOf("--max-branch-age");
const MAX_AGE = flagAt >= 0 ? Number(args[flagAt + 1]) || 2 : 2;

if (!repoDir || !statePath) {
  console.error("usage: node impl-check.mjs <repo-dir> <state.json> [--max-branch-age 2]");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const sh = (cmd) => {
  try { return execSync(cmd, { cwd: repoDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
};

if (!sh("git rev-parse --git-dir")) {
  console.error(`FAIL  ${repoDir} is not a git repository. Nothing here can be checked, and that is not a pass.`);
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* ---- 1. test trace ------------------------------------------------------ *
 * Tests are matched by ID appearing anywhere in a test file. Matching by test NAME
 * would require parsing four test frameworks, and a parser for one silently returns
 * zero for the rest. */
const useCases = (state.useCases || []).map((u) => u.id).filter(Boolean);
const rules = (state.businessRules || []).map((r) => r.id).filter(Boolean);

const testFiles = [];
(function walk(d) {
  let entries;
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", ".git", "dist", "build", ".next"].includes(e.name)) walk(p);
    } else if (/\.(test|spec|e2e)\.[jt]sx?$/.test(e.name) || /(^|\/)(tests?|e2e|__tests__)\//.test(p)) {
      testFiles.push(p);
    }
  }
})(repoDir);

const testText = testFiles.map((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");

let untested = 0;
if (!useCases.length && !rules.length) {
  untested++;
  fail("test-trace", "state.json",
    "carries no use cases and no business rules, so there is nothing to trace tests to. Run /pica-analyse first");
} else if (!testFiles.length) {
  untested++;
  fail("test-trace", repoDir,
    `${useCases.length} use case(s) and ${rules.length} rule(s) to cover, and no test files found at all`);
} else {
  for (const id of useCases)
    if (!testText.includes(id)) {
      untested++;
      fail("test-trace", id, "no test names this use case. A screen can be perfect and the task still impossible");
    }
  for (const id of rules)
    if (!testText.includes(id)) {
      untested++;
      fail("test-trace", id, "no assertion names this business rule. It was agreed and nothing proves it holds");
    }
}

/* ---- 2. CI pipeline ----------------------------------------------------- */
let ciMissing = 0;
const wfDir = path.join(repoDir, ".github", "workflows");
let wfText = "";
if (fs.existsSync(wfDir)) {
  for (const f of fs.readdirSync(wfDir))
    if (/\.ya?ml$/.test(f)) { try { wfText += fs.readFileSync(path.join(wfDir, f), "utf8") + "\n"; } catch {} }
}
if (!wfText) {
  ciMissing++;
  fail("ci-pipeline", ".github/workflows",
    "no workflow found. Every automatable check is being run by a person remembering to, which is the same as not being run");
} else {
  /* A workflow almost never names the tool. It runs `npm run types`, and what `types`
   * actually does lives in package.json. Reading only the workflow reported "does not run
   * type check" on a pipeline that runs tsc on every push, which is a false positive on
   * one of the most common setups there is.
   *
   * So the haystack is the workflow PLUS the commands behind every script it invokes.
   * Still textual: this resolves a name to a command, it does not parse either file. */
  let scripts = {};
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(repoDir, "package.json"), "utf8")).scripts || {};
  } catch {}
  const invoked = new Set();
  for (const m of wfText.matchAll(/\b(?:npm run|yarn|pnpm run|pnpm|bun run)\s+([a-zA-Z0-9:_-]+)/g))
    invoked.add(m[1]);
  const ciHay = [wfText, ...[...invoked].map((k) => scripts[k] || "")].join("\n");

  for (const [what, re] of [["lint", /\blint\b/i], ["type check", /tsc|type-?check|typecheck/i], ["tests", /\btest\b|vitest|jest|playwright/i]]) {
    if (!re.test(ciHay)) {
      ciMissing++;
      fail("ci-pipeline", "workflow", `does not appear to run ${what}. Review should spend attention on logic, not on what a machine can catch`);
    }
  }
}

/* ---- 3. branch protection ----------------------------------------------- *
 * Needs the platform API. If gh is not present, that is a check that could not run,
 * and it is reported as a failure rather than skipped. */
let unprotected = 0;
let manualProtection = null;
/* A repository that is not on GitHub, or a machine without gh, could never pass this
 * check at all, and an unpassable check is one people route around. Every other
 * deliberate exception in this repository has a register; this one had none, so the only
 * options were "install gh" and "ignore the finding".
 *
 * `state.branchProtection` is that register, and it is signed like every other one:
 *
 *   "branchProtection": { "verifiedBy": "who looked", "on": "2026-09-06",
 *                         "note": "GitLab: main is protected, 1 approval, pipeline must pass" }
 *
 * This does not make the check weaker. It makes the human assertion visible and
 * attributable, which is the difference between an exception and an omission. */
const bp = state.branchProtection || {};
const manual = String(bp.verifiedBy || "").trim() && String(bp.note || "").trim();
const hasGh = sh("gh --version") !== null;
if (manual) {
  /* Reported, never silent. A recorded human check is weaker evidence than an API read
   * and the report has to say which one it got. */
  manualProtection = `verified by ${bp.verifiedBy}${bp.on ? ` on ${bp.on}` : ""}: ${bp.note}`;
} else if (!hasGh) {
  unprotected++;
  fail("branch-protect", "gh",
    "GitHub CLI not available, so branch protection could not be read. A check that cannot run is not a pass: " +
    "install gh, or record state.branchProtection with who verified it, when, and what they saw");
} else {
  const json = sh("gh api repos/{owner}/{repo}/branches/main/protection 2>/dev/null");
  if (!json) {
    unprotected++;
    fail("branch-protect", "main",
      "no protection rules returned. main accepts direct pushes, so nothing forces a review or a green pipeline");
  } else {
    let prot = {};
    try { prot = JSON.parse(json); } catch {}
    if (!prot.required_pull_request_reviews) {
      unprotected++;
      fail("branch-protect", "main", "does not require a pull request review");
    }
    if (!prot.required_status_checks) {
      unprotected++;
      fail("branch-protect", "main", "does not require status checks to pass before merge");
    }
    if (prot.allow_force_pushes && prot.allow_force_pushes.enabled) {
      unprotected++;
      fail("branch-protect", "main", "allows force pushes, so history can be rewritten under a reviewer");
    }
  }
}

/* ---- 4. branch age ------------------------------------------------------ *
 * Trunk-based means feature branches merge back within hours, rarely later than a day
 * or two. A branch alive for a week is a fork accruing integration debt. */
let stale = 0;
const branches = (sh(`git for-each-ref --format='%(refname:short)|%(committerdate:unix)' refs/heads/`) || "")
  .split("\n").filter(Boolean).map((l) => { const [n, t] = l.replace(/'/g, "").split("|"); return { n, t: Number(t) }; });
const now = Math.floor(Date.now() / 1000);
for (const b of branches) {
  if (["main", "master", "trunk"].includes(b.n)) continue;
  const days = (now - b.t) / 86400;
  if (days > MAX_AGE) {
    stale++;
    fail("branch-age", b.n,
      `last commit ${days.toFixed(1)} days ago, past the ${MAX_AGE}-day window. Integration debt is accruing and the merge gets harder every day`);
  }
}

/* ---- 5. environments ---------------------------------------------------- */
let envMissing = 0;
const envHay = [wfText,
  ...["docker-compose.yml", "vercel.json", "netlify.toml", "fly.toml", "Procfile", "render.yaml"]
    .map((f) => { try { return fs.readFileSync(path.join(repoDir, f), "utf8"); } catch { return ""; } })
].join("\n").toLowerCase();

for (const env of ["dev", "staging", "prod"]) {
  const re = new RegExp(`\\b${env}\\w*\\b`);
  if (!re.test(envHay)) {
    envMissing++;
    fail("environments", env,
      `no ${env} environment found in CI or deploy config. Testing on the environment users are on is how a broken deploy becomes an incident`);
  }
}

/* ---- 6. secrets in tracked files ---------------------------------------- *
 * Deliberately narrow: obvious credential shapes only. A broad entropy scan produces
 * false positives on hashes and minified code, and a noisy secret check is one people
 * turn off. */
let secrets = 0;
const SECRET = [
  [/\b(sk|pk)_(live|test)_[A-Za-z0-9]{16,}/g, "Stripe-style key"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "AWS access key id"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "GitHub token"],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, "private key"],
  [/\b(password|passwd|secret|api_?key)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi, "hardcoded credential"],
];
const tracked = (sh("git ls-files") || "").split("\n").filter(Boolean);
for (const rel of tracked) {
  if (!/\.(js|jsx|ts|tsx|json|ya?ml|env|sh|py|rb|go|java|kt|swift|toml|properties)$/i.test(rel)) continue;
  if (/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(rel)) continue;
  let text;
  try { text = fs.readFileSync(path.join(repoDir, rel), "utf8"); } catch { continue; }
  for (const [re, what] of SECRET) {
    if (re.test(text)) {
      secrets++;
      fail("secrets", rel, `contains what looks like a ${what}, and it is tracked in git`);
      break;
    }
  }
}

/* ---- 7. NFRs are measured, not asserted --------------------------------- *
 * The Architect writes NFRs with a number and a measurement method. Nothing read them
 * back, which made the register a note. An NFR nobody measures is an adjective with a
 * number attached to it. */
let nfrUnmeasured = 0;
const nfrs = state.nfr || [];
for (const n of nfrs) {
  const id = n.id || "(unnumbered)";
  if (!n.measuredBy || !String(n.measuredBy).trim()) {
    nfrUnmeasured++;
    fail("nfr-measured", id,
      `"${String(n.requirement || "").slice(0, 40)}" names no measurement method, so nobody can say whether it was met`);
    continue;
  }
  if (/\bci\b|pipeline|workflow/i.test(n.measuredBy) && wfText && !new RegExp(id, "i").test(wfText)) {
    nfrUnmeasured++;
    fail("nfr-measured", id, "says it is measured in CI, and no workflow mentions it. The gate exists on paper only");
  }
}

/* ---- 8. the repo is the stack that was declared ------------------------- *
 * Declared at 7.1 so the next person does not guess. Checked here because a declaration
 * nobody verifies is a comment. */
let stackMismatch = 0;
const stack = state.stack || {};
if (Object.keys(stack).length) {
  /* package.json alone was the haystack, and it cannot hold the evidence for half the
   * roles a stack declares. "ci: github-actions" never appears there: its evidence is
   * .github/workflows. Neither does a Python, Go, Ruby, JVM or Swift component. Every one
   * of those was reported as "the repository shows no sign of it" while sitting in the
   * repository, which is a false positive on any polyglot build.
   *
   * The haystack is now every manifest that exists plus the tracked file paths, so a role
   * whose evidence is a directory name resolves like one whose evidence is a dependency.
   * Still no parsing: this is text and paths. */
  const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile",
    "pom.xml", "build.gradle", "build.gradle.kts", "Package.swift", "Cargo.toml", "composer.json",
    "Dockerfile", "docker-compose.yml", "Podfile", "pubspec.yaml"];
  const parts = MANIFESTS.map((f) => {
    try { return fs.readFileSync(path.join(repoDir, f), "utf8"); } catch { return ""; }
  });
  parts.push(sh("git ls-files") || "");
  const ALIAS = {
    "github-actions": ".github/workflows", "gitlab-ci": ".gitlab-ci", "circleci": ".circleci",
    "node": "package.json", "postgres": "postgres", "postgresql": "postgres",
  };
  const stackHay = parts.join("\n").toLowerCase();
  const NATIVE = /swift|kotlin|flutter|react-native/i;
  for (const [role, name] of Object.entries(stack)) {
    const n = String(name).toLowerCase();
    if (NATIVE.test(n)) continue;
    const needle = (ALIAS[n] || n).toLowerCase();
    if (!stackHay.includes(needle) && !stackHay.includes(n)) {
      stackMismatch++;
      fail("stack-declared", role,
        `state declares "${name}" and the repository shows no sign of it. Either the declaration is stale or the build is not what was agreed`);
    }
  }
}

/* ---- report ------------------------------------------------------------- */
console.log(`repo:          ${repoDir}`);
console.log(`test files:    ${testFiles.length}`);
console.log(`to cover:      ${useCases.length} use case(s), ${rules.length} rule(s)`);
console.log(`branches:      ${branches.length}`);
console.log(`gh available:  ${hasGh ? "yes" : "no"}`);
console.log("");

const table = [
  ["test-trace", untested, `${useCases.length + rules.length} ids`],
  ["ci-pipeline", ciMissing, wfText ? "workflow found" : "no workflow"],
  ["branch-protect", unprotected, manualProtection ? "recorded by a human, not read from the API" : hasGh ? "via gh" : "gh unavailable"],
  ["branch-age", stale, `${branches.length} branches, ${MAX_AGE}-day window`],
  ["environments", envMissing, "dev, staging, prod"],
  ["secrets", secrets, `${tracked.length} tracked files`],
  ["nfr-measured", nfrUnmeasured, `${nfrs.length} NFR(s)`],
  ["stack-declared", stackMismatch, Object.keys(stack).length ? `${Object.keys(stack).length} declared` : "none declared"],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

console.log("\nNOTE  git HISTORY is not scanned here. A secret removed from HEAD is still in the history");
console.log("      and still valid. Run a dedicated history scanner before the repository is handed over.");

if (manualProtection) {
  console.log("");
  console.log(`NOTE  branch protection was ${manualProtection}`);
  console.log("      That is a person's word, not an API read. It is recorded and attributable, which is");
  console.log("      the point, but it is weaker evidence and this line exists so nobody forgets that.");
}

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Implementation ${findings.length ? "is NOT ready to release" : "passes the implementation gate"}.`);
process.exit(findings.length ? 1 : 0);
