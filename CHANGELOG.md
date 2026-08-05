# Changelog

## 0.4.0

**The checks 0.3.0 documented now exist, and they run before the human is asked to approve anything.**

0.3.0 described a viewport parity check and a geometry diff in full — two passes, subtree pruning,
tolerance calibration, pass criteria. Neither shipped. Both existed only inside the project the rules were
derived from, so anyone installing the plugin read a rule instructing them to run something that was not
there. The 0.3.0 coverage audit did not catch this because it graded whether concepts were *documented*.

Six findings, all of the same shape: **a rule that names a check, with nothing behind it.**

- **F37 — the parity check and geometry diff did not ship.** Now in `skills/design-flow/scripts/`,
  generalized off the source project. `geometry-diff.mjs` takes its Figma-to-HTML frame mapping from
  `frameMap` in state rather than a hardcoded table.
- **F38 — the HTML was never measured.** `/pica-wp` ran no check at all; measurement began at
  `/pica-port`. An HTML-only project (`figmaInScope: false`) therefore received *no* verification, while
  "HTML is the source of truth" remained the first rule in the skill. New `verify-html.mjs` runs inside
  `/pica-wp` before GATE 5, checking viewport tagging, horizontal overflow, the tall-screen pair and
  viewport coverage. It is the gate an HTML-only project ends on.
- **F39 — the capture script's frame selector defaulted to `.phone`.** A mobile-only holdover. Any
  project whose frames were not called `.phone` captured **zero frames**, logged it as ordinary output,
  wrote a well-formed empty artefact, and passed every downstream check. The default is now
  `[data-viewport]`, so one attribute both locates the frame and names its viewport, and the capture
  **refuses to write** an empty reference.
- **F40 — the geometry diff reported success for work it had not done.** An unmapped frame was a `SKIP`,
  not a finding, so a project with no frame map compared zero runs, printed "0 over tolerance" and exited
  0. Unmapped is now a finding, an empty `frameMap` refuses to start, and zero comparisons is a failure.
- **F41 — `viewport` was captured but inert.** The tag was implemented in 0.3.0 and never used: no HTML
  carried it, every consumer fell back to matching frame width, and nothing complained. A fallback that
  always fires makes the tag decorative. Untagged is now a finding.
- **F42 — a contradiction survived in a second file.** `pica-wp.md` still said a full-height frame
  carries "no home indicator", reversed by 0.2.0 and corrected in `html-prototype.md` for 0.3.0. Five
  files said present, one said absent. A concept-grep audit cannot find a contradiction, because both
  sides of it are on-topic.

### Every check now fails closed

A selector matching nothing, an empty frame map, a comparison of zero nodes — each exits non-zero rather
than printing a reassuring number. All three paths are negative-tested: broken on purpose, confirmed to
report. A check never seen to fail has not been tested.

### The flow says what it always meant

Restructured into three phases. **A — establish** (contract, tokens, HTML kit). **B — design and verify**
(build, measure, look, approve) — this phase is the deliverable and an HTML-only project ends here, fully
verified. **C — Figma, optional**, entirely downstream of an approved package. Foundations-into-Figma moved
from step 4 into Phase C: it sat ahead of every HTML approval gate, which made the optional phase read as
mandatory.

### Also

- `parity-check.mjs`: the "registered reflow" counter was never incremented and always printed 0 despite
  49 active notes; it now reports boxes pruned. Text parity is documented as **advisory by design** rather
  than pending implementation — owner attribution works, and what remains is copy that differs between
  viewports, which nothing measurable can adjudicate.
- `geometry-diff.mjs`: `text-align: start` and `end` are no longer flagged as needing tolerance review.
  They are the computed values of left and right in an LTR document and carry no extra error; flagging
  them made two thirds of a report look suspect. Only `center` and `justify` are annotated.
- **Audit for executability, not for mention.** New rule: if a rule names a check, the executable ships
  and the rule states its command line and pass criterion.

