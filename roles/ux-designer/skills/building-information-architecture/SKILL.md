---
name: building-information-architecture
description: Take a content inventory, build the sitemap from it, and validate the structure with a card sort rather than asserting it.
argument-hint: "[the use cases and the screen list]"
intent: >-
  Structure is cheap to change now and expensive after it is styled. An information
  architecture reviewed only by the person who drew it has been reviewed by nobody.
theme: structure
best_for:
  - "Deciding what goes where before anything looks like anything"
  - "Catching a navigation model that only makes sense to its author"
  - "Producing a screen inventory the estimate can count"
scenarios:
  - "We have 40 use cases. How many screens is that?"
  - "The client keeps asking where things will live."
estimated_time: "3–5 hours"
---

## Purpose

Everything downstream counts screens: the estimate prices them, the demo builds them, the
Figma port reproduces them. The inventory is where that number is first honest.

## Input

**Works best with:** use cases, the state model, and the permissions matrix.
**Also useful:** an existing product, whose navigation the users already learned.

## The method

**1. Inventory the content before the structure.** What must appear, from the use cases and the
domain model. You cannot organise what you have not counted, and a sitemap drawn first gets
organised around imagined pages.

**2. Group by the user's task, not by the data model.** The domain model has `Payment`,
`Approval` and `AuditEntry` as three entities. The user has one job: *approve this payment*.
Navigation built from the schema is navigation built for the database.

**3. Draw the sitemap, then card sort it.** Give real participants the content labels and let
them group them. Where their grouping and yours differ, theirs is the finding.

**4. Tree test the result.** Give people a task and see whether they can find where it lives.
Card sorting tells you how people group; tree testing tells you whether your grouping works.

**5. Build the screen inventory, at every declared viewport.** Then multiply by the state list
and look at the number honestly. Twelve screens × three viewports × four states is 144 frames,
and the SOW has to say which of those you are actually committing to.

**6. Trace both ways.** Every screen names a use case; every use case names a screen. A screen
with no use case is the cheapest thing to delete now; a use case with no screen is a
requirement nobody will build.

## What good looks like

The navigation carries evidence — a card sort with participants and a date, or a written reason
why neither test was possible. Nothing is orphaned in either direction.

## Common failures

**Sitemap first.** Then the inventory gets bent to fit it.

**Navigation mirroring the schema.** Users do not have entities; they have jobs.

**Promising full coverage without counting.** 144 frames is a number somebody has to build.

## Done when

```bash
node <pica>/roles/ux-designer/scripts/flow-paths-check.mjs .pica/state.json
```

returns zero findings on `ia-evidenced`.
