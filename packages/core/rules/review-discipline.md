# Review discipline

Medium-independent. These rules hold whether you are reviewing HTML, a Figma file, or
anything else pica grows to cover. Package-specific gates live with their package:
`html-gates.md` and `figma-gates.md`.
## Report is the default

A review **reads and measures. It changes nothing.** It writes only its own report file.

Fixing is a separate pass, requested explicitly. The `--fix` flag, or the human saying so.

This is not bureaucracy. Three reasons, each earned:

1. **You cannot audit a moving file.** If findings are silently fixed as they are found, the human
   cannot judge severity, cannot see the pattern, and has no record of what was wrong.
2. **An audit that writes can damage a delivered file.** On the project this came from, an audit ran as
   a write against a handed-off file and deleted a node that could not be restored.
3. **The fix is often not the one you would pick.** A contrast failure can be fixed by darkening the
   scrim or by changing the text colour. That is a design decision, not a repair.

While a report-mode review is active, the write gate denies every Figma mutation. That is enforced by
hook, not by intention.

## The self-review, which is different

Before handing **any** built work back, review it yourself and **state what you checked and what you
found**. Not "done", not "complete".

The failure this prevents: on the source project, four separate reports declared work complete when it
was visibly broken, including one that said a screen set was "fully updated" while a home screen bore
no resemblance to its HTML. Each time, the human found it by opening both and comparing. That converts
their review from verification into discovery, which is the most expensive failure mode in the whole
flow.

A self-review that finds nothing is a valid result. Say what you ran.

## Complexity routing

A work package is **complex** if any one of these holds:

- no precedent for the feature exists in the product being redesigned
- it changes information architecture or navigation
- no reference design exists to work from
- it embodies a decision the client is likely to challenge

Tier every package at intake and have the human confirm the labels. They will know which ones are
harder than they look.

## The panel, for complex packages only

Build 2 to 3 **genuinely different** options, not variations of one. Then run four agents across four
lenses, **each blind to the others' findings**:

| Lens | Asks |
|---|---|
| **Usability** | Task-based walkthrough. Where does a user stall, hesitate, or pick wrong |
| **Platform and accessibility** | Platform conventions, contrast, touch targets, focus order, screen-reader order |
| **Product and business** | Does this serve the stated goal. What does being wrong cost. What does it measure |
| **Developer feasibility** | Can the existing backend deliver this. What does the design promise that no API provides |

**Report the disagreements.** Do not reconcile them into a single recommendation. On the source
project the lenses split, and the split was the useful part: the usability lens preferred one option's
information architecture while the platform lens preferred another's safety. The human chose a hybrid
that neither lens had proposed.

The feasibility lens earns its place on its own: it found fifteen backend gaps and several claims of
component reuse that were not true.

Blindness matters. Four agents given each other's output converge, and convergence is not agreement.

## Audit integrity

An audit is code, so it fails like code. Six rules, each of which has produced a false clean result:

**1. A filter that narrows the population must report what it excluded.** A screen audit matched frames
within 3px of 375x812, reported "68 of 68 screens covered", and had silently skipped every hug-height
frame — which is exactly where the missing element was. Print the population and the exclusions, or the
denominator is fiction.

**2. Never write an empty `catch {}` in an audit or a fix script.** A swallowed error turns a failed write
into a silent success. One pass reported 12 nodes fixed; two of them had not persisted and only surfaced
two reviews later.

**3. Never compare floats with `===`.** Figma stores `0.2` as `0.20000000298023224`, so an equality check
reported a correct write as a failure and sent the whole investigation down the wrong path. Compare with a
tolerance.

**4. Assert the intended value, not "different from broken."** A check for `opacity < 1` passed nodes
sitting at `0.45` that were supposed to be `0.68`. Write the expected value into the assertion.

**5. Three failed detectors means stop.** If a detector produces mostly false positives, the next one
usually will too. One investigation went name-based (missed the case entirely), then geometric (323 hits,
almost all noise), then colour-clash (36 hits, mostly noise) before anyone went looking for ground truth.
At the third miss, stop writing detectors and find a source of truth: a surviving correct example, the
design's own convention, the human.

