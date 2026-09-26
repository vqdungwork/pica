# Modelling rules

The structural half of analysis. Load this for stage B of `/pica-analyse`.

`business-analysis.md` covers language and behaviour: the problem, the glossary, the rules, the use
cases. This file covers the four models, and they are a different kind of work: one is argued in
sentences, the other is drawn and has to close.

Until 2.0.0 pica asked for AS-IS and TO-BE in four sentences of prose with **no notation named**:
the words BPMN and swimlane appeared nowhere in the repository, and `trace-check` asserted only that
a non-empty string existed. One sentence in `state.asIs` was a green check. That is the gap this file
closes.

---

## Four models, and what each is for

| Model | Answers | Produced |
|---|---|---|
| **Process** | who does what, and where it branches | TO-BE here; AS-IS by `pica-ux-researcher`, from observation |
| **Domain** | what things exist and how they relate | here |
| **Roles and permissions** | who may do what to which thing | here |
| **State** | what states a thing can be in, and which transitions are legal | here |

The journey map is not here. It is `pica-business-analyst`'s, at stage C, and it is **a projection of the
process model** rather than a fifth model: see below.

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

The model is typed JSON, `lanes`, `nodes`, `edges`, validated against a schema and rendered to
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

They are different jobs and they belong to different agents. `pica-ux-researcher` draws AS-IS from the
live product, the analytics and the support logs, and each step carries the evidence class discovery
already uses: `observed`, `stated`, `inferred`. A step somebody described and nobody watched is
visibly `stated`, which is what the old prose instruction asked for and nothing enforced.

**The delta is the difference between the two diagrams.** State it explicitly: it is what is being
bought, and it is the first thing presented at the confirmation.

---

## Domain model

Entities, relationships, lifecycle. **Business level, not database level**: enough to know what a
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

This moved out of design. It used to be part of the screen inventory at 3.0: the designer worked it
out while drawing, and that is too late and the wrong person. It is a business question: whether an
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

## Models are validated data — and then somebody has to see them

<!-- enforced-by: model-diagram -->

Keeping the TO-BE process, the domain model, the state model and the permissions matrix as
*validated data rather than pictures* is right: a picture cannot be checked, and a hand-drawn one
drifts while looking authoritative. But on one engagement the data then sat in `state.json` for
the whole project and the only readers were the checks. A model nobody can see is a model nobody
argues with, and the arguing is the point.

So generate the pictures from the validated graph — no second source, so the diagram cannot
disagree with the model, and regenerating it is the only way to update it.

Three things learned by rendering the first ones to PNG and **looking**, none visible in the SVG
source:

- **Edges drawn centre-to-centre put the arrowhead under the node painted over it.** The lifecycle
  rendered as a web of undirected lines — the one thing a lifecycle diagram must not be — while
  every path carried its marker.
- **Forbidden transitions were recorded as prose**, because the *reason* is the valuable half and
  an arrow cannot carry it. Code that assumed a `{from, to}` shape drew nothing while the legend
  announced "1 forbidden transition". Draw the arrow when the sentence names two real states, and
  print the sentence regardless.
- **A permissions cell must distinguish three states, not two.** A missing key is a question
  nobody answered; an empty string is the answer "none", deliberately given. Drawing them alike
  loses the distinction the matrix exists to record — one is a gap to chase, the other a decision
  to respect. (The first version printed the literal word `undefined` in that cell.)

## Drawing the model is a check the checks did not run

<!-- enforced-by: activity-laned, model-diagram -->

A TO-BE process declared its lanes by display name and its nodes referenced them by slug —
`8project (Plane)` against `8project`. Two vocabularies for one thing, in one object.

`process-check` catches this. It has caught it since the check was written: point it at that state
and `activity-laned` reports thirteen findings, one per activity with no lane it can resolve. The
check was correct, present, and **never run on this project**, because the chain stopped before
the step that invokes it and nothing downstream noticed.

What surfaced it was the renderer. Drawing the process put all twenty-three steps into the first
lane and left two lanes visibly, embarrassingly empty — a picture of a process in which one role
does everything, which nobody who knew the business could look at for two seconds. **A model that
is only ever validated is validated against the rules somebody remembered to write; a model that
is drawn is validated against everyone who sees it.** That is the argument for rendering, and it
is stronger than "it looks nice".

Three things the renderer must not do, each learned by looking at what it produced:

- **Never fall back to lane zero.** `Math.max(0, indexOf(...))` turned an unresolved lane into a
  silent default, so the data defect rendered as a *design* — an odd-looking process rather than a
  broken one. An unmatched lane gets its own band and says so in the band's label.
- **Column is topological depth, not array position.** One column per node made a 23-step process
  a 4570px horizontal ribbon in which nothing was parallel and no branch rejoined, about a graph
  whose entire point is that three roles act at once.
- **Size the canvas after measuring the content.** A height computed from `lanes.length × 96`
  clips any lane that has to stack, and a clipped step looks exactly like a step that is not there.


## a generated drawing has no theme of its own

<!-- enforced-by: figure-hardcodes-a-colour -->

A diagram generator writes colours into the SVG. Inlined into a page that switched to dark, those
colours do not switch with it: #16191d text on a #ffffff card, and the dark surface behind renders
both as black on black. The page was right, every contrast check passed — they read CSS, and this
is a presentation attribute — and not one diagram was legible.

Every colour is `var(--fig-<role>, <light hex>)`. The host page defines the variables in each of
its three theme blocks; opened as a standalone file nothing defines them and the fallback keeps
that .svg a correct light drawing. `var()` reaches a presentation attribute only when the SVG is
inline in the document, which is how a spec page carries it.

Two colours are exempt, and only two: white and black sitting **on** a coloured shape. They follow
that shape, not the theme. But the ink that sits on the accent is not one of them — white works on
a dark blue and fails on a light one, and the accent is exactly what flips between the two. That
gets its own token, `--fig-on-accent`, or it is a contrast failure waiting for the reader to
change their system setting.
