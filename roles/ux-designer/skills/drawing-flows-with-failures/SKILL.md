---
name: drawing-flows-with-failures
description: Draw user flows including the errors, the branches and the dead ends — the screens that otherwise get invented during the build.
argument-hint: "[the use cases and the integration contracts]"
intent: >-
  A flow drawn only through success has not been designed. The decline, the timeout and the
  permission-denied get invented by whoever hits them during implementation, at the quality of
  whoever hits them.
theme: structure
best_for:
  - "Finding the screens nobody has thought about yet"
  - "Turning integration failure contracts into interface"
  - "Making sure every screen can be left"
scenarios:
  - "What does the user see when the payment provider is down?"
  - "They clicked through and got stuck. Where do they go?"
estimated_time: "45–90 min per flow"
---

## Purpose

Two failures are invisible in a screen inventory, because an inventory lists screens and not
exits: the unhappy path, and the dead end.

## Input

**Works best with:** the use cases with their alternate flows, and the state model.
**Also useful:** the architect's integration contracts, whose `onFailure` is a screen.

## The method

**1. Draw the happy path first, then treat it as one sixth of the work.** It is the shortest
path and the least interesting one.

**2. Walk each alternate flow from the use case.** The BA already wrote these with their
triggers. Each becomes at least one screen.

**3. Walk each state from the state model.** Empty, loading, partial, error, permission-denied.
The state model was produced precisely so this list is not invented.

**4. Walk each integration's `onFailure`.** Queue and retry is a pending state with an age.
Serve stale is a badge and a timestamp. Block is a disabled control that says why. These are
requirements already written; you are drawing them.

**5. Check every terminal point.** It either completes the job or names where the person goes
next. *"Something went wrong"* with no route forward is a dead end with a sad face on it.

**6. Include the permission-denied path deliberately.** It is the one most often missing and
the one most likely to be seen by somebody senior on their first login.

## What good looks like

Every flow has at least one failure branch, or says by name that it cannot fail. Every terminal
step completes or exits. A person can walk any path and always know what to do next.

## Common failures

**Errors as a single generic screen.** Then the user learns nothing and support learns less.

**A spinner as a terminal state.** It is a dead end that looks busy.

**Treating permission-denied as an edge case.** It is a daily event in any product with roles.

## Done when

```bash
node <pica>/roles/ux-designer/scripts/flow-paths-check.mjs .pica/state.json
```

returns zero findings on `unhappy-paths` and `dead-ends`.
