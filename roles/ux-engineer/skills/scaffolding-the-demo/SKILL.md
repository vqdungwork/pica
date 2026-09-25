---
name: scaffolding-the-demo
description: Build the interactive demo from the approved direction — tokens as structured data, the component library, then every screen at every viewport in every state.
argument-hint: "[the chosen direction, the screen inventory, the copy]"
intent: >-
  The demo is what the client reacts to, what the estimate is priced against, and what the Figma
  file is later ported from. Built in the right order it makes all three cheap; built screen by
  screen it makes all three expensive.
theme: build
best_for:
  - "Turning an approved direction into something clickable with real data"
  - "Producing the token set that makes the Figma port transcription rather than design"
  - "Getting measurable accessibility before anyone sees it"
scenarios:
  - "Direction approved. How do we get to a demo in a week?"
  - "The client wants to click through the admin flow."
estimated_time: "1–3 weeks depending on inventory"
---

## Purpose

On MFO, design was **132 hours of 1416** because the token set and the components already
existed as structured data when the Figma work began. That is a property of build order, not
of talent.

## The method

**1. Tokens first, as data.** Before any component. They are the thing Figma imports later and
the thing every check measures against.

**2. The component library before any screen.** Every variant and every state — including
focus, disabled, loading and error. A component completed later is a component retrofitted into
twenty screens.

**3. Take the copy from the content designer, not from your head.** Build with real strings
from the first screen. Placeholder text approves layouts that break on the real thing, and the
40-character label should be found here rather than in production.

**4. Generate mock data from the entity model.** Never invent it. Invented data produces shapes
the specification does not support, and a demo that shows an impossible state is a demo that
will be asked for.

**5. Then screens, inventory order, every viewport, every state.** Not "the important ones
first" — the inventory is the commitment and the order is arbitrary.

**6. Wire the flows from the UX designer's user flows**, including the failure branches. A demo
that only walks the happy path demonstrates the third of the product that was never in doubt.

**7. Run the gates against the running build, continuously.** Contrast, target size, state
coverage, viewport parity. They are cheap while you are in the file and expensive afterwards.

## What good looks like

Tokens exist as JSON before any component. No screen contains a hardcoded colour. Every state
in the model is reachable by URL. The whole story clicks end to end, including what happens
when the integration is down.

## Common failures

**Screens before components.** Twenty screens to update when the button changes.

**Lorem ipsum.** Approves a layout that does not exist.

**Invented mock data.** Shows states the domain model forbids.

**Gates at the end.** Then a contrast failure is a re-theme rather than a token edit.

## Done when

```bash
node <pica>/roles/ux-engineer/scripts/capture-html-reference.mjs --dir html --out .audit
node <pica>/core/scripts/pica-verify.mjs .pica/state.json --phase design --evidence
```

returns zero findings — and a human has opened every screen at every viewport and clicked the
main flow, which no check can do.
