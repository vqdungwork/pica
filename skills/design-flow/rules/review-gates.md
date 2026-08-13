# Review gates

How work is checked before a human sees it, how a review reports without changing anything, and how
complexity is routed.

Load this for steps 5, 7, 8 and 9.

---

# Part 1: The two modes

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

---

# Part 2: Complexity routing

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

---

# Part 3: Verification method

## Match by text content, compare position only

To diff HTML against Figma without hand-mapping every element, key on **text content**. Strings are a
strong natural key: normalise whitespace, lowercase, truncate to roughly 24 characters, then pair
nearest matches within a frame.

**Compare `x` and `y`. Do not compare `width` or `height`.**

The two measure different things:

- HTML `Range.getBoundingClientRect()` returns the **glyph ink box**, roughly 18px tall for 16px text
- Figma's text node returns the **line box**, 24px tall for 16px/24 text, and FILL-width so it spans
  its container regardless of the glyphs

Comparing them produced **120 phantom issues** on a file that was substantially correct: every text
node reported a width delta of +175 and a height delta of +6. Position is comparable; size is not.

Tolerance of roughly 3px. Below that is text-metric noise between a browser and Figma's renderer.

## Capture element boxes too

Text runs tell you where things *are*; element boxes tell you *why*. When a text run is 45px low, the
answer is in the container: a hero at `y: -47` versus `y: 0`, an app bar 44px tall versus 56.

Diff the containers by class name against Figma node names, and set targets from HTML container
positions rather than iterating blindly toward them.

## Force a common font while diffing layout

Metrics differ per family, so a diff between Figma in the brand font and HTML in a fallback attributes
typeface differences to layout. Inject the family Figma is currently resolving:

```js
await page.addStyleTag({ content: ':root{--font-family:"<resolved family>",sans-serif !important}' });
```

Then run it **again natively** once both sides share the family, because some differences only resolve
then. A chip row that appeared to wrap differently turned out to be identical: the mismatch was
entirely a forced-font artifact.

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

## A binding that changes appearance is a defect

Every check in this file verifies a binding **exists**. None of them verifies the pixel did not move. That
gap let a token-binding pass flatten 38 translucent surfaces while reporting "0 remaining unbound, all
verified" on every page.

So before any bulk mutation — binding, snapping, rounding — **capture a baseline**, and diff after:

```js
// per SOLID paint, resolved through the alias chain, alpha included
{ id, prop, r, g, b, a }
```

A non-zero delta on any channel including alpha is a defect until you can name why. The pass is finished
when the delta set is empty or every entry is a deliberate, recorded change.

This matters because **appearance and structure fail independently.** A file can be 100 percent bound and
completely wrong, and the audit that only counts bindings will call it done.

`scripts/capture-baseline.js` writes the baseline; run it before the pass, not after you suspect a
problem. Version history is the only other record of pre-change values and the Plugin API cannot read it,
so a missed baseline means the original values are gone.

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

## Trust the data over the render, and the render over your memory

The plugin API is authoritative for structure and bindings. Renders are authoritative for what a human
sees. Your recollection of what you built two hours ago is authoritative for nothing. Re-read before
asserting.

When two sources disagree, say so and find out which is wrong. Two audit bugs above were found exactly
that way.

## Always read the font family and style distribution

Do not check "is anything not the expected family". Print the **full distribution** and read it. Two
failure modes only show up there:

1. **Whole frames stranded in the default font.** 41 nodes across two client-facing annotation frames
   sat in the wrong font through twenty rounds of auditing, because they had **no `fontFamily` binding
   at all**, so every family change simply passed them by. A spot check for "non-target family" that
   runs while the target *is* the current value finds nothing wrong.
2. **Impossible family and style pairs.** One family spells it `Semi Bold`, another spells it
   `Semibold`. Bind the family without fixing the style and you get a face that does not exist, which
   renders as a missing font. `listAvailableFontsAsync` cannot catch it, because locally installed
   families are invisible to the runtime.

Detect the second structurally: normalise each style name (lowercase, strip spaces and dashes) and flag
any normalised weight with more than one spelling in the file. The minority spelling is the broken one.

**The general lesson: a check that asks "does anything differ from the current value" is blind to
anything unbound. Ask what the distribution *is*, then judge it.**

---

# Part 3b: When the checks are yours

An HTML-only project gets the four shipped HTML-side scripts and nothing else, so most of its
verification is harnesses written for that project. The source project ended with ten of them, green three
runs in a row, and four defects the human found in a screenshot the same afternoon. Everything in this
part comes out of that gap.

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

---

# Part 4: The audit checklist

