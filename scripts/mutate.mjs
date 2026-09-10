/**
 * mutate.mjs — this repository proving its own claim.
 *
 * The README says "every one has been seen to fail on the defect it was written for", and
 * until 0.9.5 that was true and unverifiable: the suites were run ad hoc in a scratch
 * directory and never committed, so the one claim that makes a check count for anything
 * rested on somebody's word.
 *
 * It runs against ANY pica project rather than a fixture committed here, because a
 * fixture in this repository would be somebody's project and this repository ships the
 * method and nothing else. `--fixture` generates a minimal generic one when you have no
 * project to hand.
 *
 * Two directions, and the second is the half people skip:
 *
 *   1. the defect is CAUGHT       reintroduce it, and the named check fires
 *   2. nothing else co-fires      and the unmutated project still passes clean
 *
 * A check that fires on everything is as useless as one that fires on nothing, and a
 * co-fire sends whoever reads the report to the wrong place.
 *
 * Usage:
 *   node scripts/mutate.mjs <project-dir>      run against a real pica project
 *   node scripts/mutate.mjs --fixture          generate a minimal one and run against it
 *   node scripts/mutate.mjs <dir> --only trace-check
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = path.join(ROOT, "packages");
const args = process.argv.slice(2);
const FIXTURE = args.includes("--fixture");
const onlyAt = args.indexOf("--only");
const ONLY = onlyAt >= 0 ? args[onlyAt + 1] : null;
let DIR = args.find((a) => !a.startsWith("--") && a !== ONLY);

/* ---- the fixture ---------------------------------------------------------- *
 * Deliberately thin and deliberately generic. It exists so this suite runs with no
 * project to hand, not so it stands in for one: a real project has screens, and the
 * checks that read a capture are skipped here and SAID to be skipped. */
function makeFixture() {
  /* Copied from examples/approvals rather than generated here.
   *
   * It used to be a 250-line literal in this file, which meant the only complete pica
   * project in existence was written into a temp directory and deleted, and nobody
   * learning pica could read one. Extracting it gave the repository a worked example;
   * keeping it AS the fixture is what stops the example drifting from what the checks
   * actually read, because a wrong field here stops the suite catching something and the
   * suite runs on every change.
   *
   * The two things not carried in the example are produced here: the git repository,
   * which cannot be nested inside this one, and the capture, which comes from the real
   * producer over the example's own html. */
  const src = path.join(ROOT, "examples", "approvals");
  if (!fs.existsSync(src)) {
    console.error("FAIL  examples/approvals is missing, and it is the fixture.");
    console.error("      Nothing can be proven without it, and that is not a pass.");
    process.exit(2);
  }
  const d = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "pica-mutate-"));
  execFileSync("rsync", ["-a", "--exclude", ".git", "--exclude", "node_modules", src + "/", d + "/"]);

  /* The fixture gets a repository of its own. No surviving check reads git — impl-check
   * did and went with the build half — but a project directory that is not a repository
   * is not a shape pica should be proven against. */
  try {
    const q = { cwd: d, stdio: "ignore" };
    const who = ["-c", "user.email=fixture@example.invalid", "-c", "user.name=pica fixture"];
    execFileSync("git", ["init", "-q", "-b", "main"], q);
    execFileSync("git", [...who, "add", "-A"], q);
    execFileSync("git", [...who, "commit", "-q", "-m",
      "the example, so branch age and protection have a repository to be about"], q);
  } catch {}

  /* The capture's sub-objects are POSITIONAL arrays, so writing one by hand here would be
   * a second implementation of a format this repository already produces, and the two
   * would drift the way a copied field drifts. Conditional on playwright, and it says so
   * when it cannot. */
  try {
    const args = [path.join(PKG, "html/scripts/capture-html-reference.mjs"),
      "--dir", "html", "--out", ".audit"];
    try {
      args.push("--playwright", path.dirname(createRequire(import.meta.url).resolve("playwright")));
    } catch {}
    execFileSync("node", args, { cwd: d, stdio: "ignore" });
  } catch {
    console.log("NOTE  the fixture's capture could not be produced, most likely because playwright is");
    console.log("      absent. The four capture-reading mutations will report SKIPPED below, and a");
    console.log("      skipped mutation is not a passed one.\n");
  }

  return d;
}

