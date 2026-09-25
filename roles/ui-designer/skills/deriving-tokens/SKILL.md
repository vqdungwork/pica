---
name: deriving-tokens
description: Turn the chosen direction into a token set with roles, a real scale, and accessibility built into the foundations rather than audited at the end.
argument-hint: "[the chosen style tile]"
intent: >-
  Tokens are the interface between a decision and everything that implements it. Named by role
  rather than by value, they carry the contrast guarantee forward so every component inherits
  it instead of re-proving it.
theme: direction
best_for:
  - "Turning an approved tile into something the build can consume"
  - "Making dark mode a variable swap rather than a second design"
  - "Ensuring a component cannot be built out of compliance"
scenarios:
  - "They picked direction B. What does engineering get?"
  - "How do we stop people hardcoding hexes?"
estimated_time: "3–5 hours"
---

## Purpose

A token named `blue-500` describes a colour. A token named `surface-raised` describes a
decision. Only the second survives a direction change, and only the second can carry a contrast
guarantee.

## The method

**1. Name by role, in three tiers.** Primitive (`grey-900`) → semantic (`text-primary`) →
component (`button-bg-hover`). Components reference semantic tokens, never primitives. This is
what makes a theme swap possible.

**2. Build the scale, do not enumerate sizes.** A type scale is a ratio applied to a base, and
a spacing scale is a step. Twelve arbitrary spacing values is not a scale; it is a list of
things somebody needed once.

**3. Define both themes at the token layer.** Light defines every token; dark redefines only
the values. A component that reads a token works in both without knowing they exist.

**4. Prove every semantic pairing against contrast, and record it.** `text-primary` on
`surface-default`, on `surface-raised`, on `surface-sunken`. Where a pairing fails, fix the
token rather than documenting an exception — an exception is an instruction to ignore the gate.

**5. Encode the audience floor.** If the audience profile set a minimum type size or target
size, it becomes a token value, not a guideline. A floor written in prose is a floor somebody
will design under.

**6. Emit machine-readable.** JSON or Style Dictionary, from which both the CSS and the Figma
Variables are generated. A token set that exists twice will disagree within a fortnight.

## What good looks like

No component references a primitive. Dark mode redefines values and nothing else. Every
semantic foreground/background pairing has a measured ratio recorded beside it.

## Common failures

**Colour names as token names.** `blue-500` outlives the direction that chose blue.

**Tokens typed twice.** Once for code, once for Figma. They diverge.

**Contrast exceptions.** An exception in the foundations is inherited by everything built on
them.

## Done when

```bash
node <pica>/roles/ui-designer/scripts/palette-check.mjs .pica/state.json
node <pica>/roles/ux-engineer/scripts/foundations-check.mjs html/design-system.html tokens/tokens.json .pica/state.json
```

both return zero findings.