Everything must return zero. `scripts/figma-audit.js` runs it as one call.

| Check | Detection |
|---|---|
| Auto-layout overflow | flow children + gaps + padding versus box, on FIXED axes only; exclude ABSOLUTE children and WRAP frames |
| Ovalised circles | ELLIPSE or radius-999, round-sounding name, w/h ratio outside 0.92 to 1.08 |
| Clipped shadows | `clipsContent` with a child carrying a visible DROP_SHADOW |
| Clipped rails | `clipsContent`, HORIZONTAL layout, more than 2 children, no `overflowDirection` |
| Page-level overlaps | pairwise AABB on `page.children` |
| Style-less screen text | no `textStyleId` matching a local style, excluding instance children |
| Unbound font weights | no `fontWeight` binding and no bound style |
| Unbound corner radii | any of the **four** corner properties > 0, unbound, with a matching `CORNER_RADIUS` token and no register entry |
| Unbound padding | any padding side > 0, unbound, with a matching `GAP` token and no register entry |
| Unbound border width | strokes present and **none of the five** `strokeWeight` keys bound, with a matching `STROKE_FLOAT` token |
| Unbound fills and strokes | SOLID paint with no `boundVariables.color` and a token matching its **RGBA** |
| Unregistered raw values | anything raw with no matching token **and** no entry in `rawValueExemptions` |
| Flattened translucency | **advisory, not zero.** Bound SOLID paint at `opacity 1` over artwork, named as a true overlay or carrying a same-colour child. The gate is the baseline diff, because a name cannot tell you what was meant to be translucent |
| Baseline delta | any resolved RGBA change against the pre-pass baseline that is not a recorded decision |
| Un-centred icons in controls | horizontal frame with an icon child and `counterAxisAlignItems !== "CENTER"`, **unless a `*-slot` child is present**, which centres on the field deliberately |
| Fixed-height text riding high | `textAutoResize === "NONE"`, `textAlignVertical === "TOP"`, `height % lineHeight !== 0` |
| Unequal sibling heights | 3+ children **sharing a name stem** (`tab …`, `seg-…`) with differing heights and any `layoutSizingVertical !== "FILL"` |
| Unpinned screen chrome | bottom chrome whose `constraints.vertical !== "MAX"`, or whose gap to the frame bottom is non-zero |
| Un-centred button labels | `textAlignHorizontal !== "CENTER"` inside a button instance |
| Wrong button sizing | full-width size in an auto-layout parent not set to FILL |
| Detached instances | `getMainComponentAsync()` throws |
| Orphaned nodes | `icon/*`, `Vector`, `Rectangle` directly on a page |
| Prototype dead ends | frame with zero outgoing reactions |
| Home indicators | present and bottom-pinned on **every** screen frame, viewport and hug alike |
| Placeholder text | `PASTE HERE`, `TODO`, `TBD`, `lorem ipsum` |
| Banned characters | project-specific, declared at intake |
| Conflicting weight spellings | one normalised weight with more than one spelling |
| Stale published counts | claims parsed from the file's own text and recounted against live counts of screens, components, variables and links. Unrecognised nouns are ignored rather than guessed at |
| Excluded work built anyway | any top-level frame name matching an entry in the `exclusions` register |
| Clipped content | per vertical auto-layout node, `lastChild.y + height + paddingBottom` vs the node's own height; exclude declared scroll surfaces |
| Missing content | per-frame text-run count against the HTML reference, tolerance calibrated `+1 per input` / `−2 per emphasis run` |
| Missing hug twin | any screen whose content exceeds its viewport height by more than 24px must have a `· hug` twin |
| Declared chrome | every entry in `viewports[].chrome` marked `required`, present and pinned on the declared axes; optional entries match their constraints where present |
| Single-line controls | inputs and selects carry `maxLines: 1` with ellipsis truncation, set on the component |

## Recount every number you publish

A cover claiming "45 designed screens" was counting five annotation boards. Derive published figures
from a live count in the same script that writes them, so the parts always add to the total.


## The measured HTML gate

`scripts/verify-html.mjs <html-reference.json> <state.json>`. **Pass: 0 findings on all four checks.**

Runs in `/pica-wp` before the human is asked to approve anything, and again at the start of a port. For a
project with `figmaInScope: false` it is the **only** verification the work ever receives — which is why
it cannot live in the Figma half of the flow, where it sat through 0.3.0.