**6. Scope token checks to product pages.** A cover's 96px margin, an audit board's 48px gutter and a
spec table's 12/14 cell padding are not design-system values. Checking them means the audit can never
return zero, and an audit that always reports something is an audit nobody reads. Declare the
documentation pages and skip them — the first run of these checks produced roughly 900 findings, **every
one of them** on a cover, an audit board or a handoff table.

**Corollary on false positives.** Structural detectors must exclude documentation. Frames inside an
annotation or kit-coverage board carry component *names* as labels and read as detached instances; a white
glyph on a coloured logo circle reads as a contrast clash because the coloured layer is a sibling, not an
ancestor. Check for an intermediate layer before reporting.

## The blind spot has a shape: space that should not be there

A harness is good at properties of elements that exist. It is blind to what is absent, duplicated, or
merely empty. All four survivors were of that class:

| Defect | Why ten green checks missed it |
|---|---|
| three of a sheet's action rows rendered twice | every row was individually correct, and nothing counted them |
| a 16px spacer orphaned between two dividers | a spacer has no content to be wrong about |
| an open sheet leaving the sticky header undimmed | the scrim existed and was correct; the header was simply above it |
| a collapsed header leaving a 20px white strip on every screen | the header's own box measured exactly as specified |

Each got an assertion afterwards, and each new assertion **counts** rather than inspecting: no two stacked
separators anywhere, no repeated row title inside one sheet, every layer above the scrim measurably darker
once the sheet opens, no gap between a collapsed header and the content below it.

Scope a duplicate check to where repetition is genuinely wrong. Screens legitimately show the same
document under two headings, so "no repeated title" holds inside a sheet and not on a screen. A check that
has to be true everywhere gets switched off in its first week.

## Never assert a proxy

An assertion on a class, a declaration or a property passes on broken work whenever something else
overrides it. Assert the rendered outcome.

- `overflow: hidden` **does not change `scrollWidth`** or the scroll extents. An assertion keyed on
  `scrollWidth` therefore reports a decoration that is already clipped, forever, and says nothing about
  what a reviewer can see. The real fix was to move the spread into the gradient, not to loosen the check.
- A z-index assertion compared computed stacking values **with the sheet closed**, across stacking
  contexts that do not compare, and produced 38 findings on a correct file. Replaced by sampling pixels
  with the sheet open.
- A scrim comparison must be a **ratio, not an absolute drop**, because a scrim multiplies. One overlay
  took a dark header from luminance 33 to 20 and a white page from 252 to 151, so "at least 30 points
  darker" passed the page and failed the header, both wrongly. `after <= before * 0.8` holds on both.
- **A constant offset is a proxy for a measurement.** A toast positioned a fixed distance below the app bar
  landed on top of the header on exactly the two screens that replace the app bar with their own hero,
  which are the two screens people look at most. Measure whatever chrome the current screen actually has.

## Measure the state the product can actually enter

Six checks on the source project returned zero because their sample excluded the case:

- a type-scale sweep measured only the visible tab, leaving 122 group headers unmeasured
- a spacing check compared direct siblings only
- a font check looked only at the declared family, so a node bound to nothing passed
- an icon check **printed** mixed stroke widths and never counted them
- a floating-button sweep forced an app bar onto the one screen that never has one, measuring a layout
  the product cannot produce
- a contrast probe sampled the strip where a gradient ramps into white, and read about 1:1 everywhere

So print the population, print the exclusions, **and print the state you measured in**. A check that
measures a configuration the product cannot enter is worse than no check, because it produces a number.

And an **advisory that prints without counting is not an assertion.** If it cannot fail, nobody reads it
after the first week.

## Verify a new check by reintroducing the defect it was written for

Not a defect. **The** defect. Put it back, watch the check fail, note the count it reports, then take it
out again. Two checks on the source project did not fail on the first attempt:

- the group-header check exempted the `row + heading` pair, which was the exact pair that was broken.
  Restoring zero padding produced 19 failures only once the exemption was narrowed.
- the mock-data check asserted roster **membership**, so it passed on an identifier that belonged to a
  different person in the roster. It had to assert **ownership** by nearest name instead.

