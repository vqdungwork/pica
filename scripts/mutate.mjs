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
  const d = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "pica-mutate-"));
  fs.mkdirSync(path.join(d, ".pica"), { recursive: true });
  fs.mkdirSync(path.join(d, "tokens"), { recursive: true });
  const state = {
    field: "retail banking", industry: { key: "finance",
      conventions: ["colour", "style", "density", "typography", "tone"].map((about) => ({
        about, followed: true, note: `follows the sector convention on ${about}, recorded here so the decision is visible` })),
      forbiddenPrevented: [
        { forbidden: "animating a balance so it cannot be read immediately",
          preventedBy: "the balance is rendered as static text and no transition token applies to it" },
        { forbidden: "hiding a fee behind a disclosure the user has to open",
          preventedBy: "the fee row is always expanded on the confirmation screen and has no collapsed state" },
        { forbidden: "an irreversible transfer with no confirmation step naming the recipient in full",
          preventedBy: "the confirm screen prints the recipient's full legal name and the button is disabled until it renders" },
      ], departures: [] },
    /* The sector entry decides what a project of this field must answer, and "finance"
     * requires three DECIDING roles. A fixture naming only the customer failed
     * industry-check on all three and took --fixture down with it. */
    stakeholders: [
      { role: "account holder", wants: "to see the true balance and move money without doubt",
        fears: "a transfer that silently failed", decides: false, vetoes: false, informed: true },
      { role: "compliance officer", wants: "to prove afterwards who did what",
        fears: "an action with no attributable actor", decides: true, vetoes: true, informed: true },
      { role: "fraud analyst", wants: "to stop a payment mid-flight",
        fears: "a queue with no age on it", decides: true, vetoes: true, informed: true },
      { role: "regulator", wants: "evidence of fair treatment and disclosure",
        fears: "a cost the customer was not shown before consenting", decides: true, vetoes: true, informed: true },
    ],
    glossary: [{ term: "payment", means: "one instruction to move money", notOurTerm: ["transaction"] }],
    businessRules: [{ id: "BR-01", rule: "A payment above the limit needs a second approver.",
      enforcedBy: "an API guard on the server route", source: "the brief" }],
    useCases: [{ id: "UC-01", name: "Send a payment", tracesTo: ["BR-01"] }],
    domainModel: [{ entity: "payment", attributes: ["payment"] }],
    asIs: "Payments are approved by email and nobody can tell afterwards who approved which one.",
    toBe: "A payment above the limit is held until a second named approver releases it.",
    delta: "Approval moves from email to the product, so who approved what is recorded rather than remembered.",
    assumptions: [{ id: "AS-01", about: "limit", assumed: "The approval limit is a single figure rather than one per account.",
      confidence: "low", produced: ["the approval screen"], affects: ["BR-01", "UC-01"],
      correctBy: "the client has a limit per account, which changes the rule into a lookup",
      outcome: "held" },
      { id: "AS-02", about: "restricted claims", confidence: "low",
        assumed: "Fees and rates must appear on the confirmation screen rather than only in the terms.",
        why: "established by an agent from the market conduct handbook and not confirmed by the client's counsel",
        produced: ["the confirmation screen"], affects: ["BR-01"],
        correctBy: "counsel says the terms suffice, which removes a block from the confirmation screen",
        outcome: "held" }],
    exclusions: [{ excluded: "Card issuing", why: "out of scope by the brief", source: "brief" }],
    exclusionsConfirmed: true,
    briefPath: "docs/brief.md",

    /* All eight categories, because domain-check matches on the category NAME and a
     * category written any other way reads as an unanswered one. Anything verified by
     * an agent also exists as a low-confidence assumption below, which the check
     * enforces: an agent claim read as fact is how a search result becomes a liability. */
    domainConstraints: [
      { category: "standard", affects: ["the payment message schema", "the domain model"], constraint: "ISO 20022 for payment messaging", source: "the ISO 20022 published message catalogue", verifiedBy: "human" },
      { category: "regulator", affects: ["the disclosure copy", "the confirmation screen"], constraint: "the central bank plus the market conduct authority", source: "the client's own compliance register", verifiedBy: "human" },
      { category: "data protection", affects: ["the fields shown on any exported screen"], constraint: "personal data is minimised on every screen that leaves the building", source: "the client's data protection policy", verifiedBy: "human" },
      { category: "identity", affects: ["the approval step", "the session policy"], constraint: "strong customer authentication on any payment above the limit", source: "the client's compliance register", verifiedBy: "human" },
      { category: "retention", affects: ["the approval record", "an NFR on storage duration"], constraint: "approval records are kept for seven years", source: "the client's retention schedule", verifiedBy: "human" },
      { category: "audit trail", affects: ["every state-changing screen", "an end-to-end test per use case"], constraint: "every state change records an attributable actor and a timestamp", source: "the client's audit policy", verifiedBy: "human" },
      { category: "restricted claims", affects: ["the confirmation screen", "the fee row"], constraint: "no rate or fee is stated without the confirmation screen showing it", source: "the market conduct handbook", verifiedBy: "agent" },
      { category: "professional duty", affects: ["nothing: no licensed duty applies here"], constraint: "not applicable: nobody here holds a licensed professional duty", source: "asked at intake and answered by the client", verifiedBy: "human" },
    ],

    /* Five shipped exemplars, because the sector entry asks for five and schema-check
     * asks for all nine foundations with typography BY ROLE, a source URL and a method.
     * None of these hosts is a concept host, which is the other thing it checks. */
    measured: ["Monzo", "Revolut", "Wise", "Starling", "N26"].map((product, i) => ({
      product, url: `https://${product.toLowerCase()}.com/`, shipped: true,
      method: "measured from a full-page capture with the browser inspector",
      tradition: "international / Swiss typographic style, executed flat with restrained elevation",
      typography: { display: 32 - i, heading: 24, body: 16, label: 14, caption: 13 },
      colour: { hues: 2, saturationRange: "24% to 68%", neutralSteps: 9, semantic: "one positive, one negative, one warning" },
      spacing: { base: 8, scale: [4, 8, 12, 16, 24, 32, 48], brokenAt: "the dense transaction row, which runs on a 4px rhythm" },
      elevation: { levels: 2, depths: ["0 1px 2px", "0 4px 12px"], transparency: "none over content" },
      motion: { durations: { micro: 120, panel: 220 }, easing: "cubic-bezier(0.2, 0, 0, 1)", doesNotAnimate: "the balance" },
      iconography: { style: "stroke", weight: 1.5, corners: "rounded", sizes: [16, 20, 24] },
      grid: { columns: 12, gutter: 24, margin: 40, maxContent: 1200 },
      density: { controlHeight: 32 + i, rowHeight: 44, contentToWhitespace: "high on the ledger, medium elsewhere" },
      accessibility: { bodyContrast: 7.1, largeContrast: 4.8, touchTarget: 44, focus: "a 2px ring offset by 2px", reducedMotion: "respected" },
    })),

    /* Phase A and Phase E of the 1.0.0 plan. problem is the block that nothing in nine
     * versions ever read, and it is what problem-check exists for. */
    problem: {
      statement: "Nobody can say afterwards who approved a payment, so every audit becomes a reconstruction.",
      whose: "compliance officer",
      metric: "share of payments with a named approver recorded at the time",
      unit: "percent",
      baseline: 0,
      baselineMeasuredBy: "the settlement database, counting approvals with a null actor",
      baselineMeasuredOn: "2026-08-14",
      target: 95,
      direction: "up",
      guardrails: [{ metric: "median time to approve a payment", unit: "seconds", mustNotExceed: 90 }],
      counterEvidence: "If the audit team already reconstructs approvals from email in under an hour, this is not worth building.",
      hmw: "How might we make who approved what recoverable after the fact?",
    },
    trigger: {
      changed: "The regulator published an audit-trail requirement carrying a compliance date.",
      when: "2026-06",
      ifNothing: "The next inspection repeats the existing finding and the penalty escalates.",
      window: "The compliance date is 2027-03, so the window closes in roughly six months.",
    },
    constraint: {
      fixed: "date", by: "the client's compliance director",
      consequence: "The regulator's compliance date is 2027-03 and a miss escalates the existing finding.",
      variable: ["scope", "resources"],
    },
    workPackages: {
      approvals: { tier: "complex", htmlApproved: true, ported: false,
        concepts: [
          { id: "C1", approach: "a queue the approver works down, newest last", servesWell: ["UC-01"],
            servesBadly: ["UC-01"], dropped: false,
            why: "kept: it is the only shape that shows how long the oldest item has waited" },
          { id: "C2", approach: "approval inside the payment record itself", servesWell: ["UC-01"],
            servesBadly: ["UC-01"], dropped: true,
            why: "it hides how many are waiting, which is the number the fraud analyst needs first" },
        ] },
    },
    /* dev-check requires a placement for all four, and it is right to: most of the mess
     * in a front end is server data living in a client store because the first screen was
     * easier that way. */
    stateStrategy: {
      server: "every payment and every approval record, fetched per screen and never mirrored into a client store",
      url: "the queue filter and the selected payment id, so a link reopens exactly what someone was looking at",
      client: "only the collapsed or expanded state of the fee row",
      form: "the approval note, held locally until the request succeeds and discarded after",
    },
    apiContract: [
      { route: "POST /api/payments/:id/approve", request: "{ note?: string }",
        response: "{ id, status, approvedBy, approvedAt }",
        errors: ["409 already approved", "403 not an approver", "422 above the actor's limit"] },
    ],
    scopeFrozen: true,
    frozenBy: "the client's compliance director",
    changeControl: "Any addition is priced as a change order and moves the date by the same number of days.",
    deadline: "2027-01-29",
    durationWeeks: 14,
    estimate: {
      for: "client",
      research:  { o: 24, m: 32, p: 56, by: "pica-researcher" },
      analysis:  { o: 40, m: 60, p: 96, by: "pica-analyst" },
      design:    { o: 60, m: 90, p: 140, by: "pica-designer" },
      fe:        { o: 160, m: 220, p: 320, by: "pica-developer" },
      be:        { o: 200, m: 280, p: 420, by: "pica-developer" },
      qa:        { o: 80, m: 120, p: 200, by: "pica-tester" },
    },
    effortLog: [
      { line: "research", actual: 30 }, { line: "analysis", actual: 58 },
      { line: "design", actual: 96 }, { line: "fe", actual: 240 },
      { line: "be", actual: 300 }, { line: "qa", actual: 130 },
    ],
    roadmap: {
      slices: [
        { id: "R1", contains: ["approvals"], closes: ["UC-01"],
          moves: "the share of payments with a named approver", date: "2027-01-29", dependsOn: [] },
        { id: "R2", contains: ["approvals"], closes: ["UC-01"],
          moves: "the time taken to answer an audit request", date: "2027-Q2", dependsOn: ["R1"] },
      ],
      criticalPath: ["R1", "R2"],
      capacity: [{ role: "fe", availablePct: 60, alsoOn: "the settlement rebuild" }],
      bufferDays: 10,
    },
    value: {
      for: "client", currency: "USD", horizonMonths: 24,
      buildCost: { o: 564, m: 802, p: 1232, from: "estimate", by: "a human" },
      runCost: [
        { item: "hosting", annual: 4800, basis: "quoted", source: "the provider's published price list", by: "pica-architect" },
        { item: "payment provider fees", annual: 9000, basis: "measured", source: "last year's settlement reports", by: "pica-architect" },
      ],
      maintenancePct: 20,
      revenue: [
        { line: "seats", model: "per-seat", o: 42000, m: 66000, p: 91000, by: "a human",
          drivers: [
            { name: "reachable branches", value: 220, from: "docs/research/market.md", class: "observed" },
            { name: "seats per branch", value: 5, from: "docs/research/interviews/branch-manager.md", class: "stated" },
          ] },
      ],
      pricing: { model: "tiered", tiers: [
        { name: "Branch", price: 40, includes: ["approvals"], fence: "" },
        { name: "Region", price: 90, includes: ["approvals", "audit export"],
          fence: "audit export is the line regional compliance cannot do without" },
      ] },
      breakEvenMonth: 17,
      sensitivity: [
        { assumption: "reachable branches", low: 120, mid: 220, high: 300, swings: "breakEvenMonth" },
        { assumption: "seats per branch", low: 3, mid: 5, high: 8, swings: "breakEvenMonth" },
        { assumption: "payment provider fees", low: 6000, mid: 9000, high: 15000, swings: "breakEvenMonth" },
      ],
      doNothing: "Approvals stay in email, and the audit finding that triggered this repeats at the next inspection.",
      verdict: "build", decidedBy: "the client's finance director",
    },
    closeout: {
      briefReadFrom: "docs/brief.md",
      metricNow: 91, metricMeasuredOn: "2027-04-02",
      shipped: ["approvals"], dropped: [],
    },
    delivered: false,
  };
  fs.writeFileSync(path.join(d, ".pica", "state.json"), JSON.stringify(state, null, 2));
  /* dev-check refuses an empty scan, correctly: "an empty scan is not a pass". One real
   * file is enough for the mutation that matters, which is a business rule enforced by
   * hiding a button rather than by the server. */
  fs.mkdirSync(path.join(d, "src"), { recursive: true });
  fs.writeFileSync(path.join(d, "src", "approve.ts"),
    ["export async function approve(id: string, actor: string) {",
     "  if (!actor) throw new Error(\"an approval needs an attributable actor\");",
     "  const res = await fetch(`/api/payments/${id}/approve`, { method: \"POST\" });",
     "  if (!res.ok) return { error: await res.json() };",
     "  return res.json();",
     "}", ""].join("\n"));
  /* close-check reads briefPath and refuses when the file is gone, because the brief is
   * the one path that has to survive the whole project. */
  fs.mkdirSync(path.join(d, "docs"), { recursive: true });
  fs.writeFileSync(path.join(d, "docs", "brief.md"),
    "We need to know who approved a payment. Right now it is in email somewhere.\n");
  fs.writeFileSync(path.join(d, "tokens", "tokens.json"),
    JSON.stringify({ "--s-1": "4px", "--s-2": "8px", "--s-3": "12px", "--s-4": "16px", "--s-5": "24px" }, null, 2));
  return d;
}

