---
name: porting-to-figma
description: Port an approved build into Figma as variables and components, then verify it frame by frame by measurement — where the two disagree, the build is right.
argument-hint: "[the approved build and its token file]"
intent: >-
  The design was settled in code. Your job is that the record of it is faithful and that
  somebody who attended no meeting can build from it.
theme: handover
best_for:
  - "Producing the Figma deliverable a contract lists"
  - "Making the file usable by a developer who was in no meeting"
  - "Proving parity with a number instead of a glance"
scenarios:
  - "The contract lists Figma files as a deliverable. Where do we start?"
  - "How do we know the Figma actually matches what we built?"
estimated_time: "1–2 weeks depending on inventory"
---

## Purpose

Figma is off the critical path and downstream of the build. That makes this transcription and
audit rather than design — which is why it is cheap when the build produced structured tokens,
and expensive when it did not.

## The method

**1. Import tokens as Figma Variables with semantic names.** No hardcoded colour survives into
a final component. A developer opening Dev Mode should read `--color-surface-raised`, not a
hex, because the hex tells them nothing about whether they may reuse it.

**2. Light and dark from the same variables.** Two modes, one set. A second file for dark mode
is a second design that will diverge.

**3. Build component sets before screens.** Reusable, attached, on Auto Layout and
constraints. Every variant and every state, including focus and disabled.

**4. Then screens, and key screens carry loading, empty and error.** These are in the build
already; the port is where they are usually quietly dropped because they are less satisfying to
reproduce.

**5. Verify frame by frame by measurement.** Not by looking. Where Figma and the build
disagree, **the build is right** — it is what was evaluated, what carries real content at real
lengths, and what the client clicked. A difference is a porting defect, never a design change
discovered late.

**6. Run the accessibility gates in the file.** Contrast, focus order, 44px targets. The
contract may name them; they are satisfied here by construction rather than by a later audit.

**7. Annotate what Dev Mode cannot surface.** Spacing, type, colour and component properties
appear automatically. Interaction behaviour, conditional display logic, animation specs and
content rules do not — and their absence is the developer question you answer for free later.

**8. Put the requirement id on every frame.** `SCR-14 · UC-07`. A developer filters to their
own range instead of reading the whole file and asking which parts are theirs.

## What good looks like

Every fill references a variable. Every component is attached. Every key screen carries its
three states. The parity report states numbers. Every frame names what it satisfies.

## Common failures

**Fixing a difference in Figma silently.** Now there are two sources of truth and the developer
will find the second.

**Detached components.** The library stops propagating and the file rots.

**Redesigning during the port.** A defect you find is reported, not corrected on your own
authority.

## Done when

```bash
node <pica>/roles/design-ops/scripts/geometry-diff.mjs .audit/html-reference.json .audit/figma-dump.json
node <pica>/roles/design-ops/scripts/frame-inventory-check.mjs .audit/html-reference.json .audit/figma-dump.json
```

both return zero findings.
