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


## a branch nobody labelled is a branch nobody can follow

<!-- enforced-by: branch-unlabelled, branch-half-labelled, branch-conditions -->

Eight edges in one process carried `label: "co"` and `label: "khong"`. Not one was drawn. The
reader saw a step with two arrows leaving it and nothing to say which was yes — which is the only
thing a decision exists to communicate. The answer had been in the data the whole time.

**A decision is a node whose branches are named.** Two unlabelled edges leaving a step mean both
things happen: that is parallel work, and drawing a diamond there tells the reader to choose when
nobody chooses. Reading "more than one edge out" as a decision turned six nodes into diamonds
where three were real. A declared `type` confirms it; it is not the only evidence, because on that
project not a single node carried a type at all and every diamond was drawn as a plain box.

So: **infer the shape from the graph, and treat the declared type as confirmation.** A model is
data before it is a picture, and a renderer that only believes what the author remembered to
annotate will draw a different process from the one the author wrote down.

## two branches on the curves, three or more in a legend

<!-- enforced-by: figure-labels-collide -->

Four branches leaving one diamond reconverge within a hundred pixels, so four labels placed on
four curves collide however they are staggered. Pushing them apart moves each one away from the
curve it belongs to, until one lands under a step three rows down and appears to label that step
instead. No placement rule fixes a fork that crowded: the drawing is the wrong shape for it.

Two branches get their labels on the curves, where the eye already is. Three or more get a legend
under the diamond — one line per branch, the condition and the number of the step it leads to. It
always fits, it never collides, and the reader can compare the branches against each other instead
of chasing four curves across the page.

## number the steps, and say where the process starts

<!-- enforced-by: none — judgement; a diagram can be correct without numbers, only harder to talk about -->

Without a number the only way to say "this step" out loud is to read its whole label, and a client
on a call cannot point. Number by the order a reader meets them: down the page, then across the
lanes.

Start and end are facts about the graph — nothing arrives, or nothing leaves — so the renderer
knows them without being told. Draw them as pills and everything between as rectangles. A reader
who cannot see where a process begins finds it by elimination.

## resolve collisions where the coordinates are

<!-- enforced-by: figure-labels-collide -->

Guessing a placement rule and hoping is not a method when the generator already knows every
rectangle on the canvas. Lay the labels out, then push them apart until nothing intersects
anything — the other labels, and the steps themselves — and only then emit.

Three attempts at this were made by eye and each left a different collision. The one that worked
was measured: lay out, detect, separate, re-check.


## whether a figure is clickable is a measurement, not a kind

<!-- enforced-by: figure-control-does-nothing -->

Which diagrams are worth making interrogable was decided once by kind — "the lifecycle figures
are interrogable, a use case model has no route to follow" — and it was exactly backwards.

A lifecycle is a cycle. Every state reaches every other state, so focusing one lights 100% of the
diagram and the control does nothing. A use case model narrows to a tenth. The guess was confident,
reasonable, and wrong in both directions at once.

**Measure it on the graph that was actually drawn.** A figure is interrogable when it is big enough
to need help, when focusing the median node leaves most of it dimmed, AND when that node has
neighbours at all — a graph with no edges passes a "does it narrow" test by narrowing to nothing,
which is how the use case model came to offer a control that dimmed nine nodes and lit none.

## the question a click answers is not "everything after this"

<!-- enforced-by: figure-control-does-nothing -->

Transitive reachability is the obvious thing to highlight and the wrong one. On a process that
mostly runs top to bottom, everything after the first step is the whole process: clicking step 1
lit 21 of 23 boxes.

The question a reader has in front of a swimlane is smaller and better: **where does this step sit
— who hands it to me, and who do I hand it to.** The immediate neighbourhood narrows on every
graph shape, linear or cyclical, and it is the thing somebody points at on a call.

A control that appears to do something and does not is worse than no control, because the reader
spends attention finding out.


## route by search, not by derivation

<!-- enforced-by: figure-edge-through-node -->

Five rounds of this were spent hand-deriving an edge geometry meant to be correct for every case,
and each derivation was wrong for a different case: a horizontal run at the source's own centre
height, then at the target's, then a fallback between adjacent rows that cut across the columns
between them. Every one looked right in the source. Every one shipped a line through a box.

The obstacles are all known at the moment the edge is drawn. So generate candidate routes — exit
from the bottom or either side, enter at the top or either side, descend in any of a handful of
corridors, turn in any of a handful of bands — **count what each one hits, and take the cleanest**.
Bottom-out and top-in pay no tax and therefore win wherever they are clean, so the diagram stays
consistent without a single special case.

