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
  and full-height (`· hug`) showing the whole content. Both carry the declared device chrome, the home
  indicator included — a hug frame is the same screen at a taller viewport, not a documentation board.
  **Never a third mid-scroll version.**
- **Tag every frame** `data-viewport="<name>"` matching a viewport in `.pica/state.json`. The capture
  script locates frames by that attribute and every downstream check reads the viewport from it.
- Length-realistic copy for the shipping locale.
- Hold one content-edge inset across every row. If the reference itself breaks its grid, fix the
  reference; faithful to broken is still broken.

**3. Add the tab** to `html/review.html`.

**4. Measure it. This is not optional and it is not the same as looking at it.**

Never ask for approval of HTML you have not measured. For an HTML-only project this is the only
verification the work will ever get; for a Figma project, finding these defects here costs minutes and
finding them after the port costs a rebuild.

```bash
S=<plugin>/skills/design-flow/scripts
node $S/capture-html-reference.mjs --dir html --out .audit
node $S/verify-html.mjs   .audit/html-reference.json .pica/state.json
node $S/parity-check.mjs  .audit/html-reference.json .pica/state.json   # 2+ viewports only
```

Pass criteria, all of them, no partial credit:

| Check | Passes when |
|---|---|
| capture | writes an artefact at all — it refuses on 0 frames, which means a selector matched nothing |
| `viewport-tagged` | 0 findings: every frame tagged with a declared viewport name |
| `overflow` | 0 findings: nothing extends past a frame's right edge |
| `tall-screen-pair` | 0 findings: every frame whose content exceeds its viewport by >24px has a `· hug` twin |
| `viewport-coverage` | 0 findings: every declared viewport produced frames |
| parity nominal | 0 findings: every screen exists at every viewport, or a `parityExemptions` entry says why not |
| parity structural | 0 findings: per-class element counts match across viewports, or `reflowNotes` covers the difference |

A non-zero count is a defect to fix, not a number to explain. The registers exist so that a real
decision can be recorded and the check can still return zero — reaching for a register is legitimate,
leaving a finding unregistered is not.

**Measurement does not replace looking.** These checks find what the eye misses — 83px of clipped
overflow behind a frame edge, one row silently absent from a column. They are blind to what only the eye
catches: cramped type, a label that reads wrong, a card that is technically correct and ugly. **Render
every frame and look at it, per viewport, before you present.** Both classes of defect shipped in the
project this rule came from, in both directions.

**5. Self-review, and say what you checked.** Against the state matrix, the grid, the kit, and the
acceptance criteria for this package in `docs/contract.md`. Report the check output — the actual counts,
not "checks pass". State findings, including "none". Never report complete on work you have not verified.

---

## GATE 5

Present the package. Point at the review page and name the tabs, and give the measured results from
step 4 alongside them.

**Do not present an unmeasured package.** If any check is non-zero, fix it first. Presenting HTML with
known findings asks the human to arbitrate something a script already decided.

**Stop. Wait for explicit approval of this package's HTML.**

Only when the human approves, set in `.pica/state.json`:

```json
"workPackages": { "<wp>": { "htmlApproved": true } }
```

Approval means they said so. Not that they went quiet, not that they moved on to another topic, not that
it looks finished to you. If you are unsure whether a message was approval, ask.

Then tell them `/pica-port <wp>` is now unblocked, or that the project is HTML-only and the next package
is next.
