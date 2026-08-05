# HTML prototype rules

The cheap medium, and the one that stays authoritative. Load this for steps 3 and 5.

---

## Why HTML first

Figma is slow to iterate in and easy to declare finished by eye. HTML is fast to change, trivial to
view as a whole flow, and can be measured by a script.

So the design gets worked out in HTML and **approved** there. Figma receives a settled design rather
than being the place exploration happens. And once both exist, **HTML remains the source of truth**,
because it is the one a machine can check.

## Project layout

```
docs/          contract, exclusions, findings, state matrices, reviews, rationale
html/
  shared.css   tokens plus the phone chrome
  design-system.html
  review.html  the tabbed shell
  <wp>.html    one file per work package
tokens/        tokens.json, tokens.css
.audit/        captured references and diffs
.pica/         state.json
```

## One tabbed review page, always

Never hand over a folder of separate HTML files. Build `review.html`: a tab bar plus lazily-loaded
iframes, one tab per work package, and add a tab as each package lands.

The per-package files stay the source of truth; the shell is only navigation. That keeps the Figma port
reading from the same files a reviewer looks at.

Reason: a reviewer with four files to open reviews three of them. It gets worse every package.

## The frame size is declared once

Set it at intake and hold it for the whole project. The default is **375 x 812**, the iOS idiom,
because it is the tighter constraint.

Whatever it is, **the HTML viewport matches the Figma frame exactly**, or the geometry diff in step 7
compares two different things and every finding is noise.

## Responsive is `@container`, never a width `@media`

When more than one viewport is declared, **every viewport renders in the same browser window**. A
width-based `@media` rule therefore fires for every column at once and renders the narrow column as
the wide one — and that column is what gets ported. Verified: with a 1440 frame and a 375 frame side
by side, every `@container` rule resolved against its own frame.

Each frame declares `container-type: inline-size`. That contains the **inline axis only**, so frame
height stays content-driven — which is what keeps the tall-screen hug pair working.

Hover cannot use `@media (hover)` either: one window cannot distinguish the columns. Key it off the
frame class.

**`@container` carries no specificity.** A component base class declared *later* in the file wins at
equal specificity, so the container rule silently loses:

```css
.top-nav__burger { display: inline-flex; }
@container frame (min-width: 1024px) { .top-nav__burger { display: none; } }
/* ... 200 lines later ... */
.btn { display: inline-flex; }        /* equal specificity, declared later — wins */
```

The burger rendered on the desktop frame. Every `@container` block that overrides a property also set
by a component base class must be declared **after** that class; keeping them in one trailing section
makes the ordering a visible convention. This trap was hit **three times** in one stylesheet — the
third time it made an icon button 32×40 instead of square and dragged every row it sat in 8px taller.

## Prefer CSS Grid with named areas for anything that reflows

A flex row cannot promote a nested child to full width. One mobile card ran to **550px** because its
chip row was a grandchild inside a squeezed column; no amount of flex tuning could fix it, because the
reflow was structurally impossible without changing the DOM.

Grid changes order *and* span from CSS alone, so both viewports keep **identical markup** — which is
what keeps a structural parity check meaningful. Reaching for flex first tends to force either a markup
fork per viewport (which parity then reports forever) or a compromise layout. After the restructure:
550px → 170px, wide viewport unchanged.

## Check for overflow. The frame hides it.

Frames carry `overflow: hidden`, so content that spills is **clipped, not visible**. Two mobile frames
overflowed by 83px and 34px with nothing to see: no scrollbar, no cut glyph, just content rendered into
a void.

Cause both times: grid items default to `min-width: auto` and refuse to shrink below their min-content
width, so one unbreakable string — a 38-character filename — pushed the column past the frame edge.
`.grid > * { min-width: 0 }` fixes it; **the finding is that nothing would have caught it.** The capture
script already walks every element box and knows each frame's rect, so the check is nearly free.

## Single-line controls must truncate, not wrap

An `<input>` is single-line by definition: the value scrolls and never lays out on a second line. A
design-tool text node wraps as soon as the string exceeds the width — correct for a paragraph, wrong for
a form control. Set `maxLines: 1` with ellipsis truncation **on the component**, so every instance
inherits and any instance added later cannot revert.

Note the ellipsis is a deliberate improvement on the reference, not a match: a browser clips input
overflow with no ellipsis. A static frame cannot scroll, so without it a truncated value reads as the
complete value and a developer builds the wrong field width. Record it as a deviation.