| Check | Detects | Pass |
|---|---|---|
| `viewport-tagged` | a frame with no `data-viewport`, or one naming an undeclared viewport | 0 |
| `overflow` | content past the frame's right edge — the frame clips it, so no screenshot shows it | 0 |
| `tall-screen-pair` | content exceeding its viewport by >24px with no `· hug` twin, so the remainder is unreviewable | 0 |
| `viewport-coverage` | a declared viewport that produced no frames at all | 0 |

## The flow gate

`scripts/flow-check.mjs --dir html [--state .pica/state.json]`. **Pass: 0 findings on all seven checks**,
and a non-zero number of screens and links, because zero of either means a selector missed rather than a
sound flow.

It measures the one thing a geometry diff structurally cannot: whether the prototype goes where it says it
goes. Every destination renders perfectly in a screenshot, which is why this class of defect reaches the
human every time.

| Check | Detects | Pass |
|---|---|---|
| `dangling-target` | `data-go`, `data-tab` or `data-sheet` naming something that does not exist | 0 |
| `dangling-href` | a cross-application link to a missing file, or a deep link to a missing screen | 0 |
| `nav-target` | a router root or tab id that resolves to no screen, or a tab set that will not parse | 0 |
| `unreachable` | a screen no control opens, so a reviewer is told about it and never sees it | 0 |
| `dead-end` | a screen with nothing outgoing and no back affordance, which traps the reviewer | 0 |
| `orphan-prototype` | an interactive file with no tab in the review shell | 0 |
| `flow-declared` | a `flows` entry whose entry file or home screen does not exist | 0 |

Pass `--allow-none` for a package that genuinely ships boards only, and **say so at the gate**. Without
the flag, no interactive prototype is a failure, because that is the normal way this deliverable goes
missing.

Two things it cannot do. It reads markup, so a link built in JavaScript is invisible to it: keep targets in
attributes. And it cannot tell whether a link goes somewhere *sensible*, which is why "the human clicks the
main flow end to end" is a separate line in the definition of done.

The 24px threshold is calibrated, not chosen: on the project this came from, real overflows were 90px and
up while sub-pixel scroll-region noise never exceeded 8px. A threshold in that gap separates them without
tuning per screen.

### A check must fail closed

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

### Every named check must ship

If a rule names a check, the executable is in `scripts/` and the rule gives its command line and its pass
criterion. 0.3.0 violated this: it documented the parity check and the geometry diff in prose, complete
with tolerances and two-pass structure, while both existed only inside the project they were derived
from. Anyone installing the plugin read a rule telling them to run something that was not there.

A coverage audit that greps for concepts cannot catch this — the concept is present and well described.
Audit for **executability**: for each named check, does the file exist, does it run, and does the rule
state what passing means?

## The viewport parity check

`scripts/parity-check.mjs <html-reference.json> <state.json>`. **Pass: 0 findings.**

Only with two or more declared viewports; with one it says so and exits 0. It answers one question: **do
the viewports of a screen say the same thing, apart from the differences we declared?**

**Compare per-class COUNTS, not sets — a set comparison misses count drift.** A set comparison reported zero findings on every screen of a
project while missing real drift: delete one of five candidate rows from one column and the class *set*
is unchanged — `.cand` is still present — so the check passes on a screen that lost content. Since
hand-copied columns are where drift lives and a dropped row is the likeliest copy error, set comparison
fails at exactly the job it was added for.

Two passes, and they answer different questions:

1. **Nominal** — is the screen present at every declared viewport? Cheap, catches a whole screen
   missing. An absence is a finding unless `parityExemptions` records it as a decision. A tall-screen
   **hug twin is not a separate screen** here; fold it into its base.
2. **Structural** — per-class counts, **subtree-pruned**, plus text attributed to its owning element.

Three things it needs to avoid firing forever on correct work:

- **Prune the subtree of an excused component.** Excusing `cand__actions` must excuse the
  `btn--secondary` inside it, or the descendant leaks a count gap the register does not cover. And the
  parent link must be the nearest **classed** ancestor — an unclassed wrapper such as a `<td>` around a
  pill silently breaks the chain and defeats the pruning.
- **Attribute text to its owner.** Otherwise every legitimately reflowing component reports its own
  labels as drift.
- **Scope the register.** See `reflowNotes` in SKILL.md: `scope` is required.

Correctly built, this returns **zero** on a correct two-viewport project. On the source project it went
from 305 raw deltas to 0 findings once subtree pruning and owner attribution were in place — and the
remaining text differences were the calibration artefacts below, not defects.

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

## A position diff cannot detect absence

**A clipped node still reports its coordinates.** Every text run clipped out of existence returns a
plausible x and y, so a geometry diff reports the frame as merely "over tolerance" while a third of
its content is missing.

Two checks close that gap, and both are cheap:

