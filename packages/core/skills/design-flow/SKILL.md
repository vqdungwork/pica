---
name: design-flow
description: Use when designing a product interface that will actually be built — an application, a website, a landing page, a set of screens, a dashboard, or the design system behind them. Covers intake as a contract, research and token extraction, HTML prototyping at every declared viewport, measured verification, porting to Figma once the human approves, prototype wiring, and handover. Trigger on "design the app", "design this website", "design a landing page", "design these screens", "design the dashboard", "build a design system", "port the HTML to Figma", "review the Figma against the HTML", "design handoff", or any interface work with a brief, a client, or a deadline. NOT for artwork or media — an illustration, a photograph, an image, a video, an animation, a logo or brand mark, a presentation deck, a document, a diagram, or the styling of CLI and terminal output. pica designs interfaces people navigate and someone has to build; if nothing is going to be implemented from it, this is the wrong tool.
---

# design-flow

A gated design workflow. Prototype in HTML, port to Figma on approval, verify by measurement.

**The commands drive this.** Run `/pica` to start a project; the flow is deterministic from there. This
file is the map. The rules now live with the package that owns them, under `packages/*/rules/`.

## The one non-negotiable

**HTML is the source of truth. Measure, do not eyeball.**

Every serious defect was invisible to visual review and obvious to
measurement: a hero 47px low across three screens, a CTA hugging its label instead of filling, a card
43px too tall, inputs at a stale fixed height clipping their own error messages, 41 text nodes bound to
no font at all on the one page the client was scoring.

All of it looked fine in a screenshot. Eyeballing finds the wrong things and misses the real ones.

**The general form is: measure against a reference, and the reference is read-only.** HTML is that
reference for a port; a client's own file is that reference for a rebuild; the sources named in the brief
are that reference for tokens and copy. How to treat one — never edit it, pair to it by an identity
channel you control, diff its *content* as a criterion of its own, and sort its own defects into the
three kinds — is medium-independent and lives in
[reference-discipline.md](../../rules/reference-discipline.md). Read it once; it applies to
every phase.

## The flow

Brief becomes a contract, HTML becomes the design, measurement decides whether it is right. Figma is a
downstream rendering of an approved HTML design — never a parallel effort, never the place a decision
first gets made.

**`/picaflow <brief>` runs phases 0 to 3 in one go**, without stopping to ask. Everything it cannot
derive becomes a labelled assumption the client corrects at review. The steps below are what it runs,
and each has its own entry point because no session survives a multi-day project.

**Phase 0 to 2 — understand and define.** Ends with a PRD a non-technical reader follows.

| # | Step | Command | Rules |
|---|---|---|---|
| 0 | Intake: brief verbatim, sources labelled, **analytics and support logs requested** | `/pica` | `packages/research/rules/research.md` |
| 1 | Research: analytics, support logs, journey map, **measure 3 to 5 shipped products** | inside `/pica` | `packages/research/rules/design-vocabulary.md` |
| 1.8 | Feasibility, **before anything is promised** | `/pica-architect --feasibility` | `packages/architect/rules/architecture.md` |
| 2 | Domain knowledge, glossary, AS-IS, TO-BE, **the delta**, business rules, use cases, domain model, PRD | `/pica-analyse` | `packages/analyst/rules/business-analysis.md`, `packages/analyst/rules/domain-knowledge.md`, `packages/analyst/rules/industry-knowledge.md` |

**Phase 3 — design and verify.** This phase is the deliverable. An HTML-only project ends here, fully
verified.

