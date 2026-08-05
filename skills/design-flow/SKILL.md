---
name: design-flow
description: Use when doing any UI or UX design work that will be reviewed or handed off, especially when an HTML prototype has to become a Figma file. Covers intake as a contract, research and token extraction, HTML prototyping, porting to Figma, measured verification against the HTML, prototype wiring, and handover. Trigger on "design these screens", "port the HTML to Figma", "review the Figma against the HTML", "build a design system", "design handoff", or any design work with a client, a brief, or a deadline.
---

# design-flow

A gated design workflow. Prototype in HTML, port to Figma on approval, verify by measurement.

**The commands drive this.** Run `/pica` to start a project; the flow is deterministic from there. This
file is the map, and the rules are in `rules/`.

## The one non-negotiable

**HTML is the source of truth. Measure, do not eyeball.**

Every serious defect on the project this came from was invisible to visual review and obvious to
measurement: a hero 47px low across three screens, a CTA hugging its label instead of filling, a card
43px too tall, inputs at a stale fixed height clipping their own error messages, 41 text nodes bound to
no font at all on the one page the client was scoring.

All of it looked fine in a screenshot. Eyeballing finds the wrong things and misses the real ones.

## The flow

Brief becomes a contract, HTML becomes the design, measurement decides whether it is right. Figma is a
downstream rendering of an approved HTML design — never a parallel effort, never the place a decision
first gets made.

**Phase A — establish (one sitting).** Ends with a UI kit and tokens.

| # | Step | Command | Rules |
|---|---|---|---|
| 1 | Intake, brief becomes a contract. Declares `viewports` and `figmaInScope` | `/pica` | [research.md](rules/research.md) |
| 2 | Research and tokens | inside `/pica` | [research.md](rules/research.md) |
| 3 | UI kit in HTML — the design kit every screen consumes | inside `/pica` | [html-prototype.md](rules/html-prototype.md) |

**Phase B — design and verify (repeats per work package, over days).** This phase is the deliverable.
An HTML-only project ends here, having been fully verified.

| # | Step | Command | Rules |
|---|---|---|---|
| 4 | Build the package at every declared viewport | `/pica-wp <name>` | [html-prototype.md](rules/html-prototype.md) |
| 5 | **Measure it** — capture, `verify-html`, `parity-check`. All zero, or fix | inside `/pica-wp` | [review-gates.md](rules/review-gates.md) |
| 6 | Render every frame and look at it, per viewport | inside `/pica-wp` | [review-gates.md](rules/review-gates.md) |
| 7 | **GATE: human approves this package's HTML** | inside `/pica-wp` | [review-gates.md](rules/review-gates.md) |

**Phase C — Figma (optional; skip entirely when `figmaInScope` is false).** Nothing here may begin for a
package until step 7 passed for that package. The hook enforces it.

| # | Step | Command | Rules |
|---|---|---|---|
| 8 | Foundations into Figma — variables, text styles, components | inside `/pica` or before first port | [figma-elements.md](rules/figma-elements.md) |
| 9 | Port the approved package | `/pica-port <wp>` | [figma-screens.md](rules/figma-screens.md), [figma-elements.md](rules/figma-elements.md) |
| 10 | Verify against the HTML — `geometry-diff`, per frame, re-diff after each fix | inside `/pica-port` | [review-gates.md](rules/review-gates.md) |
| 11 | Review | `/pica-review [wp]` | [review-gates.md](rules/review-gates.md) |
| 12 | Prototype | `/pica-prototype` | [figma-screens.md](rules/figma-screens.md), [review-gates.md](rules/review-gates.md) |
| 13 | Closeout | `/pica-close` | [review-gates.md](rules/review-gates.md) |
| — | Feedback arrives | `/pica-feedback` | [review-gates.md](rules/review-gates.md), [figma-mcp.md](rules/figma-mcp.md) |

Foundations sat at step 4 through 0.3.0, before any HTML was approved. That put Figma writes ahead of the
gate that exists to prevent them and made the optional phase look mandatory. They belong in Phase C: the
kit is settled in HTML at step 3, and pushing it to Figma is only worth doing if Figma is in scope.

Each step from 4 on has its own entry point because no session survives a multi-day project.

`/pica-feedback` is not a step. It runs whenever someone else's review lands, before or after delivery,
and it exists because triaging a client's claims is a different job from auditing your own work: every
item has to be **verified before it is accepted**, and the fix is often a decision rather than a repair.

## Build order within a project

**variables, then text styles, then global components, then local components, then screens, then
prototype, then handoff.**

Each layer is built from the one below it. Building screens before components guarantees a rebuild.

## The gates

Four are enforced by hook and cannot be talked around:

1. No Figma write for a work package whose HTML the human has not approved.
2. No Figma write while a review is running in report mode.
3. No Figma write after delivery.
4. No `use_figma` call without the `figma-use` skill loaded and `skillNames: "figma-use"` passed.

The rest are yours to hold:

- Present limitations before capability claims.
- Self-review and **say what you checked** before handing anything back. Never report complete on work
  you have not verified.
- Verify every mutation in a **separate call**. Same-call read-back returns the in-memory value.
- **Capture an appearance baseline before any bulk mutation.** `scripts/capture-baseline.js`, then diff
  after. Existence checks cannot see a binding that changed what a node renders, and Figma version
  history is not readable from the Plugin API, so a missed baseline means the original values are gone.
- **Say what your filter excluded.** A denominator you did not verify is fiction: one screen audit
  reported "68 of 68 covered" while silently skipping every hug-height frame, which is where the missing
  element was.
- Re-read the original brief at closeout, not the plan. Copies drift.

## Dependencies

