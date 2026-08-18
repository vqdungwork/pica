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

**The interactive flow leads the tab bar, and it is the default tab.** Tab order reads as priority
order, whatever you intended it to mean. On one project the tabs sat in build order, so the first thing
a refresh showed was work package one of an application that was no longer the entry point, and the
human's report was that it still opened on the first application built rather than on the launcher. The
tabs were accurate, and the ordering made an argument about the deliverable that was wrong.

## Options decide. The interactive flow is the deliverable.

A work package ships **both**: option boards, which settle a decision, and **one interactive prototype
of its main flow**, which is the thing the human uses. Boards alone are not a package.

Boards are static, so every check in this flow can see them. A flow cannot be checked that way, and on
the source project **every defect the human found by using the prototype was a navigation defect with no
geometric signature**:

- a row on one role's home screen that opened a screen belonging to another role
- an entry point that navigated correctly and left the bottom nav highlighting the tab it came from
- a screen the launcher owns, opened from inside an application, returning the user to the launcher
  instead of to the application they were in
- a deep link that bounced through the launcher's own home on the way to its destination
- a sheet that opened above the page and left the sticky header undimmed behind it

Screenshot every destination and they are all correct. The defect is in the wiring, so the wiring is what
has to be read: `scripts/flow-check.mjs`, and a human clicking.

**Fold the winning option back into the flow, and mark the board as provenance.** Otherwise the review
page accumulates three variants of a header and no product, and the next reviewer cannot tell which one
shipped. The board stays as a record of the decision; it stops being a deliverable the moment the
decision is made.

### One prototype per application, linked for real

When the product is several applications behind one launcher, each gets its own interactive file, and the
links between them are real links rather than an annotation saying "this would open X".

Cross-application navigation is where the routing defects live, because it is the only place two
independently correct files have to agree. The vocabulary that makes it checkable:

| Attribute | Means |
|---|---|
| `data-scr="id"` on a `section` | a screen |
| `data-sheetwrap="id"` | a sheet |
| `data-go="id"` | push a screen inside this application |
| `data-tab="id"` | switch to a root screen, resetting the stack |
| `data-sheet="id"` | open a sheet |
| `data-href="f.html[?scr=id]"` | open another application, optionally deep into it |
| `data-popback` | return to where the user came from |
| `data-flow` on the viewport | inside a task: the bottom nav is hidden |
| `<script src="proto.js" data-nav='[…]' data-home="id">` | the router, the tab set and the root |

`flow-check.mjs` reads exactly these, so a link built in JavaScript is invisible to it. Keep targets in
markup. A target in markup is also greppable, which is how you answer "what opens this screen" without
reading the router.

### Navigation state is part of the design, and it gets checked

Four rules, each of which was a reported defect first:

1. **An entry point sets the owner.** Arriving at a screen from a utility tile, a notification or a
   search result leaves the bottom nav pointing at that screen's own section, never at where the user
   came from. Derive the owner from the route rather than from the control, or every new entry point is a
   new chance to get it wrong.
2. **A deep link opens its destination directly.** Not the launcher, then the destination. The reviewer
   sees the intermediate screen and reports it, correctly, as a bug.
3. **Back returns to the previous screen inside the application**, including when the screen is owned by
   another application. A shared screen opened from application B goes back into B.
4. **A screen inside a task hides the tabs.** Tabs during a multi-step task invite the user to abandon
   it and then blame the prototype.

`flow-check.mjs` covers dangling targets, dangling cross-application links, unreachable screens, dead
ends, the router's own root and tab set, and any prototype the review shell cannot open. It cannot judge
whether a link goes somewhere *sensible*: that is what clicking is for.

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

**Emoji as content is a different question from emoji as icons.** A reaction picker whose whole subject is
emoji has to show the real set the product will ship, at the real fidelity: if the product uses an
animated set, a still frame standing in for the animation is the same substitution the icon rule forbids,
one level down. Decode the real asset frame by frame (`ImageDecoder` from WebCodecs gives frame-exact
output) into a sprite sheet and step it in CSS, so the prototype has no runtime dependency and no build
step and still shows the thing itself.

**Photography that carries the mock data is content too.** Where a screen's subject is a photo, a real
photo from a licensable source is worth the twenty minutes: a grey rectangle teaches a reviewer that the
image area is undesigned, and they stop reading it. Keep it in the repository at the size the screen
renders, not linked from a service that can go away.

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

## Promote slowly, bind always

The flow-wide statement is in
[reference-discipline.md](../../core/rules/reference-discipline.md). In HTML it reads:

**A shared class is a promotion, and the default is no.** Write the markup on the screen; lift it into
the kit when a second occurrence appears that is the same *thing*, not the same shape. Two blocks that
happen to be 328px wide are not one component. A kit class created on a guess is worse than none: it
reads as the current plan, and every later variation arrives as a modifier nobody asked for.

**Every value is a custom property on first use.** Colour, spacing, radius, border width, font size,
line height, weight. No threshold, no "this one is a one-off" — a literal in a rule has no second
occurrence to justify it, and it is exactly what will fail to port. The only escape is a
`rawValueExemptions` entry.

The two decisions arrive in the same moment and feel like the same instinct. They are opposite.

## A trap documented beside the code is not a rule

`box-sizing` contains padding and border and **not margin**, so `width: 100%` plus a horizontal margin
overflows its parent. On the source project that trap was written out as a comment on one component, and
then hit again on a new component **twelve lines below the comment**, in the same stylesheet, by the same
author, within the hour.

A comment explains a decision to whoever is already reading that line. It does not prevent anything. When
a trap is general, remove the chance to hit it: one kit utility that sets the inset arithmetic
(`calc(100% - 2 * var(--row-inset))`), used by every full-bleed row, so the wrong form never has to be
typed. If it cannot be removed, it becomes an assertion in the project harness, not a comment.

The same applies to naming collisions. A generic component name (`countdown`, `card`, `panel`) will
eventually be claimed by something else and the second one silently inherits the first one's rules.
Name for the slot it fills, and when two candidates collide, rename before building on either.

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
