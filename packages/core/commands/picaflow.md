---
description: Run the whole chain from a thin brief to a reviewable, measured, clickable review.html without stopping
argument-hint: "[the brief, or a path to it] [--resume]"
---

# picaflow: brief in, review.html out

Runs phases 0 to 3 end to end and stops at the first gate a human can actually use: the client opening
`review.html`.

**This command does not stop to ask questions.** That is not a convenience, it is the whole design.
Anything the sources cannot settle becomes a labelled assumption and the chain continues, because
reacting to a built thing is far cheaper than specifying one from nothing. Ask a client what their
business flow is and you get hesitation; show them a wrong one that clicks and you get the correction
in three seconds.

**The demo is the question. It is only packaged as an answer.**

### It collapses three gates into one, deliberately

`/pica` carries GATE 1 (contract, exclusions, options, tiers), GATE 2 (audit, direction, tokens) and
GATE 3 (the kit), and each says **stop and wait for approval**. This command runs those steps and
**stops at none of them.**

That is not the gates being ignored. It is the same decision made once, later, against something the
human can actually judge:

| | Gated separately | Collapsed here |
|---|---|---|
| What the human sees | A contract, then a token file, then a storybook | A working product with its guesses marked |
| What they can judge | Whether the words sound right | Whether it does their job |
| Cost of being wrong | Three stops, three days, each on an artefact nobody enjoys reviewing | One correction against something they clicked |

**What makes the collapse safe is the assumptions register, and nothing else.** Every decision that
would have been gated is recorded with a confidence and a blast radius, surfaced beside the screen it
produced, and correctable in one round. Remove that and this command is a machine for producing
confident wrong answers at speed.

**Run `/pica` on its own and its gates apply normally.** Use it when the scope is contested, when the
client has been burned before, or when a wrong direction costs more than a review round.

---

## Before starting

Load, in order: `research.md`, `business-analysis.md`, `domain-knowledge.md`, `design-vocabulary.md`,
`industry-knowledge.md`, `html-prototype.md`, `html-gates.md`, `evaluation.md`, `content.md`.

**`pica-core` cannot depend on the packages this command drives**, because they all depend on core and a
cycle is not installable. So this command **checks before it calls**: for every script path below, confirm
the file exists, and when it does not, say which package is missing and run what remains.

A missing package is a **stated limitation**, never a silently skipped step. Reporting a chain as
complete when four of its checks never ran is the exact failure this project exists to prevent.

| Missing | What stops working |
|---|---|
| `pica-analyst` | No PRD, no glossary, no use cases, and no sector knowledge. The client has nothing to agree to |
| `pica-research` | Direction has no measured precedent behind it |
| `pica-html` | Nothing is built and nothing is measured |
| `pica-content` | Screens carry placeholder text |
| `pica-designqa` | No independent evaluation before the client sees it |

`$ARGUMENTS` is the brief, or a path to it. **Write it to `docs/brief.md` verbatim the moment it
arrives**, before you have had a chance to tidy it.

With `--resume`, read `state.chain.completed` and continue from the next step. Do not re-run what
already wrote its artefact.

---

## The three rules that make this runnable unattended

**1. Never pause.** Cannot derive something? Record an assumption and continue. The default behaviour
of a model facing a gap is to stop and ask, and that behaviour makes this command pointless.

**2. Every step writes to disk before the next begins**, and appends its id to `state.chain.completed`.
The chain runs on the filesystem, not on conversation memory, so a lost context loses no work.

**3. Every assumption carries a blast radius.**

```json
{ "id": "A1", "about": "...", "assumed": "...", "why": "...",
  "confidence": "low|medium|high",
  "produced": ["2.3", "2.7"], "affects": ["approval screen", "UC-04"] }
```

Without `produced` and `affects`, correcting one assumption rebuilds everything, and nobody survives
review round three.

---

## The chain