Corollary, and it cost an hour: **grepping for your own failure string proves nothing about whether the
check ran.** A suite that crashed before reaching a check prints the same nothing as a check that passed.
Emit one line per check, pass or fail, and count the lines.

## Check the probe before believing the result

Two of the source project's contrast probes were wrong in opposite directions, and both were believed for
a few minutes:

- one sampled the region where the background ramps into white, so every reading was about 1:1
- one hid the rows it was measuring with `visibility: hidden`, which also hides their background, so the
  numbers came out identical with and without the change under test

A surprising measurement is a claim about your instrument first. Re-derive it a second way before acting
on it.

## Contrast: compute, do not sample

Resolve both foreground and background from **token values**, following alias chains, and composite any
alpha. This catches what eyes do not: a placeholder at 2.52:1, a disabled label at 1.48:1, a scrim at
3.35:1.

Two rules the ancestor walk cannot handle:

1. **Anything positioned over a sibling image.** Media pills over a card photo are not descendants of
   the photo, so a walk finds the card's white background and computes a fictional value. Detect "sits
   over artwork" by scanning **earlier siblings** up the chain for image or gradient fills, and exclude
   those nodes from computation.
2. **Alpha that never reaches opaque.** If you accumulate alpha up the chain and hit the page before
   reaching 1.0, composite over the page background rather than returning the raw colour. Returning raw
   black for a section filled with black at 10 percent opacity reported 2.03:1 where the true figure
   was about 9.5:1.

Both were audit bugs, not design bugs. **Verify any surprising contrast result before acting on it.**

## Pixel sampling: only near native resolution

When you must measure from a render, for example text over photography:

- **Sample at or near 1:1.** A section 5280px wide reduced to 900px smears thin glyphs into the
  background. That produced a 1.26:1 reading where the real value was about 9.5:1.
- **Flat-colour regions survive downscaling; text does not.** Sample the background from a flat area and
  take the foreground from the node's own resolved fill rather than from pixels.
- **Exclude glyph pixels when measuring background.** Taking `max(luminance)` over a text region returns
  the white glyphs, not the backdrop, every time. Filter below a threshold, or sample a text-free strip.
- Report a distribution, not one number. The median tells you the typical case; the 95th percentile tells
  you the worst spot over a photograph.

## Screenshots in isolation cannot judge contrast

A node screenshot renders that node alone. A status bar with white text over a photo comes back blank
white, because the photo is a **sibling**, not an ancestor. Screenshot the parent frame.

## Colour needs measuring, and the interpolation space is part of the design

`color-mix(in oklch)` interpolates hue along an **arc**, so a dark navy mixed toward a saturated red
transits through mauve and green. It is visible, and it reads as a bug. `in oklab` is Cartesian and stays
neutral; plain sRGB stayed richest for that dark-to-saturated brand ramp. Sample the midpoints rather than
reasoning about them.

Two more that only measurement settles. **Separately painted boxes cannot continue one diagonal
gradient**, so two stacked surfaces will seam until one of them paints both. And white type over a
generated background is not one contrast question but as many as there are variants: a background with
eight generated conditions took four measured iterations before all eight cleared 4.5:1.

## Editing safely is part of verification

Three failure modes here destroyed more work on the source project than any design defect.

**Prove an anchor unique before an index-based edit.** A restructure computed string offsets from a
substring that appeared twice and cut 8,047 characters out of a file, twice, taking a tab bar, a bulk
action bar and two sheets with it. The visible symptom was a null-reference error somewhere unrelated.
`assert src.count(anchor) == 1` before any slice.

**Never use `git checkout` to undo.** It destroyed uncommitted work twice in one session, including the
edits that were about to be committed. Copy the file somewhere else first; the cost is nothing.

**When you replace a component, assert the old one is gone.** A reverted control left a stray closing tag
that browsers tolerated silently, and it mangled the next restructure of the same region. Removal is a
check, not a step.

## Recount every number you publish

A cover claiming "45 designed screens" was counting five annotation boards. Derive published figures
from a live count in the same script that writes them, so the parts always add to the total.


## A check must fail closed

Every script here exits non-zero when it could not do its job, and none of them report a clean run for
work they did not do:

- a wrap or frame selector matching nothing → the capture **refuses to write** rather than emitting a
  well-formed artefact containing zero frames
