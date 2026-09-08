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
        fears: "an action with no attributable actor", decides: true, vetoes: true, informed: true,
        wouldBlockIf: "the audit trail cannot be exported in the inspector's own format" },
      { role: "fraud analyst", wants: "to stop a payment mid-flight",
        fears: "a queue with no age on it", decides: true, vetoes: true, informed: true,
        wouldBlockIf: "a held payment can be released without its age being shown" },
      { role: "regulator", wants: "evidence of fair treatment and disclosure",
        fears: "a cost the customer was not shown before consenting", decides: true, vetoes: true, informed: true,
        wouldBlockIf: "a fee reaches a confirmation screen without being printed on it" },
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
    commercialConstraint: {
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
    discovery: {
      segments: [
        { name: "branch approver", jobToBeDone: "release a held payment without leaving the queue",
          context: "at a desk, on a shared terminal, interrupted every few minutes",
          frequency: "forty times a day", fluency: "high in the product, low in anything else",
          interviews: 7, isBuyer: false, isUser: true },
        { name: "compliance director", jobToBeDone: "answer an inspection without a reconstruction project",
          context: "at a desk, alone, under a deadline set by somebody else",
          frequency: "twice a quarter and once in anger", fluency: "medium",
          interviews: 5, isBuyer: true, isUser: false },
      ],
      painPoints: [
        { id: "PP-01", statement: "I can see it was approved but not who approved it.",
          segment: "compliance director", nOf: [5, 5], severity: "high",
          workaround: "search the mailbox by date and hope the thread survived",
          costs: "about two days per inspection", class: "observed", confidence: "high",
          source: "docs/research/interviews/compliance-director-02.md" },
        { id: "PP-02", statement: "The queue does not tell me which one has been waiting longest.",
          segment: "branch approver", nOf: [6, 7], severity: "high",
          workaround: "sort by reference and infer the order from it",
          costs: "the oldest item is released last about a third of the time",
          class: "observed", confidence: "high", source: "docs/research/interviews/branch-approver-04.md" },
        { id: "PP-03", statement: "I approve things I cannot really check.",
          segment: "branch approver", nOf: [4, 7], severity: "medium",
          workaround: "call the originating branch when the amount looks unusual",
          costs: "unquantified", class: "stated", confidence: "medium",
          source: "docs/research/interviews/branch-approver-01.md" },
      ],
      saidNo: [
        { who: "a regional bank that evaluated the product and kept its spreadsheet", 
          why: "the spreadsheet already had the audit columns and nobody would own a migration",
          source: "docs/research/interviews/lost-deal-01.md" },
      ],
      competitors: [
        { product: "an incumbent core-banking approvals module", serves: "tier-one banks",
          pricing: "bundled into the core licence, no separate line",
          packaging: "everything or nothing, negotiated per bank",
          positioning: "the safe option nobody is fired for choosing",
          source: "the vendor's published price list and two client interviews" },
        { product: "a general-purpose workflow tool", serves: "operations teams in any sector",
          pricing: "18 USD per seat per month",
          packaging: "three tiers, audit export only on the top one",
          positioning: "flexible enough for anything, specific to nothing",
          source: "the vendor's public pricing page" },
      ],
      market: {
        size: 1100, unit: "reachable approver seats",
        derivedFrom: [
          { factor: "reachable branches", value: 220, source: "the client's own branch directory" },
          { factor: "approvers per branch", value: 5, source: "docs/research/interviews/branch-approver-04.md" },
        ],
        growth: "flat in branch count, rising in approvals per branch as limits fall",
        switchingCost: "one migration of open approvals and a retraining day per branch",
        whyBuyersChange: "an inspection finding, which is what happened here and is the only trigger anyone named",
      },
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
    viewports: [
      { name: "desktop", w: 1440, h: 900, idiom: "desktop web, no device chrome", pointer: true,
        breakpoints: [1024], chrome: [], grid: { columns: 12, gutter: 24, margin: 24, maxContent: 1200 } },
      { name: "tablet", w: 768, h: 1024, idiom: "tablet web, no device chrome", pointer: false,
        breakpoints: [768], chrome: [], grid: { columns: 8, gutter: 16, margin: 24, maxContent: 1200 } },
      { name: "mobile", w: 375, h: 812, idiom: "mobile web, no device chrome", pointer: false,
        breakpoints: [], chrome: [], grid: null },
    ],

    /* ---- the design direction, asserted as numbers ---------------------- *
     * verify-html reads `assert` and fails a package that breaches it, so the direction
     * mutation has something to breach. */
    direction: {
      name: "Ledger", field: "retail banking", mode: "propose",
      precedent: [
        { product: "Starling", measured: "radius 8, control 36, tabular figures, 1 hue" },
        { product: "Monzo", measured: "radius 8, control 44, tabular figures, 2 hues" },
        { product: "Wise", measured: "radius 4, control 40, tabular figures, 2 hues" },
      ],
      rationale: "The age of a held payment is the content. Large radii and a wide palette both cost row scannability.",
      assert: { "radius.max": 8, "control.height.min": 32, "numerals.tabular": true,
        "hue.count.max": 3, "type.roles.max": 5 },
      deviations: [],
    },

    /* ---- arch-check ------------------------------------------------------ *
     * retention and audit trail appear in domainConstraints above, so constraint-nfr
     * requires each to have become an NFR with a number on it. */
    stack: { runtime: "Node", db: "Postgres" },
    risks: [
      { id: "R-01", capability: "hold a payment until a second named approver releases it",
        verdict: "possible", reason: "the settlement API already exposes a hold and a release, both idempotent",
        affects: [] },
      { id: "R-02", capability: "export the audit trail in the inspector's own format",
        verdict: "risky", reason: "the format is published but no test file exists, so the first real export is the first test",
        affects: ["be", "qa"] },
      { id: "R-03", capability: "release a held payment from a mobile device",
        verdict: "not-possible", reason: "strong customer authentication on this account type is desktop-only until the bank's own roadmap lands",
        affects: [] },
    ],
    nfr: [
      { id: "N-01", kind: "performance", requirement: "the approval queue renders in 800ms at p95",
        condition: "500 held payments, on the shared branch terminal over the branch VPN",
        measuredBy: "a synthetic check against staging every five minutes" },
      { id: "N-02", kind: "retention", requirement: "approval records are kept for 7 years and are not deletable by any product path",
        condition: "for every payment above the approval limit",
        measuredBy: "a migration test asserting no DELETE grant on the approvals table" },
      { id: "N-03", kind: "audit trail", requirement: "every state change records an actor id and a timestamp within 1 second of the action",
        condition: "on every approval, rejection and release",
        measuredBy: "an end-to-end test asserting the row exists with a non-null actor" },
    ],
    adr: [
      { id: "ADR-01", title: "PostgreSQL 16 for the approval record",
        context: "The approval record has to be queryable by actor and by date for seven years, and must not be deletable by any product path.",
        options: ["PostgreSQL 16", "the existing document store", "an append-only log service"],
        decision: "PostgreSQL 16, with no DELETE grant on the approvals table",
        consequences: "One more system to operate than the document store, and a migration path for the existing holds. In exchange the retention NFR is enforceable by a grant rather than by a policy." },
      { id: "ADR-02", title: "Node 22 for the service",
        context: "The front end is already TypeScript and the team maintains no other runtime.",
        options: ["Node 22", "Go", "the existing Java service"],
        decision: "Node 22, so one language covers both halves",
        consequences: "Slower on the export path than Go would be. The export is a background job, so the cost lands where nobody waits on it." },
      { id: "ADR-03", title: "No queue: the approval is synchronous",
        context: "An approval either succeeds or the approver must see why, immediately, while still on the screen.",
        options: ["a queue with a callback", "synchronous", "optimistic with reconciliation"],
        decision: "synchronous, so the approver never has to come back to find out",
        consequences: "The request holds a connection for up to 800ms. At 40 approvals a day per branch that is not a capacity problem, and it removes a whole class of reconciliation defect." },
    ],

    /* ---- qa-check --------------------------------------------------------- */
    perfBudget: [
      { nfr: "N-01", metric: "approval queue render at p95", budget: 800, unit: "ms",
        condition: "500 held payments, on the shared branch terminal over the branch VPN, cold cache",
        measuredBy: "a CI step that fails the build when the synthetic check regresses past the budget" },
    ],
    testStrategy: {
      shape: { unit: 48, integration: 14, e2e: 3 },
      owner: { unit: "pica-developer", integration: "pica-developer", e2e: "pica-tester" },
      smoke: "npm run test:smoke",
    },
    defects: [
      { id: "D-01", title: "the queue sorted by reference rather than by age", severity: "blocker",
        test: "UC-01 the oldest held payment is first in the queue", failedFirst: true },
      { id: "D-02", title: "a released payment showed no actor on the audit row", severity: "major",
        test: "UC-01 an approver releases a held payment and the actor is recorded", failedFirst: true },
      { id: "D-03", title: "the fee row collapsed at 375px", severity: "minor",
        test: "the fee row has no collapsed state at any viewport", failedFirst: true },
      { id: "D-04", title: "the empty queue read as a loading state", severity: "minor",
        test: "an empty queue reads as empty and not as loading", failedFirst: true },
    ],
    testData: {
      provenance: "synthetic",
      note: "generated from the branch directory's shape, with no real customer or payment record anywhere in it",
      method: "names and account numbers from a seeded generator, cross-referenced so no identifier belongs to another row",
      edgeCases: ["the longest legal name at 64 characters", "the empty queue", "a duplicate reference on two payments",
        "a name with an apostrophe in it", "500 held payments", "a fee of zero", "an approver at their own limit"],
    },
    branchProtection: { verifiedBy: "the client's platform lead", on: "2027-01-10",
      note: "main refuses direct pushes, requires one review and requires the ci workflow to pass, read from the repository settings page" },
    rollbackExecuted: { on: "2027-01-18", by: "the client's platform lead",
      what: "the approvals release was rolled back on staging in 4 minutes and the held payments reconciled with no manual step" },

    /* ---- proposal-check --------------------------------------------------- *
     * S1 and S2 presented, the rest skipped WITH a reason, because a slot nobody asked
     * and a slot with no material look identical otherwise. Option text deliberately
     * avoids the sector's forbidden wording, which not-forbidden matches on. */
    proposals: [
      { slot: "S1", presented: true, axis: "how much of the queue is visible at once",
        options: [
          { id: "A", names: "one row per payment, age in the first column",
            from: "measured on Monzo and Starling, both of which lead with a single scannable column",
            costs: "12 rows per screen at 1440x900" },
          { id: "B", names: "grouped by branch, collapsed by default",
            from: "measured on the incumbent core-banking module, which groups by originating unit",
            costs: "3 groups per screen, one extra click to reach a payment" },
          { id: "C", names: "a dense table, 44px rows, no grouping",
            from: "measured on Wise and Revolut, both of which run 44px rows on ledger surfaces",
            costs: "18 rows per screen, and the age column has to earn its width" },
        ],
        chosen: "C", by: "the client's head of branch operations", on: "2026-09-02",
        why: "we work down the whole list, we do not go looking branch by branch" },
      { slot: "S2", presented: true, axis: "how loud the pending state is",
        options: [
          { id: "A", names: "light mode, one accent, age shown as a number",
            from: "measured on Starling, which spends one hue on the whole ledger",
            costs: "the oldest item is legible but not shouted" },
          { id: "B", names: "light mode, a second hue once an item passes its target age",
            from: "measured on the fraud queues in Revolut, which escalate by hue at a threshold",
            costs: "a second reserved hue, leaving one for everything else" },
        ],
        chosen: "B", by: "the client's compliance director", on: "2026-09-02",
        why: "if one has been sitting too long I want to see it without reading the number" },
      { slot: "S3", skipped: "no stakeholder fear here names a moment the field designs badly beyond the queue age, which S1 already settles" },
      { slot: "S4", skipped: "the glossary carries one contested term, approval, and the client uses it the same way the sector does" },
      { slot: "S5", skipped: "one audience on this surface: the branch approver. The compliance view is a separate work package" },
      { slot: "S6", presented: true, axis: "how much of the approval flow lands in the first release",
        options: [
          { id: "A", names: "the queue and a single release action",
            from: "priced from the use cases: UC-01 alone, one screen set",
            costs: "the audit export waits, so the inspection is still answered by hand once" },
          { id: "B", names: "the queue, the release action and the audit export",
            from: "priced from the use cases plus the export path the regulator names",
            costs: "the export is the risky capability at R-02, and it carries the wider spread" },
        ],
        chosen: "B", by: "the client's compliance director", on: "2026-09-04",
        why: "the export is the whole reason we are doing this, doing it later means doing the inspection by hand again" },
      { slot: "S7", presented: true, axis: "where an approver can do this",
        options: [
          { id: "A", names: "on a laptop at the branch desk only",
            from: "the bank's own strong-authentication constraint on this account type",
            costs: "one release pipeline, and it can be rolled back the way the web can" },
          { id: "B", names: "on a laptop and on a phone",
            from: "asked for at intake, and ruled not-possible at R-03 until the bank's roadmap lands",
            costs: "two release pipelines, one of which cannot be rolled back the way the web can" },
        ],
        chosen: "A", by: "the client's compliance director", on: "2026-09-04",
        why: "nobody approves payments on a phone here, they are at the desk when they do it" },
    ],
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
  /* qa-check walks for test files and refuses an empty suite, correctly. The tests have to
   * NAME the use case and the business rule, because uc-covered and rule-asserted match on
   * the id: a suite that tests everything and names nothing is untraceable. */
  fs.mkdirSync(path.join(d, "tests"), { recursive: true });
  fs.writeFileSync(path.join(d, "tests", "approvals.e2e.spec.ts"), [
    'import { test, expect } from "@playwright/test";',
    '',
    '/* UC-01 Send a payment: the whole flow, end to end. */',
    'test("UC-01 an approver releases a held payment and the actor is recorded", async ({ page }) => {',
    '  await page.goto("/approvals");',
    '  await page.getByRole("row").first().getByRole("button", { name: "Release" }).click();',
    '  await expect(page.getByText("Released")).toBeVisible();',
    '});',
    '',
    'test("UC-01 the oldest held payment is first in the queue", async ({ page }) => {',
    '  await page.goto("/approvals");',
    '  const ages = await page.getByTestId("age").allTextContents();',
    '  expect(ages).toEqual([...ages].sort((a, b) => Number(b) - Number(a)));',
    '});', ''].join("\n"));
  fs.writeFileSync(path.join(d, "tests", "rules.spec.ts"), [
    'import { describe, it, expect } from "vitest";',
    'import { approve } from "../src/approve";',
    '',
    '/* BR-01 A payment above the limit needs a second approver. Asserted on the server',
    ' * path, because a rule enforced by hiding a button is not enforced. */',
    'describe("BR-01 a payment above the limit needs a second approver", () => {',
    '  it("BR-01 refuses a single approval above the limit", async () => {',
    '    await expect(approve("p-above-limit", "actor-1")).rejects.toThrow(/second approver/);',
    '  });',
    '  it("BR-01 accepts the release once a second approver has signed", async () => {',
    '    await expect(approve("p-above-limit", "actor-2")).resolves.toMatchObject({ status: "released" });',
    '  });',
    '});', ''].join("\n"));
  fs.writeFileSync(path.join(d, "tests", "fee-row.spec.ts"), [
    'import { describe, it, expect } from "vitest";',
    'import { render } from "./helpers/render";',
    '',
    'describe("the fee row", () => {',
    '  it("the fee row has no collapsed state at any viewport", () => {',
    '    for (const w of [375, 768, 1440]) {',
    '      const el = render("fee-row", { width: w });',
    '      expect(el.querySelector("[hidden]")).toBeNull();',
    '    }',
    '  });',
    '  it("an empty queue reads as empty and not as loading", () => {',
    '    const el = render("queue", { rows: [] });',
    '    expect(el.textContent).toContain("Nothing is waiting");',
    '    expect(el.querySelector("[aria-busy=true]")).toBeNull();',
    '  });',
    '});', ''].join("\n"));
  fs.writeFileSync(path.join(d, "tests", "smoke.spec.ts"), [
    'import { test, expect } from "@playwright/test";',
    'test("smoke: the approval queue loads", async ({ page }) => {',
    '  await page.goto("/approvals");',
    '  await expect(page.getByRole("heading", { name: "Held payments" })).toBeVisible();',
    '});', ''].join("\n"));

  /* impl-check reads the workflow AND package.json, because a workflow runs `npm run
   * types` and what that does lives in the manifest. It also wants three environments. */
  fs.mkdirSync(path.join(d, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(d, ".github", "workflows", "ci.yml"), [
    "name: ci",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "    branches: [main]",
    "jobs:",
    "  verify:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - run: npm ci",
    "      - run: npm run lint",
    "      - run: npm run typecheck",
    "      - run: npm test",
    "  deploy-dev:",
    "    needs: verify",
    "    environment: dev",
    "    runs-on: ubuntu-latest",
    "    steps: [{ run: npm run deploy }]",
    "  deploy-staging:",
    "    needs: verify",
    "    environment: staging",
    "    runs-on: ubuntu-latest",
    "    steps: [{ run: npm run deploy }]",
    "  deploy-production:",
    "    needs: [verify, deploy-staging]",
    "    environment: production",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: npm run deploy",
    "      - run: npm run test:smoke",
    ""].join("\n"));
  fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({
    name: "approvals", private: true, type: "module",
    scripts: {
      lint: "eslint src tests",
      typecheck: "tsc --noEmit",
      test: "vitest run && playwright test",
      "test:smoke": "playwright test tests/smoke.spec.ts",
      deploy: "node scripts/deploy.mjs",
    },
    dependencies: { pg: "^8.13.0" },
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(d, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "ESNext",
      moduleResolution: "bundler", types: ["node"] },
    include: ["src", "tests"],
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(d, "eslint.config.js"),
    'export default [{ files: ["src/**/*.ts", "tests/**/*.ts"], rules: { eqeqeq: "error" } }];\n');
  fs.writeFileSync(path.join(d, ".gitignore"), "node_modules\n.audit\n");

  /* impl-check refuses a directory that is not a git repository, correctly: branch age
   * and branch protection are properties of a repository and not of a folder. */
  try {
    const q = { cwd: d, stdio: "ignore" };
    execFileSync("git", ["init", "-q", "-b", "main"], q);
    execFileSync("git", ["-c", "user.email=fixture@example.invalid", "-c", "user.name=pica fixture",
      "add", "-A"], q);
    execFileSync("git", ["-c", "user.email=fixture@example.invalid", "-c", "user.name=pica fixture",
      "commit", "-q", "-m", "the fixture, so branch age and protection have a repository to be about"], q);
  } catch {}

  /* ---- a capture, produced by the real producer ------------------------- *
   * The capture sub-objects are POSITIONAL arrays, so hand-writing one here would be a
   * second implementation of a format this repository already produces, and the two
   * would drift exactly the way a copied field drifts. So the fixture writes html and
   * runs capture-html-reference over it: the same code path a real project takes.
   *
   * Conditional on playwright, which the producer needs. Without it the four
   * capture-reading mutations skip, and they SAY they skipped, which is the state this
   * suite was in for every version before this one. */
  const css = [
    ":root{--s-1:4px;--s-2:8px;--s-3:12px;--s-4:16px;--s-5:24px;",
    "--ink:#141816;--ground:#ffffff;--rule:#d7dcd8;--accent:#12433d;--r:8px}",
    "*{box-sizing:border-box}",
    "body{margin:0;background:var(--ground);color:var(--ink);",
    "font:16px/1.5 -apple-system,system-ui,sans-serif;font-variant-numeric:tabular-nums}",
    ".scr{padding:var(--s-5)}",
    "h1{font-size:24px;line-height:1.2;margin:0 0 var(--s-4)}",
    ".row{display:flex;gap:var(--s-4);align-items:center;padding:var(--s-3) 0;",
    "border-bottom:1px solid var(--rule)}",
    ".age{font-size:16px;min-width:64px}",
    ".name{font-size:16px;flex:1}",
    ".cap{font-size:13px;color:#3d4a45}",
    "button{height:40px;padding:0 var(--s-4);border-radius:var(--r);border:0;",
    "background:var(--accent);color:#ffffff;font-size:14px}",
    ".frame-wrap{padding:var(--s-5)}",
    ".frame-cap{font-size:13px;color:#3d4a45;padding-bottom:var(--s-2)}",
    ".frame{border:1px solid var(--rule);border-radius:var(--r);overflow:hidden}",
  ].join("");
  /* The producer's own selectors: a .frame-wrap around a [data-viewport], with the screen
   * inside it. Matching the convention rather than inventing one is the whole point of
   * running the real producer. */
  /* The producer reads .frame-cap for the screen's name, and parity-check pairs the
   * three viewports of one screen by that name. Without it every frame is frame0,
   * frame1, frame2 and parity reads three screens each present at one viewport. */
  const frame = (vp, w, title, rows, scr) => [
    `<div class="frame-wrap"><div class="frame-cap">${scr} \u00b7 ${vp}</div>`,
    `<div class="frame" data-viewport="${vp}" data-uc="UC-01" style="width:${w}px">`,
    `<section class="scr" data-scr="approvals"><h1>${title}</h1>`,
    rows.length
      ? rows.map((r) => `<div class="row"><span class="age">${r[1]}</span>` +
          `<span class="name">${r[0]}</span><button type="button">Release</button></div>`).join("")
      : '<p class="cap">Nothing is waiting. Held payments appear here.</p>',
    rows.length ? '<p class="cap">Oldest first. Age in hours.</p>' : "",
    "</section></div></div>",
  ].join("");
  const page = (title, rows, scr) => [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title><style>${css}</style></head><body>`,
    frame("desktop", 1440, title, rows, scr),
    frame("tablet", 768, title, rows, scr),
    frame("mobile", 375, title, rows, scr),
    "</body></html>",
  ].join("");
  fs.mkdirSync(path.join(d, "html"), { recursive: true });
  fs.writeFileSync(path.join(d, "html", "approvals.html"),
    page("Held payments", [["Ridgeway Metals Ltd", "31"], ["Calder Freight", "18"], ["Ash Lane Dairy", "4"]], "approvals"));
  fs.writeFileSync(path.join(d, "html", "approvals-empty.html"), page("Held payments", [], "approvals empty"));

  fs.writeFileSync(path.join(d, "tokens", "tokens.json"),
    JSON.stringify({ "--s-1": "4px", "--s-2": "8px", "--s-3": "12px", "--s-4": "16px", "--s-5": "24px" }, null, 2));
  try {
    /* Resolved from THIS script, not from the fixture's cwd: the producer walks up from
     * its working directory and a temp dir has no node_modules above it. */
    const args = [path.join(PKG, "html/scripts/capture-html-reference.mjs"),
      "--dir", "html", "--out", ".audit"];
    try {
      const pw = path.dirname(createRequire(import.meta.url).resolve("playwright"));
      args.push("--playwright", pw);
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
  ["constraint-declared", "analyst/scripts/problem-check.mjs", [S], "commercialConstraint", (s) => delete s.commercialConstraint.by],
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
  // concept-check  (state only: divergence happens before any screen exists)
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { s.workPackages.approvals.concepts = s.workPackages.approvals.concepts.slice(0, 1); }],
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.servesBadly = []; }],
  ["concepts-diverged", "html/scripts/concept-check.mjs", [S], "workPackages", (s) => { for (const c of s.workPackages.approvals.concepts) c.dropped = false; }],
  // roadmap, inside estimate-check
  ["slice-releasable", "estimate/scripts/estimate-check.mjs", [S], "roadmap", (s) => { s.roadmap.slices[0].closes = []; }],
  ["critical-path",    "estimate/scripts/estimate-check.mjs", [S], "roadmap", (s) => { s.roadmap.criticalPath = ["R1", "R9"]; }],
  ["buffer-stated",    "estimate/scripts/estimate-check.mjs", [S], "roadmap", (s) => delete s.roadmap.bufferDays],
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
  ["effort-logged",      "core/scripts/close-check.mjs", [S], "effortLog", (s) => { s.effortLog = s.effortLog.slice(1); }],
  ["delivered-frozen",   "core/scripts/close-check.mjs", [S], "closeout", (s) => { s.delivered = true; s.workPackages.approvals.htmlApproved = false; }],
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
