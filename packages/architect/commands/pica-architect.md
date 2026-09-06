---
description: Feasibility before anything is promised, then C4 diagrams, ADRs and NFRs stated as numbers
argument-hint: "[--feasibility for step 1.8, default runs phase 6]"
---

# pica-architect

`--feasibility` runs step 1.8, before the contract.
`--data-check` runs the data-source pass at 3.0b, once the screen inventory exists.
Without a flag, runs 6.1 and 6.4, after the contract.

Load `${CLAUDE_PLUGIN_ROOT}/rules/architecture.md` before anything else.

---

## `--feasibility`, step 1.8

Runs before design, before the estimate, before anything is shown to a client. **This is the only step
whose job is to say no while saying no is still free.**

Read: the brief, the sources labelled `use`, the client's existing systems, `domainConstraints` if the
Analyst has run.

Produce three lists:

| List | Content |
|---|---|
| **Possible** | And roughly at what cost |
| **Not possible** | With a reason a non-technical reader understands. The Account has to say it out loud |
| **Risky** | These feed the pessimistic column at 5.1. A risk that moves no number was an observation |

### The data-source question runs later, and that is not a compromise

The obvious thing to ask here is *"where does every screen's data come from"*. **It cannot be asked
here: the screen inventory does not exist until 3.0b.** Asking it now would mean inventing screens to
answer it, which is analysis pretending to be design.

So feasibility splits into two passes against two different artefacts:

| | Runs at | Reads | Answers |
|---|---|---|---|
| **Capability** | 1.8, before any promise | The brief, the client's systems | Can this be built at all |
| **Data source** | 3.0b, once screens exist | The screen inventory, the domain model | Where does each screen's data come from |

Run `/pica-architect --data-check` at 3.0b. Any screen that cannot name a source becomes a
low-confidence `assumption` surfaced in `review.html`, so the client corrects it **before** the contract
rather than a developer discovering it after.

This is the mitigation for the one structural flaw in the flow: screens are designed in Phase 3 and the
API is defined in Phase 6. Splitting the pass is what makes the mitigation actually runnable.

Write `risks` to state. Do not proceed to design decisions here.

---

## Default, steps 6.1 and 6.4

Preconditions: contract signed, domain model exists at 2.9, `domainConstraints` recorded.

### 6.1 C4 and ADRs

Draw **context, container, component**. Stop before code level: a code diagram is stale a week later
and costs more to maintain than the clarity it buys.

One ADR per non-obvious decision, four parts, none optional:

    CONTEXT       what was true when this was decided
    OPTIONS       what else was considered, and why each was rejected
    DECISION      what was chosen
    CONSEQUENCES  what this makes easy, and what it makes hard

**Every technology choice gets one.** "We used Postgres" is a fact, not a decision.

`CONSEQUENCES` is the part that gets skipped and the part that matters: a decision recorded without its
downside reads as free, and the next person reverses it having never seen the cost.

### 6.4 NFRs

Each carries a number, the condition it holds under, and how it will be measured. Cover performance,
availability, security, scalability.

**Then walk `domainConstraints`**: every retention rule and every audit-trail requirement becomes an NFR
here, or it becomes nothing and surfaces during a compliance review instead.

### Mobile

If native is in scope, record signing key custody and the rollback asymmetry: Android supports staged
percentage rollout, iOS does not. That asymmetry belongs in the architecture, not in a deployment
checklist nobody reads.

---

## Write to state

```json
"risks": [
  { "id": "R1", "risk": "the client's system of record is undocumented and access is not granted",
    "verdict": "risky", "affects": ["UC-01", "UC-03"],
    "why": "access arrives in week three at the earliest" },
  { "id": "R2", "risk": "real-time settlement inside the app", "verdict": "not-possible",
    "why": "the bank settles overnight in batch, so a balance shown as final during the day would be wrong on any day a payment reverses",
    "affects": [] }
],
"nfr": [
  { "id": "NFR-01", "kind": "performance", "requirement": "p95 response under 300ms",
    "condition": "500 concurrent users on the production instance type",
    "measuredBy": "load test in CI, gate on regression", "source": "client ops" }
],
"adr": [
  { "id": "ADR-01", "title": "React for the front end",
    "context": "the client's other products are React and their team maintains them",
    "options": ["React, which their team already runs", "Svelte, smaller but no in-house experience"],
    "decision": "react",
    "consequences": "hiring and handover are easy; the bundle is larger and the first-paint budget at NFR-01 is tighter as a result" }
]
```

**`verdict` is one of `possible`, `not-possible` or `risky`**, and a `not-possible` needs a `why` a
non-technical reader can repeat out loud. A `risky` needs `affects`, because that is what 5.1 widens a
pessimistic figure against. `arch-check.mjs` reads exactly these keys; it also accepts `feasibility` for
`verdict` and `affected` for `affects`, and the spelling above is the one to write.

**Every ADR carries all four parts.** `consequences` is the one that gets skipped and the one that
matters: a decision recorded without its downside reads as a free choice, and the next person reverses it
having never seen the cost.

---

## Verify before handing back

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/arch-check.mjs .pica/state.json --feasibility   # at 1.8
node ${CLAUDE_PLUGIN_ROOT}/scripts/arch-check.mjs .pica/state.json                 # at 6.1 and 6.4
```

All zero, or fix and re-run. Five items in the definition of done stay with a human and the script says
so on every run: whether a "not possible" reads plainly to a non-technical reader, whether the C4
diagrams say anything, whether an ADR's consequences are honest, whether a screen's named data source is
real, and whether the decisions were right.

## Then stop

Present the diagrams, the ADRs and the NFR table. Say which screens could not answer where their data
comes from, because those are the questions for the client, not findings against the build.
