---
description: Turn the brief into requirements the business recognises, glossary, AS-IS, TO-BE, business rules, domain model, PRD
argument-hint: "[work package, or empty for the whole project]"
---

# pica-analyse: brief to requirements

Steps 1.1 to 1.3, 1.9, and 2.1 to 2.11. Runs after `/pica` intake and before any design.

Load `${CLAUDE_PLUGIN_ROOT}/rules/business-analysis.md` and
`${CLAUDE_PLUGIN_ROOT}/rules/domain-knowledge.md` and `${CLAUDE_PLUGIN_ROOT}/rules/industry-knowledge.md`
before anything else. If either is missing, stop and
say so rather than proceeding without it.

**Do not stop to ask questions.** Anything the sources cannot settle becomes an `assumption` with a
confidence and a blast radius, and the chain continues. The client corrects it at review, which is
cheaper than a round trip now.

---

## Inputs

Read, in this order:

| Source | For |
|---|---|
| `docs/brief.md` | What the client said. The starting point, never the specification |
| Sources labelled `use` | Everything the brief implies but does not name |
| Analytics, if supplied at 0.4 | What people do, versus what the brief claims they do |
| Support logs, if supplied at 0.4 | Where it hurts, ranked by frequency |
| The live product, if reachable | The AS-IS, observed rather than described |

**If analytics and support logs were not supplied, say so explicitly and record it as a limitation.**
They are the substitute for user interviews, and without them the AS-IS rests on assertion.

---

## 1.1 Split the brief

Two lists: what the brief states, and what it leaves open. The second list is the assumption backlog.

## 1.2 Problem, whose it is, success measure

What problem, for whom, why now, and **what number would move if this worked**. That number is read
again at 8.5, so it has to be something the client can actually measure.

Write it to `state.problem` as fields rather than prose, because `problem-check` reads them and
prose is not readable: `metric`, `unit`, `baseline`, `baselineMeasuredBy`, `baselineMeasuredOn`,
`target`, `direction`, one or more `guardrails` with a threshold each, and `counterEvidence`.

**Take the baseline now.** It is the one figure that cannot be recovered later: after launch there
is no way back to what the number was before, and a project without one argues about whether it
worked using the same data either way.

Then write the **question**, to `state.problem.hmw`. It is a different object from the number and
both are needed: the metric is what 8.5 judges, the question is what 3.1 diverges against. Phrase
it as an outcome, never as a thing to build. "How might we make who approved what recoverable after
the fact?" opens a solution space. "How might we build an approvals dashboard?" has already
answered itself, and three concepts run against it come back as three versions of one idea.
`problem-check` rejects a question naming a screen, an app, a report or a dashboard.

## 1.3 Narrow the field

A name with real products behind it. "Retail banking dashboard", not "fintech". The Researcher cannot
measure a mood.

## 2.1 Stakeholder register

```json
"stakeholders": [
  { "name": "<role, not a person's name if it may be shared>", "decides": [...],
    "vetoes": [...], "informed": true }
]
```

At least one decider and one veto holder. **Sign-off from someone who cannot approve is not sign-off.**

## 2.1b Domain knowledge, before the glossary

`domain-knowledge.md` governs this. Start at the **sector's standards body**, not at a search engine:
regulated sectors have published their data model, and a domain model that ignores it makes every
future integration a translation layer.

Then run Event Storming against the artefacts you have, since there is rarely a workshop: name the
**domain events** in business language and past tense, ask what command caused each, who may issue it,
which events change together, and what must be true for each to be legal. **Mark every event you
inferred rather than observed**: a wrong event list shown to a client is worth more than a right
question asked of them.

## 2.1c Industry knowledge, before any design decision

