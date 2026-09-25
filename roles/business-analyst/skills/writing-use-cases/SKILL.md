---
name: writing-use-cases
description: Write use cases with actors, preconditions, main and alternate flows — and group them into the feature scope a client can sign.
argument-hint: "[the process or the TO-BE model]"
intent: >-
  A use case is the unit everything downstream is counted in: screens trace to it, the estimate
  prices against it, the SOW carves by it. Written loosely, every one of those inherits the
  looseness.
theme: analysis
best_for:
  - "Turning a process model into things that can be built and counted"
  - "Producing the feature list scope is actually agreed from"
  - "Making the alternate flows explicit before design invents them"
scenarios:
  - "We have the TO-BE. How do we get to something engineering can estimate?"
  - "The client wants to know what they are paying for."
estimated_time: "20–40 min per use case"
---

## Purpose

This is where scope stops being a boundary and becomes a list. Phase 1 could only say which
areas; the feature scope says which features, and features are groups of use cases.

## Input

**Works best with:** the TO-BE process model and the business rules.
**Also useful:** the roles and permissions, which decide who the actor can be.

## The method

**1. One goal, one actor, one outcome.** A use case that serves two actors is two use cases.
The test: could these be built in different sprints by different people?

**2. Write the preconditions as state, not as narrative.** *"The payment is in `pending` and
the approver is not the submitter"* is checkable. *"The payment is ready"* is not.

**3. Number the main flow, and make every step an action by somebody.** If a step has no
actor, it is a system behaviour and belongs to the systems analyst.

**4. Write the alternate flows, and name what triggers each.** These are where the screens
nobody designed come from. An alternate flow with no trigger is a note.

**5. Write the postcondition.** What is true afterwards that was not true before. If nothing
changed, the use case did not do anything.

**6. Group into features, then cut into releases.** A feature is a set of use cases a client
would recognise as one thing. The release cut is the PM's call, but it can only happen once
this grouping exists.

**7. Give everything an ID and never reuse one.** `UC-07` stays `UC-07` even if it is dropped.
The SOW will reference these, and a reused ID makes two contracts mean different things.

## What good looks like

Every use case traces up to a pain point and down to at least one screen. Every alternate flow
names its trigger. Every feature names the use cases inside it.

## Common failures

**Use cases that are really features.** *"Manage users"* is four use cases wearing one name.

**No alternate flows.** Then the build invents them, at the quality of whoever hits them.

**Reusing an ID after dropping a requirement.** Sequential and never reused — this is what
makes the carve into SOWs possible.

## Done when

```bash
node <pica>/roles/business-analyst/scripts/trace-check.mjs .pica/state.json
node <pica>/roles/business-analyst/scripts/requirements-check.mjs .pica/state.json
```

both return zero findings.