| # | Step | Command | Rules |
|---|---|---|---|
| 3.0 | IA, screen inventory traced to use cases, state matrix | inside `/pica-wp` | `packages/html/rules/html-prototype.md` |
| 3.1 | **Design direction**, named against a tradition, asserted as numbers | inside `/pica` | `packages/research/rules/design-vocabulary.md` |
| 3.2 | Tokens in **three tiers**: primitive, semantic, component | inside `/pica` | `packages/research/rules/research.md` |
| 3.3 | UI kit in HTML, before any screen consumes it | inside `/pica` | `packages/html/rules/html-prototype.md` |
| 3.4 | Build the package at every viewport, **every state**, plus the interactive flow | `/pica-wp <name>` | `packages/html/rules/html-prototype.md` |
| 3.5 | **The words**, every state, bound to the glossary | `/pica-copy` | `packages/content/rules/content.md` |
| 3.7 | **Measure**: verify-html, coverage-check, parity-check, flow-check, copy-check. All zero, or fix | inside `/pica-wp` | `packages/html/rules/html-gates.md` |
| 3.8 | **3 to 5 independent evaluators**, then a walkthrough per use case | `/pica-evaluate` | `packages/designqa/rules/evaluation.md` |
| 3.10 | Render every frame and **look at it**, then click the main flow end to end | inside `/pica-wp` | [review-discipline.md](../../rules/review-discipline.md) |
| 3.11 | **GATE: the client approves this package** | inside `/pica-wp` | `packages/html/rules/html-gates.md` |

**Phase 4 to 5 — commercial.** Nothing here may run before the client froze scope and gave a date.

| # | Step | Command | Rules |
|---|---|---|---|
| 4 | Client confirms the business flow **and** the design. Account writes `scopeFrozen` and `deadline` | human | — |
| 5 | **Three-point effort by role**, work order derived from the deadline | `/pica-estimate` | `packages/estimate/rules/estimation.md` |

**Phase 6 to 8 — build and release.** After the contract.

| # | Step | Command | Rules |
|---|---|---|---|
| 6 | C4 diagrams, **ADRs**, NFRs stated as numbers | `/pica-architect` | `packages/architect/rules/architecture.md` |
| 7 | Build, test, release, and **compare the build against the approved design** | `/pica-build` | `packages/impl/rules/implementation.md`, `packages/html/rules/native-mobile.md` |
| 7f | Port to Figma for the developers, verify, wire the prototype | `/pica-port`, `/pica-review`, `/pica-prototype` | `packages/figma/rules/figma-screens.md` |
| 8 | Closeout, then **log the real hours back** so the next estimate is better | `/pica-close`, `/pica-estimate --closeout` | [review-discipline.md](../../rules/review-discipline.md) |
| — | Feedback arrives | `/pica-feedback` | [review-discipline.md](../../rules/review-discipline.md) |

**One design, three viewports; targets choose what they consume.** A responsive website takes desktop,
tablet and mobile. A native app takes tablet and mobile and never desktop. `coverage-check` fails a
target that names a viewport the design never produced, so "we cannot build iOS, nobody drew tablet" is
found in Phase 3 rather than in Phase 7.

`/pica-feedback` is not a step. It runs whenever someone else's review lands, before or after delivery,
because triaging a client's claims is a different job from auditing your own work: every item has to be
**verified before it is accepted**, and the fix is often a decision rather than a repair.

## The other job: rebuilding an existing Figma file

Sometimes there is no brief and no HTML. A client hands you a Figma file they already have and wants it
rebuilt into something a developer can build from — tokens, components, states, naming — **without
changing what it shows**.

The flow above does not apply. There is nothing to prototype and nothing to approve, because the design
already exists. What replaces it:

| | Port (Phases A–C) | Rebuild |
|---|---|---|
| Arbiter | the approved HTML | the client's untouched pages, which are read-only |
| Gate | `htmlApproved:<wp>` | none — the design is already approved by existing |
| Geometry check | `geometry-diff.mjs` | `source-parity.js` |
| Target | 0 findings | **0 findings, and every lens reported as a pair against the source** |

Three things carry over unchanged: the audit (`figma-audit.js`), the appearance baseline
(`capture-baseline.js`), and every rule in `figma-elements.md` and `figma-screens.md`.

What is **not** specific to a rebuild, despite being discovered in one, is everything about handling the
reference itself — read-only, identity channel, content parity, the three kinds of source defect, fixing
at the definition, promote slowly and bind always. Those are in
[reference-discipline.md](../../rules/reference-discipline.md) and they govern the port
flow just as much.

Read `packages/figma/rules/figma-rebuild.md` before starting one. The short
version: never write to the originals, keep the rebuilt screens at the source's canvas coordinates so
pairing is exact, and remember that **a file can pass every structural criterion at zero and still show
the wrong product** — content parity is a separate criterion and only the source can score it.

## Packages

pica is ten packages plus a bundle. Each declares what it requires, produces, checks and considers
done, in its own manifest, and each installs on its own with only what it needs.