if (FIXTURE || !DIR) {
  if (!FIXTURE && !DIR) console.log("no project given, generating a fixture. Pass a project directory to run against a real one.\n");
  DIR = makeFixture();
}
/* Absolute, because every check runs with cwd: DIR and is handed a path built from it.
 * A relative directory made those two disagree, so `mutate.mjs examples/approvals` — the
 * invocation the README documents — reported every check FAIL on a missing state file and
 * refused as a failing baseline. The suite was fine; the argument was. */
DIR = path.resolve(DIR);
const S = path.join(DIR, ".pica", "state.json");
if (!fs.existsSync(S)) {
  console.error(`FAIL  ${S} does not exist. Point this at a pica project, or pass --fixture.`);
  process.exit(2);
}
const REF = path.join(DIR, ".audit", "html-reference.json");
const hasCapture = fs.existsSync(REF);

const run = (script, argv) => {
  try { execFileSync("node", [path.join(PKG, script), ...argv], { encoding: "utf8", cwd: DIR }); return ""; }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

/* ---- the mutations -------------------------------------------------------- *
 * `check` is the id the named script must report. `needs` says what the project has to
 * carry for the mutation to be meaningful, so a thin fixture reports SKIPPED rather than
 * a pass it did not earn. */
const M = [
  // trace-check
    /* The check flags a word the glossary DECLARES is wrong, not any unknown word: flagging
   * every unknown word would report the whole English language. So the mutation declares a
   * non-term and then uses it, which is the defect the check actually guarantees against.
   *
   * Two earlier versions of this mutation tested the guarantee the file's HEADER claimed
   * rather than the one its code held, and both silently caught nothing. */
  ["glossary-closure", "analyst/scripts/trace-check.mjs", [S], "glossary", (s) => {
    s.glossary[0].notOurTerm = [...(s.glossary[0].notOurTerm || []), "flange"];
    s.businessRules[0].rule = "Every flange must be recorded before dispatch.";
  }],
  ["rule-enforcement", "analyst/scripts/trace-check.mjs", [S], "businessRules", (s) => delete s.businessRules[0].enforcedBy],
  ["use-case-trace",   "analyst/scripts/trace-check.mjs", [S], "useCases", (s) => delete s.useCases[0].tracesTo],
  ["entity-terms",     "analyst/scripts/trace-check.mjs", [S], "domainModel", (s) => s.domainModel.push({ entity: "widget", attributes: [] })],
  ["as-is-present",    "analyst/scripts/trace-check.mjs", [S], "asIs", (s) => delete s.asIs],
  ["assumption-radius","analyst/scripts/trace-check.mjs", [S], "assumptions", (s) => delete s.assumptions[0].affects],
  ["exclusions-asked", "analyst/scripts/trace-check.mjs", [S], null, (s) => s.exclusionsConfirmed = false],
  // industry-check
  ["industry-known",   "analyst/scripts/industry-check.mjs", [S], null, (s) => { s.field = "assorted things"; delete s.industry.key; }],

  // archetype-check
  ["archetype-declared", "analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { delete s.applications[0].archetype; delete s.archetype; }],
  ["archetype-resolved", "analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { s.applications[0].archetype = "widget-thing"; }],
  ["archetype-ambiguous","analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { s.applications[0].archetype = "platform"; }],

  // audience-check
  ["audience-resolved",  "analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.age.value = "middle-aged"; }],
  ["audience-dimensions","analyst/scripts/audience-check.mjs", [S], "audience", (s) => { delete s.audience.dimensions.literacy; }],
  ["audience-floors",    "analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.age.value = "older-adults"; }],
  ["audience-evidence",  "analyst/scripts/audience-check.mjs", [S], "audience", (s) => { delete s.audience.dimensions.region.evidence; }],
  ["audience-ambiguous", "analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.region.value = "asia"; }],

  // process-check
  ["notation-named",   "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.notation = "uml-activity"; }],
  ["notation-named",   "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.notationWhy; }],
  ["activity-laned",   "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.nodes.find((n) => n.id === "raise").lane; }],
  ["gateway-forks",    "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.edges = s.toBe.edges.filter((e) => !(e.from === "decide" && e.to === "amend")); }],
  ["no-dead-end",      "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.edges = s.toBe.edges.filter((e) => e.from !== "record"); }],
  ["activity-traced",  "analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.nodes.find((n) => n.id === "raise").tracesTo; }],

  // permissions-check
  ["cell-answered",    "analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { delete s.rolesPermissions["account holder"].payment; }],
  ["entity-owned",     "analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["account holder"].payment = "r"; }],
  ["role-known",       "analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["shadow admin"] = { payment: "crud", approval: "crud" }; }],
  ["use-case-backs",   "analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["compliance officer"].payment = "rd"; }],

  // requirements-check
  ["nfr-measured",     "analyst/scripts/requirements-check.mjs", [S], "nfr", (s) => { s.nfr[0].requirement = "the approval queue is fast"; }],
  ["nfr-measured",     "analyst/scripts/requirements-check.mjs", [S], "nfr", (s) => { delete s.nfr[0].measuredBy; }],
  ["classified",       "analyst/scripts/requirements-check.mjs", [S], "requirements", (s) => { delete s.requirements[0].class; }],
  ["transition-flagged","analyst/scripts/requirements-check.mjs", [S], "requirements", (s) => { delete s.requirements.find((r) => r.class === "transition").untilWhen; }],
  ["state-closed",     "analyst/scripts/requirements-check.mjs", [S], "stateModel", (s) => { delete s.stateModel[0].states.find((x) => x.name === "held").to; }],
  ["state-closed",     "analyst/scripts/requirements-check.mjs", [S], "stateModel", (s) => { s.stateModel[0].states.find((x) => x.name === "approved").terminal = false; }],

  // journey-check
  ["lane-covered",     "analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { s.journeys[0].actor = "somebody with no lane"; }],
  ["stage-derived",    "analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { s.journeys[0].stages[0].from = ["a step that is not in the lane"]; }],
  ["pain-sourced",     "analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.journeys[0].stages[0].pain[0].nOf; }],
  ["pain-sourced",     "analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.journeys[0].stages[0].pain[0].class; }],
  ["delta-stated",     "analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.delta; }],
  ["conventions",      "analyst/scripts/industry-check.mjs", [S], "industry", (s) => s.industry.conventions.pop()],
  ["stakeholders",     "analyst/scripts/industry-check.mjs", [S], "stakeholders", (s) => s.stakeholders = []],
  // domain-check
  ["all-categories",   "analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints = (s.domainConstraints || []).slice(1)],
  ["sourced",          "analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints[0].source = "n/a"],
  // problem-check
  /* Two mutations on `metric`, deliberately: absent and VOID are different defects, and
   * the second is the one that defeated an earlier revision of industry-check end to end
   * by writing "n/a" into every field it required. */
  ["metric",              "analyst/scripts/problem-check.mjs", [S], "problem", (s) => delete s.problem.metric],
  ["metric",              "analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.metric = "n/a"],
  ["target",              "analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.target = s.problem.baseline],
  ["baseline",            "analyst/scripts/problem-check.mjs", [S], "problem", (s) => delete s.problem.baselineMeasuredBy],
  ["guardrail",           "analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.guardrails = []],
  ["counter-evidence",    "analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.counterEvidence = "n/a"],
  ["hmw-generative",      "analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.hmw = "How might we build an approvals dashboard?"],
  ["tier-declared",       "analyst/scripts/problem-check.mjs", [S], "workPackages", (s) => delete s.workPackages.approvals.tier],
  ["freeze-attributed",   "analyst/scripts/problem-check.mjs", [S, "--freeze"], "workPackages", (s) => delete s.frozenBy],
  // schema-check
  ["sample-size",      "research/scripts/schema-check.mjs", [S], "measured", (s) => s.measured = s.measured.slice(0, 2)],
  ["provenance",       "research/scripts/schema-check.mjs", [S], "measured", (s) => delete s.measured[0].method],
  // discover-check
  ["segment-defined",    "discover/scripts/discover-check.mjs", [S], "discovery", (s) => delete s.discovery.segments[0].context],
  ["users-sample-size",  "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.segments[0].interviews = 2; }],
  ["pain-frequency",     "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.painPoints[0].nOf = [9, 5]; }],
  ["evidence-class",     "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.painPoints[2].class = "inferred"; s.discovery.painPoints[2].confidence = "high"; }],
  ["said-no",            "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.saidNo = []; }],
  ["stakeholder-fears",  "discover/scripts/discover-check.mjs", [S], "stakeholders", (s) => delete s.stakeholders[1].fears],
  ["buyer-named",        "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { for (const g of s.discovery.segments) g.isBuyer = false; }],
  ["competitor-pricing", "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.competitors[1].pricing = "unknown"; }],
  ["market-bottom-up",   "discover/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.market.size = 950000; }],
  ["users-provenance",   "discover/scripts/discover-check.mjs", [S], "discovery", (s) => delete s.discovery.painPoints[1].source],
  /* Strip the PROVENANCE from a driver rather than deleting the driver. Deleting it also
   * orphaned the sensitivity entry naming it, so one missing driver reported as two
   * findings and sent the reader in two directions. An unsourced driver is the defect
   * this check is actually written for. */
  // concept-check  (state only: divergence happens before any screen exists)
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { s.workPackages.approvals.concepts = s.workPackages.approvals.concepts.slice(0, 1); }],
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.servesBadly = []; }],
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.dropped = false; }],
  // proposal-check
  ["slot-addressed",   "core/scripts/proposal-check.mjs", [S], "proposals", (s) => s.proposals = s.proposals.filter((p) => p.slot !== "S1")],
  ["axis-named",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.axis],
  ["provenance",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.options[0].from],
  ["choice-recorded",  "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.by],
  // close-check
  ["brief-cold",         "core/scripts/close-check.mjs", [S], "closeout", (s) => s.closeout.briefReadFrom = "docs/contract.md"],
  /* Recorded and then gone. A declared absence excuses a brief nobody ever supplied; it
   * cannot excuse one that was written down and lost, because that one was supposed to
   * survive the project. */
  ["brief-cold",         "core/scripts/close-check.mjs", [S], "closeout", (s) => { s.briefPath = "docs/gone.md"; s.briefAbsent = "the client never sent one, which is recorded here so it is not read as an oversight"; }],
  ["nothing-excluded",   "core/scripts/close-check.mjs", [S], "closeout", (s) => s.closeout.shipped.push("Card issuing")],
  ["metric-compared",    "core/scripts/close-check.mjs", [S], "closeout", (s) => delete s.closeout.metricNow],
  ["committed-shipped",  "core/scripts/close-check.mjs", [S], "closeout", (s) => { s.closeout.shipped = []; }],
  ["assumption-outcome", "core/scripts/close-check.mjs", [S], "assumptions", (s) => delete s.assumptions[0].outcome],
  /* Wrong WITHOUT a cost, not merely wrong. What it cost is the whole value of having
   * written the assumption down, and it is the first thing dropped in a hurried closeout. */
  ["assumption-outcome", "core/scripts/close-check.mjs", [S], "assumptions", (s) => { s.assumptions[0].outcome = "wrong"; }],
  /* Exempted and pointing at no register. A dispute that excuses a check without naming
   * where the exemption lives IS the ignored finding it was built to prevent, wearing
   * better paperwork. */
  ["check-disputed",     "core/scripts/close-check.mjs", [S], "checkDisputes", (s) => delete s.checkDisputes[0].exemptionIn],
  ["check-disputed",     "core/scripts/close-check.mjs", [S], "checkDisputes", (s) => { s.checkDisputes[0].argument = "we disagreed"; }],
  ["delivered-frozen",   "core/scripts/close-check.mjs", [S], "closeout", (s) => { s.delivered = true; s.workPackages.approvals.htmlApproved = false; }],
  // capture-reading checks
  ["direction",        "html/scripts/verify-html.mjs", [REF, S], "capture+direction", (s) => s.direction.assert["type.roles.max"] = 1],
  ["exemption-used",   "html/scripts/contrast-check.mjs", [REF, S], "capture", (s) => s.contrastExemptions = [{ where: "nothing here", why: "a stale exemption nobody removed", by: "somebody" }]],
  ["uc-covered",       "html/scripts/coverage-check.mjs", [REF, S], "capture", (s) => s.useCases.push({ id: "UC-99", name: "A use case nobody built", tracesTo: ["BR-01"] })],
    /* spacing-check reads the TOKEN FILE first and falls back to state.spacingScale, so
   * mutating the fallback did nothing on any project that has tokens. Redirect the path
   * at a scale on which no real gap lands. */
  ["off-scale",        "html/scripts/spacing-check.mjs", [REF, S], "capture", (s) => {
    s.tokensPath = ".pica/mutant-tokens.json";
    /* A scale on which the EDGES still land and the gaps do not. A file with only
     * "--s-1": "7px" put every edge inset off-scale too, so one redirected token file
     * reported as two findings and sent the reader to two places. The fixture's frames
     * pad 24 and gap 16 and 12, so a scale of 24 alone isolates the gap. */
    fs.writeFileSync(path.join(DIR, ".pica", "mutant-tokens.json"), JSON.stringify({ "--s-1": "24px" }));
  }],
];

const results = [];
let caught = 0, missed = 0, skipped = 0;
const base = fs.readFileSync(S, "utf8");
const baseState = JSON.parse(base);

/* ---- the baseline first, and it is not optional -------------------------- *
 * Every "caught" below is meaningless if the project was already failing: a check firing
 * on a project that is broken proves nothing about the mutation. An interrupted earlier
 * run left a mutated state on disk and the next run read it as the baseline, so 38
 * mutations "passed" against a project carrying four real defects. Establish it first,
 * refuse if it is dirty, and say what is wrong. */
const have = (need) => {
  if (!need) return true;
  if (need === "capture") return hasCapture;
  if (need === "capture+direction") return hasCapture && baseState.direction && baseState.direction.assert;
  const v = baseState[need];
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null;
};

/* A pair is EXERCISED only if some mutation on it will actually run: the script is in
 * scope for --only, and the project carries the material that mutation needs. The gate
 * used to demand all nineteen scripts pass, which contradicted this fixture's own design
 * ("the checks that read a capture are skipped here and SAID to be skipped") and made
 * --fixture refuse to run at all: 14 scripts reported findings on it, so the suite exited
 * 2 before the first mutation and the one claim this file exists to prove was
 * unverifiable by the very mode offered to people with no project to hand.
 *
 * Narrowing it does not weaken the gate. Its purpose is that no mutation is scored over
 * a baseline that was already failing, and that purpose is served by checking exactly the
 * pairs about to be scored. A script nothing will exercise proves nothing either way. */
const exercised = (script, argv) => M.some(([, s, a, need]) =>
  s === script && a.join(" ") === argv.join(" ") && (!ONLY || s.includes(ONLY)) && have(need));

{
  const seen = new Set(); const bad = [];
  for (const [, script, argv] of M) {
    const key = script + argv.join(" ");
    if (seen.has(key)) continue; seen.add(key);
    if (!exercised(script, argv)) continue;
    const out = run(script, argv);
    if (out && !/^0 finding|^PASS:/m.test(out))
      bad.push([path.basename(script), out.trim().split("\n").slice(-1)[0]]);
  }
  if (bad.length) {
    console.error(`FAIL  the project is not clean before any mutation, so nothing below would mean`);
    console.error(`      anything. ${bad.length} script(s) already report findings:\n`);
    for (const [n, line] of bad) console.error(`      ${n.padEnd(22)} ${line}`);
    console.error(`\n      Fix the project, or point this at one that passes. A mutation suite run over a`);
    console.error(`      failing baseline reports every check as working and proves none of them.`);
    process.exit(2);
  }
}

for (const [check, script, argv, need, mutate] of M) {
  if (ONLY && !script.includes(ONLY)) continue;
  const name = `${path.basename(script, ".mjs")} · ${check}`;
  if (!have(need)) {
    skipped++;
    results.push(["skip", name, `the project carries no ${need}, so this mutation has nothing to break`]);
    continue;
  }
  const s = JSON.parse(base);
  try { mutate(s); } catch { skipped++; results.push(["skip", name, "the mutation did not apply to this project's shape"]); continue; }
  fs.writeFileSync(S, JSON.stringify(s, null, 2));
  const out = run(script, argv);
  const fired = new RegExp(`\\[${check}\\]|^FAIL\\s+${check}\\b`, "m").test(out);
  const others = [...out.matchAll(/^FAIL\s+([a-z-]+)/gm)].map((m) => m[1]).filter((c) => c !== check);
  if (fired) { caught++; results.push(["caught", name, others.length ? `also fired: ${[...new Set(others)].join(", ")}` : ""]); }
  else { missed++; results.push(["MISSED", name, out.trim().split("\n").slice(-1)[0] || "(no output)"]); }
}
fs.writeFileSync(S, base);

/* ---- and it is still clean afterwards ------------------------------------ *
 * The baseline was established before the first mutation. This confirms the suite put
 * everything back: a run that leaves the project mutated poisons the NEXT run's baseline,
 * which is how 38 mutations came to pass over a project carrying four real defects. */
const clean = [];
for (const [, script, argv] of M) {
  const key = script + argv.join(" ");
  if (clean.some(([k]) => k === key)) continue;
  if (!exercised(script, argv)) continue;
  clean.push([key, script, argv, run(script, argv)]);
}
const dirty = clean.filter(([, , , out]) => out && !/^0 finding|^PASS:/m.test(out));

console.log("");
for (const [verdict, name, note] of results) {
  const mark = verdict === "caught" ? "  caught " : verdict === "skip" ? "  skip   " : "  MISSED ";
  console.log(`${mark}${name.padEnd(38)}${note ? "  " + note.slice(0, 60) : ""}`);
}
console.log(`\n  ${caught} caught · ${missed} missed · ${skipped} skipped (the project has no material for them)`);
console.log(`  restored afterwards:   ${dirty.length ? `${dirty.length} script(s) left dirty. The suite did not put everything back` : "clean on every script exercised"}`);
for (const [, script, argv, out] of dirty)
  console.log(`    ${path.basename(script)} ${argv.join(" ")}
      ${out.trim().split("\n").slice(-1)[0]}`);

if (skipped)
  console.log("\nNOTE  a skipped mutation is not a passed one. Run this against a project that carries\n" +
              "      the material, or the claim it proves is smaller than it looks.");
console.log("\nNOTE  this proves a check FIRES on a defect. Whether the defect it fires on is the one\n" +
            "      worth catching is a judgement, and nothing here can make it.");

process.exit(missed || dirty.length ? 1 : 0);