if (FIXTURE || !DIR) {
  if (!FIXTURE && !DIR) console.log("no project given, generating a fixture. Pass a project directory to run against a real one.\n");
  DIR = makeFixture();
}
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
  ["trigger-complete",    "analyst/scripts/problem-check.mjs", [S], "trigger", (s) => delete s.trigger.window],
  ["constraint-declared", "analyst/scripts/problem-check.mjs", [S], "constraint", (s) => delete s.constraint.by],
  ["tier-declared",       "analyst/scripts/problem-check.mjs", [S], "workPackages", (s) => delete s.workPackages.approvals.tier],
  ["freeze-attributed",   "analyst/scripts/problem-check.mjs", [S, "--freeze"], "workPackages", (s) => delete s.frozenBy],
  // schema-check
  ["sample-size",      "research/scripts/schema-check.mjs", [S], "measured", (s) => s.measured = s.measured.slice(0, 2)],
  ["provenance",       "research/scripts/schema-check.mjs", [S], "measured", (s) => delete s.measured[0].method],
  // arch-check
  ["feasibility",      "architect/scripts/arch-check.mjs", [S, "--feasibility"], "risks", (s) => delete s.risks[0].verdict],
  ["nfr-complete",     "architect/scripts/arch-check.mjs", [S], "nfr", (s) => delete s.nfr[0].measuredBy],
  ["adr-complete",     "architect/scripts/arch-check.mjs", [S], "adr", (s) => delete s.adr[0].consequences],
  ["tech-has-adr",     "architect/scripts/arch-check.mjs", [S], "adr", (s) => s.stack = { ...(s.stack || {}), cache: "Memcached" }],
  // estimate-check
  ["preconditions",    "estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { delete s.scopeFrozen; s.estimate.for = "client"; }],
  ["estimated-by-doer","estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { for (const v of Object.values(s.estimate)) if (v && v.o !== undefined) delete v.by; }],
  ["three-points",     "estimate/scripts/estimate-check.mjs", [S], "estimate", (s) => { const k = Object.keys(s.estimate).find((x) => s.estimate[x] && s.estimate[x].o !== undefined); s.estimate[k] = { o: 1, m: 1, p: 1, by: s.estimate[k].by }; }],
  // value-check
  ["value-declared",       "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.for],
  ["value-attribution",    "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.revenue[0].by],
  ["run-cost",             "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.runCost[0].basis],
  ["run-cost",             "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.maintenancePct],
  ["value-horizon",        "model/scripts/value-check.mjs", [S], "value", (s) => s.value.horizonMonths = 12],
  ["value-trigger",        "model/scripts/value-check.mjs", [S], "trigger", (s) => delete s.trigger.changed],
  ["revenue-three-points", "model/scripts/value-check.mjs", [S], "value", (s) => { const r = s.value.revenue[0]; r.o = r.m = r.p = 66000; }],
  ["revenue-three-points", "model/scripts/value-check.mjs", [S], "value", (s) => { s.value.revenue[0].o = 120000; }],
  /* Strip the PROVENANCE from a driver rather than deleting the driver. Deleting it also
   * orphaned the sensitivity entry naming it, so one missing driver reported as two
   * findings and sent the reader in two directions. An unsourced driver is the defect
   * this check is actually written for. */
  ["bottom-up",            "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.revenue[0].drivers[1].from],
  ["tier-fence",           "model/scripts/value-check.mjs", [S], "value", (s) => { s.value.pricing.tiers[1].fence = ""; }],
  ["sensitivity",          "model/scripts/value-check.mjs", [S], "value", (s) => { s.value.sensitivity[0].assumption = "the phase of the moon"; }],
  ["do-nothing",           "model/scripts/value-check.mjs", [S], "value", (s) => delete s.value.doNothing],
  ["value-verdict",        "model/scripts/value-check.mjs", [S, "--gate"], "value", (s) => delete s.value.verdict],
  // proposal-check
  ["slot-addressed",   "core/scripts/proposal-check.mjs", [S], "proposals", (s) => s.proposals = s.proposals.filter((p) => p.slot !== "S1")],
  ["axis-named",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.axis],
  ["provenance",       "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.options[0].from],
  ["choice-recorded",  "core/scripts/proposal-check.mjs", [S], "proposals", (s) => delete s.proposals.find((p) => p.presented)?.by],
  // dev-check
  ["api-contract",     "developer/scripts/dev-check.mjs", ["src", S], "apiContract", (s) => delete s.apiContract[0].errors],
  ["state-strategy",   "developer/scripts/dev-check.mjs", ["src", S], "stateStrategy", (s) => delete s.stateStrategy.url],
  ["server-guard",     "developer/scripts/dev-check.mjs", ["src", S], "businessRules", (s) => s.businessRules[0].enforcedBy = "the button is hidden in the interface"],
  // qa-check
  ["pyramid",          "qa/scripts/qa-check.mjs", [".", S], "testStrategy", (s) => s.testStrategy.shape = { unit: 4, integration: 9, e2e: 60 }],
  ["regression",       "qa/scripts/qa-check.mjs", [".", S], "defects", (s) => s.defects[0].failedFirst = false],
  ["test-data",        "qa/scripts/qa-check.mjs", [".", S], "testData", (s) => s.testData.provenance = "production export"],
  ["release",          "qa/scripts/qa-check.mjs", [".", S], "rollbackExecuted", (s) => delete s.rollbackExecuted],
  // impl-check
  ["nfr-measured",     "impl/scripts/impl-check.mjs", [".", S], "nfr", (s) => delete s.nfr[0].measuredBy],
  ["stack-declared",   "impl/scripts/impl-check.mjs", [".", S], "stack", (s) => s.stack = { ...s.stack, search: "Elasticsearch" }],
  // capture-reading checks
  ["direction",        "html/scripts/verify-html.mjs", [REF, S], "capture+direction", (s) => s.direction.assert["type.roles.max"] = 1],
  ["exemption-used",   "html/scripts/contrast-check.mjs", [REF, S], "capture", (s) => s.contrastExemptions = [{ where: "nothing here", why: "a stale exemption nobody removed", by: "somebody" }]],
  ["uc-covered",       "html/scripts/coverage-check.mjs", [REF, S], "capture", (s) => s.useCases.push({ id: "UC-99", name: "A use case nobody built", tracesTo: ["BR-01"] })],
    /* spacing-check reads the TOKEN FILE first and falls back to state.spacingScale, so
   * mutating the fallback did nothing on any project that has tokens. Redirect the path
   * at a scale on which no real gap lands. */
  ["off-scale",        "html/scripts/spacing-check.mjs", [REF, S], "capture", (s) => {
    s.tokensPath = ".pica/mutant-tokens.json";
    fs.writeFileSync(path.join(DIR, ".pica", "mutant-tokens.json"), JSON.stringify({ "--s-1": "7px" }));
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
