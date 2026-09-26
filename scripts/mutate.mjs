/**
 * mutate.mjs: this repository proving its own claim.
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
/* Two roots since 3.0.0: the runtime at <root>/core and the roles under <root>/roles.
   A mutation names its script as "<package>/scripts/<file>.mjs", so the package half
   decides which root it resolves against. This was a bare "packages" string, which is
   why a rename that caught every "packages/" left it behind and only the mutation suite
   on CI noticed. */
const pkgScript = (rel) => {
  const [pkg, ...rest] = rel.split("/");
  return path.join(ROOT, pkg === "core" ? "core" : path.join("roles", pkg), ...rest);
};
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

  /* The fixture gets a repository of its own. No surviving check reads git: impl-check
   * did and went with the build half, but a project directory that is not a repository
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
    const args = [pkgScript("ux-engineer/scripts/capture-html-reference.mjs"),
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
 * A relative directory made those two disagree, so `mutate.mjs examples/approvals`: the
 * invocation the README documents: reported every check FAIL on a missing state file and
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
  try { execFileSync("node", [pkgScript(script), ...argv], { encoding: "utf8", cwd: DIR }); return ""; }
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
  ["glossary-closure", "business-analyst/scripts/trace-check.mjs", [S], "glossary", (s) => {
    s.glossary[0].notOurTerm = [...(s.glossary[0].notOurTerm || []), "flange"];
    s.businessRules[0].rule = "Every flange must be recorded before dispatch.";
  }],
  ["rule-enforcement", "business-analyst/scripts/trace-check.mjs", [S], "businessRules", (s) => delete s.businessRules[0].enforcedBy],
  ["use-case-trace",   "business-analyst/scripts/trace-check.mjs", [S], "useCases", (s) => delete s.useCases[0].tracesTo],
  ["entity-terms",     "business-analyst/scripts/trace-check.mjs", [S], "domainModel", (s) => s.domainModel.push({ entity: "widget", attributes: [] })],
  ["as-is-present",    "business-analyst/scripts/trace-check.mjs", [S], "asIs", (s) => delete s.asIs],
  ["assumption-radius","business-analyst/scripts/trace-check.mjs", [S], "assumptions", (s) => delete s.assumptions[0].affects],
  ["exclusions-asked", "business-analyst/scripts/trace-check.mjs", [S], null, (s) => s.exclusionsConfirmed = false],
  // industry-check
  ["industry-known",   "business-analyst/scripts/industry-check.mjs", [S], null, (s) => { s.field = "assorted things"; delete s.industry.key; }],

  // archetype-check
  ["archetype-declared", "business-analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { delete s.applications[0].archetype; delete s.archetype; }],
  ["archetype-resolved", "business-analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { s.applications[0].archetype = "widget-thing"; }],
  ["archetype-ambiguous","business-analyst/scripts/archetype-check.mjs", [S], "applications", (s) => { s.applications[0].archetype = "platform"; }],

  // audience-check
  ["audience-resolved",  "business-analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.age.value = "middle-aged"; }],
  ["audience-dimensions","business-analyst/scripts/audience-check.mjs", [S], "audience", (s) => { delete s.audience.dimensions.literacy; }],
  ["audience-floors",    "business-analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.age.value = "older-adults"; }],
  ["audience-evidence",  "business-analyst/scripts/audience-check.mjs", [S], "audience", (s) => { delete s.audience.dimensions.region.evidence; }],
  ["audience-ambiguous", "business-analyst/scripts/audience-check.mjs", [S], "audience", (s) => { s.audience.dimensions.region.value = "asia"; }],

  // process-check
  ["notation-named",   "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.notation = "uml-activity"; }],
  ["notation-named",   "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.notationWhy; }],
  ["activity-laned",   "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.nodes.find((n) => n.id === "raise").lane; }],
  ["gateway-forks",    "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.edges = s.toBe.edges.filter((e) => !(e.from === "decide" && e.to === "amend")); }],
  ["no-dead-end",      "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { s.toBe.edges = s.toBe.edges.filter((e) => e.from !== "record"); }],
  ["activity-traced",  "systems-analyst/scripts/process-check.mjs", [S], "toBe", (s) => { delete s.toBe.nodes.find((n) => n.id === "raise").tracesTo; }],

  // permissions-check
  ["cell-answered",    "systems-analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { delete s.rolesPermissions["account holder"].payment; }],
  ["entity-owned",     "systems-analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["account holder"].payment = "r"; }],
  ["role-known",       "systems-analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["shadow admin"] = { payment: "crud", approval: "crud" }; }],
  ["use-case-backs",   "systems-analyst/scripts/permissions-check.mjs", [S], "rolesPermissions", (s) => { s.rolesPermissions["compliance officer"].payment = "rd"; }],

  // requirements-check
  ["nfr-measured",     "business-analyst/scripts/requirements-check.mjs", [S], "nfr", (s) => { s.nfr[0].requirement = "the approval queue is fast"; }],
  ["nfr-measured",     "business-analyst/scripts/requirements-check.mjs", [S], "nfr", (s) => { delete s.nfr[0].measuredBy; }],
  ["classified",       "business-analyst/scripts/requirements-check.mjs", [S], "requirements", (s) => { delete s.requirements[0].class; }],
  ["transition-flagged","business-analyst/scripts/requirements-check.mjs", [S], "requirements", (s) => { delete s.requirements.find((r) => r.class === "transition").untilWhen; }],
  ["state-closed",     "business-analyst/scripts/requirements-check.mjs", [S], "stateModel", (s) => { delete s.stateModel[0].states.find((x) => x.name === "held").to; }],
  ["state-closed",     "business-analyst/scripts/requirements-check.mjs", [S], "stateModel", (s) => { s.stateModel[0].states.find((x) => x.name === "approved").terminal = false; }],

  // journey-check
  ["lane-covered",     "systems-analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { s.journeys[0].actor = "somebody with no lane"; }],
  ["stage-derived",    "systems-analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { s.journeys[0].stages[0].from = ["a step that is not in the lane"]; }],
  ["pain-sourced",     "systems-analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.journeys[0].stages[0].pain[0].nOf; }],
  ["pain-sourced",     "systems-analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.journeys[0].stages[0].pain[0].class; }],
  ["delta-stated",     "systems-analyst/scripts/journey-check.mjs", [S], "journeys", (s) => { delete s.delta; }],
  ["conventions",      "business-analyst/scripts/industry-check.mjs", [S], "industry", (s) => s.industry.conventions.pop()],
  ["stakeholders",     "business-analyst/scripts/industry-check.mjs", [S], "stakeholders", (s) => s.stakeholders = []],
  // domain-check
  ["all-categories",   "systems-analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints = (s.domainConstraints || []).slice(1)],
  ["sourced",          "systems-analyst/scripts/domain-check.mjs", [S], "domainConstraints", (s) => s.domainConstraints[0].source = "n/a"],
  // problem-check
  /* Two mutations on `metric`, deliberately: absent and VOID are different defects, and
   * the second is the one that defeated an earlier revision of industry-check end to end
   * by writing "n/a" into every field it required. */
  ["metric",              "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => delete s.problem.metric],
  ["metric",              "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.metric = "n/a"],
  ["target",              "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.target = s.problem.baseline],
  ["baseline",            "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => delete s.problem.baselineMeasuredBy],
  ["guardrail",           "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.guardrails = []],
  ["counter-evidence",    "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.counterEvidence = "n/a"],
  ["hmw-generative",      "business-analyst/scripts/problem-check.mjs", [S], "problem", (s) => s.problem.hmw = "How might we build an approvals dashboard?"],
  ["tier-declared",       "business-analyst/scripts/problem-check.mjs", [S], "workPackages", (s) => delete s.workPackages.approvals.tier],
  ["freeze-attributed",   "business-analyst/scripts/problem-check.mjs", [S, "--freeze"], "workPackages", (s) => delete s.frozenBy],
  // schema-check
  ["sample-size",      "design-researcher/scripts/schema-check.mjs", [S], "measured", (s) => s.measured = s.measured.slice(0, 2)],
  ["provenance",       "design-researcher/scripts/schema-check.mjs", [S], "measured", (s) => delete s.measured[0].method],
  // discover-check
  ["segment-defined",    "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => delete s.discovery.segments[0].context],
  ["users-sample-size",  "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.segments[0].interviews = 2; }],
  ["pain-frequency",     "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.painPoints[0].nOf = [9, 5]; }],
  ["evidence-class",     "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.painPoints[2].class = "inferred"; s.discovery.painPoints[2].confidence = "high"; }],
  ["said-no",            "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.saidNo = []; }],
  ["stakeholder-fears",  "ux-researcher/scripts/discover-check.mjs", [S], "stakeholders", (s) => delete s.stakeholders[1].fears],
  ["buyer-named",        "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { for (const g of s.discovery.segments) g.isBuyer = false; }],
  ["competitor-pricing", "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.competitors[1].pricing = "unknown"; }],
  ["market-bottom-up",   "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => { s.discovery.market.size = 950000; }],
  ["users-provenance",   "ux-researcher/scripts/discover-check.mjs", [S], "discovery", (s) => delete s.discovery.painPoints[1].source],
  /* Strip the PROVENANCE from a driver rather than deleting the driver. Deleting it also
   * orphaned the sensitivity entry naming it, so one missing driver reported as two
   * findings and sent the reader in two directions. An unsourced driver is the defect
   * this check is actually written for. */
  // concept-check  (state only: divergence happens before any screen exists)
  ["concepts-diverged", "ux-engineer/scripts/concept-check.mjs", [S], "workPackages", (s) => { s.workPackages.approvals.concepts = s.workPackages.approvals.concepts.slice(0, 1); }],
  ["concepts-diverged", "ux-engineer/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.servesBadly = []; }],
  ["concepts-diverged", "ux-engineer/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.dropped = false; }],
  // proposal-check
  ["slot-addressed",   "product-manager/scripts/proposal-check.mjs", [S], "proposals", (s) => s.proposals = s.proposals.filter((p) => p.slot !== "S1")],
  ["axis-named",       "product-manager/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.axis],
  ["provenance",       "product-manager/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.options[0].from],
  ["choice-recorded",  "product-manager/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.by],
  // close-check
  ["brief-cold",         "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => s.closeout.briefReadFrom = "docs/contract.md"],
  /* Recorded and then gone. A declared absence excuses a brief nobody ever supplied; it
   * cannot excuse one that was written down and lost, because that one was supposed to
   * survive the project. */
  ["brief-cold",         "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => { s.briefPath = "docs/gone.md"; s.briefAbsent = "the client never sent one, which is recorded here so it is not read as an oversight"; }],
  ["nothing-excluded",   "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => s.closeout.shipped.push("Card issuing")],
  ["metric-compared",    "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => delete s.closeout.metricNow],
  ["committed-shipped",  "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => { s.closeout.shipped = []; }],
  ["assumption-outcome", "product-manager/scripts/close-check.mjs", [S], "assumptions", (s) => delete s.assumptions[0].outcome],
  /* Wrong WITHOUT a cost, not merely wrong. What it cost is the whole value of having
   * written the assumption down, and it is the first thing dropped in a hurried closeout. */
  ["assumption-outcome", "product-manager/scripts/close-check.mjs", [S], "assumptions", (s) => { s.assumptions[0].outcome = "wrong"; }],
  /* Exempted and pointing at no register. A dispute that excuses a check without naming
   * where the exemption lives IS the ignored finding it was built to prevent, wearing
   * better paperwork. */
  ["check-disputed",     "product-manager/scripts/close-check.mjs", [S], "checkDisputes", (s) => delete s.checkDisputes[0].exemptionIn],
  ["check-disputed",     "product-manager/scripts/close-check.mjs", [S], "checkDisputes", (s) => { s.checkDisputes[0].argument = "we disagreed"; }],
  ["delivered-frozen",   "product-manager/scripts/close-check.mjs", [S], "closeout", (s) => { s.delivered = true; s.workPackages.approvals.htmlApproved = false; }],
  // capture-reading checks
  ["direction",        "ux-engineer/scripts/verify-html.mjs", [REF, S], "capture+direction", (s) => s.direction.assert["type.roles.max"] = 1],
  ["exemption-used",   "ux-engineer/scripts/contrast-check.mjs", [REF, S], "capture", (s) => s.contrastExemptions = [{ where: "nothing here", why: "a stale exemption nobody removed", by: "somebody" }]],
  ["uc-covered",       "ux-engineer/scripts/coverage-check.mjs", [REF, S], "capture", (s) => s.useCases.push({ id: "UC-99", name: "A use case nobody built", tracesTo: ["BR-01"] })],
    /* spacing-check reads the TOKEN FILE first and falls back to state.spacingScale, so
   * mutating the fallback did nothing on any project that has tokens. Redirect the path
   * at a scale on which no real gap lands. */
  // font-check
  ["family-declared",  "ui-designer/scripts/font-check.mjs", [REF, S], "capture", (s) => { delete s.direction.fontsWhy; }],
  ["family-resolved",  "ui-designer/scripts/font-check.mjs", [REF, S], "capture", (s) => { s.direction.fonts.display = "Archivo, Helvetica, sans-serif"; }],
  ["fallback-stated",  "ui-designer/scripts/font-check.mjs", [REF, S], "capture", (s) => { s.direction.fonts.body = "Archivo"; }],

  // state-coverage-check
  ["state-captured",   "ux-engineer/scripts/state-coverage-check.mjs", [REF, S], "capture", (s) => { s.stateExemptions = s.stateExemptions.filter((x) => x.state !== "returned"); }],
  ["minimum-present",  "ux-engineer/scripts/state-coverage-check.mjs", [REF, S], "capture", (s) => { s.stateExemptions = s.stateExemptions.filter((x) => x.state !== "error"); }],
  ["excused-named",    "ux-engineer/scripts/state-coverage-check.mjs", [REF, S], "capture", (s) => { s.stateExemptions.find((x) => x.state === "draft").why = "n/a"; }],
  ["stale-exemption",  "ux-engineer/scripts/state-coverage-check.mjs", [REF, S], "capture", (s) => { s.stateExemptions.push({ state: "a state the model never had", why: "a stale exemption nobody removed" }); }],

  // direction-spread-check
  ["three-offered",     "ui-designer/scripts/direction-spread-check.mjs", [S], "proposals", (s) => { const p = s.proposals.find((x) => x.slot === "S1"); p.options = p.options.slice(0, 2); }],
  ["traditions-differ", "ui-designer/scripts/direction-spread-check.mjs", [S], "proposals", (s) => { const p = s.proposals.find((x) => x.slot === "S1"); p.options[1].tradition = p.options[0].tradition; }],
  ["baseline-present",  "ui-designer/scripts/direction-spread-check.mjs", [S], "proposals", (s) => { for (const o of s.proposals.find((x) => x.slot === "S1").options) o.isSectorBaseline = false; }],
  ["numbers-differ",    "ui-designer/scripts/direction-spread-check.mjs", [S], "proposals", (s) => { for (const o of s.proposals.find((x) => x.slot === "S1").options) o.asserts.radius = 8; }],

  // structure-check
  ["lofi-traced",     "ux-designer/scripts/structure-check.mjs", ["html/structure", S], "@html/structure", (s) => { s.useCases = s.useCases.filter((u) => u.id !== "UC-01"); s.useCases.push({ id: "UC-77", name: "something else", actor: "account holder", tracesTo: ["BR-01"], touches: [{ entity: "payment", ops: "cr" }, { entity: "approval", ops: "cru" }] }); }],
  ["lofi-states",     "ux-designer/scripts/structure-check.mjs", ["html/structure", S], "@html/structure", (s) => { s.structureExemptions = []; }],
  /* A state declared and drawn nowhere. Found by a blind evaluator on a project whose lo-fi boards
     carried all seventeen sections and whose final screen carried none of them: structure-check
     holds the wireframes, and nothing held what replaced them. */
  ["screen-states",   "ux-engineer/scripts/screen-states-check.mjs", ["html", S], "@html", (s) => { (s.screens?.[0]?.states || []).push("a-state-nothing-draws"); }],

  /* internal-reference-check — a requirement id written into a text node a user reads. The
   * mutation deliberately ALSO puts one in a comment, because the check's whole guarantee is
   * that it distinguishes the two: a check that flagged the comment would push a team into
   * deleting the provenance that belongs beside the code. */
  ["internal-reference-check", "content-designer/scripts/internal-reference-check.mjs", ["demo/src"], "@demo/src",
    { file: "demo/src/__mutation__.jsx",
      content: '{/* provenance: BR-06 belongs here */}\n<div>Quản lý không sửa được (BR-06).</div>\n' }],

  /* url-param-guard — a page that renders its screen no matter what the URL says. A static
   * fixture IS that defect in its purest form: it has no router at all, so every parameter is
   * silently ignored and every route returns the same frame. Driven over file://, which needs no
   * server, so this mutation runs wherever playwright does. */
  ["url-param-guard", "ux-engineer/scripts/url-param-guard.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation__.html"), "--valid", "vp=mobile"], "@demo",
    { file: "__mutation__.html",
      content: '<!doctype html><meta charset="utf-8"><title>m</title><div class="frame">renders regardless of the URL</div>\n' }],

  /* layout-coherence-check — a row whose second line starts left of its own title. Written as a
   * static page because the defect is purely geometric: two rows in a list, the badge under the
   * title outdented back to the row's edge, which is exactly what a broken grid produces and
   * exactly what no overflow, token or target-size check can see. file://, so no server. */
  ["ragged-rows", "ux-engineer/scripts/layout-coherence-check.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation-layout__.html"), "--viewport", "390x844"], "@demo",
    { file: "__mutation-layout__.html",
      content: '<!doctype html><meta charset="utf-8"><title>m</title>' +
        '<style>.frame{width:390px;height:844px}.list{padding:8px}.row{padding:8px}' +
        '.t{margin-left:38px}.b{margin-left:0}</style>' +
        '<div class="frame"><div class="list">' +
        '<div class="row"><div class="t">A title that wraps</div><div class="b">badge</div></div>' +
        '<div class="row"><div class="t">Another title here</div><div class="b">badge</div></div>' +
        '</div></div>\n' }],

  /* keyboard-check — a dialog with no way out. The fixture is a page with an open role="dialog"
   * that neither traps Tab nor answers Escape, which is precisely what shipped: the two defects
   * a static capture cannot see, because every control in it is individually correct. */
  ["escape-closes", "ux-engineer/scripts/keyboard-check.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation-kb__.html"), "--frame", ".frame",
     "--open", "#opener", "--modal", '[role="dialog"]', "--viewport", "390x844"], "@demo",
    { file: "__mutation-kb__.html",
      content: '<!doctype html><meta charset="utf-8"><title>m</title>' +
        '<style>.frame{width:390px;height:844px}button:focus{outline:2px solid #06c}</style>' +
        '<div class="frame"><button id="opener" onclick="d.hidden=false">open</button>' +
        '<button id="behind">behind</button>' +
        '<div id="d" role="dialog" aria-modal="true" hidden><button>inside</button></div></div>\n' }],

  /* axe-check — a control with no accessible name, which is the single most common real-world
   * violation and one that every geometric check in this repo is blind to. */
  ["axe-violations", "ux-engineer/scripts/axe-check.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation-axe__.html"), "--include", ".frame",
     "--axe", path.join(DIR, "demo", "node_modules", "axe-core", "axe.min.js"), "--viewport", "390x844"], "@demo/node_modules/axe-core",
    { file: "__mutation-axe__.html",
      content: '<!doctype html><html lang="vi"><meta charset="utf-8"><title>m</title>' +
        '<div class="frame"><button></button><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div></html>\n' }],

  /* visual-baseline-check — a page that no longer matches its committed baseline. Two files,
   * because a comparison cannot be broken by writing only one side of it: the fixture, and a
   * baseline PNG of different dimensions standing in for "this used to look like something
   * else". This is the mutation that made the harness learn multi-file and binary fixtures. */
  ["visual-baseline", "ux-engineer/scripts/visual-baseline-check.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation-vis__.html"), "--clip", ".frame",
     "--dir", path.join(DIR, "__mutation-baseline__"), "--modules", path.join(DIR, "demo"), "--viewport", "390x844"], "@demo",
    { files: [
        { file: "__mutation-vis__.html",
          content: '<!doctype html><meta charset="utf-8"><title>m</title>' +
            '<style>.frame{width:390px;height:844px;background:#fff}</style><div class="frame">x</div>\n' },
        { file: path.join("__mutation-baseline__", "index.png"), base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" },
      ] }],

  /* acceptance-check — a requirement nobody can test, then a criterion that only restates it.
   * Both pass every other check in the suite: the requirement is well formed, traced in both
   * directions and classified. Only "can a reviewer tell when this is done" catches them. */
  ["acceptance-coverage-regressed", "business-analyst/scripts/acceptance-check.mjs", [S], "requirements",
    (s) => s.requirements.push({ id: "FR-MUT", class: "functional", statement: "Một yêu cầu không ai kiểm được", tracesTo: [s.useCases[0].id] })],
  ["acceptance-restates-the-requirement", "business-analyst/scripts/acceptance-check.mjs", [S], "requirements",
    (s) => { const r = s.requirements.find((x) => x.class !== "nonFunctional"); r.acceptanceCriteria = ["Hệ thống phải làm đúng điều vừa nói ở trên"]; }],
  ["acceptance-too-thin", "business-analyst/scripts/acceptance-check.mjs", [S], "requirements",
    (s) => { const r = s.requirements.find((x) => x.class !== "nonFunctional"); r.acceptanceCriteria = ["xong"]; }],

  /* figure-placement-check — the two ways a diagram is produced and still not seen. One is never
   * placed in the assembled page; the other is placed and scaled to the width of the column until
   * its labels are too small to read. Both report "wrote N diagram(s)" and pass everything else. */
  ["figure-rendered-but-not-placed", "business-analyst/scripts/figure-placement-check.mjs",
    [path.join(DIR, "__mut-fig__.html"), path.join(DIR, "__mut-figs__")], "@none",
    { files: [
        { file: "__mut-fig__.html", content: '<!doctype html><title>m</title><figure data-figure="kept" data-label="Kept"><svg viewBox="0 0 400 300"><text font-size="12">Kept</text></svg></figure>\n' },
        { file: path.join("__mut-figs__", "kept.svg"), content: '<svg viewBox="0 0 400 300"><text font-size="12">Kept</text></svg>\n' },
        { file: path.join("__mut-figs__", "orphan.svg"), content: '<svg viewBox="0 0 400 300"><text font-size="12">Nobody placed me</text></svg>\n' },
      ] }],
  ["figure-too-wide-to-read", "business-analyst/scripts/figure-placement-check.mjs",
    [path.join(DIR, "__mut-fig2__.html"), path.join(DIR, "__mut-figs2__")], "@none",
    { files: [
        { file: "__mut-fig2__.html", content: '<!doctype html><title>m</title><figure data-figure="wide" data-label="Wide"><svg viewBox="0 0 2400 300"><text font-size="11">Wide</text></svg></figure>\n' },
        { file: path.join("__mut-figs2__", "wide.svg"), content: '<svg viewBox="0 0 2400 300"><text font-size="11">Wide</text></svg>\n' },
      ] }],

  /* screenreader-check — a page with no heading and a button the tree cannot name. Both are
   * invisible to every geometric check and to a screenshot: the button has a visible icon, and
   * the page looks perfectly structured to an eye. */
  ["no-headings", "ux-engineer/scripts/screenreader-check.mjs",
    ["--url", "file://" + path.join(DIR, "__mutation-sr__.html"), "--frame", ".frame", "--viewport", "390x844"], "@demo",
    { file: "__mutation-sr__.html",
      content: '<!doctype html><html lang="vi"><meta charset="utf-8"><title>m</title>' +
        '<div class="frame"><p>Không có tiêu đề nào</p><button><svg width="16" height="16"></svg></button></div></html>\n' }],

  /* traceability-check — a screen that traces to a use case nobody wrote. The commonest real
   * shape of a broken chain: an id renumbered upstream and its citation left behind. */
  ["dangling-ref", "business-analyst/scripts/traceability-check.mjs", [S], "screens",
    (s) => { s.screens[0].tracesTo = ["UC-DOES-NOT-EXIST"]; }],
  ["orphan-screen", "business-analyst/scripts/traceability-check.mjs", [S], "screens",
    (s) => { s.screens[0].tracesTo = []; }],
  /* The severed hop: strip the pain link from every use case and the whole hop must be reported
   * ONCE, not once per pain. */
  ["broken-link", "business-analyst/scripts/traceability-check.mjs", [S], "useCases",
    (s) => { for (const u of s.useCases) { delete u.addresses; delete u.painPoints; delete u.solves; delete u.pains; } }],

  /* Two screens under one id — the defect that drew ten boards for eleven screens in silence. */
  ["duplicate-id", "business-analyst/scripts/traceability-check.mjs", [S], "screens",
    (s) => { s.screens.push({ ...s.screens[0] }); }],

  // foundations-check
  ["contrast-floor",    "ux-engineer/scripts/foundations-check.mjs", ["html/design-system.html", "tokens/tokens.json", S], "direction", (s) => { s.audience.floors.contrastRatio = 21; }],
  ["state-covered",     "ux-engineer/scripts/foundations-check.mjs", ["html/design-system.html", "tokens/tokens.json", S], "direction", (s) => { s.direction.components[0].states.push("pressed"); }],
  ["icon-set",          "ux-engineer/scripts/foundations-check.mjs", ["html/design-system.html", "tokens/tokens.json", S], "direction", (s) => { delete s.direction.icons.licence; }],
  ["icon-set",          "ux-engineer/scripts/foundations-check.mjs", ["html/design-system.html", "tokens/tokens.json", S], "direction", (s) => { s.direction.icons.strokeWidth = "2"; }],

  ["off-scale",        "ux-engineer/scripts/spacing-check.mjs", [REF, S], "capture", (s) => {
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
  /* `@path` is a path on disk, the same convention pica-verify's `needs` uses. Without it a
     mutation on a check that reads a directory rather than state was skipped for want of a
     state key it never wanted, and a skip reads as "no material" rather than as a bug here. */
  if (need.startsWith("@")) return fs.existsSync(path.join(DIR, need.slice(1)));
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

/* A mutation may break a FILE instead of state.json: `{ file, content }` writes that file
 * (relative to the project) for the duration of one run and restores it afterwards, deleting it
 * if it did not exist. Until this existed the suite could only mutate `.pica/state.json`, so
 * every check that reads an artefact — a source tree, a rendered page, a token file — was
 * unprovable by construction, and its absence from the suite looked like an author's oversight
 * rather than a missing capability. Two checks added on one day both landed in that gap, which
 * is what finally made it visible. */
function applyFileMutation(m) {
  /* One mutation, one or more files, text or binary. A single file was enough until a check
   * needed a fixture AND the baseline to compare it against — a comparison cannot be broken by
   * writing only one of the two things being compared. `base64` exists for the same reason: the
   * artefact some checks read is a PNG. */
  const parts = m.files || [m];
  const undo = [];
  for (const part of parts) {
    const target = path.join(DIR, part.file);
    const existed = fs.existsSync(target);
    const prior = existed ? fs.readFileSync(target) : null;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, part.base64 ? Buffer.from(part.base64, "base64") : part.content);
    undo.push(() => { if (existed) fs.writeFileSync(target, prior); else fs.rmSync(target, { force: true }); });
  }
  return () => { for (const u of undo) u(); };
}

for (const [check, script, argv, need, mutate] of M) {
  if (ONLY && !script.includes(ONLY)) continue;
  const name = `${path.basename(script, ".mjs")} · ${check}`;
  if (!have(need)) {
    skipped++;
    results.push(["skip", name, `the project carries no ${need}, so this mutation has nothing to break`]);
    continue;
  }
  let restoreFile = null;
  if (typeof mutate === "object" && mutate !== null && (mutate.file || mutate.files)) {
    try { restoreFile = applyFileMutation(mutate); }
    catch { skipped++; results.push(["skip", name, "the file mutation could not be written"]); continue; }
  } else {
    const s = JSON.parse(base);
    try { mutate(s); } catch { skipped++; results.push(["skip", name, "the mutation did not apply to this project's shape"]); continue; }
    fs.writeFileSync(S, JSON.stringify(s, null, 2));
  }
  const out = run(script, argv);
  if (restoreFile) restoreFile();
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