Edges are routed in order and each sees the ones already placed. Crossing another edge costs about
a sixtieth of what cutting through a box costs, because a crossing is readable and a line through a
label is not.

Measured on one 23-step process: edges through unrelated boxes 8 → **0**, crossings 9 → 5.

This is the same move that fixed the branch labels, and it is the general one. **When the geometry
is hard, stop reasoning about placement and start scoring it.** A rule you derived is a hypothesis;
a route you measured is a fact.

## measure the thing you are shipping, not a model of it

<!-- enforced-by: none — judgement about how to verify, which no script can hold -->

The harness written to score these diagrams parsed cubic Béziers by hand. When the routes became
orthogonal it silently dropped the eight it could not parse and reported a large improvement —
part of which was edges disappearing from the measurement rather than from the drawing.

A measurement that quietly ignores what it does not understand will confirm whatever you just did.
Rewriting it to load the real SVG in a browser and walk each path with `getPointAtLength` removed
the parser and its blind spot at once: eight edges reappeared, and two of the numbers got worse.

If a harness cannot see everything it claims to score, it is not a harness. It is agreement.


## a label that is not on its line is not a label

<!-- enforced-by: figure-labels-collide -->

The first collision pass pushed branch labels apart vertically until nothing intersected. It was a
fine way to stop them colliding and a terrible way to keep them meaningful: one "Không" ended up
floating in white space with no line touching it, while the branch it named ran somewhere else.
The measurement said zero overlaps. The label named nothing.

A label may only ever occupy a point **on its own route**. Sample the route, score each point
against the steps and the labels already placed, take the cleanest, prefer positions near the fork
where the reader is already looking. If every point collides, the least bad one is still on the
line, which is the property that matters.

Free movement plus a collision count will always converge on something that satisfies the count
and means nothing. Constrain the search space to positions that are correct by construction, and
let the score choose among those.

## measure the boxes too, not only the lines

<!-- enforced-by: figure-steps-overlap -->

Routing was measured to zero edges through boxes and five crossings, and the drawing still looked
cramped — because nothing had measured the boxes against each other.

The half-row used when a cell overflows its columns dropped a step by 59px for a box 54 tall: five
pixels of air, and the step-number badge overhangs nine pixels above its own box, so the badge of
the lower step was drawn on top of the box above it. Three pairs overlapped and nine sat closer
than fourteen pixels.

**Height is the axis a page has to spare.** Width is fixed and every column fights for it; vertical
room costs a scroll nobody minds. When a layout is tight, the answer is almost always to spend
height, and almost never to shave the gaps.


## measure at the width the reader has, not the width you designed for

<!-- enforced-by: figure-unreadable-on-a-phone -->

Every number about this diagram was taken in a 900px column: labels at 10px, no edge through a box,
no label off its line. In a 358px phone column the same drawing rendered its smallest label at
**3.7px**, and no check had ever looked, because the check took the design width as the width.

Shrinking a diagram until it is unreadable is not responsive design. A page that must never scroll
sideways is not an argument for it either — the page still does not, the FIGURE does, inside its
own frame, on screens too narrow to hold it.

And that is a mitigation, not a fix. A three-lane swimlane on a phone is a poor artefact however it
is handled: readable-and-scrollable beats shrunk-into-a-texture, and neither is good. Say so rather
than reporting the narrow case as solved.


## an annotation belongs beside the flow, never in it

<!-- enforced-by: figure-step-unreachable -->

A four-way fork got a legend under the diamond, between the fork and its four targets. That put an
annotation in the flow's path: the routes had to bend around it, and the region looked tangled.

The conclusion drawn from that was wrong. The legend already named each branch and its target
number, so the four routes looked redundant and were deleted — a third of the ink came out,
crossings fell, every geometric measure improved, and **four steps were left with no incoming line
at all.** The legend became a dead end and the process stopped in the middle of the page.

"The legend carries the step numbers" is true and useless. **A number in a list is a reference; a
reader following a process needs a connection.** An annotation may never cost the reader the flow.

The defect was never the lines. It was where the annotation sat. Moved beside the fork — searched
for the nearest genuinely empty space, connected by a thin dashed leader, penalised for landing in
a lane that is not its own — the routes run straight, the legend still explains them, and the
process is whole.

**Every measure got better when the change was wrong.** Ink, crossings, overlap and label
placement all improved while the drawing stopped being a process. That is what a metric does when
it measures the picture and not the thing the picture is for, and it is why reachability is checked
separately and by id rather than by geometry.