| Need | For | If missing |
|---|---|---|
| nothing | steps 1, 2, 3, 5, 7 HTML-side, 9 | the core flow runs |
| Figma MCP server, which provides `figma-use` | steps 4, 6, 7 Figma-side, 8 | say those steps are unavailable, run the rest |
| Figma seat with enough MCP calls | any Figma-side step | size the work to the budget, see [figma-mcp.md](rules/figma-mcp.md) |
| playwright | the capture harness in `scripts/` | say the measured diff is unavailable, and do not silently fall back to eyeballing |
| superpowers | stronger intake and planning, plus the panel | use `brainstorming`, `writing-plans`, `dispatching-parallel-agents` when present |

Load `figma-use` **before** any `use_figma` call. It owns the API contract; this skill owns the workflow
and the failure modes that skill does not cover.

## State

`.pica/state.json` holds two kinds of thing. The commands write both.

**Read by the hooks**, to gate writes: `figmaInScope`, `delivered`, per-package `tier`, `htmlApproved`
and `ported`, plus `activeReview` and `writeAuthorization`.

**Read by the audit**, to make judgement calls checkable: `rawValueExemptions`, `exclusions`,
`deviations`, `bannedChars`, `parityExemptions`, `reflowNotes`.

**The viewport declaration**, which everything downstream reads:

```json
"viewports": [
  { "name": "desktop", "w": 1440, "h": 900,
    "idiom": "desktop web, no device chrome",
    "pointer": true, "breakpoints": [1024],
    "chrome": [ { "name": "top-nav", "required": true, "pinH": "STRETCH", "pinV": "MIN" } ],
    "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } }
]
```

One entry behaves exactly as 0.2.0 did. Two or more activates sections per viewport, a prototype page
per viewport, the parity check and the hug pair.

Two registers exist only because multi-viewport work needs them, and each has something that reads it:

- **`parityExemptions`** — a screen deliberately absent at a viewport. `{screen, presentAt[], why}`.
  Without it the parity check reports every deliberate asymmetry forever; with it, a decision is
  distinguishable from an omission.
- **`reflowNotes`** — a component that legitimately differs across viewports. **`scope` is required**:
  either a screen name or `"*"` for chrome that reflows everywhere. A flat global list is too blunt —
  a class can reflow on one screen and be identical on another, and silencing it globally blinds the
  check where it mattered.

A hook is a shell script. It cannot know the human said yes out loud, so approvals have to be on disk.

## A rule with no register is a preference

If the flow says something "must be written down", it needs a **named key in state** and something that
reads it. Otherwise the rule is unfalsifiable: nobody can tell a deliberate exception from an oversight,
including you a week later.

This is why the audit reads `exclusions` and `deviations` rather than trusting that a document mentions
them. Prose artefacts stay — `docs/exclusions.md` is what the human reads — but the machine-checkable
list lives in state alongside it.

The audit runs inside Figma and has **no filesystem access**, so it cannot read state directly. State is
authoritative; populate the script's config block from it before pasting. Never edit the register in the
script only, or the two will drift.

## Scripts

Every check named in a rule ships here and is runnable. A rule that names a check with no executable
behind it is a rule nobody can follow — 0.3.0 shipped three such rules, documenting a parity check and a
geometry diff that existed only in the project they were written from.

**HTML side — runs in Phase B, before approval. The only verification an HTML-only project gets.**

| Script | Proves | Passes when |
|---|---|---|
| `capture-html-reference.mjs` | measurement is possible | it writes an artefact; it refuses on 0 frames rather than emitting an empty one |
| `verify-html.mjs` | the HTML is internally sound | 0 findings across viewport-tagged, overflow, tall-screen-pair, viewport-coverage |
| `parity-check.mjs` | the viewports agree | 0 findings, nominal and structural. 2+ viewports only |

The capture records true text-run rectangles via range geometry, every element box with its classes,
depth and nearest classed ancestor, computed font size and weight, each run's owning element and
text-align, and per frame the tagged viewport, hug flag, content height and horizontal overflow. Frames
are located by `data-viewport` — the same attribute that names the viewport.

**Figma side — Phase C only.**

| Script | Proves | Passes when |
|---|---|---|
| `geometry-diff.mjs` | Figma matches the HTML | 0 findings above tolerance, **and** a nonzero number of runs compared |
| `figma-audit.js` | **structure** — the whole audit checklist in one `use_figma` call | every count returns zero |
| `capture-baseline.js` | **appearance**, which the audit cannot | resolved RGBA of every paint identical before and after a bulk mutation |

**Every one of these fails closed.** A selector that matches nothing, a frame map with no entries, a
comparison of zero nodes: each exits non-zero rather than reporting a clean run. A check that cannot
tell you it did nothing is worse than no check, because its silence reads as a pass.

**None of them can detect absence.** A node never created has no coordinates, so it cannot be over
tolerance; a frame missing a third of its content still reports everything it does have as correct.
Inventory and count checks cover that, and rendering every frame and looking at it covers what no
script does.

## Rules

- [research.md](rules/research.md) intake packet, contract, exclusions, audit breadth, token provenance
- [html-prototype.md](rules/html-prototype.md) layout, the tabbed review page, the tall-screen pair, real assets, state matrices
- [figma-elements.md](rules/figma-elements.md) token layers including Border, geometry binding, alpha in tokens, numeric font weights, font-package forensics, component tiers, instance constraints
- [figma-screens.md](rules/figma-screens.md) frames, states, alignment and vertical centring, screen chrome pinning, CSS to auto-layout, the circle trap, API traps
- [figma-mcp.md](rules/figma-mcp.md) rate limits and call budget, `page.loadAsync` for whole-file reads, write discipline
- [review-gates.md](rules/review-gates.md) report versus fix, self-review, complexity routing, the panel, verification method, appearance baselines, audit integrity, the audit checklist
