---
name: researching-a-genre
description: Measure the KIND of thing being built — a report, a queue, a form, a dashboard — against the best examples of that kind, and not only the products whose looks you admire.
argument-hint: "[the screen inventory, and the nine-foundation measurements already taken]"
intent: >-
  Nine foundations describe how a product looks at rest. None of them says what a report is
  for. Measuring four admired products teaches a style and leaves the genre unexamined, and
  the gap is invisible precisely because the measurements are good.
theme: research
best_for:
  - "A screen whose job is to be read in five seconds rather than worked in"
  - "Any surface that summarises: a report, a roll-up, an overview, a dashboard"
  - "Deciding whether something should be a chart at all"
scenarios:
  - "The measured products are all one genre and the build contains four"
  - "A client calls the result a wall of text"
  - "Nobody can say what the screen answers before it is read"
estimated_time: "60–90 minutes for one genre, three examples and a counter-example"
---

## Purpose

Nine foundations tell you how a product looks: typography, colour, spacing, elevation, motion,
iconography, grid, density, accessibility. Measure four products that way and you learn what a
well-made interface looks like at rest.

**None of them tells you what a good report is.**

That gap shipped. An engagement measured Plane, Linear, Jira and Harvest across all nine, with real
provenance and 36 values, then built a leadership report carrying **26 displayed strings of prose
and 4 graphic elements**. Every floor passed. The client's verdict was *"wall of text… trông không
giống cái report meaningful nào cả"*, and they were right: nothing in the research had ever asked
what a report is for.

A genre is not a style. It is a contract between the artefact and the reader's first five seconds.

<!-- enforced-by: none — judgement, not decidable by a script -->

## When this runs

At step 3.1, alongside the nine foundations — not instead of them. Name the genre of every screen
in the inventory before measuring anything, because a queue, a report, a form and a detail view are
four different contracts and one product can contain all four.

<!-- enforced-by: none — judgement, not decidable by a script -->

## The method

**1. Name the genre per screen, from the screen's job.** `docs/screens.md` says what each screen is
for. "A manager finds who is idle across 15 projects" is a **report**. "An employee confirms what
they did" is a **queue with a commit**. Say which, per screen, before you look at anything.

**2. Measure the best examples OF THAT GENRE, not the products you already measured.** Plane is
the right precedent for a work item row and says nothing about reports. For a report, go to
products whose entire reason for existing is a report — analytics, BI, monitoring, portfolio
views — and name them. If the genre has a settled convention, that convention is the thing you
are measuring; if it has none, say so, because that is a finding.

**3. Measure what the reader does, not what the screen contains.** Per example, answer with
evidence and a URL:

- **The five-second question.** What does this surface answer before anyone reads a word? If the
  answer is "nothing until you read", the example is a counter-example and belongs in the report
  as one.
- **Encoding.** What carries magnitude — length, position, size, colour, or a number? What carries
  identity? A count rendered as a numeral answers "how many"; a bar answers "how many *compared to
  what*", and those are different questions.
- **What is left out.** The strongest report design decision is usually a removal. Name what each
  example refuses to show.
- **Density of prose.** Count displayed strings against graphic marks. A genre has a rough ratio
  and it is measurable; report the number rather than an impression.
- **What a reader does next.** Does the surface end in an action, a drill-down, or nothing?

**4. Load Claude's `dataviz` skill before writing anything about charts, and do not restate it.**
It carries the form heuristic — including when the answer is *not* a chart — a colour formula, mark
specs, anti-patterns, and a runnable palette validator. It is design-system agnostic, so it
consumes this project's tokens unchanged. Summarising it into a few bullets is how this was got
wrong once already: the skill was loaded by a coordinator, reduced to four lines, and the method
never reached the build.

**5. Return the genre's contract, not a recommendation.** Two or three shapes the genre supports,
what each is good at, what each costs. The choice belongs to the client at 5.2, built as screens.

<!-- enforced-by: none — judgement, not decidable by a script -->

## What good looks like

Every screen in the inventory carries a named genre. Each genre has at least three measured
examples that exist to serve that genre, with URLs and method. The prose-to-mark ratio is a number.
At least one counter-example is recorded — a product that does this genre badly, and why — because
a set of good examples teaches a style and a bad one teaches the constraint.

<!-- enforced-by: none — judgement, not decidable by a script -->

## Common failures

**Measuring the products you like instead of the genre you need.** Four beautiful work-tracking
tools teach you nothing about executive reporting, and their beauty makes the gap invisible.

**Treating "dashboard" as a genre.** It is a container. The genres inside it — a status roll-up, a
trend, a ranked list, an exception feed — have different contracts and different failure modes.

**Reporting a ratio without counting.** "It felt text-heavy" is not a measurement. 26 to 4 is.

<!-- enforced-by: none — judgement, not decidable by a script -->

## Done when

```bash
node <pica>/roles/design-researcher/scripts/schema-check.mjs .pica/state.json
```

and `state.genres` names a genre for every screen in the inventory, each genre carries at least
three measured examples that exist to serve it with a URL and a method, at least one counter-example
is recorded with the reason it fails, and the prose-to-mark ratio is a counted number rather than an
impression. A genre you could not find three examples for is recorded as such — that absence is a
finding, and the shortlist you return says so.
