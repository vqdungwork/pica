# Review gates

How work is checked before a human sees it, how a review reports without changing anything, and how
complexity is routed.

Load this for steps 5, 7, 8 and 9.

---

# Part 1: The two modes

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
