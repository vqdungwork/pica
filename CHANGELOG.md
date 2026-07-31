# Changelog

## 0.1.0

First release. Extracted from one real client design pilot: a fixed-scope mobile app redesign delivered
against a 24 hour cap.

### The flow

Nine steps across six commands. `/pica` covers intake, research, the HTML UI kit and the Figma
foundations in one sitting. `/pica-wp`, `/pica-port`, `/pica-review`, `/pica-prototype` and `/pica-close`
each have their own entry point, because a multi-day project does not fit in one session.

Figma is declared in or out of scope at intake, and every work package still needs its own approval
before porting.

### Enforced by hook, not by instruction

- A `SessionStart` hook injects six non-negotiables into every session and re-injects them after a
  context compaction. Rules that live only in conversation decay inside a long session; on the source
  project one agreed on day one had to be demanded again on day two.
- A `PreToolUse` gate on `mcp__figma__use_figma` denies writes when the target work package has no HTML
  approval, while a review is running in report mode, after delivery, or without the `figma-use` skill
  loaded. Read-only scripts pass during a report-mode review.
- Approvals live in `.pica/state.json`, because a shell script cannot know that a human said yes out
  loud. With no state file, the gate stays out of the way entirely.

### Rules

Five modules, each readable on its own: `research.md`, `html-prototype.md`, `figma-elements.md`,
`figma-screens.md`, `review-gates.md`.

The Figma rules are the ones with the most hours behind them. They cover the two-layer variable
architecture, numeric font weights (a name-matched weight collapses to Regular on a family swap: 18
styles and 1753 of 1757 nodes, silently), the global and local component tiers, the constraint that you
cannot add a child to an instance, the circle-to-oval trap, and eleven Plugin API calls that return
success and produce a wrong result.

### Verification

`scripts/capture-html-reference.mjs` records true text-run rectangles via range geometry rather than
element boxes. `scripts/figma-audit.js` runs seventeen checks as one call, and everything must return
zero.

Position is compared; size is not. The HTML glyph ink box and the Figma line box measure different
things, and comparing them produced 120 phantom findings on a substantially correct file.

### Known limits

- One project of evidence. The HTML half is better tested than the Figma half.
- Mobile-shaped. No desktop or web variant.
- No motion design, no code generation, no token export to a codebase.
- The write gate classifies scripts as reads or writes by pattern matching the Plugin API calls in them.
  It is deliberately cautious, so an unusual write formulation could slip past.
