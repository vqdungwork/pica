---
name: choosing-a-stack
description: Argue every layer of the stack from the NFRs, the integrations and the people who will maintain it — and record why it can or cannot be replaced.
argument-hint: "[the NFRs and the integration list]"
intent: >-
  The stack gets chosen on every project. It is not always chosen on purpose. Written down
  with its argument, it becomes a decision a client can confirm; left unwritten, it is whatever
  the person who scaffolded the demo reached for.
theme: platform
best_for:
  - "Committing to a stack the client confirms in writing before development begins"
  - "Answering a no-lock-in clause with evidence rather than assertion"
  - "Giving the tech lead something to estimate against"
scenarios:
  - "What are we actually building this on, and who decided?"
  - "The contract says no vendor lock-in. How do we show that?"
estimated_time: "2–4 hours"
---

## Purpose

On the engagement this role came from, platform work was **265 hours of 1416 — nineteen per
cent** — and no role owned it. This skill is how that stops being true.

## Input

**Works best with:** the NFRs as numbers, the integration list, and who maintains it after you.
**Also useful:** what the client already runs, which is usually the strongest constraint.

## The method

**1. List the layers before you choose any.** Runtime, framework, data store, queue, auth,
hosting, CI, observability, mail. A layer you did not list is one the build will close.

**2. For each, write the argument before the choice.** Three sources are admissible: an NFR it
must meet, an integration it must speak to, and the team that will maintain it. *"What everyone
uses now"* is not an argument, and novelty is an argument against.

**3. Break ties on maintenance, not on merit.** Where two options both meet the NFRs, the one
the client's team can operate wins. You leave; they do not.

**4. Answer replaceability per choice.** Can this be swapped, and at what cost? Three entries
marked `replaceable: false` with reasons is a defensible answer. An unanswered field is not,
and a no-lock-in clause is satisfied per choice or not at all.

**5. State what you are not building.** No multi-region, no offline-first, no real-time sync,
no self-hosting. Each is a decision somebody could reasonably have expected the other way, and
unstated each becomes a change request with *"we assumed it would"* behind it.

**6. Write for the tech lead who will price it.** If a line would not change anybody's
estimate, it is not carrying its weight. No vendor comparison tables, no explanation of what
an API is.

## What good looks like

Every layer has a choice, a reason and a replaceability answer. The exclusions are as explicit
as the inclusions. A tech lead can estimate from it without asking you anything.

## Common failures

**Choosing for the CV.** The team inherits it.

**One environment.** Then production is the test environment.

**Asserting no-lock-in once, at the top.** The clause is answered per choice.

## Done when

```bash
node <pica>/roles/solution-architect/scripts/architecture-check.mjs .pica/state.json
```

returns zero findings, and the client has confirmed the stack **in writing** — which the
contract requires before development begins, and which no check can do for you.