1. **Per-frame text-run counts.** Count visible runs in the design, count them in the HTML reference,
   flag any delta beyond a calibrated tolerance. On one project this flagged 8 frames and **every flag
   was real** — including an invisible stray text node on every instance of a component, where a
   button label had been clipped by resizing rather than removed.
2. **Content height vs container height.** For every vertical auto-layout node, compare
   `lastChild.y + lastChild.height + paddingBottom` against the node's own height. Anything over is
   clipped content. Exclude deliberate scroll surfaces only.

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

---

# Part 5: Definition of done

**HTML side, and the whole list for a project with `figmaInScope: false`:**

- [ ] `verify-html` returns zero on all four checks
- [ ] `parity-check` returns zero, nominal and structural, where two or more viewports are declared
- [ ] `flow-check` returns zero on all seven checks, with a non-zero screen and link count
- [ ] **The main flow of every application clicked end to end**, by a human, from its real entry point
- [ ] Every screen rendered and looked at **after** the last change, not before it
- [ ] Every check written for this project has been **seen to fail** on the defect it was written for
- [ ] Every option board either folded into the flow or labelled as provenance

**Figma side:**

- [ ] Audit returns zero on every check
- [ ] Geometry diff shows no position delta above roughly 3px that is not a documented decision
- [ ] Every screen text node carries a text style; every style is variable-bound
- [ ] Every geometry property is bound or listed in `rawValueExemptions`: four corner radii, four
      padding sides, border width, fills and strokes
- [ ] **Every frame rendered and looked at, per viewport.** Separate from "audit returns zero": the
      audit answers a narrower question than it appears to
- [ ] Content-height check returns zero, so nothing is clipped
- [ ] Text-run counts match the HTML reference within the calibrated tolerance
- [ ] Every screen taller than its viewport has its hug twin
- [ ] Prototype clones re-synced after the last frame-level fix, audited by **measuring** a property
      that changed — not by remembering the re-sync
- [ ] Baseline diff is empty, or every resolved RGBA delta is a recorded decision
- [ ] Every screen frame carries a bottom-pinned home indicator, hug frames included
- [ ] Zero detached instances; zero raw shapes in screens beyond images, scrims and indicators
- [ ] Contrast computed and passing, with any exception measured from the render and written down
- [ ] Prototype has no dead ends
- [ ] Every deviation from the HTML is either fixed or listed in `deviations` with a reason and a name
- [ ] Nothing in `exclusions` exists in the file
- [ ] Every number published in the file recounts correctly from the file

## Deviating from the HTML

The HTML wins by default. Two cases where it does not, and both go in the **`deviations` register** in
`.pica/state.json` — not into prose, because a deviation recorded only in a review document cannot be
distinguished from a defect on the next run:

```json
{ "deviations": [
  { "node": "29:119", "prop": "y", "html": 369, "figma": 389,
    "why": "client approved moving the CTA below the checkbox on 12 Mar", "by": "client" },
  { "node": "28:4", "prop": "cornerRadius", "html": 16, "figma": 14,
    "why": "HTML was off-token; 14 is the agreed hero radius", "by": "html-fix-pending" }
] }
```

The geometry diff reads it: a delta above tolerance that **is** registered is reported as a decision, and
one that is not is reported as a finding. Without the register the definition of done below is
unfalsifiable, because "recorded as a decision" has nowhere to be recorded.

Two rules on entries. `why` names the **person or the reason**, never "intentional" — the point is that a
stranger can audit it. And `by: "html-fix-pending"` is a promise: the HTML gets corrected, the entry gets
deleted. A register that only grows is a backlog pretending to be documentation.

The two cases:

1. **The HTML is accidentally off-token.** A missing `line-height` falling back to `normal`, an inline
   `height:160px` where every sibling uses 150. Fix the HTML; do not copy the mistake into the design
   system.
2. **Figma reflects a later approved change.** If the client or designer approved a restructure the
   HTML never received, Figma is authoritative. Mark it in both files so nobody re-aligns it.

Never silently split the difference.

---

# Part 6: Behaviour review, for prototypes

Links are not behaviour. Check:

- **Dead ends.** Every frame has an outgoing reaction or is a deliberate terminal state.
- **Wrong targets.** A link pointing at a frame that looks right but is the wrong state.
- **Missing back paths.** Any screen a user can enter and not leave.
- **Unreachable states.** A state that exists in the file with no interaction that produces it. Either
  wire it or explain why it is documentation only.
- **Implied but absent interactions.** The screens show a disabled CTA gated on a checkbox, so the
  prototype should let a reviewer tick the checkbox.

Repeat until the pass returns nothing.