| Package | Depends on | Owns |
|---|---|---|
| `pica-core` | — | intake, closeout, feedback, the state schema, every gate, and `/picaflow` |
| `pica-analyst` | core | elicitation, domain knowledge, AS-IS and TO-BE, business rules, the domain model, the PRD |
| `pica-research` | core | the source audit, the nine foundations, design vocabulary, token provenance |
| `pica-html` | core, research | work packages at every viewport, and the measured gate |
| `pica-content` | core, html | the words: every state written, bound to the glossary |
| `pica-designqa` | core, html | independent evaluators, cognitive walkthrough, build versus design |
| `pica-architect` | core | feasibility before anything is promised, C4, ADRs, NFRs |
| `pica-estimate` | core | three-point effort by role, the work order, the effort record |
| `pica-impl` | core, html, designqa | the definition of done for building, reviewing, testing and releasing |
| `pica-figma` | core, html | the port, annotations, and the geometry diff |

`pica` installs all ten. A project that will never touch Figma installs `pica-html`, which pulls in
`pica-core` and `pica-research` and never sees the Figma half. A team that only wants the business
analysis installs `pica-analyst`, which pulls in `pica-core` and nothing else.

**Package is a distribution unit; agent is an execution unit. They are different axes.** A rule file is
a document, and which agent loads it is a runtime decision, not a packaging one. That is why the
packages divide by artefact domain and the agents divide by who reasons about what.

**No package may grant a gate it benefits from.** `html` requests `htmlApproved`; core
grants it on human approval; `figma` requires it and cannot grant it. Run
`node packages/core/scripts/pica-status.mjs` to see what is ready and what is blocked.

**pica ships the definition of done for implementation, not a coding agent.** `pica-impl` is built and
stable: it checks that tests trace to use cases, that a pipeline runs lint, types and tests, that
branches are short-lived, that three environments deploy from main, that no credential is tracked, that
every NFR names how it is measured, and that the repository is the stack that was agreed.

What it does not do is write the code. Writing code is the most mature thing in this ecosystem, and a
worse version of it here would help nobody. A coding agent executes; this decides whether what came out
is finished.

`packages/_planned/` keeps per-platform contracts for `impl-web`, `impl-ios`, `impl-android` and `e2e`.
Those are interfaces worth agreeing before the work starts, and they have no content.

## Build order within a project

**variables, then text styles, then global components, then local components, then screens, then
prototype, then handoff.**

Each layer is built from the one below it. Building screens before components guarantees a rebuild.

## The gates

Four are enforced by hook and cannot be talked around:

1. No Figma write for a work package whose HTML the human has not approved.
2. No Figma write while a review is running in report mode.
3. No Figma write after delivery.
4. No `use_figma` call without the `figma-use` skill loaded and `skillNames: "figma-use"` passed.

The rest are yours to hold:

- Present limitations before capability claims.
- **A package ships option boards and an interactive prototype of its main flow.** The boards settle a
  decision and then become provenance; the flow is what the human uses.
- **Look after the last change, not before it,** and click the flow. Ten green checks on one project
  coexisted with four defects visible in a screenshot.
- Self-review and **say what you checked** before handing anything back. Never report complete on work
  you have not verified.
- Verify every mutation in a **separate call**. Same-call read-back returns the in-memory value.
- **Capture an appearance baseline before any bulk mutation.** `packages/figma/scripts/capture-baseline.js`, then diff
  after. Existence checks cannot see a binding that changed what a node renders, and Figma version
  history is not readable from the Plugin API, so a missed baseline means the original values are gone.
- **Say what your filter excluded.** A denominator you did not verify is fiction: one screen audit
  reported "68 of 68 covered" while silently skipping every hug-height frame, which is where the missing
  element was.
- Re-read the original brief at closeout, not the plan. Copies drift.

## Dependencies

| Need | For | If missing |
|---|---|---|
| nothing | intake, research, analysis, design, the measured gate, evaluation, the client gate, estimate, architecture | the whole flow to an approved design runs |
| Figma MCP server, which provides `figma-use` | phase 7f only: the port, the geometry diff, annotations, the wired prototype | say the Figma phase is unavailable, run everything else |
| Figma seat with enough MCP calls | any part of 7f | size the work to the budget, see `packages/figma/rules/figma-mcp.md` |
| playwright | the capture harness in `packages/html/scripts/` | say the measured diff is unavailable, and do not silently fall back to eyeballing |
| superpowers | stronger intake and planning, plus the panel | use `brainstorming`, `writing-plans`, `dispatching-parallel-agents` when present |