## The tall-screen pair

A screen taller than the viewport ships as **two versions**, side by side:

1. **Interactive.** The real viewport height with genuine `overflow-y: auto` inside it, scrollbar
   hidden, bottom nav pinned, home indicator present.
2. **Full height.** The frame grows to the full content so a reviewer sees everything at once. It
   **still carries the declared chrome**, bottom-pinned like every other frame.

   *Corrected in 0.3.0.* This rule previously said a hug frame carries no home indicator "because it is
   a board rather than a viewport" — which contradicted figma-screens.md, where 0.2.0 had already
   reversed it. A missing element reads as an oversight rather than a decision, and it also removes a
   per-frame judgement call from the audit.

**Never a third "scrolled" version** showing a mid-scroll position. It reads as a state that does not
exist, and it is the thing reviewers ask about every time.

**This is not optional and it needs a check.** On one project it was specified in two rule files and
implemented in neither: **8 of 25 screens overflowed** their viewport by 212px to 614px, and every one
was a screen a reviewer could only ever see the top two-thirds of. Nothing in the audit caught it,
because each frame was internally valid.

Two implementation details that matter:

- **Threshold the overflow at ~24px.** A twin generated for a 10px overflow is rounding noise and makes
  the pair read as mechanical rather than considered.
- **Generate the twin by cloning the interactive frame**, not by copying its markup. The two cannot then
  drift — which is the exact failure the pair exists to expose.
- A hug twin is **not a separate screen** for parity purposes. Its existence depends on content height at
  that viewport, so it is legitimately asymmetric between viewports.

This pair maps directly onto Figma's interactive and hug frames, which is why it exists in this form.

## Real assets, or none

- **No emoji standing in for icons.** Use a real icon set. On the source project fifteen emoji and glyph
  placeholders had reached the component library before anyone noticed, and every one had to be
  retrofitted across the whole file.
- **No generic stock imagery unrelated to the content.** An image that does not match what the screen
  claims to show teaches a reviewer to ignore images, and then they miss a real one.
- **Use the client's own assets and captures.** Do not introduce photography that would have to be
  sourced or licensed for the real build.
- **Brand marks must be the real marks.** Social sign-in buttons need the actual provider logos, not
  coloured circles.

Anything genuinely unavailable is labelled as a placeholder in the frame, not left to be mistaken for a
decision.

## The state matrix comes before the screens

Write the matrix first: every screen against every state. It is the cheapest possible way to avoid
finding a missing state during handoff.

Minimum states, and the ones most often missing:

| State | Note |
|---|---|
| default | |
| loading or skeleton | at least one representative per family |
| empty | make it useful, not apologetic |
| error | per-field for forms, not only a global banner |
| disabled | especially a CTA gated on a checkbox |
| keyboard-open | with the content inset, because it changes the layout |
| focus | on inputs |

Video or live surfaces add: buffering, connection lost, casting, and the fullscreen orientation pair.

## Everything consumes the kit

`design-system.html` is built first, as a storybook: every token and every component with all variants
and states, single file, no build step.

From then on, **screens consume kit components.** A one-off built inline on a screen is a review
finding, not a shortcut, because it will not receive the next token change and nobody will notice.

When a pattern repeats within a screen family, promote it. When it repeats across families, it belongs
in the kit.

## Check the reference against its own grid

Pick one content-edge inset and hold every row to it.

The HTML is authoritative, but **faithful to a broken reference is still broken**. On the source project
a row used `justify-content: center`, putting its buttons at 43px while every other element sat at 16px.
Figma reproduced it exactly and correctly, and both were wrong. Fix the HTML rather than porting the
mistake.

Where the HTML is accidentally off-token, a missing `line-height` falling back to `normal` or an inline
height where siblings use a token, fix the HTML. Do not carry it into the design system.

## Length-realistic copy

Mock strings should be realistic for the shipping locale. If the product ships in a language that runs
15 to 25 percent longer than your working language, draw at least one screen in it as a length check,
and make long strings degrade predictably: clamp to two lines, then ellipsis.

When you replace mock data later, **match the character count** so nothing reflows. A 22-character
email swapped for a 27-character one can overflow a field that was already signed off.

## No build step

Plain HTML and CSS, one `shared.css` carrying the tokens and the phone chrome. No bundler, no framework,
no npm install to view a screen.

The prototype's job is to be opened instantly by a designer and measured by a script. Both get harder
with tooling in the way.
