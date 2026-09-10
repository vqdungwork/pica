# Modelling rules

The structural half of analysis. Load this for stage B of `/pica-analyse`.

`business-analysis.md` covers language and behaviour — the problem, the glossary, the rules, the use
cases. This file covers the four models, and they are a different kind of work: one is argued in
sentences, the other is drawn and has to close.

Until 2.0.0 pica asked for AS-IS and TO-BE in four sentences of prose with **no notation named** —
the words BPMN and swimlane appeared nowhere in the repository — and `trace-check` asserted only that
a non-empty string existed. One sentence in `state.asIs` was a green check. That is the gap this file
closes.

---

## Four models, and what each is for

| Model | Answers | Produced |
|---|---|---|
| **Process** | who does what, and where it branches | TO-BE here; AS-IS by `pica-discoverer`, from observation |
| **Domain** | what things exist and how they relate | here |
| **Roles and permissions** | who may do what to which thing | here |
| **State** | what states a thing can be in, and which transitions are legal | here |

The journey map is not here. It is `pica-analyst`'s, at stage C, and it is **a projection of the
process model** rather than a fifth model — see below.

---

## Process modelling

### The notation is a decision, and getting it wrong costs either way

| Use | When |
|---|---|
| **BPMN with lanes** | the process **crosses roles**. One lane per actor, and the handoffs between lanes are the thing worth drawing |
| **A flowchart** | one actor, linear, simple branches |

A BPMN model of a three-step approval confuses the stakeholders it was drawn for. A flowchart of a
three-role process hides every handoff, and handoffs are where the defects live. **Name the notation
and say why**, in one line, so the choice is reviewable rather than habitual.

### It is data before it is a picture

The model is typed JSON — `lanes`, `nodes`, `edges` — validated against a schema and rendered to
self-contained SVG. Not a diagram somebody drew.

A drawn diagram drifts from the process it depicts and nothing catches it. A generated one cannot: it
is the same mechanism that renders pica's own flow, and `process-check` reads the data rather than
the image.

### What has to close

- **Every activity sits in a lane.** An activity with no owner is work nobody agreed to do.
- **Every gateway has at least two outgoing paths.** A decision with one answer is not a decision.
- **No dead ends.** Every path reaches an end event. A path that stops is a user who stopped.
- **Every activity traces to a use case.** This is the same link `coverage-check` holds screens to,
  one level up: an activity nobody asked for is scope, and a use case with no activity is a
  requirement the process forgot.

### AS-IS is observed, TO-BE is designed

They are different jobs and they belong to different agents. `pica-discoverer` draws AS-IS from the
live product, the analytics and the support logs, and each step carries the evidence class discovery
already uses — `observed`, `stated`, `inferred`. A step somebody described and nobody watched is
visibly `stated`, which is what the old prose instruction asked for and nothing enforced.

**The delta is the difference between the two diagrams.** State it explicitly: it is what is being
bought, and it is the first thing presented at the confirmation.

---

## Domain model

Entities, relationships, lifecycle. **Business level, not database level** — enough to know what a
screen shows and where a link goes, not enough to be a schema.

Per entity: the name **from the glossary**, who owns it, the key fields a screen actually displays,
and the states it can be in. An entity whose name is not in the glossary is a second vocabulary, and
two vocabularies for one thing is how a screen and a conversation stop being about the same object.

---

## Roles and permissions

A **CRUD matrix**: roles down, entities across, and Create / Read / Update / Delete in the cells.

pica asked for this as a data-ownership table at intake, **before anyone knew what the entities
were.** It belongs here, after the domain model exists.

What has to close:

- **Every entity × role pair has a value.** A blank cell is not "no access", it is a question nobody
  asked, and the two are indistinguishable three weeks later.
- **No entity is unowned.** Something has to be able to create it.
- **No permission a use case does not justify.** A role that may delete an entity no use case has it
  deleting is either a missing use case or a permission that should not exist. Both are worth finding
  before the admin console is built on it.

This matrix is what makes an admin console designable. Without it the designer guesses at scope per
role, and a leak between roles looks like a layout choice.

---

## State modelling

What states each entity can be in, and which transitions are legal.

This moved out of design. It used to be part of the screen inventory at 3.0 — the designer worked it
out while drawing — and that is too late and the wrong person. It is a business question: whether an
invoice can go from `paid` back to `draft` is not a design decision.

**And it is what makes state coverage checkable.** The design phase owes a screen for every state, and
until this model existed there was no list to hold it to. Now `screens × viewports × states` is a
number, and `state-coverage-check` compares it against what was captured.

Per entity: the states, the legal transitions, who may perform each, and the terminal states. A state
with no way out is a state the product traps things in, and if that is intended it is declared.

---

## Non-functional requirements

Rehomed here when the architect package went. They are requirements, and requirements are analysis.

**A number with a unit, or it is not a requirement.** "Fast" is a mood. "The approval queue renders in
800ms at p95 with 500 rows" is a requirement, and the only kind a build can be held to or a design can
be shaped by.

Per NFR: the id, the kind, the requirement as a number, the condition it holds under, and **how it
would be measured**. An NFR nobody can measure is an adjective with an id.