Load `figma-use` **before** any `use_figma` call. It owns the API contract; this skill owns the workflow
and the failure modes that skill does not cover.

## State

`.pica/state.json` holds two kinds of thing. The commands write both.

**Read by the hooks**, to gate writes: `figmaInScope`, `delivered`, per-package `tier`, `htmlApproved`
and `ported`, plus `activeReview` and `writeAuthorization`.

**Read by the analysis gate** (`trace-check`, `domain-check`, `industry-check`): `glossary`, `businessRules`,
`useCases`, `domainModel`, `domainConstraints`, `asIs`, `toBe`, `delta`, `assumptions`, `stakeholders`,
`field`, `industry` (`key`, `conventions`, `forbiddenPrevented`, `departures`, `stakeholdersNotApplicable`,
`constraintsNotApplicable`, `evidenceNote`).

The two `NotApplicable` registers each need a reason **and a name**. They exist for the same purpose as
every other register here: so that a deliberate exception is distinguishable from an oversight, including
by the person who wrote it a week later.

**Read by the measured gate** (`verify-html`, `coverage-check`, `parity-check`, `copy-check`):
`viewports`, `targets`, `direction`, `useCases`, `glossary`, `copyRules`, `parityExemptions`,
`reflowNotes`, `flowExemptions`, `flows`.

**Read by the commercial gate** (`estimate-check`): `scopeFrozen`, `deadline`, `durationWeeks`,
`hoursPerWeek`, `estimate`, `risks`, `workPackages`, `effortLog`.

**Read by the build gate** (`impl-check`, `code-tokens-check`, `build-diff`): `stack`, `nfr`,
`useCases`, `businessRules`, `rawValueExemptions`.

**Read by the audit**, to make judgement calls checkable: `rawValueExemptions`, `exclusions`,
`deviations`, `bannedChars`, `copyRules`, `dataOwnership`, `granularityExemptions`, `lensBaselines`,
`geometryTolerance`, `frameMap`, `fontMatch`, `gates`.

**Read by closeout**, so the last step can run at all: `briefPath` and `exclusionsConfirmed`.

Three of these decide whether a whole phase can begin, and all three are written by a **human**
recording that another human agreed. No command writes them, deliberately:

| Key | Written when | Blocks |
|---|---|---|
| `exclusionsConfirmed` | The client was asked what **not** to build | GATE 1 |
| `htmlApproved:<wp>` | The client approved that package's HTML | every Figma write |
| `scopeFrozen` + `deadline` | The client confirmed scope and gave a date | the estimate |

Refusing to run without them is the point, not an obstacle: each is the one hard stop between a thing
a client liked and a thing they will be held to.

**The flow declaration**, one entry per application the product presents as its own:

```json
"flows": [
  { "app": "launcher",  "entry": "app-launcher.html", "home": "sign-in", "owns": ["account"] },
  { "app": "<product>", "entry": "app-<slug>.html",   "home": "<screen id>" }
]
```

`flow-check` reads it, so "one interactive prototype per application" is checkable rather than a habit.
`flowExemptions` records a screen the router opens rather than any control, `{file, screen, why}`, and
exists for the same reason every other register does: without it a deliberate case is indistinguishable
from an omission.

`copyRules` and `dataOwnership` carry the client's own rules in a form something can read. See
`packages/research/rules/research.md`: a copy rule stated in conversation lasts about a
day, and "the user's data is read-only here" means nothing useful until it is written per entity.

**The viewport declaration**, which everything downstream reads:

```json
"viewports": [
  { "name": "desktop", "w": 1440, "h": 900,
    "idiom": "desktop web, no device chrome",
    "pointer": true, "breakpoints": [1024],
    "chrome": [ { "name": "top-nav", "required": true, "pinH": "STRETCH", "pinV": "MIN" } ],
    "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } },
  { "name": "tablet", "w": 768, "h": 1024,
    "idiom": "tablet web in a device frame",
    "pointer": false, "breakpoints": [768],
    "chrome": [ { "name": "side-rail", "required": true, "pinH": "MIN", "pinV": "STRETCH" } ],
    "grid": { "columns": 8, "gutter": 16, "margin": 24, "maxContent": 1200 } }
]
```