`industry-knowledge.md` governs this, and the base is read with:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/industry-check.mjs --list
node ${CLAUDE_PLUGIN_ROOT}/scripts/industry-check.mjs --show <sector>
```

**Read `--show` in full before writing anything here.** It carries what 2.1b does not: every stakeholder
the sector has with what they want and fear, the colour conventions and the reason each reserved hue is
reserved, the tradition the sector settled on and the ones that misread in it, density per audience,
typography, tone, and what the sector treats as a defect regardless of what the client asked for.

Then write `state.industry`, and **decide all five axes**. Silence on an axis is the failure: an
undecided axis gets filled with whatever came out by default, and afterwards nobody can tell that a
decision was never made.

```json
"industry": {
  "key": "<sector, only when state.field is ambiguous or matches two>",
  "conventions": [
    { "about": "colour|style|density|typography|tone", "followed": true, "note": "how, specifically" },
    { "about": "tone", "followed": false, "why": "the argument for departing" }
  ],
  "forbiddenPrevented": [ { "forbidden": "<the sector's own wording>", "preventedBy": "what in this design stops it" } ],
  "departures": [ { "from": "<the ruled-out tradition>", "why": "the argument" } ],
  "stakeholdersNotApplicable": [ { "role": "…", "why": "…", "by": "who signed" } ],
  "constraintsNotApplicable": [ { "category": "…", "why": "…", "by": "who signed" } ],
  "evidenceNote": ""
}
```

Three things this step gets wrong most often:

- **A sector with more than one audience has more than one density.** Education is low for the learner,
  high for the teacher's gradebook, medium and translated for the parent. Declare each, or one will be wrong
- **"Not applicable" in `domainConstraints` waives nothing.** That field answers whether the question was
  asked. Waiving a sector requirement happens in `constraintsNotApplicable`, with a reason and a name
- **A prevention names what stops the defect, not the defect.** "We will avoid truncating drug names" is
  an intention; "the name cell wraps to a second line and no ellipsis rule exists in the token set" is a
  prevention

## 2.2 Glossary

One concept, one word. Fill `notOurTerm` wherever a synonym exists in the sources. Everything after
this step uses these terms and only these terms.

## 2.3 AS-IS process

How they work today. Prefer observation over description: the live product, the analytics, the support
logs. Mark anything derived from description alone as lower confidence.

## 2.4 TO-BE process

How they work with the product.

## 2.5 The delta

State it explicitly. **This is what is being bought**, and it is the thing the client judges fastest.
It goes at the top of the business tab in `review.html`, marked as an assumption if it was inferred.

## 2.6 Business rules

Numbered `BR-01`..`BR-nn`. Each with the rule, its source, whether it is confirmed, and what enforces
it. Extract from the sources; do not invent rules to fill gaps. A gap is an assumption.

## 2.6b Domain constraints

Work the eight categories the check requires, in this exact wording: **standard, regulator,
data protection, identity, retention, audit trail, restricted claims, professional duty.**

`domain-check.mjs` matches on the category name, so a category written any other way reads as an
unanswered one. **Answer every category, including the ones that are "not applicable"** with a reason:
an unasked question and a null answer look identical otherwise.

Record what you found, where you found it, and **`verifiedBy`: either `"human"` or `"agent"`**. Those
are the only two values the check accepts, and the difference is the whole point.

**Anything marked `agent` must also exist as a low-confidence assumption**, or it will be read as fact.
`domain-check.mjs` enforces that. Do not state a legal requirement as settled on the strength of a
search result: getting this wrong is not a design defect, it is a liability.

## 2.7 User flows · 2.8 Use cases

Flows first, then use cases `UC-01`..`UC-nn`. Every use case traces to a `BR-nn` or to the delta:

```json
"useCases": [
  { "id": "UC-01", "name": "send a payment", "actor": "account holder",
    "trigger": "the account holder needs to move money", "mainFlow": ["open", "supply", "confirm"],
    "tracesTo": ["BR-01"] }
]
```

**`tracesTo` is the key `trace-check` reads.** A use case that traces to nothing was agreed by nobody, and
one that traces to a rule id that does not exist is worse: it looks traced.

## 2.9 Domain model

ERD and data dictionary, using only glossary terms. One entry per entity:

```json
"domainModel": [
  { "entity": "Payment", "attributes": ["id", "status", "createdAt"], "owns": ["its own status"] }
]
```

**`entity` is the key `trace-check` reads**, and it reads `attributes` for the field names. It accepted
only `name` until 0.8.0, which no command documented and nothing wrote, so the entity check skipped every
entry and reported zero on a model that had invented every word in it. **Every screen the designer will later draw must
be able to answer "where does this data come from" from this model.** If it cannot, that is a
low-confidence assumption and the Architect needs to see it at 1.8.

## 2.10 PRD

Assemble into `docs/contract.md`. Written for a non-technical reader: no unglossed jargon, acceptance
criteria in the client's own words, quoted where possible.

## 2.11 Exclusions

Quoted from the brief. Then ask the human what else to add and set `exclusionsConfirmed`.

---

## Write to state

```json
"stakeholders": [], "glossary": [], "businessRules": [],
"domainConstraints": [], "useCases": [], "domainModel": [],
"industry": { "conventions": [], "forbiddenPrevented": [], "departures": [] },
"asIs": "", "toBe": "", "delta": "", "assumptions": []
```

Every `assumption` carries `{ id, about, assumed, why, confidence, produced[], affects[] }`. The last
two are the blast radius: without them, correcting one assumption rebuilds everything.

---

## Verify before handing back

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/problem-check.mjs .pica/state.json
node ${CLAUDE_PLUGIN_ROOT}/scripts/trace-check.mjs  .pica/state.json
node ${CLAUDE_PLUGIN_ROOT}/scripts/domain-check.mjs   .pica/state.json
node ${CLAUDE_PLUGIN_ROOT}/scripts/industry-check.mjs .pica/state.json
```

Zero findings, or fix. Then report what you checked, what you found, and **which assumptions are low
confidence**, because those are the questions for the client rather than findings.

---

## When this finishes

The Product Designer can start at 3.0a. Say which use cases are unresolved, and name the two
assumptions the client should look at first: **the AS-IS and the delta.**
