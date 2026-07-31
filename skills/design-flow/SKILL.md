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

| # | Step | Command | Rules |
|---|---|---|---|
| 1 | Intake, brief becomes a contract | `/pica` | [research.md](rules/research.md) |
| 2 | Research and tokens | inside `/pica` | [research.md](rules/research.md) |
| 3 | UI kit in HTML | inside `/pica` | [html-prototype.md](rules/html-prototype.md) |
| 4 | Foundations into Figma | inside `/pica` | [figma-elements.md](rules/figma-elements.md) |
| 5 | Work package | `/pica-wp <name>` | [html-prototype.md](rules/html-prototype.md), [review-gates.md](rules/review-gates.md) |
| 6 | Port to Figma | `/pica-port <wp>` | [figma-screens.md](rules/figma-screens.md), [figma-elements.md](rules/figma-elements.md) |
| 7 | Review | `/pica-review [wp]` | [review-gates.md](rules/review-gates.md) |
| 8 | Prototype | `/pica-prototype` | [figma-screens.md](rules/figma-screens.md), [review-gates.md](rules/review-gates.md) |
| 9 | Closeout | `/pica-close` | [review-gates.md](rules/review-gates.md) |

Steps 1 to 4 happen in one sitting. Steps 5 to 9 recur over days, which is why each has its own entry
point: no session survives a multi-day project.

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
- Re-read the original brief at closeout, not the plan. Copies drift.

## Dependencies

| Need | For | If missing |
|---|---|---|
| nothing | steps 1, 2, 3, 5, 7 HTML-side, 9 | the core flow runs |
| Figma MCP server, which provides `figma-use` | steps 4, 6, 7 Figma-side, 8 | say those steps are unavailable, run the rest |
| playwright | the capture harness in `scripts/` | say the measured diff is unavailable, and do not silently fall back to eyeballing |
| superpowers | stronger intake and planning, plus the panel | use `brainstorming`, `writing-plans`, `dispatching-parallel-agents` when present |

Load `figma-use` **before** any `use_figma` call. It owns the API contract; this skill owns the workflow
and the failure modes that skill does not cover.

## State

`.pica/state.json` holds what the hooks read: `figmaInScope`, `delivered`, per-package `tier`,
`htmlApproved` and `ported`, plus `activeReview` and `writeAuthorization`. The commands write it.

A hook is a shell script. It cannot know the human said yes out loud, so approvals have to be on disk.

## Scripts

- `scripts/capture-html-reference.mjs` renders every HTML frame and records true text-run rectangles via
  range geometry, every element box with its classes, and computed font size and weight.
- `scripts/figma-audit.js` runs the whole audit checklist as one `use_figma` call. Everything must
  return zero.

## Rules

- [research.md](rules/research.md) intake packet, contract, exclusions, audit breadth, token provenance
- [html-prototype.md](rules/html-prototype.md) layout, the tabbed review page, the tall-screen pair, real assets, state matrices
- [figma-elements.md](rules/figma-elements.md) two token layers, numeric font weights, component tiers, instance constraints
- [figma-screens.md](rules/figma-screens.md) frames, states, alignment, CSS to auto-layout, the circle trap, API traps
- [review-gates.md](rules/review-gates.md) report versus fix, self-review, complexity routing, the panel, verification method, the audit checklist
