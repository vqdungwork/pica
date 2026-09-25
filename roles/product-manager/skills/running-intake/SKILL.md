---
name: running-intake
description: Turn a brief into a contract — the five-input packet, the scope boundary, the exclusions, and the two things that must be derived rather than asked.
argument-hint: "[the brief, or a path to it]"
intent: >-
  Take whatever arrived — a paragraph, an RFP, a transcript — and produce an engagement
  somebody can sign: what is in, what is explicitly out, which field it sits in, and what
  was assumed to get there. Nothing downstream runs until this is agreed.
theme: framing
best_for:
  - "Turning a vague brief into a boundary with named exclusions"
  - "Deriving the field and archetype instead of interrogating the client"
  - "Recording what you assumed, so it can be corrected rather than discovered"
scenarios:
  - "The client sent three paragraphs and a competitor link. Where do we start?"
  - "They keep adding things. What did we actually agree to?"
estimated_time: "30–45 min"
---

## Purpose

Intake is not a questionnaire. It is the moment the engagement acquires a boundary, and the
boundary is what every later argument is settled against.

## Input

**Works best with:** the brief in the client's own words, and whatever they attached.
**Also useful:** an existing product, a competitor they named, a deadline they mentioned.

Anything supplied with the invocation counts as **already answered** — use it and skip that
question. Do not re-ask what the brief already says.

**Arriving with almost nothing works too.** Two of the five inputs are derived, not asked.

## The method

**1. Write the brief down verbatim, first.** Before you tidy it, before you interpret it.
`docs/brief.md` is the document the closeout will be graded against, and a brief you improved
is a brief you will later grade yourself against.

**2. Derive the field, narrowly.** It must resolve to one of the 28 sector keys. *"A platform
for logistics"* is a field; *"a platform"* is not. Four terms are deliberately refused as
ambiguous — if the brief lands on one, say so and ask, rather than guessing.

**3. Derive the archetype per application.** An admin console and a customer app in one brief
are two archetypes, not one.

**4. Draw the boundary, not the list.** You can say *the dispensing queue, not the inventory
system*. You cannot say which features, because features are groups of use cases that do not
exist until analysis. Say so plainly rather than inventing a list.

**5. Name the exclusions individually.** One line each, in the client's own words. "Everything
else" is not an exclusion, it is a dispute with a delay on it.

**6. Record every assumption with a confidence and a blast radius.** What breaks if this is
wrong, and how far the damage reaches.

## What good looks like

Every exclusion is a sentence the client would recognise as theirs. The field resolves to one
key. Two things marked *derived* with the evidence beside them. A deadline that came from the
client, or none at all — never one you inferred.

## Common failures

**Asking what you can derive.** Most briefs state the field; reading is faster than asking.

**A scope with no exclusions.** Then everything is arguably in.

**Tidying the brief.** The closeout compares against it. Improve it now and the comparison
passes by construction.

## Done when

```bash
node <pica>/roles/product-manager/scripts/proposal-check.mjs .pica/state.json --phase design
```

and `exclusionsConfirmed` is true — written by a human recording that a client agreed, by no
command.
