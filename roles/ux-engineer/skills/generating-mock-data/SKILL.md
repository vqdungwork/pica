---
name: generating-mock-data
description: Generate the demo's data from the entity model rather than inventing it — so the demo cannot show a state the specification forbids.
argument-hint: "[the entity model and the state model]"
intent: >-
  Mock data is the quietest way a demo lies. Invented records produce shapes the domain model
  does not allow, and the client approves a behaviour nobody can build.
theme: build
best_for:
  - "Making a demo credible to somebody who knows the domain"
  - "Exercising the edge cases the layout will actually meet"
  - "Keeping the demo and the specification in agreement"
scenarios:
  - "The demo shows a portfolio. Where do the numbers come from?"
  - "The client says these figures are not realistic."
estimated_time: "3–6 hours"
---

## Purpose

Every record in the demo is an instance of an entity the systems analyst declared. If it is
not, the demo is showing something that cannot exist.

## The method

**1. Start from the entity model, one generator per entity.** Fields, types and validation
rules are already written. Reading them is faster than inventing them and produces data that
passes the same rules the build will enforce.

**2. Respect the state model.** Every record sits in a declared state, and the distribution
matters: mostly settled, a few pending, one failed, one partially applied. A dataset where
everything succeeded exercises one sixth of the interface.

**3. Generate the edge cases deliberately**, because they are what the layout meets:

| Case | Why |
|---|---|
| Longest plausible name | the one that wraps to two lines |
| Zero rows | the empty state, first thing a new user sees |
| One row | often looks broken between empty and many |
| Five hundred rows | pagination, virtualisation, the slow render |
| Negative and zero amounts | the sign, the colour, the reserved hue |
| Every locale | number formats, date order, string expansion |

**4. Make it plausible to a practitioner.** A pharmacist reads your dispensing queue in one
second and knows whether the quantities are nonsense. Domain-wrong data destroys the demo's
credibility faster than a visual defect.

**5. Keep it deterministic.** A seeded generator so the same demo shows the same data twice.
Numbers that change between two viewings make the client doubt everything else.

**6. Never use real client data.** Not a subset, not anonymised, not "just for the demo".

## What good looks like

Every record validates against the entity model. Every declared state appears at least once.
The edge cases are present by construction rather than by luck. A domain expert finds nothing
implausible.

## Common failures

**Lorem and `123.45` everywhere.** Exercises nothing.

**Only the happy state.** Then five sixths of the interface is never seen.

**Real data.** A compliance problem wearing a demo costume.

## Done when

Every generator traces to an entity, every state in the model appears, and the six edge cases
above are present in the dataset.
