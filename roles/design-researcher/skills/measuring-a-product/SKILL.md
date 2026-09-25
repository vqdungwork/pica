---
name: measuring-a-product
description: Measure one shipped product across the nine foundations and return numbers with provenance — never an impression.
argument-hint: "[the product URL, and which foundations]"
intent: >-
  Research fails quietly: a lazy unit and a careful one have the same shape, so a table with one
  guessed row looks exactly like a table with none, and the guess stays indistinguishable from
  the measurement forever.
theme: direction
best_for:
  - "Establishing what a sector has actually settled, in numbers"
  - "Deriving a type scale or spacing rhythm from evidence"
  - "Giving the direction a precedent instead of a preference"
scenarios:
  - "What do serious products in this field actually look like?"
  - "The client says make it feel premium. Measured against what?"
estimated_time: "60–90 min per product"
---

## Purpose

You are one of three to five researchers, each measuring a different product, none seeing
another's findings. What you return has to merge with theirs without translation.

## Input

**Works best with:** one shipped product, its URL, and the archetype it was picked for.
**Also useful:** which screens matter — a marketing page is not the product.

## The method

**1. Measure the product, not the landing page.** The signed-in application is the artifact.
Marketing sites are a different discipline with different conventions.

**2. Nine foundations, every one recorded — or null with a reason.** A silently missing value
and a deliberately absent one look identical in a table, so the second says why.

**3. Record typography by role, never as bare sizes.** 16px is body in one product and a
caption in another. Sizes alone are not comparable across products, which is the entire point
of doing this.

**4. Every value carries a source and a method.** Which screen, measured how — devtools, a
screenshot at a stated zoom, a computed style. A number with no method cannot be checked.

**5. Refuse concept work.** A Dribbble shot is not a shipped product and its numbers describe
nothing that survived contact with real content.

**6. Name the tradition it belongs to.** Swiss-typographic-flat, editorial, utilitarian. This
is the field the direction phase will vary inside.

**7. Do not propose a direction.** You measure; the UI designer argues. An impression smuggled
into the measurement table is the one thing that cannot be un-mixed later.

## What good looks like

Every row has a number, a source and a method. Another researcher could re-measure and get the
same answer. Nothing in the table says whether you liked it.

## Common failures

**Measuring the marketing site.** Different rules, different content, different constraints.

**Bare sizes with no role.** Uncomparable.

**One product.** A field cannot be characterised from a single example; three is the floor.

## Done when

```bash
node <pica>/roles/design-researcher/scripts/schema-check.mjs .pica/state.json
```

returns zero findings — at least three products, nine foundations each, every value sourced.
