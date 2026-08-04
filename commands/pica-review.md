# pica-review: review by measurement

Step 7. `$ARGUMENTS` may name a work package and may contain `--fix`. With no package, review everything.

Load `${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/review-gates.md`. For Figma-side checks, load the
`figma-use` skill and pass `skillNames: "figma-use"`.

---

## Mode

**Report is the default.** It reads and measures and **changes nothing**, writing only its own report
file.

`--fix` applies fixes, then re-audits to zero.

Set `activeReview` in `.pica/state.json` at the start:

```json
"activeReview": { "mode": "report" }
```

or `{"mode": "fix"}` with `writeAuthorization` set to `{"granted": true, "reason": "review fix"}`.

Clear `activeReview` when the command ends, including on failure. In report mode the write gate denies
every Figma mutation, so a forgotten flag blocks the next command.

Why the default is report: an audit that writes cannot be judged for severity, destroys the record of
what was wrong, and on the source project deleted a node from a delivered file that could not be
restored. Also, the right fix is frequently a design decision. A contrast failure can be solved by
darkening the scrim or by changing the text colour, and that is not yours to pick.

---

## Before any check: load the page

`findAll` on a node whose page is not current **silently skips instance children.** A frame once reported
4 text nodes instead of 10, with no error. `await figma.setCurrentPageAsync(page)` before every deep
read, for every page you touch.

---

## The checks

### 1. Geometry against the HTML reference

Match by **text content**: normalise whitespace, lowercase, truncate to about 24 characters, pair nearest
matches within a frame.

**Compare `x` and `y` only.** Never width or height. The HTML glyph ink box and the Figma line box
measure different things; comparing them produced 120 phantom issues on a substantially correct file.
Tolerance roughly 3px.

Diff element boxes by class name too. Text runs say where things are; containers say why.

### 2. Text bindings

Every text node resolves to a defined text style; every style resolves to variables; family, size,
line-height and weight all bound.

**Print the full family and style distribution and read it.** Two failures only appear there:

- frames stranded in the default font because they have **no `fontFamily` binding at all**, which every
  family change simply passes by
- impossible family and style pairs, where one family spells a weight `Semi Bold` and another
  `Semibold`, producing a face that does not exist

Detect the second structurally: normalise style names and flag any normalised weight with more than one
spelling. The minority spelling is broken.

A check asking "does anything differ from the current value" is blind to anything unbound.

### 3. Layout

Circles ovalised, FILL versus HUG against the HTML, shadows clipped by the wrong container, rails clipped
without `overflowDirection`, zero-size nodes, auto-layout overflow, page-level overlaps.

For overflow: sum visible flow children plus gaps plus padding against the box, on FIXED axes only.
Exclude `layoutPositioning === "ABSOLUTE"` children and `layoutWrap === "WRAP"` frames or you generate
false positives.

### 4. Contrast

**Compute from resolved token values, following alias chains. Do not sample pixels.**

Two cases the ancestor walk gets wrong, both of which were audit bugs rather than design bugs:

- **Text over a sibling image.** A pill over a card photo is not a descendant of the photo, so the walk
  finds the card's background and computes a fictional number. Scan **earlier siblings** for image or
  gradient fills and exclude those nodes.
- **Alpha that never reaches opaque.** If accumulated alpha hits the page below 1.0, composite over the
  page background. Returning raw black for a section filled black at 10 percent reported 2.03:1 where the
  truth was about 9.5:1.

**Verify any surprising contrast result before acting on it.**

Reading `fill.color` on a bound paint returns a **stale cached value**. Resolve through the variable.

### 5. Touch targets

Against platform minimums. Note where the drawn box is deliberately smaller than the target and what
expands it, so it reads as a decision rather than a defect.

### 6. Reuse decay

Detached instances (`getMainComponentAsync()` throws), patterns duplicated inline that should be local
components, locals duplicating a global, orphaned nodes sitting directly on a page.

### 7. Prototype

Dead ends, links to the wrong target, missing back paths, states with no way in or out.

### 8. Hygiene

Placeholder text (`PASTE HERE`, `TODO`, `TBD`, `lorem ipsum`), any banned characters declared at intake,
home indicators present and **bottom-pinned on every screen frame including hug frames**, and **every
published number recounted from the file**. A cover claiming 45 screens was counting five annotation
boards.

### 9. Geometry token binding

All four corner radii individually, all four padding sides, border width, and every fill and stroke where
a token matches its **RGBA**. Anything raw must appear in `rawValueExemptions` with a reason.

Two detector traps: binding `strokeWeight` leaves `boundVariables.strokeWeight` undefined and writes four
per-side keys instead, so check all five; and `COMPONENT_SET` geometry is variant-set chrome, not design.

### 10. Appearance preserved

Structural checks prove bindings exist, not that the pixel held. Diff `scripts/capture-baseline.js` output
from before the pass. A bound paint takes its alpha from the token, so binding a translucent paint to an
opaque token flattens it silently — and every existence check still passes.

---

## Output

Write `docs/reviews/<date>-<wp>.md`. One row per finding: severity, location, **measured evidence**, and
the fix.

Zero findings is a valid and reportable outcome. Say what you ran.

In report mode, present the report and **stop**. Do not offer to fix in the same breath; let the human
decide what matters.

In fix mode, fix, **re-audit in a separate call**, and report before and after.

---

## Cadence

Run this after **every** port, per package. Never accumulate it to the end of the project.

Deferred once on the source project, it became 64 findings across 12 rounds, because two days of
divergence had piled up and every fix risked disturbing another.