**Tablet.** 768 x 1024 is the canonical entry: it is the breakpoint minimum, so the tightest case is
covered, and it is a real device rather than a midpoint nobody ships. Pick the 8 column grid above and
the column width lands within a pixel of the 4 column mobile grid at 375, which is the point. A card
that spans two columns is the same width at both sizes, so tablet fits more of them per row instead of
stretching each one. That is what makes a tablet pass cheap: components reflow, they are not redrawn.
Reaching for 834 or 810 because a specific iPad uses it buys nothing and loses the grid relationship.

One entry behaves exactly as 0.2.0 did. Two or more activates sections per viewport, a prototype page
per viewport, the parity check and the hug pair.

Two registers exist only because multi-viewport work needs them, and each has something that reads it:

- **`parityExemptions`** — a screen deliberately absent at a viewport. `{screen, presentAt[], why}`.
  Without it the parity check reports every deliberate asymmetry forever; with it, a decision is
  distinguishable from an omission.
- **`reflowNotes`** — a component that legitimately differs across viewports. **`scope` is required**:
  either a screen name or `"*"` for chrome that reflows everywhere. A flat global list is too blunt —
  a class can reflow on one screen and be identical on another, and silencing it globally blinds the
  check where it mattered.

A hook is a shell script. It cannot know the human said yes out loud, so approvals have to be on disk.

## A rule with no register is a preference

If the flow says something "must be written down", it needs a **named key in state** and something that
reads it. Otherwise the rule is unfalsifiable: nobody can tell a deliberate exception from an oversight,
including you a week later.

This is why the audit reads `exclusions` and `deviations` rather than trusting that a document mentions
them. Prose artefacts stay — `docs/exclusions.md` is what the human reads — but the machine-checkable
list lives in state alongside it.

The audit runs inside Figma and has **no filesystem access**, so it cannot read state directly. State is
authoritative; populate the script's config block from it before pasting. Never edit the register in the
script only, or the two will drift.

## Scripts

Every check named in a rule ships here and is runnable. A rule that names a check with no executable
behind it is a rule nobody can follow — 0.3.0 shipped three such rules, documenting a parity check and a
geometry diff that existed only in the project they were written from.

**HTML side — runs in Phase B, before approval. The only verification an HTML-only project gets.**

| Script | Proves | Passes when |
|---|---|---|
| `capture-html-reference.mjs` | measurement is possible | it writes an artefact; it refuses on 0 frames rather than emitting an empty one |
| `verify-html.mjs` | the HTML is internally sound | 0 findings across viewport-tagged, overflow, tall-screen-pair, viewport-coverage, direction |
| `coverage-check.mjs` | **the design is what was agreed** | 0 across uc-covered, screen-traced, uc-exists, flow-reachable, target-buildable |
| `copy-check.mjs` | the words are written | 0 across placeholder, glossary terms, copy rules, error next step, length realism |
| `parity-check.mjs` | the viewports agree | 0 findings, nominal and structural. 2+ viewports only |
| `flow-check.mjs` | the prototype goes where it says it goes | 0 findings across dangling-target, dangling-href, nav-target, unreachable, dead-end, orphan-prototype, flow-declared, **and** a non-zero screen and link count |

The capture records true text-run rectangles via range geometry, every element box with its classes,
depth and nearest classed ancestor, computed font size and weight, each run's owning element and
text-align, and per frame the tagged viewport, the use case it serves, the hug flag, content height, horizontal
overflow, and a **census** of radii, control heights, hues and numerals. Frames are located by
`data-viewport` — the same attribute that names the viewport.

`--url` captures a **running build** instead of prototype files, which is what makes step 7.10 possible.

**Analysis side — runs before any design exists.**

