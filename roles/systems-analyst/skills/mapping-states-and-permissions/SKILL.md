---
name: mapping-states-and-permissions
description: Build the state machine and the role × action × object matrix — including the transitions that must never happen and the permissions nobody holds.
argument-hint: "[the domain model and the roles]"
intent: >-
  States and permissions are the two places where a gap is invisible in prose and obvious in a
  table. Drawn as a matrix, the holes announce themselves.
theme: specification
best_for:
  - "Finding the state nobody thought about — usually empty or partially-failed"
  - "Answering 'who can do this' before the build answers it by accident"
  - "Giving the designer a list of screens they would not have invented"
scenarios:
  - "What happens to a payment that was approved and then the account closed?"
  - "Can a submitter approve their own request?"
estimated_time: "2–3 hours"
---

## Purpose

Every state you declare here becomes a screen somebody has to draw. Every one you miss becomes
a screen somebody improvises during the build.

## The method

**1. List the states per entity, as adjectives the business uses.** `draft`, `submitted`,
`approved`, `settled`, `reversed`. If the business has no word for it, question whether it is
a state or an implementation detail.

**2. Draw the transitions as a table, not a diagram.** From-state × to-state, with the trigger
and the actor. A table has holes you can see; a diagram hides them behind layout.

**3. Name the forbidden transitions explicitly.** `settled → draft` is not merely absent, it is
**forbidden**, and the difference matters: absent means nobody thought about it, forbidden
means somebody decided. Write the forbidden ones down.

**4. Build the permission matrix as role × action × object.** Every cell gets yes, no, or a
condition. An empty cell is an unanswered question, and unanswered defaults to yes during
implementation.

**5. Write the conditions as rules, not as prose.** *"Approver ≠ submitter"* is a rule the
build can enforce and a check can verify. *"A different person should approve"* is a hope.

**6. Check every state is reachable and every state can be left.** A state with no way in is
dead; a state with no way out is a trap, and it will be discovered by a user.

## What good looks like

The transition table has no unexplained holes. Every forbidden transition is labelled as
forbidden rather than simply missing. Every permission cell is filled.

## Common failures

**Only the happy states.** `pending`, `failed`, `partially-applied` and `expired` are where the
work is.

**Permissions as prose.** *"Managers can approve"* leaves out amount limits, delegation, and
what happens when the manager is the submitter.

**Forgetting the empty state is a state.** It is the first screen every new user sees.

## Done when

```bash
node <pica>/roles/systems-analyst/scripts/permissions-check.mjs .pica/state.json
node <pica>/roles/systems-analyst/scripts/process-check.mjs .pica/state.json
```

both return zero findings.
