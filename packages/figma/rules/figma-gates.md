# Figma gates

The gates the figma package owns. Medium-independent review discipline is in core's
`review-discipline.md`, which these assume.

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

## Trust the data over the render, and the render over your memory

The plugin API is authoritative for structure and bindings. Renders are authoritative for what a human
sees. Your recollection of what you built two hours ago is authoritative for nothing. Re-read before
asserting.

When two sources disagree, say so and find out which is wrong. Two audit bugs named in core's
`review-discipline.md` (Audit integrity, rules 2 and 3) were found exactly that way.

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

## The audit checklist

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

## Definition of done

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