| Step | Does | Writes |
|---|---|---|
| **0.4** | Note what was supplied: analytics, support logs, live product access | `state.inputs` |
| **1.1** | Split the brief: stated versus open | `state.assumptions` seeded |
| **1.2** | Problem, whose it is, the number that would move | `state.problem` |
| **1.3** | Narrow the field to a name with real products behind it | `state.field`, top level, not inside `direction` |
| **1.4–1.5** | Analytics and support logs, if supplied, into ranked pain | `docs/research/` |
| **1.5b** | Journey map: stages, goals, pain, opportunity | `docs/research/journey.md` |
| **1.6–1.7** | **Fan out**: one agent per shipped product, nine foundations each | `docs/research/measured.json` **and** `state.measured`, the same table. The file is read by a human, the state key by `schema-check` and `industry-check` |
| **1.7b** | Verify the measurement table: `node ${CLAUDE_PLUGIN_ROOT}/../research/scripts/schema-check.mjs .pica/state.json` | |
| **1.8** | Feasibility: **can this be built at all**. The data-source pass waits for 3.0b | `state.risks` |
| **2.1** | Stakeholder register: who decides, who vetoes | `state.stakeholders` |
| **2.1b** | **Domain knowledge**: the sector's standard first, then domain events in business language | `state.domainConstraints` |
| **2.1c** | **Industry knowledge**: resolve the sector, then decide all five convention axes against it | `state.industry` |
| **2.2–2.11** | Glossary, AS-IS, TO-BE, delta, rules, flows, use cases, domain model, PRD, exclusions | `state.*`, `docs/contract.md` |
| **3.0a–c** | IA, screen inventory traced to use cases, state matrix | `state.screens` |
| **3.0b+** | **Data source per screen**, now that the inventory exists | `state.assumptions` |
| **3.1–3.2** | Direction named against a tradition, tokens in three tiers | `state.direction`, `tokens/` |
| **3.3–3.6** | Kit, then screens at every viewport in every state, then the prototype | `html/` |
| **3.7** | Measure | see below |
| **3.8** | **Fan out**: 3 to 5 `pica-evaluator` agents, one lens each | `docs/reviews/` |
| **3.9** | Cognitive walkthrough, one per use case | `docs/reviews/` |
| **3.11** | Assemble `review.html`, flow leading, assumptions in place | `html/review.html` |

### Where to fan out, and how

Two places, both measurement, never judgement:

- **1.7** one agent per named product, all spawned in one message, same return schema
- **3.8** three to five `pica-evaluator` agents, **each with a different lens**, none seeing another's
  findings

The split is decided here and written down first. Reject any unit with no provenance rather than
merging it.

### Step 3.7, the measured gate

The check-before-calling contract stated above is written into the block itself, rather than left as
prose to remember while running it. `run` says which package is missing instead of failing on a path,
and **prints a line for every check that did not run**, because a chain reported as complete with four
of its checks silently absent is the exact failure this project exists to prevent.

```bash
P=${CLAUDE_PLUGIN_ROOT}/..
run() { if [ -f "$1" ]; then node "$@"; else
  echo "SKIPPED $(basename "$1"): package $(basename "$(dirname "$(dirname "$1")")") is not installed. NOT a pass."; fi; }

run $P/html/scripts/capture-html-reference.mjs --dir html --out .audit
run $P/html/scripts/verify-html.mjs      .audit/html-reference.json .pica/state.json
run $P/html/scripts/contrast-check.mjs   .audit/html-reference.json .pica/state.json
run $P/html/scripts/coverage-check.mjs   .audit/html-reference.json .pica/state.json
run $P/html/scripts/parity-check.mjs     .audit/html-reference.json .pica/state.json
run $P/html/scripts/flow-check.mjs       --dir html --state .pica/state.json
run $P/content/scripts/copy-check.mjs    .audit/html-reference.json .pica/state.json
run $P/analyst/scripts/trace-check.mjs    .pica/state.json
run $P/analyst/scripts/domain-check.mjs   .pica/state.json
run $P/analyst/scripts/industry-check.mjs .pica/state.json
run $P/research/scripts/schema-check.mjs  .pica/state.json
```

All zero, or fix and re-run. **A failing check is not an assumption**: it is a defect, and continuing
past it produces a demo that breaks in front of the client.

---

## Stop here, and say what a human still has to do

The chain **cannot** perform step 3.10: render every screen, look at it, and click the main flow. Ten
green checks once coexisted with four screenshot-obvious defects and a home row that opened another
role's screen.

So the closing report says, in this order:

1. **The path to `review.html`**
2. **The low-confidence assumptions**, most consequential first. The AS-IS and the delta lead, because
   those are the two a client judges correctly in three seconds
3. **What was not supplied** at 0.4, and what that cost: no analytics means the AS-IS rests on assertion
4. **Explicitly: no human has looked at these screens yet.** Do not report the package complete

Then stop. `/pica-wp` continues per package; `/pica-evaluate` re-runs evaluation; `/pica-estimate` runs
once the client has frozen scope and deadline.

---

## Definition of done

- [ ] Ran end to end without asking a question
- [ ] Every step wrote its artefact and appended to `state.chain.completed`
- [ ] Every gap became an assumption with a confidence and a blast radius
- [ ] Every measured check returns zero
- [ ] `review.html` exists, flow tab leading, assumptions surfaced beside the screens that produced them
- [ ] The closing report names what a human still has to do
- [ ] **Nothing was reported complete that a human has not looked at**
