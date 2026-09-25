---
name: building-a-style-tile
description: Build two or three style tiles that vary inside the sector's settled tradition — each carrying real interface, and each naming what it serves badly.
argument-hint: "[the sector, the measured benchmarks and the screen inventory]"
intent: >-
  A style tile sits deliberately between a moodboard and a mockup. A moodboard alone cannot
  establish a visual language; a full mockup starts an argument about details that do not
  matter yet.
theme: direction
best_for:
  - "Offering a real choice rather than three accent colours"
  - "Getting a direction decided before the expensive artifact is built"
  - "Making a client's taste decision defensible three weeks later"
scenarios:
  - "We need them to pick a direction before we build 40 screens."
  - "They said make it modern. Modern compared to what?"
estimated_time: "4–6 hours for the set"
---

## Purpose

The demo is the expensive artifact. Changing direction after it is built means rebuilding it,
which is why this gate exists and why it is cheap.

## Input

**Works best with:** the sector entry, the measured benchmarks, and one real screen from the
inventory.
**Also useful:** an existing brand, which constrains rather than decides.

## The method

**1. Read the sector's settled tradition first.** It names one tradition and rules out two to
four with reasons. Finance leads with Swiss typographic executed flat and rules out
glassmorphism, because translucency reduces the contrast of the one number that must be
unambiguous.

**2. Vary inside it, never across it.** Density, colour temperature, type voice. Three tiles
that are Swiss against glassmorphic against brutalist is offering two things you would refuse
to build — and the style gate fails two of them anyway.

**3. Derive each palette from what recurs across the references**, not from a colour that stood
out in one image. A palette taken from a single photograph is that photograph's palette.

**4. Prove the contrast before the tile is shown.** 4.5:1 body, 3:1 large text, 3:1 interface
components. Some traditions cannot pass by construction — neumorphism sets the control's fill
equal to the page's, so the boundary ratio is 1:1 and no shadow tuning fixes a gradient.

**5. Put real interface on the tile.** A control, an input, a container, an icon set and one
real fragment from the screen inventory. A tile carrying only colour and type is a moodboard,
and the client is reacting to a collage rather than to their product.

**6. Name what each one serves badly.** *"Dense tables at small sizes — the type scale is
generous."* A client choosing between options with no stated cost is choosing on taste with no
information, and will reopen it when somebody senior asks why.

**7. Recommend one.** After phases 1–5 the brief is settled, so you are not asking them to do
your thinking — you are asking them to confirm a taste judgement research cannot derive.

## What good looks like

Two or three tiles, one safe and one uncomfortable, all inside the sector's tradition, all
proved against contrast, each naming its cost, with one recommended and why.

## Common failures

**Three variants of one idea.** A rubber stamp with extra steps.

**Offering a ruled-out tradition.** The gate fails it, so you offered something unbuildable.

**No recommendation.** Reads as an absence of conviction.

## Done when

```bash
node <pica>/roles/ui-designer/scripts/palette-check.mjs .pica/state.json
node <pica>/roles/ui-designer/scripts/direction-spread-check.mjs .pica/state.json
```

both return zero findings.
