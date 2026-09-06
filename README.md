<div align="center">

<img alt="pica — from the brief to the shipped product. Analyse, design in HTML, evaluate, estimate, architect, build and release. Every step verified by measurement, never by opinion." src="assets/banner.svg" width="100%">

**From a brief to a released product, checked by measurement at every step. For Claude Code.**

[![version](https://img.shields.io/badge/version-0.9.1-1f2328)](https://github.com/vqdungwork/pica/releases)
[![checks](https://img.shields.io/badge/checks-106%20fail--closed-1f2328)](#the-checks)
[![agents](https://img.shields.io/badge/role%20agents-9-1f2328)](#nine-roles-one-per-step)
[![sectors](https://img.shields.io/badge/sectors-28-1f2328)](#it-knows-the-field)
[![licence](https://img.shields.io/badge/licence-MIT-1f2328)](LICENSE)
[![requires](https://img.shields.io/badge/requires-Claude%20Code-1f2328)](#requirements)

</div>

---

> A **pica** is the unit designers have measured type in for six centuries.
> The name is the whole argument: work is checked against a measurement, not against an impression.

---

## What it catches

A design that looks right is not the same as a design that is right. Here is what that means in
practice, before anyone is asked to approve anything.

**The one the eye cannot see.** Contrast is computed from the resolved colours and composited through
translucency, never sampled from a screenshot:

```
FAIL  body-contrast     1 finding(s)   (60 runs)

FINDING  [body-contrast] "Could not save that check-in"
         2.15:1 at 16px/400, and AA needs 4.5:1 for normal text.
         rgb(245, 158, 11) on rgb(255, 255, 255)
```

Less than half the required ratio, on the one line a person most needs to read. It looked fine.

**The one a measurement cannot see either.** Every frame tagged, in bounds, paired and covered — and the
product both incomplete and over-scoped:

```
FAIL  uc-covered       1 finding(s)   (4 use cases)
FAIL  screen-traced    1 finding(s)   (11 screens)

FINDING  [uc-covered] UC-03 review a statement
         was agreed and has no screen. Nobody notices until UAT, because every
         screen that DOES exist looks correct
```

**The one only the field can see.** The sector gate does not report an empty box, it says why the field
cares:

```
FINDING  [stakeholders] parent or guardian
         this sector's "parent or guardian" can decide or veto and appears in no
         register. They fear: finding out about a problem too late. Design
         consequence: the parent view is a third density, and it must translate
         rather than expose the teacher's terms
```

**And every check fails closed.** Point one at a directory matching nothing and it refuses to write an
artefact rather than reporting a clean run over zero files:

```
FAIL  captured 0 frames from 3 file(s).
      One of these selectors matches nothing. Nothing was written: an empty
      reference would pass every downstream check while measuring nothing.
```

That last one is the whole argument in five lines. **A check that reports success for work it did not do
is worse than no check, because its silence reads as a pass.**

## What it asks you

Most of pica decides. This is the part that does not.

> **Propose where the decision is yours and you can judge it by looking.
> Decide silently where it is craft and looking would not help you.**

Both halves matter. "Postgres or MySQL" is a question that transfers risk to someone with no instrument
to carry it. Which easing curve a sheet uses is a question that costs your attention and buys nothing.

**Seven slots, universal on every project. What fills them is derived, never listed here** — from the
sector entry, the measurement and the analysis. A rule offering "streak, chain or run" is a
habit-tracker rule wearing a general one's clothes, and noise on a payments product.

| | Slot | Filled from |
|:--:|:--|:--|
| **S1** | **The direction** — the busiest screen built three ways, same content | the products actually measured, plus the sector's own tradition as the baseline |
| **S2** | Default mode and density | the sector's colour lead and its density conventions, which for several sectors name *two* densities — and that is itself the decision |
| **S3** | **The sector's signature moment** | the stakeholder whose fear names the failure that field designs into its own products |
| **S4** | The word the product turns on | the delta, crossed with the glossary |
| **S5** | Who sees what | the actors, bounded by the sector's forbidden defaults |
| **S6** | What is in the first release | every use case, priced in hours |
| **S7** | Where it runs, in consequences | the targets, and the release asymmetries each one buys |

**S1 is three renderings of one screen, not three palettes.** Nobody can judge `--radius-lg: 12px`. Two
screens side by side settle it in three seconds, and each option names the measured product it argues
from — so the choice has numbers behind it rather than three pictures a model liked.

**S3 is the highest-value question in the flow and the one nobody thinks to ask**, because it does not
look like a design question. It looks like an edge case, gets built the obvious way, and the obvious way
is the one the field already knows causes the damage. Fitness: the broken streak. Finance: the silently
failed transfer. Education: being shown you are behind, in front of others.

A slot with no material in this project is **skipped with a reason recorded**. A question nobody asked
and a question with no answer look identical afterwards, which is why `proposal-check` refuses to run at
all on a project with no register: reporting zero findings there would be a lie.

**What it cannot do:** tell you the options were worth choosing between. Three weak ones produce a
choice, a recorded decision, a clean check and a bad product. It says so on every run.

## The flow

Nine phases, each run by the agent that owns it. **One stops and waits for you**, and it is the one that
matters. Every command is `/pica-…`, shortened here to fit.

| Phase | Agent | What happens | Run |
|:--|:--|:--|:--|
| **0 · Intake** | — | The brief verbatim, sources labelled, exclusions quoted, viewports declared. **A contract, not a mockup** | `/pica` |
| **1 · Research** | researcher ×3–5, then architect | Shipped products measured across the nine foundations, by researchers who never see each other's findings. Then feasibility says **no**, while saying no is still free | `-architect` |
| **2 · Analysis** | analyst | Sector, glossary, AS-IS, TO-BE, **the delta**, business rules, use cases, domain model, and a PRD a non-technical client can read | `-analyse` |
| **3 · Design** | designer, writer,<br>evaluator ×3–5 | Direction asserted as numbers, tokens in three tiers, a kit, then screens at every viewport in every state, then the words. **Measured, evaluated and looked at** before you see it | `-wp`<br>`-copy`<br>`-evaluate` |
| **4 · You approve** | **you** | The business flow **and** the design. Scope and deadline frozen. **Nothing downstream runs until they are** | — |
| **5 · Estimate** | estimator | Three points per role, a work order derived from the deadline, arithmetic shown | `-estimate` |
| **6 · Architecture** | architect | C4, decision records carrying their downside, NFRs as numbers with a way to measure each | `-architect` |
| **7 · Build** | **developer**, tester, evaluator | **The developer writes the code** — the API contract as a seam, four places state may live, every failure shaped so the copy reaches it. The tester decides whether the suite is a suite. Then the pipeline. Then the built product is measured back against the approved design, **never by whoever built it** | `-develop`<br>`-test`<br>`-build` |
| **8 · Closeout** | analyst | Proved against the **original brief**, handed over, then the real hours logged back | `-close` |

**Figma is optional and sits beside phase 7, never in front of it.** Port an approved package, verify it
frame by frame against the HTML, wire the prototype: `/pica-port` · `/pica-review` · `/pica-prototype`.
Where the two disagree, Figma is wrong.

**Or hand it the brief and let it run.** `/picaflow` runs the chain and stops only at those three
decisions, turning every gap in between into a labelled assumption carrying a confidence and a blast
radius. Each step runs as the agent that owns it, and each agent reads the sector before it starts.

`--to` says where to finish, and **every one of them is a complete project rather than a truncated one**:

| Stop at | You get |
|:--|:--|
| `--to design` | a measured, clickable `review.html`, the PRD, and the assumptions register |
| `--to figma` | that, plus the Figma file verified frame by frame against the HTML |
| `--to product` | that, plus working front end and back end, tested, released |

Figma is off the critical path. `--to product` goes straight from the approved HTML to production code
without touching it, and it is a supported route rather than a corner cut.

Running without stopping is the argument, not a shortcut. Reacting to a built thing is far cheaper than
specifying one from nothing: ask a client what their business flow is and you get hesitation; show them a wrong one that
clicks and you get the correction in three seconds. **The demo is the question. It is only packaged as an
answer.** What makes it safe is the assumptions register and nothing else.

## Install

```bash
/plugin marketplace add vqdungwork/pica
/plugin install pica@pica
```

**Upgrading from an earlier version, install rather than update.** `/plugin install pica@pica` pulls
every package the bundle depends on, including ones that did not exist when you first installed.
`/plugin marketplace update pica` followed by an update of the bundle alone leaves the new packages
absent — and pica will then correctly report every check they own as `SKIPPED … NOT a pass`, which is
honest and not what you wanted.

Restart Claude Code. The workflow announces itself at the start of every session, including after a
compaction, so you never have to remember to load it. Then just talk:

```
Design the onboarding screens for our mobile app

Design this dashboard for desktop and mobile

Port the approved HTML to Figma

Here is the brief. Run the whole thing and show me a review page
```

**Or install only what you need.** Every package pulls `pica-core` with it, so any single install brings
the state schema and the gates.

| Install | You get | Because |
|:--|:--:|:--|
| `pica-analyst` · `pica-architect` · `pica-estimate` · `pica-research` | 2 | they need the state schema and nothing else |
| `pica-html` | 3 | it consumes `tokens/tokens.css`, which research produces |
| `pica-qa` | 3 | a test asserts a business rule, and the rules live in the analyst's state |
| `pica-content` · `pica-designqa` · `pica-figma` | 4 | all three read the capture artefact html produces |
| `pica-developer` | 5 | it builds an approved HTML design against the analyst's contract |
| `pica-impl` | 5 | the build-versus-design comparison belongs to Design QA, not the builder |
| `pica` | 13 | the bundle |

### Where the line is

| pica is for | pica is not for |
|:--|:--|
| Applications — web, mobile, desktop | Illustration, images, photography |
| Websites and landing pages | Video, motion, animation |
| Dashboards, admin tools, internal products | Logos, brand marks, identity work |
| Design systems and component libraries | Presentation decks and documents |
| The PRD, use cases and domain model behind them | Diagrams, charts, terminal output |
| The code, the tests, and whether the build still matches the design | Bespoke infrastructure and cloud operations |

**pica designs things people navigate and someone has to build.** If nothing will be implemented from
the output, it will get in your way: every gate exists to protect an implementation that would otherwise
be built from an unverified design.

Nothing in it assumes a client, a stack, a brand or a team. You declare the viewports, whether Figma is
in scope, and what the brief says. It adapts to that and refuses to invent the rest.


## Nine roles, one per step

Each step runs as the agent that owns it — `pica-analyst`, `pica-designer` and so on, shortened below.
Every agent loads its own craft rules **and reads the sector entry before it starts** — which is what keeps a clinician's screen and a warehouse handheld from coming
out of the same template.

| Agent | Owns | Reads before it starts |
|:--|:--|:--|
| **researcher** | measuring shipped products across the nine foundations | which products count as precedent here, and which mislead |
| **analyst** | glossary, AS-IS, TO-BE, the delta, rules, use cases, the PRD | who can veto, and what the field requires whatever the brief says |
| **architect** | feasibility, C4, ADRs, NFRs as numbers | the obligations that become NFRs nobody asked for |
| **designer** | the kit, every screen, every state, every viewport | the hues already spent, the tradition, the density, the type |
| **writer** | the words, every state, bound to the glossary | the register the reader is fluent in, and the phrasings the field treats as defects |
| **evaluator** | independent evaluation — **no write access** | the sector's own defect list, as a lens |
| **estimator** | three points per role, the work order | the approval bodies that land on the critical path |
| **developer** | the code, the contract, the failure shapes | the conventions the field expects in a build |
| **tester** | the suite's shape, the release gate | what this field considers a blocker |

**The evaluator cannot write.** An audit that fixes destroys the record of what was wrong, and picks
solutions that are not its to pick: a contrast failure can be solved by darkening the scrim or by
changing the text colour, and that is a design decision.

**Fan out measurement. Never fan out judgement.** Research and evaluation are the two places agents run
in parallel — same return schema, none seeing another's findings, and a result with no provenance is
rejected rather than merged.

## What ships

| | What each one is |
|:--|:--|
| **13 plugins** | 12 packages plus a bundle, each declaring what it requires, produces, checks and considers done |
| **16 commands** | Deterministic once typed |
| **23 rule modules** | Loaded per step, never all at once. 173 definition-of-done items across them |
| **19 check scripts** | Plus the capture harness, the status tool, and a harness that runs the in-Figma scripts outside Figma |
| **106 checks** | Every one fails closed |
| **28 sectors** | 264 names resolving to them, 4 deliberately refused as ambiguous |
| **9 role agents** | One per step, each loading its own craft rules and the sector entry before it starts. The evaluator has **no write access**, because a reviewer that can fix cannot be trusted to report |
| **2 hooks** | One loads the rules every session; one refuses a Figma write that has not earned it |

## The checks

Listed so the number can be recounted rather than trusted.

| Script | | What each one is |
|:--|:--:|:--|
| `trace-check` | 7 | glossary closure, rule enforcement, use case trace, entity terms, AS-IS present, assumption radius, exclusions asked |
| `domain-check` | 5 | all eight categories answered, sourced, verified, agent claims surfaced, affects |
| `industry-check` | 7 | sector known, stakeholders, constraints, conventions, forbidden, style excluded, evidence |
| `schema-check` | 6 | sample size, nine foundations, type roles, provenance, shipped not concept, tradition named |
| `verify-html` | 7 | viewport tagged, overflow, tall-screen pair, viewport coverage, direction, data ownership, width media |
| `contrast-check` | 4 | body contrast, large-text contrast, unresolved background, exemption still needed |
| `coverage-check` | 5 | use case covered, screen traced, use case exists, flow reachable, target buildable |
| `parity-check` | 2 | nominal and structural, where two or more viewports are declared |
| `copy-check` | 5 | no placeholder, glossary terms, copy rules, error next step, length realism |
| `flow-check` | 7 | dead end, dangling href, dangling target, unreachable, orphan prototype, nav target, flow declared |
| `arch-check` | 7 | feasibility verdict, risk priced, NFR complete, constraint becomes NFR, ADR complete, technology has an ADR, mobile signing custody |
| `proposal-check` | 6 | slot addressed, axis named, provenance, a real choice, nothing the sector forbids, choice recorded |
| `estimate-check` | 6 | preconditions, three points, tier spread, risk reflected, headcount, effort log |
| `impl-check` | 8 | test trace, CI pipeline, branch protection, branch age, environments, secrets, NFR measured, stack declared |
| `code-tokens-check` | 4 | raw colour, raw spacing, raw radius, linear easing |
| `dev-check` | 7 | API contract, error branch, state strategy, accessibility in code, performance budget, server guard, retry safety |
| `qa-check` | 7 | pyramid shape, use case covered end to end, rule asserted, regression traced, severity defined, test data, release gate |
| `build-diff` | 5 | frame paired, control height, radius, hue budget, text position |
| `geometry-diff` | 1 | Figma position against the HTML reference |
| | **106** | |

**Every one has been seen to fail on the defect it was written for.** That is the only reason to trust a
number, and it is why each is recorded next to the failure that earned it in
[`CHANGELOG.md`](CHANGELOG.md).

Two more check the tooling rather than a design. `validate-packages.mjs` asserts every declared file
exists, every shipped file is owned, and no markdown link crosses a package boundary. `mock-figma.mjs`
runs the three in-Figma scripts outside Figma and self-tests them, so 800 lines that could otherwise only
be verified inside a paid session can be verified in a terminal.

## It knows the field

An education product built like an admin dashboard passes every other check here. Tokens reference
correctly, geometry measures clean, every use case has a screen. A teacher spots it instantly.

For each of 28 sectors the base records:

- **every stakeholder** — what they want, what they fear, whether they can veto, and what that means for
  the design
- **the colour convention with its reason.** 22 hues across 14 sectors are already spent: red means
  overdrawn in banking and clinical emergency in a hospital; red, amber and green on a factory floor are
  inherited from plant signage, so spending them decoratively is a safety defect rather than a taste
  disagreement; blue on a food menu reads as spoilage
- **the tradition it settled on**, and the ones that misread in it
- **density per audience** — education runs three in one product, because a learner, a teacher and a
  parent are not one audience
- **what it treats as a defect** regardless of what the brief asked for

**Departing from a convention is allowed. Departing silently is not.** Each of five axes is followed with
a note or departed from with a reason, because an undecided axis does not stay undecided: it gets filled
with whatever came out by default, and afterwards nobody can tell a decision was never made.

**A sector the base does not cover fails the gate.** Passing an unknown one would give the least
supported work the quietest gate. Four terms name two sectors each and the check refuses to guess at any
of them, because their conventions are opposites.

```bash
# The base is queryable. This finds it wherever pica was installed from.
IC=$(find ~/.claude/plugins -maxdepth 8 -path "*analyst/scripts/industry-check.mjs" | sort -V | tail -1)

node "$IC" --list                 # the 28, and the 4 terms it refuses to guess at
node "$IC" --show education       # everything it knows about one
node "$IC" --audit                # the base against itself
```

## What is enforced, and how

Three layers, with honest reliability. This is built on the assumption that model judgement is
unreliable.

| Layer | Fires | Bypassable |
|:--|:--|:--|
| `SessionStart` hook | Always, including after compaction | **No** |
| Commands | When you type them, deterministic after that | Yes, by not typing them |
| `PreToolUse` hook | On every matching tool call | **No** |

Four things are held by a hook rather than by instruction, because instructions decay: no Figma write for
a package whose HTML is not approved, none while a report-mode review is running, none after delivery,
and none before the Figma API rules are loaded.

Approvals live in `.pica/state.json`. A hook is a script; it cannot know you said yes out loud.

## Requirements

| Tier | Needs | Gives you |
|:--|:--|:--|
| **Core** | `bash` and `python3` | Everything: analysis, design, estimate, architecture, the build, the tests, the release. All of it except Figma |
| **Measured** | `playwright` | The capture harness every measured check reads |
| **Figma** | the Figma MCP server, plus a Dev or Full seat | Phase 7f only |
| **Enhanced** | [superpowers](https://github.com/obra/superpowers) | Stronger intake and planning, plus the agent panel |

**The core tier works with nothing else installed.** If you never touch Figma, the whole HTML flow runs
and ends complete, not truncated.

## The rules

Twenty-three modules, loaded per step rather than all at once. **173 definition-of-done items
across them**, each item either decided by a check or explicitly left to a human.

<details>
<summary><b>All twenty-three, and what each covers</b></summary>

| Module | Package | Covers |
|:--|:--|:--|
| `research.md` | research | Intake packet, contract, exclusions, audit breadth, token provenance, client copy rules, data ownership |
| `design-vocabulary.md` | research | The nine foundations, ten named styles with measurable signatures, style assertions, where to look |
| `business-analysis.md` | analyst | Elicitation, AS-IS and TO-BE, the delta, business rules, use cases, the domain model, the PRD |
| `domain-knowledge.md` | analyst | Where domain constraints live in order of authority, Event Storming without a workshop |
| `industry-knowledge.md` | analyst | The 28-sector base and how to use it, the five convention axes, the waiver registers |
| `architecture.md` | architect | Feasibility as three lists, C4 stopping at component, ADRs with consequences, NFRs as numbers |
| `html-prototype.md` | html | Layout, the review page, options versus the interactive flow, the tall-screen pair, state matrices |
| `html-gates.md` | html | The measured gate, the flow gate, viewport parity, HTML-only coverage, definition of done |
| `native-mobile.md` | html | Safe areas per device class, touch targets, the release asymmetry between the two stores |
| `content.md` | content | Glossary-bound terms, every state written, length realism, mock data provenance |
| `evaluation.md` | designqa | Heuristic evaluation fanned out, the cognitive walkthrough, severity, contrast from tokens |
| `estimation.md` | estimate | Three-point estimation, tiers that change the numbers, headcount as arithmetic, the effort record |
| `engineering.md` | developer | The API contract as a seam, the four places state lives, failure shapes, accessibility in code, security at the boundary |
| `testing.md` | qa | The pyramid and who owns each layer, one test per use case, exploratory charters, severity, test data |
| `implementation.md` | impl | Trunk-based development, the pipeline, environments, secrets, the build-versus-design comparison |
| `reference-discipline.md` | core | The reference is read-only, identity channels, content parity, fixing at the definition |
| `proposals.md` | core | The seven proposal slots, why the slots are universal and their content derived, and the register |
| `review-discipline.md` | core | Report before fix, audit integrity, failing closed, verifying a check by breaking it |
| `figma-elements.md` | figma | Token layers, geometry binding, component tiers, naming by role, merge mechanics |
| `figma-screens.md` | figma | Frames, states, alignment, chrome pinning, CSS to auto-layout, the API traps |
| `figma-gates.md` | figma | The audit checklist, appearance baselines, diff tolerances, the deviations register |
| `figma-rebuild.md` | figma | Rebuilding an existing file: the source as arbiter, positional parity, lens baselines |
| `figma-mcp.md` | figma | Rate limits and call budget, whole-file reads, write discipline |

</details>

## Philosophy

- **Measure, do not eyeball** — the defects that matter most survive a visual review
- **The cheap medium first** — nothing expensive gets built before the cheap one is approved
- **Report before you fix** — finding and fixing are separate passes; an audit that writes is not an audit
- **A check must fail closed** — if it cannot do its job it exits non-zero, never a clean run over nothing
- **A green check is not evidence the check works** — make it fail on purpose before you trust it
- **A rule with no register is a preference** — if something must be written down it needs a named key in
  state and something that reads it, or a deliberate exception looks exactly like an oversight
- **A false positive is worse than a miss** — a check that cries wolf gets switched off, and then it
  catches nothing at all
- **Measurement and review find different defects** — neither substitutes for the other
- **Approval is a decision, not an inference** — silence, "looks ready" and moving on are not approval
- **Every rule names the failure that earned it** — a rule without one gets deleted by the next person
- **The last step is a person looking** — measurement narrows what a human has to check; it never
  replaces the checking

## What this repo contains

The **method**: rules, commands, hooks, scripts, the sector base, the checks. Nothing else, by design.

```
packages/
  core/        intake, the contract, the state schema, every gate, the hooks
  research/    the source audit, the nine foundations, token provenance
  analyst/     elicitation, domain and industry knowledge, use cases, the PRD
  architect/   feasibility, C4, decision records, non-functional requirements
  html/        the kit, the screens, and the measured gate
  content/     the words
  designqa/    independent evaluation, and the build against the design
  estimate/    three-point effort, the work order, the effort record
  developer/   the code: the contract as a seam, where state lives, failure shapes
  qa/          the tests: the shape of the suite, and the release gate
  impl/        the repository: pipeline, branches, environments, secrets
  figma/       the port, the rebuild, the geometry diff
scripts/       validate-packages.mjs — this repository checking itself
docs/          design records and implementation plans

Each package carries its own commands/, rules/, scripts/ and agents/, and its own
manifest declaring what it requires, produces, checks and considers done.
```

## Community

- **Issues and questions**: <https://github.com/vqdungwork/pica/issues>
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) — every rule beside the failure that earned it
- **Design notes**: [`docs/specs/`](docs/specs) and [`docs/plans/`](docs/plans)

## Contributing

Rules earn their place by naming a failure. A pull request adding one without saying what went wrong will
be asked for the failure first. New checks must fail closed, and must be demonstrated failing on the
defect they were written for.

## Attribution

Built for [Claude Code](https://claude.com/claude-code). Optional integration with
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, MIT licensed.

## Licence

MIT — see [LICENSE](LICENSE).
