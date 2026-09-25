# Craft

Every rule below was written from one engagement, where the client looked at a screen that had
passed sixty-three assertions and said *"trông nó quá xấu"*. Nothing here is taste. Each one names
the defect it came from.

## The gap this file exists to close

<!-- enforced-by: none — judgement, not decidable by a script -->

The gates measure **compliance**: contrast ratios, type floors, target sizes, traceability, state
coverage. Nothing measures whether the result is worth looking at. An agent that optimises for
green hits every floor and aims above none, and the output is a wireframe with colour added — which
is exactly what shipped.

**A floor is not a target.** Reaching 4.5:1 and 14px and 48px means nothing was broken. It does not
mean anything was designed.

## Research is measured and then thrown away

<!-- enforced-by: none — judgement, not decidable by a script -->

The failure was not bad research. `design-researcher` measured four shipped products across nine
foundations with real provenance. The build then used the hex values and discarded everything else:

| Measured, with provenance | Reached the build |
|---|---|
| Inter Variable at weights **510 / 590 / 680** (Linear's literal, optical-size-adjusted steps) | no — default system stack |
| Weight base **450**, not 400 (Plane) | no |
| ~8 sizes total, hierarchy from weight and optical placement | no — bold vs not-bold |
| `tabular-nums` throughout, so figures do not jitter on update | no |
| Space separates; borders are rare and deliberate | no — a 1px border on nearly everything |
| A 5-step elevation scale, 6–35% opacity, 1–32px blur | no — no depth at all |
| Motion tokens, durations and easings | declared in the token file, applied nowhere |

**When you measure a product, you owe its whole method, not its palette.** A colour is the cheapest
thing to copy and the least of what makes the measured product good.

## Borders are a debt

<!-- enforced-by: none — judgement, not decidable by a script -->

A border is the laziest way to say two things are separate. Space says it better and costs nothing
to read. Keep a border only where you can say what it means — in the build that fixed this, four
survived out of dozens, and one of them (a dashed outline meaning *not filled in yet*) was carrying
actual meaning rather than drawing a box.

Count the borders you kept. If you cannot defend each one in a sentence, it is decoration.

## Dark is designed, never inverted

<!-- enforced-by: contrast-floor, contrast-proved -->

Dark mode is not light with the colours flipped. Surfaces step (canvas → surface → overlay) and
none of them is pure black. Every hue is re-tuned for luminance against a dark surface and **every
contrast pair is recomputed**, because a ratio proved on white says nothing about the same token on
`#0F0F10`.

Real instance: `#006399` measured 5.78:1 on light and **2.92:1 on dark**, under a 3:1 floor. The
honest move is to depart from the measured token and record the departure — not to swap the hex and
stay quiet.

## Numbers wear ink, not the series colour

<!-- enforced-by: none — judgement, not decidable by a script -->

A coloured numeral is the commonest dashboard mistake and it fails twice: colour stops being
available as a signal, and the number stops being readable as text. The figure is ink; a coloured,
**shaped** mark beside it carries identity.

For anything that summarises — a stat tile, a KPI row, a meter, any chart at all — **load Claude's
`dataviz` skill before writing the first line**. It carries the form heuristic, the colour formula
and a runnable palette validator, and it is design-system agnostic, so it consumes this project's
tokens unchanged. pica does not restate it here and must not drift from it.

## Load the skill, do not summarise it

<!-- enforced-by: none — judgement, not decidable by a script -->

Claude ships `dataviz` for exactly the surfaces this role builds badly: a stat row, a meter, a
summary, a chart. It carries a form heuristic that answers *is this even a chart*, a colour
formula, mark specs, an anti-pattern catalogue, and a palette validator you run rather than reason
about.

On the engagement these rules come from it was loaded once — by a coordinator, who then reduced it
to four bullet points in a brief. The method never reached the build. The resulting report carried
**26 displayed strings of prose against 4 graphic marks**, passed every floor, and the client called
it a wall of text.

Four bullets from a skill is not the skill. Load it, work through it, and let it change what you
build. pica deliberately does not restate its contents here, so there is nothing to read instead.

## A report that must be read has failed

<!-- enforced-by: none — judgement, not decidable by a script -->

The manager's screen is for finding the two rows that need attention among the nine that do not.
If every row carries the same visual weight and differs only by a small chip, the reader has to
parse every line to find anything — at which point the report has done none of the work.

What makes a surface scannable is mostly **not colour**:

- **Weight.** The ordinary recedes so the exceptional is found without reading.
- **Grouping.** The eye lands on a group, then a row — never on row 1 of 40.
- **What you leave out.** Repeating the project name on every row that already sits grouped under
  that project is text the eye must actively reject, and rejecting text is work.

## Build the screen the most people open

<!-- enforced-by: none — judgement, not decidable by a script -->

Choose the screen to design first by **who opens it and how often**, not by which one carries the
most states. In the engagement this came from, the report screen had ten states and won — while
`discovery.market` recorded **39 daily seats against 6 manager seats**. The product for 39 people
stayed a greyscale wireframe while the screen for 6 got three design directions.

The state count tells you which screen is hardest. The seat count tells you which one matters.

## You cannot review what you cannot see

<!-- enforced-by: none — judgement, not decidable by a script -->

Arithmetic auditing is real and it works: computing every contrast pair against the surface it
actually composites over caught a chip at 2.80:1 that no default proofing would have found.

And it cannot see geometry. In the same file, an `<svg>` rendering at **1312×1312px** and **32px of
horizontal overflow** passed a complete mathematical audit, because neither is a colour, a size or
a border.

So: audit what you can compute, **say plainly what you could not verify**, and never report a
screen as done on arithmetic alone. If a renderer is available to you, render it and look. If one
is not, the sentence "I could not see this" belongs in your report — it is what tells the reviewer
where to look.

## Never make a person the headline of an alert

<!-- enforced-by: none — judgement, not decidable by a script -->

When you sort exceptions to the top so a screen can be scanned, watch what happens to the
exception that has no object. A drift has a work item to name. A reassignment has a work item to
name. *"This person has nothing to confirm"* has nothing — so the interface reaches for the only
noun available and puts a **human being's name** in the title slot, in the same weight it uses for
tasks, inside the red bin, sorted above everything else.

That happened. Two of four alert rows read `Hùng` and `Phạm Văn Sơn` in bold beside a warning
triangle, while the two rows that did have an object correctly titled the work and left the person
in the metadata. The asymmetry is the tell.

The project's own analysis had written the warning four steps earlier, in prose every role reads,
and it did not prevent it — because prose in a document is not a constraint on a build.

So: **an alert names a condition, not a person.** "Không có việc nào được xác nhận hôm nay" is a
condition; a name is not. Where a person must appear, they appear the way they appear on every
other row — in the supporting line, not the headline.

## A fix belongs in the shape, not at the site

<!-- enforced-by: none — judgement, not decidable by a script -->

`craft.md` already says *delete the cause, do not override it where you happened to look* — that is
about a defect spreading across breakpoints. This is the other axis: a defect spreading across
**copies**.

One engagement fixed the same container defect three times. A screen capped its column at 720px;
the next screen reused the wrapper unchanged and inherited it; a third invented 960px the same way
the first invented 720. Each fix landed at the site. The builder's own diagnosis was the sharpest
sentence of the project: *"I copied the row's flex shape without copying the fix."*

When a component or a layout shape is reused, **it carries its pre-fix state unless the fix went
into the shared thing.** So after fixing anything twice, stop fixing and go build the shared
primitive — one row component, one container decision, one place the next screen inherits rather
than copies. That project built `ListRow` and the row defects stopped recurring; the container was
never given the same treatment and recurred a third time.

If you cannot name where the next screen would inherit the fix from, the fix is not finished.

## Measure the glyph, not the box that holds it

<!-- enforced-by: none — judgement, not decidable by a script -->

A stretched container reports its own width, not the width of what is drawn inside it. Measuring
scan distance from a flex container that claims all leftover space gives a number bearing no
relation to how far the eye travels — on one project it produced a reported 16px for a gap that
was really 678px, and the same error had already been made and corrected once in the same
engagement.

Measure from the rendered text — a `Range` around the glyphs, or the ink box — whenever the number
is about what a person sees. Container geometry answers layout questions; it does not answer
perceptual ones, and the two are easy to confuse precisely because both produce a confident number.

