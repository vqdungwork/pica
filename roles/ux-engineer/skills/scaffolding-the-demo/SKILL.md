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

## Declare the runners on day one

Write `.pica/runners.json` when the demo first serves, not at the end. It is how the project tells
the runner the things only the project knows — where the app runs, which selector is its dialog,
which part of the page is its own review chrome — and without it those checks abstain.

```json
{
  "serve": { "cmd": "npm run dev", "cwd": "demo", "url": "http://localhost:5173/" },
  "build": { "cmd": "npm run build", "cwd": "demo", "out": "demo/dist" },
  "substitutions": {
    "<servedDemo>": "http://localhost:5173/",
    "<everyScreenAndState>": "demo/scripts/screens.mjs",
    "<knownRoute>": "scr=WL-02&state=success",
    "<harnessChrome>": ".devbar",
    "<targetFloor>": "48",
    "<frame>": ".frame", "<primary>": "main", "<dialog>": "[role=dialog]",
    "<opener>": "[data-confirm-open]", "<baselines>": "demo/.baselines", "<srcDir>": "demo/src"
  }
}
```

**Why this and not the project's own npm scripts.** One finished project wired every one of those
checks into its `package.json` with a hardcoded localhost URL and a hardcoded path into the plugin
cache, and ran them itself — 94 routes, 376 renders, exit 0. All of it real, all of it passing, and
the closing report said twenty-one of twenty-nine design checks abstained, because the runner had no
way to fill `<servedDemo>` or guess a selector. **Evidence that exists only in a side channel is
evidence nobody will find.**

`<targetFloor>` comes from the audience profile, not from a default. `<harnessChrome>` is whatever
the demo's own screen and state pickers live in — without it, target-size-check measures the review
toolbar and reports a dozen defects in chrome the client never sees.

## Every script in the chain must be able to fail

A demo's check chain is joined with `&&`, so anything that exits 0 unconditionally is a gap with a
green tick beside it. One project's `target-sizes.mjs` printed the dimensions of seven hand-picked
selectors and returned success every time it ran.

Every script the chain calls either asserts and exits non-zero, or prints that it SKIPPED and says
that a skip is not a pass. Prefer pica's own checks over a local script: a local one drifts, and
nothing mutates it.

## Done when

```bash
node <pica>/roles/ux-engineer/scripts/capture-html-reference.mjs --dir html --out .audit
node <pica>/core/scripts/pica-verify.mjs .pica/state.json --phase design --evidence
```

returns zero findings — and a human has opened every screen at every viewport and clicked the
main flow, which no check can do.