## 0.3.0

Third project of evidence, and the first that is **not mobile-only**: a desktop-shaped recruitment web
application taken from a real PRD, designed in HTML at two declared viewports and ported to Figma in full
— 33 frames, 108 variables, 12 text styles, 37 component variants, two wired prototypes.

**35 findings.** Four contradicted the 0.3.0 design as originally reasoned. The most valuable ones were
found by a human looking at a rendered frame after every automated check had returned zero.

### Multi-viewport

`frameSize` becomes **`viewports`**, an ordered list. One entry means byte-identical behaviour to 0.2.0;
two or more activates sections per viewport, a prototype page per viewport, and the parity check.

Each viewport declares its **`idiom`** — native app, mobile web bare, or mobile web in a device frame —
and its own `chrome`, `pointer`, `breakpoints` and `grid`.

**Chrome is declared, never defaulted.** 0.2.0's list was not "the mobile contract", it was *the
native-iOS-app contract*. A width of 375 says nothing about whether a home indicator belongs. Entries
carry `required` and **two** pin axes, because a sidebar pins horizontally and stretches vertically.

The corollary that cost two rounds: **a rule saying "declare X" is violated just as much by an assistant
quietly declaring X as by nobody declaring it.** The register records who declared it.

### Responsive prototypes

`@container`, never a width `@media` — every viewport renders in one browser window, so a width media
query fires for all columns at once and the narrow column ports as the wide one. `container-type:
inline-size` contains the inline axis only, so the tall-screen hug pair still works.

`@container` carries **no specificity**: a component base class declared later wins. Hit three times in
one stylesheet. Prefer **CSS Grid with named areas** for anything that reflows — a flex row cannot promote
a nested child to full width, and grid keeps both viewports on identical markup.

### The tall-screen pair, enforced

Specified in two rule files since 0.1.0 and implemented in neither: **8 of 25 screens** overflowed their
viewport by 212–614px. Now a checklist item, thresholded at 24px, generated by cloning so the pair cannot
drift, and understood by the parity check as one screen rather than two.

### Verification: two passes, not one

**"Eyeballing finds the wrong things and misses the real ones" is true and incomplete.** This project
produced evidence for it *and its converse* in one afternoon.

- **A position diff cannot detect absence.** A clipped node still reports coordinates, so a 397-run
  geometry diff called a frame "over tolerance" while a third of its content was missing.
- Two cheap checks close the gap: per-frame **text-run counts** against the reference, and **content
  height vs container height** on every vertical auto-layout node. The count check flagged 8 frames and
  every flag was real — including an invisible stray text node on every instance of a component.
- **Calibrate the tolerance.** The HTML capture cannot see `<input>` values, and inline `<strong>` splits
  one line into three runs. Uncalibrated, the check fires forever on correct frames.
- **A green check is not evidence the check works.** A clone-integrity check compared counts across pages,
  where `findAll` under-reports — it could not fail meaningfully *or* pass meaningfully. Assert a check
  against a known bad case first.
- Definition of done now includes **every frame rendered and looked at, per viewport**, as a line separate
  from "audit returns zero".

### Plugin API traps that return success and a wrong result

`findAll` under-reports instance children on a non-current page **and on a node created in the same call**
— so clone in one call and wire in the next. Node identity is not stable across lookups, so `===` on nodes
silently matches nothing. `layoutGrow` is primary-axis relative, so re-parenting reinterprets it, and
removing it yields `FIXED` not `HUG`. `vectorPaths` takes no arcs and **scales geometry to the node box**,
so icons sized to their CSS box come out twice too heavy. `reactions` needs the plural `actions`.

### The capture script carries the data the checks need

`capture-html-reference.mjs` now records, per frame: `viewport` and `hug` **tagged, never parsed** from
the caption; `contentH` and `overflowX` so clipped content is measurable; each text run's **owning
element and text-align**; and each box's **depth and nearest classed parent**.

