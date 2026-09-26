---
name: running-a-cognitive-walkthrough
description: Walk one task, one step at a time, asking the four questions that predict whether a first-time user gets through it — an inspection method for when no real user is available.
argument-hint: "[one task as a goal, the actor, and something clickable]"
intent: >-
  Heuristic evaluation asks whether a screen obeys principles; it is the only usability method
  pica runs, and it finds broad problems across a surface. It does not find the specific step
  where a person stops, because it never walks a task. The two are the standard pair and each
  finds what the other misses — running one and calling the product evaluated is how a build
  passes every review and fails the first person who tries to use it.
theme: evaluate
best_for:
  - "A finished flow, before anyone outside sees it"
  - "A task the client described in their own words at intake"
  - "Any screen whose defects are about sequence rather than appearance"
scenarios:
  - "Every heuristic passed and a first-time user still could not finish the task"
  - "No real users are available and the build is about to be handed over"
  - "A flow reads correctly screen by screen and fails as a sequence"
estimated_time: "45–60 minutes for one task of eight to twelve steps"
---

## Purpose

Heuristic evaluation asks whether a screen obeys good principles. A cognitive walkthrough asks
something narrower and harder: **will a person who has never seen this get through this task?**
The two find different defects and neither replaces the other — heuristics find broad problems
across a screen, a walkthrough finds the specific step where a real person stops. Running both is
the standard combination, and it is deliberately cheap: it needs a task, a screen and an hour, and
it works before anything ships.

**Neither is user testing.** Inspection methods recognise a large share of usability problems and
exist precisely because users are not always available. They cannot tell you whether anyone wants
the thing, and they cannot find what a practitioner spots in one second. Say so in the report,
every time. A walkthrough that gets written up as "tested" is worse than one never run.

## Input

**Needs:** one task, stated as a goal in the user's words, not as a feature; the actor from
`state.audience` (what they know, what they have done before, what they are holding); and a built,
clickable thing. **Never the person who designed it, alone** — they cannot un-know the design.

## The method

**1. Write the task as a goal.** *"Confirm what I actually did today before I go home"*, not
*"use the confirmation screen"*. If the task can only be phrased with the product's own nouns, the
walkthrough will pass by construction.

**2. List the correct action sequence, one step per action.** Six to twelve steps. Longer than
that is two tasks; shorter is usually a step being skipped because it seems obvious, and the
obvious steps are where walkthroughs find things.

**3. At every step, ask the four questions, and answer each with a story.**

| | Question | What a failure looks like |
|---|---|---|
| Q1 | Will they try to achieve this effect? | the step exists for the system's benefit, not theirs |
| Q2 | Will they notice the action is available? | the control is below the fold, off-canvas, or looks like text |
| Q3 | Will they connect that action with the effect they want? | the label names the mechanism, not the outcome |
| Q4 | After acting, will they see progress? | the screen changes in a way they cannot tie to what they did — or does not change at all |

A **yes** needs a reason, not a nod. A **no** is a finding, recorded with the step, the question,
and what the person would do instead — the wrong turn is the actionable part, not the verdict.

**4. Walk the failure paths too.** The empty case, the second visit, the interruption, the one
where the data is stale. Most walkthroughs cover the happy path and stop, and most real failures
are not on it.

**5. Report per step, not per screen.** "Step 4, Q3: the button says *Xác nhận cuối ngày* but the
person is deciding about eleven specific items; they cannot tell whether it confirms all of them
or opens something." That is fixable. "The confirm screen is confusing" is not.

## What good looks like

Every step has four answers. At least one is **no** — a walkthrough where everything passes was
run by someone who already knew the answer. Q4 is answered from what is actually on screen after
the action, not from what the designer intended to happen.

## Common failures

**Walking it as the designer.** You know where the button is. Recruit someone who does not, or at
minimum walk the version you have not opened today.

**Answering Q2 from the DOM.** "The control is there" answers a different question than "they will
notice it". Notice is about the fold, the contrast, and what the eye does first.

**Skipping the step before the first one.** How did they get to this screen? Several tasks fail
before step 1, and a walkthrough that starts at the right screen never sees it.

**Reporting it as testing.** Write the limitation into the document: no human has used this.

## Done when

Every step in the sequence has four recorded answers with reasons; the failure paths are walked;
each **no** names the step, the question and the wrong turn; and the report states plainly that no
real user has used the thing yet.
