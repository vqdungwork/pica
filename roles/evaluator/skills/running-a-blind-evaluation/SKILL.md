---
name: running-a-blind-evaluation
description: Run three to five evaluators, each alone, each on a different lens — and one lens before the gate rather than all five after it.
argument-hint: "[the built screens and the use cases]"
intent: >-
  You receive the screens and the use cases and nothing else. Given the reasoning that produced
  a screen, an evaluator agrees with it, which is the whole failure this role exists to prevent.
theme: evaluation
best_for:
  - "Catching what the people who built it can no longer see"
  - "Finding blockers while they are still cheap to act on"
  - "Producing findings a designer can act on rather than argue with"
scenarios:
  - "It looks fine to us. What are we missing?"
  - "Before we show the client, what breaks?"
estimated_time: "20–30 min per lens"
---

## Purpose

Three to five evaluators recognise up to **80% of usability problems**. One evaluator reporting
"no findings" says nothing about the product.

## Input

**Works best with:** the screens, and the use cases they claim to serve.
**Deliberately withheld:** the design rationale, the meeting notes, the reasoning. If you have
seen why a screen is the way it is, you are no longer an evaluator of it.

## The method

**1. One lens runs before the gate.** By default *error prevention, recovery and undo* — where
the defects live that measurement cannot see and a screenshot does not show. Record it with its
date, because a lens run after approval and one run before are the same three fields and only
the date separates them.

On the project this rule came from, the full fan-out found **all eight blockers after all seven
packages were already approved**. Five shared one cause, visible on one screen. Seventeen
minutes of work, scheduled so that acting on any of it meant re-opening a closed gate.

**2. Then fan out three to five, each alone.** Spawned together, none seeing another's
findings. An evaluator who has read somebody else's list anchors to it and stops looking.

**3. One lens each, never "usability".** Five evaluators on usability produce five copies of
the most obvious answer. Split them: visibility of state · match to the real world and to the
glossary · user control and freedom · consistency · error prevention and recovery.

**4. Walk the use cases cognitively.** At each step: would the person know what to do, and
would they know it worked? These are two different failures and the second is the quieter one.

**5. Write findings as observations, not instructions.** *"The confirmation does not name the
recipient, so an error is only discoverable after the transfer"* — not *"add the recipient
name"*. You report; you do not redesign.

**6. Merge afterwards, collapsing duplicates into one finding naming many locations.** Five
reports of the same cause is one finding with five addresses.

**7. Write down where you looked even when you found nothing.** A check that rewarded findings
would reward inventing them. What is required is the report, not the count.

## What good looks like

Every finding names a location, a severity and what a person would experience. No finding
proposes a redesign. A clean package produces a report saying where it was looked at.

## Common failures

**Reading the rationale first.** Then you are reviewing the argument, not the screen.

**All five lenses on the same question.** Five copies of one answer.

**Fixing what you find.** An audit that writes is not an audit.

## Done when

```bash
node <pica>/roles/evaluator/scripts/pre-gate-lens-check.mjs .pica/state.json
```

returns zero findings — a lens ran, it is dated before the gate, and its report exists.