Those last two are not polish — without the owner, text inside a registered reflow reports as drift
forever; without the parent chain, excusing a component cannot excuse its descendants. With them the
parity check went from **305 raw deltas to 0 findings** on the source project. It also skips the
storybook, which is a documentation board and yields no frames.

One subtlety worth the comment it carries: the parent must be the nearest **classed** ancestor.
Unclassed elements are not recorded, so an unclassed wrapper — a `<td>` around a score pill — silently
breaks the chain and defeats the pruning.

### Known limits

- Three projects of evidence, one of them a spike rather than a delivered engagement.
- The geometry diff's **x-axis** comparison is still uncalibrated for centred and FILL text. The
  capture now records `text-align` so it *can* be, but the diff does not yet use it.
- The Figma half remains less exercised than the HTML half, now across two design systems rather than
  one.


## 0.2.0

Second project of evidence: a client review of the 0.1.0 pilot output, then the repair pass. The client
raised two items. **0.1.0 would have caught neither**, and the repair pass introduced a worse defect than
the ones it fixed. Both facts drove this release.

### The client's two items, and why they were missed

**Incomplete variable bindings** — all four corner radii, horizontal and vertical padding, border width,
fills and strokes. 0.1.0 bound type thoroughly and geometry not at all: the 17-check audit had nothing for
radius, padding or stroke weight. Worse, the prescribed primitives were `Colors`, `Spacing`, `Radius`,
`Typography` with **no `Border` collection**, so there was nothing to bind a border width to. Pica's own
architecture produced the finding.

**Alignment and centring, particularly icons inside input fields.** 0.1.0 required button labels centred
horizontally and said nothing about vertical centring anywhere.

### Added

- **`Border` primitives** (`hairline` 1, `default` 1.5, `emphasis` 2, scoped `STROKE_FLOAT`).
- **Geometry binding rules and checks** for all four corner radii individually, all four padding sides,
  `strokeWeight`, and fills and strokes matched on **RGBA**. Two detector traps documented: binding
  `strokeWeight` leaves `boundVariables.strokeWeight` undefined and writes four per-side keys instead, and
  `COMPONENT_SET` geometry is variant-set chrome rather than design.
- **`rawValueExemptions`** in state, so "raw values only where no suitable token exists" is auditable
  instead of aspirational. Brand marks and SVG icon internals are always exempt.
- **Alpha belongs in the token.** `setBoundVariableForPaint` makes the variable's RGBA authoritative and
  **overwrites `paint.opacity`**: a paint at 0.30 bound to an opaque token returns 1.0. A colour matcher
  keyed on RGB cannot see this, so a bulk binding pass flattened six full-screen scrims to solid black and
  hid the content behind every bottom sheet — while every existence check returned zero. Prescribes
  `scrim`, `overlay/pill`, `overlay/control`, `overlay/track` as alpha-bearing tokens, because a manual
  opacity on a bound paint is an override that re-resolves away.
- **`scripts/capture-baseline.js`** and the rule behind it: capture resolved RGBA before any bulk
  mutation, diff after. The audit proves structure; only a baseline proves appearance. Figma version
  history is not readable from the Plugin API, so a missed baseline means the original values are gone.
- **`rules/figma-mcp.md`**, new module. Rate limits by seat and plan, `use_figma` **not** being exempt,
  `whoami` to size the budget at intake, per-minute versus daily diagnosis, and no parallel fan-out. One
  review session exhausted an Education daily allowance in about seventy calls.
- **`page.loadAsync()`** for whole-file reads: a ten-page audit in one call instead of ten. Works for
  writes too. `setCurrentPageAsync` is still required where deep instance traversal matters.
