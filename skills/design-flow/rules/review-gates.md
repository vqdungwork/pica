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
| Un-centred button labels | `textAlignHorizontal !== "CENTER"` inside a button instance |
| Wrong button sizing | full-width size in an auto-layout parent not set to FILL |
| Detached instances | `getMainComponentAsync()` throws |
| Orphaned nodes | `icon/*`, `Vector`, `Rectangle` directly on a page |
| Prototype dead ends | frame with zero outgoing reactions |
| Home indicators | present on every viewport frame, absent on every hug frame |
| Placeholder text | `PASTE HERE`, `TODO`, `TBD`, `lorem ipsum` |
| Banned characters | project-specific, declared at intake |
| Conflicting weight spellings | one normalised weight with more than one spelling |
| Stale published counts | any number claimed in the file must be recounted from the file |

## Recount every number you publish

A cover claiming "45 designed screens" was counting five annotation boards. Derive published figures
from a live count in the same script that writes them, so the parts always add to the total.

---

# Part 5: Definition of done

- [ ] Audit returns zero on every check
- [ ] Geometry diff shows no position delta above roughly 3px that is not a documented decision
- [ ] Every screen text node carries a text style; every style is variable-bound
- [ ] Zero detached instances; zero raw shapes in screens beyond images, scrims and indicators
- [ ] Contrast computed and passing, with any exception measured from the render and written down
- [ ] Prototype has no dead ends
- [ ] Every deviation from the HTML is either fixed or recorded as a decision with a reason

## Deviating from the HTML

The HTML wins by default. Two cases where it does not, and both must be **written down**:

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
