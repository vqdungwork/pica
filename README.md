<div align="center">

<img alt="pica. From the brief to the shipped product. Analyse, design in HTML, evaluate, estimate, architect, build and release. Every step verified by measurement, never by opinion." src="assets/banner.svg" width="100%">

**Describe the product you want. Get a design you can click, then a product you can ship.**
<br>An expert team for Claude Code, with the checking built in.

[![version](https://img.shields.io/badge/version-0.9.5-1f2328)](https://github.com/vqdungwork/pica/releases)
[![checks](https://img.shields.io/badge/checks-116%20fail--closed-1f2328)](#what-gets-checked)
[![agents](https://img.shields.io/badge/specialists-8-1f2328)](#who-does-the-work)
[![sectors](https://img.shields.io/badge/industries-28-1f2328)](#it-already-knows-your-industry)
[![licence](https://img.shields.io/badge/licence-MIT-1f2328)](LICENSE)

</div>

---

## Start in two lines

```bash
/plugin marketplace add vqdungwork/pica
/plugin install pica@pica
```

Restart Claude Code, then describe what you want in your own words:

> *A dispensing queue for our four pharmacies. Staff lose an hour a day finding where a prescription
> is. Assembly and the final check have to be two different people.*

That is enough to start. It asks you a handful of questions on the way, and it stops once for your
approval before anything expensive gets built.

## What you get

| You want | You say | You get back |
|:--|:--|:--|
| **To see it first** | *show me a review page* | a design you can click, at every screen size and every state, plus the written requirements and a list of everything it had to assume |
| **A design file** | *and port it to Figma* | the above, plus a Figma file checked frame by frame against the design |
| **A working product** | *build it* | the above, plus front end, back end, tests and a release pipeline |

All three are finished pieces of work, not truncated ones. Figma is optional and you can skip it.

## What pica does for you

| It | What that means |
|:--|:--|
| **Understands the work** | Turns your paragraph into requirements your team recognises: what happens today, what changes, the rules, and a document a non-technical reader can follow |
| **Knows your industry** | 28 of them. Who can say no, which colours already mean something, what the field treats as a mistake no matter what you asked for |
| **Designs it so you can click it** | Real screens at every size and every state, in a day rather than a fortnight, cheap to change while your mind is still changing |
| **Checks it before you see it** | 116 automated checks: contrast, coverage, the words, the wiring. Nothing reaches you having only been looked at |
| **Has it reviewed by others** | Three to five independent reviewers, none of them seeing each other's findings |
| **Prices it, if you want** | Whoever does the work prices it, never one person guessing at four trades. Optional: for a client, for yourself, or skipped |
| **Builds and tests it** | Working code, a test for everything the product promises, and a pipeline that will not release without them |
| **Proves it back to you** | The finished product measured against the design you approved, by someone who did not build it |

---

## It already knows your industry

An education product built like a bank's admin panel passes every technical check. A teacher spots it in
a second. pica carries what each field already settled, so you are not paying to rediscover it.

<div align="center">

**Banking and payments**&nbsp;&nbsp;·&nbsp;&nbsp;**Insurance**&nbsp;&nbsp;·&nbsp;&nbsp;**Healthcare**&nbsp;&nbsp;·&nbsp;&nbsp;**Pharmacy**&nbsp;&nbsp;·&nbsp;&nbsp;**Education**&nbsp;&nbsp;·&nbsp;&nbsp;**Legal**&nbsp;&nbsp;·&nbsp;&nbsp;**Retail and e-commerce**&nbsp;&nbsp;·&nbsp;&nbsp;**Food and hospitality**&nbsp;&nbsp;·&nbsp;&nbsp;**Logistics and delivery**&nbsp;&nbsp;·&nbsp;&nbsp;**Property and rental**&nbsp;&nbsp;·&nbsp;&nbsp;**Travel and mobility**&nbsp;&nbsp;·&nbsp;&nbsp;**Media and publishing**&nbsp;&nbsp;·&nbsp;&nbsp;**Manufacturing**&nbsp;&nbsp;·&nbsp;&nbsp;**Energy and utilities**&nbsp;&nbsp;·&nbsp;&nbsp;**Government**&nbsp;&nbsp;·&nbsp;&nbsp;**Charity and non-profit**&nbsp;&nbsp;·&nbsp;&nbsp;**HR and recruitment**&nbsp;&nbsp;·&nbsp;&nbsp;**Agriculture**&nbsp;&nbsp;·&nbsp;&nbsp;**Construction**&nbsp;&nbsp;·&nbsp;&nbsp;**Fitness and wellness**&nbsp;&nbsp;·&nbsp;&nbsp;**Telecoms**&nbsp;&nbsp;·&nbsp;&nbsp;**Agencies and consultancies**&nbsp;&nbsp;·&nbsp;&nbsp;**Developer tools**&nbsp;&nbsp;·&nbsp;&nbsp;**Games**&nbsp;&nbsp;·&nbsp;&nbsp;**Automotive**&nbsp;&nbsp;·&nbsp;&nbsp;**Events and ticketing**&nbsp;&nbsp;·&nbsp;&nbsp;**Beauty and salon**&nbsp;&nbsp;·&nbsp;&nbsp;**Cybersecurity**

</div>

**For each one it knows** who can veto, which colours are already taken and why, how dense the screens
should be, how the product should speak, and what the field treats as a defect regardless of the brief.

**This is a floor, not a template.** The researcher still measures real products for *your* project, every
time, and the design is argued from what it found. What the industry knowledge does is stop you paying to
rediscover that amber means a dispensing warning, and stop you shipping something a pharmacist would
reject on sight. Ten products in the same industry should share the conventions that field already
settled and share nothing else, which is why the direction comes from measurement and only the
constraints come from here.

Red means overdrawn in a bank and clinical emergency in a hospital. Red, amber and green on a factory
floor are inherited from site signage, so using them decoratively is a safety problem rather than a taste
disagreement. Blue on a food menu reads as spoilage.

**If your field is not one of the 28, pica says so and stops** rather than guessing. Four words that
could mean two different industries are refused for the same reason.

---

## The flow

Nine steps. **One stops and waits for you**, and it is the one that matters. Or say *run the whole
thing* and it does all nine, pausing only there.

| Step | Who | What happens | Command |
|:--|:--|:--|:--|
| **0 · Intake** | you | Your brief, kept word for word. What is in scope, what is out, which screen sizes it has to work on | `/pica` |
| **1 · Discovery** | 3 to 5 researchers, one per group of users | Who uses it and **what actually hurts**, counted rather than assumed. Who can stop the project, and what they are afraid of. What your competitors charge | `/pica-discover` |
| **2 · Research** | 3 to 5 researchers, then an architect | Real products in your field, measured rather than admired. Then someone says what **cannot** be built, while saying it is still free | `/pica-architect` |
| **3 · Is it worth it** | a modeller, then **you** | What it costs to build, what it costs to **run for two years**, and what it plausibly earns. **The last point where stopping is cheap** | `/pica-model` |
| **4 · Analysis** | analyst | What happens today, what changes, the rules your business runs on, and a requirements document your team can actually read | `/pica-analyse` |
| **5 · Design** | designer, writer, 3 to 5 reviewers | Every screen, every size, every state, and the words on them. **Measured, reviewed and looked at** before it reaches you | `/pica-wp` |
| **6 · You approve** | **you** | The business flow **and** the design. Scope and deadline settled. **Nothing further runs until they are** | none |
| **7 · Estimate** *(optional)* | each specialist, its own line | Whoever does the work prices it. For a client, for yourself, or skipped with a reason | `/pica-estimate` |
| **8 · Architecture** | architect | How it is put together, every technology choice recorded with its downside, every performance promise written as a number | `/pica-architect` |
| **9 · Build** | **developer**, tester, reviewer | **The code gets written.** Then tested. Then a release pipeline. Then the finished thing is measured back against the design you approved, **never by whoever built it** | `/pica-develop` |
| **any time** | you | **One command, one table.** Every check that applies to where you are, what passed, what failed, and what abstained with the reason. `--evidence` lists every assertion, which is what a review quotes | `/pica-verify` |
| **10 · Handover** | analyst | Proved against your **original brief**, not against a plan that drifted. Then the real hours are recorded so the next estimate is better | `/pica-close` |

Figma is optional and sits beside step 7, never in front of it. Where Figma and the design disagree,
Figma is wrong.

## Something to read first

`examples/approvals/` is a complete pica project: a payment-approval surface for a retail bank,
small on purpose and complete on purpose. **Every check either passes on it or says why it
abstains.**

```bash
node <pica>/packages/core/scripts/pica-verify.mjs .pica/state.json --evidence
# 27 check(s): 24 passed, 0 failed, 3 abstained.  154 assertion(s) verified.
```

It is also the mutation suite's fixture, which is what keeps it honest: if a field in it is
wrong, the suite stops catching something, and the suite runs on every change.

## Who does the work

Ten specialists. Each has a trade of its own, each reads up on your industry before it starts work,
and **each prices its own work** when you ask for an estimate.

| Specialist | Does | Reads about your industry first |
|:--|:--|:--|
| **discoverer** | interviews one group of users and counts what hurts, finds who can stop the project | which people your field always has, and what each of them is afraid of |
| **researcher** | measures real products in your field, nine things about each | which products are worth copying here, and which will mislead you |
| **analyst** | what happens today, what changes, the rules, the requirements document | who can say no, and what your field requires whatever your brief says |
| **modeller** | what it costs to build, what it costs to run for two years, what it earns | what your field charges, and how it packages what it sells |
| **architect** | what can and cannot be built, how it fits together, every promise as a number | the obligations your field carries that nobody thought to mention |
| **designer** | every screen, every state, every size | which colours already mean something, how dense, what the field's products look like |
| **writer** | the words on every screen, including the ones nobody writes | how your field speaks, and the phrasings it treats as a mistake |
| **reviewer** | independent review, and **it cannot change anything** | what your field already knows counts as a defect |
| **developer** | the code, and what happens when things go wrong | the conventions your field expects in a working product |
| **tester** | the tests, and whether the product is fit to release | what your field considers a blocker rather than a niggle |

**The reviewer cannot change anything.** A reviewer who can fix things destroys the record of what was
wrong, and quietly makes design decisions that were never theirs to make.

---

<details>
<summary><b>All 116 checks, and what is enforced by a hook</b></summary>


<br>Listed so the number can be recounted rather than trusted.

| Script | | What each one is |
|:--|:--:|:--|
| `trace-check` | 7 | no declared wrong term used, rule enforcement, use case trace, entity terms, AS-IS present, assumption radius, exclusions asked |
| `domain-check` | 5 | all eight categories answered, sourced, verified, agent claims surfaced, affects |
| `industry-check` | 7 | sector known, stakeholders, constraints, conventions, forbidden, style excluded, evidence |
| `schema-check` | 6 | sample size, nine foundations, type roles, provenance, shipped not concept, tradition named |
| `verify-html` | 7 | viewport tagged, overflow, tall-screen pair, viewport coverage, direction, data ownership, width media |
| `contrast-check` | 4 |
| `shell-check` | 6 | says what it is not, flow leads, three zoom controls, tabs load in place, group order, frame inset |
| `spacing-check` | 4 | edge inset, insets agree across screens, gaps on the scale, edge inset on the scale | body contrast, large-text contrast, unresolved background, exemption still needed |
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
| | **116** | |

Every one has been seen to fail on the defect it was written for, and you can watch it happen:

```bash
node scripts/mutate.mjs <your-project-dir>
```

It reintroduces the defect each check was written for and reports whether that check fires, whether
anything else fires with it, and whether your project was clean before it started. **It refuses to run
over a failing baseline**, because a check firing on an already-broken project proves nothing.

Each check is also recorded next to the failure that earned it in [`CHANGELOG.md`](CHANGELOG.md).

</details>

<details>
<summary><b>What is enforced by a hook rather than by a promise</b></summary>

<br>Built on the assumption that model judgement is unreliable.

| Layer | Fires | Bypassable |
|:--|:--|:--|
| `SessionStart` hook | Always, including after compaction | **No** |
| Commands | When you type them, deterministic after that | Yes, by not typing them |
| `PreToolUse` hook | On every matching tool call | **No** |

Four things are held by a hook because instructions decay: no Figma write for a package whose design is
not approved, none while a review is running, none after delivery, and none before the Figma rules are
loaded. Approvals live on disk, because a hook is a script and cannot know you said yes out loud.


<br>


<br>Built on the assumption that model judgement is unreliable.

| Layer | Fires | Bypassable |
|:--|:--|:--|
| `SessionStart` hook | Always, including after compaction | **No** |
| Commands | When you type them, deterministic after that | Yes, by not typing them |
| `PreToolUse` hook | On every matching tool call | **No** |

Four things are held by a hook because instructions decay: no Figma write for a package whose design is
not approved, none while a review is running, none after delivery, and none before the Figma rules are
loaded. Approvals live on disk, because a hook is a script and cannot know you said yes out loud.

</details>

---

## What ships

| Count | What each one is |
|:--|:--|
| **13 plugins** | 12 packages plus a bundle, each declaring what it requires, produces, checks and considers done |
| **16 commands** | Deterministic once typed |
| **23 rule modules** | Loaded per step, never all at once. 173 definition-of-done items across them |
| **21 check scripts** | Plus the capture harness, the status tool, and a harness that runs the in-Figma scripts outside Figma |
| **116 checks** | Every one fails closed |
| **28 sectors** | 264 names resolving to them, 4 deliberately refused as ambiguous |
| **8 specialists** | Each loads its own craft rules and the sector entry before it starts, and estimates its own line. The evaluator has **no write access**, because a reviewer that can fix cannot be trusted to report |
| **2 hooks** | One loads the rules every session; one refuses a Figma write that has not earned it |

<details>
<summary><b>Install only the parts you need</b></summary>

<br>Every package brings `pica-core` with it, so any single install has the state schema and the gates.

| Install | You get | Because |
|:--|:--:|:--|
| `pica-analyst` · `pica-architect` · `pica-estimate` · `pica-research` | 2 | they need the state schema and nothing else |
| `pica-html` | 3 | it consumes `tokens/tokens.css`, which research produces |
| `pica-qa` | 3 | a test asserts a business rule, and the rules live in the analyst's state |
| `pica-content` · `pica-designqa` · `pica-figma` | 4 | all three read the capture artefact html produces |
| `pica-developer` | 5 | it builds an approved HTML design against the analyst's contract |
| `pica-impl` | 5 | the build-versus-design comparison belongs to Design QA, not the builder |
| `pica` | 13 | the bundle |
| pica is for | pica is not for |
|:--|:--|
| Applications: web, mobile, desktop | Illustration, images, photography |
| Websites and landing pages | Video, motion, animation |
| Dashboards, admin tools, internal products | Logos, brand marks, identity work |
| Design systems and component libraries | Presentation decks and documents |
| The PRD, use cases and domain model behind them | Diagrams, charts, terminal output |
| The code, the tests, and whether the build still matches the design | Bespoke infrastructure and cloud operations |

</details>

<details>
<summary><b>Requirements</b></summary>

| Tier | Needs | Gives you |
|:--|:--|:--|
| **Core** | `bash` and `python3` | Everything: analysis, design, estimate, architecture, the build, the tests, the release. All of it except Figma |
| **Measured** | `playwright` | The capture harness every measured check reads |
| **Figma** | the Figma MCP server, plus a Dev or Full seat | Phase 7f only |
| **Enhanced** | [superpowers](https://github.com/obra/superpowers) | Stronger intake and planning, plus the agent panel |

**The core tier works with nothing else installed.** If you never touch Figma, the whole flow runs and
ends complete, not truncated.

</details>

<details>
<summary><b>The 23 rule modules</b></summary>

<br>Loaded per step rather than all at once. 173 definition of done items across them, each either
decided by a check or explicitly left to a human.

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

<details>
<summary><b>Where the line is, and what is in this repository</b></summary>

| pica is for | pica is not for |
|:--|:--|
| Applications: web, mobile, desktop | Illustration, images, photography |
| Websites and landing pages | Video, motion, animation |
| Dashboards, admin tools, internal products | Logos, brand marks, identity work |
| Design systems and component libraries | Presentation decks and documents |
| The PRD, use cases and domain model behind them | Diagrams, charts, terminal output |
| The code, the tests, and whether the build still matches the design | Bespoke infrastructure and cloud operations |

**pica designs things people navigate and someone has to build.** If nothing will be implemented from
the output, it will get in your way. Nothing in it assumes a client, a stack, a brand or a team.

```
packages/
  core/        intake, the contract, the state schema, every gate, the hooks, the proposals
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
```

</details>

---

## Upgrading

Use `install`, not `update`.

```bash
/plugin install pica@pica
```

`install` brings packages that did not exist in your version. `update` only refreshes what you already
have, and pica then reports the missing checks as `SKIPPED. NOT a pass`, which is honest and not what
you wanted.

## Philosophy

- **Measure, do not eyeball.** The defects that matter most survive a visual review
- **The cheap medium first.** Nothing expensive gets built before the cheap one is approved
- **Report before you fix.** Finding and fixing are separate passes. An audit that writes is not an audit
- **A check must fail closed.** If it cannot do its job it exits non-zero, never a clean run over nothing
- **A green check is not evidence the check works.** Make it fail on purpose before you trust it
- **A rule with no register is a preference.** If something must be written down it needs a named key in
- **A false positive is worse than a miss.** A check that cries wolf gets switched off, and then it
- **Measurement and review find different defects.** Neither substitutes for the other
- **Approval is a decision, not an inference.** Silence, "looks ready" and moving on are not approval
- **Every rule names the failure that earned it.** A rule without one gets deleted by the next person
- **The last step is a person looking.** Measurement narrows what a human has to check. It never
- **Issues and questions**: <https://github.com/vqdungwork/pica/issues>
- **Changelog**: [CHANGELOG.md](CHANGELOG.md), every rule beside the failure that earned it
- **Design notes**: [`docs/specs/`](docs/specs) and [`docs/plans/`](docs/plans)

---

**Issues and questions**: <https://github.com/vqdungwork/pica/issues>
&nbsp;&nbsp;**Changelog**: [CHANGELOG.md](CHANGELOG.md), every rule beside the failure that earned it

**Contributing.** Rules earn their place by naming a failure. A pull request adding one without saying
what went wrong will be asked for the failure first. New checks must fail closed, and must be
demonstrated failing on the defect they were written for.

Built for [Claude Code](https://claude.com/claude-code). Optional integration with
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, MIT licensed. MIT, see
[LICENSE](LICENSE).