- **Vertical alignment rules.** Icons centre on the **control**, not the component, because an input is
  label plus field plus error and its centre is nowhere near the field's — with a field-height slot bound
  to `input/height`. A trailing icon belongs **inside** the component: the reported eye icon was positioned
  absolutely on the screen, so it sat 4px low on four screens and 16px high on the fifth where the error
  state pushes the field down 20px. Centring a text box is not centring its glyphs. Siblings that must
  match height use `FILL`, keeping content top-aligned so icons stay on a baseline.
- **Screen chrome pins to its edge.** `STRETCH/MAX` constraints, plus `ABSOLUTE` positioning inside
  auto-layout. All 68 home indicators in the source file sat at `MIN/MIN`, pinned to the top, and looked
  correct only because every frame happened to be 812 tall.
- **`/pica-feedback`**, new command. Triaging someone else's claims is a different job from auditing your
  own work: verify before accepting, classify each item as confirmed, false positive, true-with-a-different-cause
  or not reproducible, keep their scope separate from what you noticed, and look for the convention already
  in the file before inventing a value.
- **Audit integrity**, five rules from real false clean results: report what your filter excluded, never
  write an empty `catch`, never compare floats with `===`, assert the intended value rather than
  "different from broken", and stop after three failed detectors.
- **Registers, because a rule with no register is a preference.** Reviewing 0.1.0 against its own standard
  found six rules that said something "must be written down" with nowhere to write it, so nothing could
  check them. `state.json` now carries `exclusions`, `deviations`, `rawValueExemptions` and `bannedChars`
  alongside the keys the hooks read, and the audit reads them:
  - **`deviations`** closes the biggest hole. "Every deviation from the HTML is recorded as a decision with
    a reason" was in the definition of done and was unfalsifiable. The geometry diff now classifies each
    delta as a finding or a recorded decision, entries name a person rather than saying "intentional", and
    `by: "html-fix-pending"` is a promise that gets closed before handover.
  - **`exclusions`** gets a matchable form beside the prose in `docs/exclusions.md`, and closeout compares
    frame names against it. This is the check that would have caught the ruled-out screen that got designed
    anyway on the source project.
  - **`bannedChars`** moves from the audit script's config to intake, where the fact is actually
    established.
- **The published-number recount is now implemented.** 0.1.0 listed it as a check and shipped no code, so
  a cover claiming "45 designed screens" while counting five annotation boards would still pass. The audit
  parses claims out of the file's own text and recounts screens, components, variables and prototype links.
  Unrecognised nouns are ignored rather than guessed at, and phrases like "Step 4 of 7" are not claims.
- **12 new audit checks** and 3 new definition-of-done items.

### Changed

- **Home indicators are now required on every screen frame, hug frames included, and must be
  bottom-pinned.** 0.1.0 omitted them on hug frames on the grounds that a content board is not a viewport.
  In review that read as an oversight rather than a decision, and the `ABSOLUTE` positioning that makes it
  work on a hug frame removes the technical reason for the exception.
- The audit's screen population is now any frame whose width **or** height is the portrait dimension, so
  landscape and hug frames are included. A filter keyed on 375x812 silently excluded them and then reported
  full coverage.
- The claim that locally installed fonts are invisible to the runtime is split into two cases: installed
  **during** the session, which a Figma relaunch fixes, and genuinely unreachable, which it does not.
- Font guidance extended with package forensics. Static desktop OTFs from some foundries register **one
  family per weight** — `Chillax`, `Chillax Medium`, `Chillax Semibold` — so a single family variable
  reaches only 400 and 700 and the middle weights collapse with no error. The variable build is a third
  family name again. Includes a dependency-free `name`-table dumper, because the answer is in the font
  file, not in Figma.

### Known limits

- The alpha-token vocabulary (`overlay/pill`, `overlay/control`, `overlay/track`) comes from one project.
- `rawValueExemptions` adds an intake step. Without it the audit reports every off-scale value each run.
- The flattened-translucency check needs a corroborating signal (an overlay-ish name, or a child of the
  same colour) to stay precise, so a translucent surface over a flat background can still slip past.

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