- an empty `frameMap` → the geometry diff **refuses to start** rather than skipping every frame
- zero text runs compared → the geometry diff **fails** rather than printing "0 over tolerance"
- an untagged frame reaching parity or the diff → **fails**, pointing back at `verify-html`

This is the difference between a check that returns zero and a check that *did nothing and said zero*.
Both print the same reassuring number. Through 0.3.0 the capture script's frame selector defaulted to
`.phone`, from the mobile-only era: any project whose frames were not called `.phone` captured nothing,
logged "0 frames" as ordinary output, and passed every downstream check.

**A green check is not evidence the check works.** Before trusting a new check, make it fail on purpose —
break one frame, delete one row — and confirm it reports. A check never seen to fail has not been tested.

## Every named check must ship

If a rule names a check, the executable is in `scripts/` and the rule gives its command line and its pass
criterion. 0.3.0 violated this: it documented the parity check and the geometry diff in prose, complete
with tolerances and two-pass structure, while both existed only inside the project they were derived
from. Anyone installing the plugin read a rule telling them to run something that was not there.

A coverage audit that greps for concepts cannot catch this — the concept is present and well described.
Audit for **executability**: for each named check, does the file exist, does it run, and does the rule
state what passing means?

## Measurement and review find different defects. Neither substitutes for the other.

**"Eyeballing finds the wrong things and misses the real ones" is true and incomplete.** One project
produced evidence for it and for its converse in the same afternoon:

- An 83px horizontal overflow, invisible because the frame's `overflow: hidden` clipped it. Found by
  measurement, impossible to see.
- A checkbox with no tick, a control whose labels did not fit, and a card missing its last 300px of
  content. Found by looking. **Four automated passes ran clean over exactly those frames** — verified
  by re-introducing the defect and measuring 0px of clipping.

Measurement finds clipping, overflow, misalignment and drift: defects with a numeric signature. It is
blind to *"this control does not fit its copy"*, *"this component is missing its mark"*, and *"this
card is missing three fields"*, which have none.

**An audit returning zero means no defect with a numeric signature survives. It does not mean the
design is good.** Never present it as if it does.

## Calibrate the tolerance, or the check fires forever

A count comparison needs a per-frame expected delta, not a flat number. Two structural differences
between HTML and a design tool are permanent, not defects:

- **The HTML capture cannot see `<input>` values.** A `value` or `placeholder` is not a DOM text node,
  so range geometry finds nothing. Every input costs **+1 run** on the design side.
- **Inline `<strong>` splits one visual line into three runs.** One design text node, three HTML runs.

Same shape on the x axis: for **centred or FILL text**, the HTML capture records glyph *ink* and the
design tool records the *layout box*. They coincide only for left-aligned hug text. Reporting raw `dx`
on centred text guarantees an audit that can never return zero.

## A structural check is only as good as its model of legitimate difference

Three times on one project a check was arithmetically right and conceptually wrong, and each time the
fix was to teach it a distinction the design already made — **never to loosen the tolerance**:

| Check | What it got wrong |
|---|---|
| Reflow register | A flat global list silenced a component everywhere; it needed a per-screen scope |
| Count comparison | A flat tolerance; it needed `+1 per input`, `−2 per emphasis run` |
| Nominal parity | Counted each tall-screen hug twin as its own screen, producing 8 phantom findings |

"Nominal parity" and register scoping are defined in full by the viewport parity check in `html-gates.md`; this table only names the lessons learned from getting them wrong.

## A green check is not evidence the check works

A clone-integrity check compared descendant counts between a frame and its clone and reported zero.
It could not have failed meaningfully: it read one node on the current page and the other on a
**different** page, and `findAll` under-reports instance children on any page that is not current. Run
from the other side, every number reversed.

**Assert a check against a known bad case before trusting a pass.** This is rule 4 above — *assert the
intended value, not "different from broken"* — turned on the audit itself.

And its corollary for any tool that returns a status object: a plausible success value is not evidence
of a correct result. On one project a write API returned `{variantCount: 9}` with all nine variants
stacked at the origin, and `{rows: 5}` with five rows built from the wrong component variant. **A
structural read-back would have passed on both.** Render the node and look at it.