| Script | Proves | Passes when |
|---|---|---|
| `trace-check.mjs` | the requirements hold together | 0 across glossary closure, rule enforcement, use case trace, entity terms, AS-IS present, assumption radius |
| `domain-check.mjs` | the domain was asked about | 0 across all-categories, sourced, verified, agent claims surfaced, affects |
| `industry-check.mjs` | **the design belongs to its sector** | 0 across industry-known, stakeholders, constraints, conventions, forbidden, style-excluded, evidence. **Fails closed on a sector the base does not cover** |
| `schema-check.mjs` | the field was measured, not admired | 0 across sample size, nine foundations, type roles, provenance, shipped-not-concept, tradition named |

**Commercial and build side.**

| Script | Proves | Passes when |
|---|---|---|
| `estimate-check.mjs` | the price is defensible | 0 across preconditions, three points, tier spread, risk reflected, headcount, effort log |
| `code-tokens-check.mjs` | the code consumes the tokens | 0 raw colour, spacing, radius, and no linear easing |
| `impl-check.mjs` | the repository is releasable | 0 across test trace, CI, branch protection, branch age, environments, secrets, NFR measured, stack declared |
| `build-diff.mjs` | **the build is the design that was approved** | 0 across frame paired, control height, radius, hue budget, text position |

**Figma side — Phase C only.**

| Script | Proves | Passes when |
|---|---|---|
| `geometry-diff.mjs` | Figma matches the HTML | 0 findings above tolerance, **and** a nonzero number of runs compared |
| `figma-audit.js` | **structure** — the whole audit checklist in one `use_figma` call | every count returns zero |
| `capture-baseline.js` | **appearance**, which the audit cannot | resolved RGBA of every paint identical before and after a bulk mutation |
| `source-parity.js` | **content**, for a rebuild — that each screen still says what the client's file says | contamination 0, 0 missing and 0 extra strings per screen, and a nonzero screen count |

**Every one of these fails closed.** A selector that matches nothing, a frame map with no entries, a
comparison of zero nodes: each exits non-zero rather than reporting a clean run. A check that cannot
tell you it did nothing is worse than no check, because its silence reads as a pass.

**None of them can detect absence.** A node never created has no coordinates, so it cannot be over
tolerance; a frame missing a third of its content still reports everything it does have as correct.
Inventory and count checks cover that, and rendering every frame and looking at it covers what no
script does.

**And none of them can tell you a link is wrong, only that it is broken.** `flow-check` proves every
destination exists; whether it is the *right* destination is answered by a human clicking. On the source
project ten green harnesses coexisted with a home-screen row that opened another role's screen.

## Rules

Each rule now lives with the package that owns it.

- `packages/research/rules/research.md` — research package. Intake packet, contract, exclusions, audit breadth, token provenance, mock-data provenance, client copy rules, data ownership
- `packages/html/rules/html-prototype.md` — html package. Layout, the tabbed review page, options versus the interactive flow, navigation state, the tall-screen pair, real assets, state matrices
- `packages/html/rules/html-gates.md` — html package. The measured HTML gate, the flow gate, viewport parity, HTML-only coverage, behaviour review for prototypes, definition of done
- `packages/figma/rules/figma-elements.md` — figma package. Token layers including Border, geometry binding, alpha in tokens, numeric font weights, font-package forensics, component tiers, instance constraints, component granularity, fake variant axes, naming by role, merge mechanics
- `packages/figma/rules/figma-screens.md` — figma package. Frames, states, alignment and vertical centring, screen chrome pinning, CSS to auto-layout, the circle trap, API traps
- `packages/figma/rules/figma-mcp.md` — figma package. Rate limits and call budget, `page.loadAsync` for whole-file reads, write discipline
- `packages/figma/rules/figma-gates.md` — figma package. The Figma audit checklist, appearance baselines, geometry-diff tolerances, the deviations register, definition of done
- `packages/figma/rules/figma-rebuild.md` — figma package. Rebuilding a client's existing Figma file: the source as arbiter, the shared coordinate system, positional parity, baselining every lens against the source, deciding the source's own defects
- [reference-discipline.md](../../rules/reference-discipline.md) — core package. Medium-independent: the reference is read-only and it is checkable, names are not identity, content parity as its own criterion, the three kinds of reference defect, fix at the definition, promote slowly and bind always
- [review-discipline.md](../../rules/review-discipline.md) — core package. Medium-independent: report versus fix, self-review, complexity routing, the panel, verification method, writing your own checks, audit integrity, reading a property instead of deducing it, baselining a number, guards that must fail rather than skip
