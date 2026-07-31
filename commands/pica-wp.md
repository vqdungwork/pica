# pica-wp: build one work package in HTML

Step 5. The package named in `$ARGUMENTS`. If empty, list the packages from `.pica/state.json` with their
tiers and ask which one.

Load `${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/html-prototype.md` and
`${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/review-gates.md`.

This command **never writes to Figma.** Porting is `/pica-port`, and it is blocked until the gate below
passes.

---

## Branch on tier

Read the package's `tier` from `.pica/state.json`.

### If `complex`

Do all four, in order. Do not shortcut to building because an option looks obvious.

**1. Re-read the requirement.** The brief and `docs/contract.md` for this package, plus
`docs/exclusions.md`. Not your memory of them.

**2. Research precedent, and cite it.** Name real products and real conventions. Quote platform
guidelines where they apply. "Best practice suggests" is not research.

**3. Build 2 to 3 genuinely different options** in HTML. Different information architecture or different
interaction model, not three colourways of one idea. Each as its own tab in `review.html`.

**4. Run the panel.** Four agents, four lenses, **each blind to the others' findings.** Use
`dispatching-parallel-agents` if superpowers is installed; otherwise spawn them directly.

| Lens | Brief |
|---|---|
| Usability | Task-based walkthrough of each option. Where does a user stall, hesitate, or choose wrong |
| Platform and accessibility | Platform conventions, contrast, touch targets, focus order, screen-reader order |
| Product and business | Does each option serve the stated goal. What does being wrong cost. What would you measure |
| Developer feasibility | Can the existing backend deliver this. What does each option promise that no API provides |

Write `docs/<wp>-options-report.md`. **Report the disagreements between lenses; do not reconcile them
into one recommendation.** The split is the useful part.

Present the options and the findings. **Stop. The human chooses.** Record the choice and its reasoning
in `docs/rationale.md`.

### If `standard`

Straight to build.

---

## Build

**1. State matrix first.** Write `docs/<wp>-state-matrix.md`: every screen against every state. Minimum:
default, loading, empty, error, disabled, keyboard-open, focus. Video or live surfaces add buffering,
connection lost, casting, and the fullscreen orientation pair.

Do this before drawing. It is the cheapest way to avoid finding a missing state at handoff.

**2. Build the screens** in `html/<wp>.html` at the declared frame size from `.pica/state.json`.

- Consume kit components. A one-off built inline is a review finding, not a shortcut.
- **Real assets.** No emoji for icons, no unrelated stock imagery, real brand marks on social buttons.
  Label anything genuinely unavailable as a placeholder in the frame.
- Screens taller than the viewport ship as a **pair**: interactive with real scrolling and pinned chrome,
  and full-height with no home indicator. **Never a third mid-scroll version.**
- Length-realistic copy for the shipping locale.
- Hold one content-edge inset across every row. If the reference itself breaks its grid, fix the
  reference; faithful to broken is still broken.

**3. Add the tab** to `html/review.html`.

**4. Self-review, and say what you checked.** Against the state matrix, the grid, the kit, and the
acceptance criteria for this package in `docs/contract.md`. State findings, including "none". Never
report complete on work you have not verified.

---

## GATE 5

Present the package. Point at the review page and name the tabs.

**Stop. Wait for explicit approval of this package's HTML.**

Only when the human approves, set in `.pica/state.json`:

```json
"workPackages": { "<wp>": { "htmlApproved": true } }
```

Approval means they said so. Not that they went quiet, not that they moved on to another topic, not that
it looks finished to you. If you are unsure whether a message was approval, ask.

Then tell them `/pica-port <wp>` is now unblocked, or that the project is HTML-only and the next package
is next.
