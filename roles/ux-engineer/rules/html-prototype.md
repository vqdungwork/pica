# HTML prototype rules

The cheap medium, and the one that stays authoritative. Load this for steps 3 and 5.

> **The definition of done for everything here is in `roles/ux-engineer/rules/html-gates.md`.** This file is
> how to build the prototype; that one is what has to be true before a human is asked to approve it.


---

## Why HTML first
<!-- enforced-by: none — the reasoning behind the approach, not a constraint on an artefact -->

Figma is slow to iterate in and easy to declare finished by eye. HTML is fast to change, trivial to
view as a whole flow, and can be measured by a script.

So the design gets worked out in HTML and **approved** there. Figma receives a settled design rather
than being the place exploration happens. And once both exist, **HTML remains the source of truth**,
because it is the one a machine can check.

## Project layout
<!-- enforced-by: none — a convention; no check reads the directory shape -->

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

## The builder is the source of the file it builds
<!-- enforced-by: none — not decidable from the output. The generated file and a hand-edited one are identical on disk -->

If a `<wp>.html` is generated, **every change goes in the generator.** Editing the output is not a
shortcut, it is a mine: the file looks right, the gates pass, and the work is destroyed the next time
anyone runs the script: which may be weeks later, by someone who did not make the edit.

This is not hypothetical. On one afternoon a single project lost three things this way:

- a card rebuilt in CSS and in Figma, while the builder still emitted the pre-rebuild markup, so
  regenerating restored a placeholder icon at full width
- two screens that had only ever existed in the output, deleted without a trace
- a review page holding a stale copy of a screen nobody had rebuilt

The second one is the instructive case, because the gate caught it and the eye did not: `geometry-diff`
failed closed with *"no HTML frame for &lt;screen&gt;"* rather than quietly comparing 42 frames where it
had compared 46. **A frame count that drops silently is worse than a red build.**

Two habits. **After running any generator, diff its output against what was there**: file size and
frame count are enough to notice a screen vanishing. And when a screen is added by hand under time
pressure, that is a debt with a due date: put it in the builder before the day ends, or it will be
collected at the worst moment.

The same rule applies to anything that greps generated markup. A prototype router that matched
`class="scr <viewport>"` silently stopped finding a screen once that screen gained a second class. It
reported `MISSING` and carried on. **A matcher over generated HTML is coupled to the generator; change
one, re-run the other.**

## One tabbed review page, always
<!-- enforced-by: meta-line, flow-first, zoom, tabs-in-place, group-order, frame-inset -->

## Concepts before screens, on a complex package
<!-- enforced-by: concepts-diverged -->

A complex package widens before it narrows. Two or three approaches, **different in approach and
not in styling**, each naming the use cases it serves well and the ones it serves badly, then one
kept and the rest dropped with a reason.

Rough is correct here. Enough fidelity to judge the idea, not enough to fall in love with it: the
cost of going straight to one polished prototype is not the drawing, it is that **the polish makes
the first idea hard to abandon.** Nobody drops a screen that looks finished.

```json
"workPackages": { "<name>": { "tier": "complex", "concepts": [
  { "id": "C1", "approach": "", "servesWell": ["UC-01"], "servesBadly": ["UC-02"],
    "dropped": false, "why": "kept: ..." },
  { "id": "C2", "approach": "", "servesWell": [], "servesBadly": ["UC-01"],
    "dropped": true,  "why": "..." }
] } }
```

`concept-check` reads it and requires two or more with **exactly one kept**, because diverging is
only half of it and the convergence is the decision. It runs on the **complex tier only**: a
standard package has a precedent in the product, and requiring divergence everywhere would make
the rule ignorable, which is worse than not having it.

**A concept with nothing in `servesBadly` has not been examined.** Every real approach is worse at
something, and a set in which all of them are perfect is one idea described three times.

Three colourways of one layout is **one** concept. The axis has to be the approach.

It reads state only, deliberately: divergence happens before any screen exists, so a check that
needed the capture could only ever report on a decision already made.

Never hand over a folder of separate HTML files. Build `review.html`: a tab bar and one pane per work
package, **each package's body inlined into the shell**, and add a tab as each package lands.

Inlined, not iframed. On `file://` every document is its own opaque origin, so a browser refuses to load
a local file into an iframe of another local file: every pane renders the browser's own "It may have
been moved, edited, or deleted" page and the review is empty. This rule said "lazily-loaded iframes"
from 0.3.0 and the first project to follow it literally shipped a shell of error pages, then rebuilt it
as a table of contents, which is not a review either.

The per-package files stay the source of truth; the shell holds a copy of each body and is only
navigation. That keeps the Figma port reading from the same files a reviewer looks at.

**Lifting a body out of a page: cut at `<script`, not at `<script>`.** The exact-string form does not
match `<script src="proto.js" data-nav='...'>`, so the prototype's own router tag is inlined verbatim
along with the markup - the router then loads twice, two click listeners fire per tap, one tap pushes
two history entries, and Back appears dead. The same tag's `data-home` runs against whatever frames
have been parsed so far, which is a bug that hides until the pane order changes.

Reason: a reviewer with four files to open reviews three of them. It gets worse every package.

**The interactive flow leads the tab bar, and it is the default tab.** Tab order reads as priority
order, whatever you intended it to mean. On one project the tabs sat in build order, so the first thing
a refresh showed was work package one of an application that was no longer the entry point, and the
human's report was that it still opened on the first application built rather than on the launcher. The
tabs were accurate, and the ordering made an argument about the deliverable that was wrong.

### The shell is the product, not a document about the product

`review.html` **is** the demo. It is a tab bar and a viewport, and nothing above the tab bar except a
title and one line of meta: what revision, what this is, what it does not do, and the viewports it was
built at.

The shape, which is the one to copy:

```
Title - design review        revised <date> - <what this is> - <the scope caveat> - <viewports>
[ App one ] [ App two ] [ WP1 - name ] [ WP2 - name ] ... [ Design system ] [ Tokens ]
<heading: the active tab, e.g. "Client app - interactive flow">
<the thing itself, rendered in the page>
```

**Applications first, one tab each. Then one tab per work package. Then the design system, then the
tokens.** That order is the argument: a reviewer sees a product, then the states behind it, then the
system it was built from. Reversed, they see a spec and never reach the product.

The failure this exists to prevent, and it has happened: a review page built as a **document** - delta
table, decisions, assumptions - with the tabbed viewer embedded somewhere in the middle. Every fact on
it was true and the client's reaction was that it was not the deliverable. **A reviewer opens a demo to
use it.** Analysis belongs in a tab at the far end of the bar, or in `docs/`, never in front of the
thing being reviewed.

Two more, both learned the same way: a tab that navigates **away** from the shell is a tab a reviewer
does not come back from, so every tab loads in place. And a tab bar that needs a scroll to reach the
last tab hides whatever is last, so if the bar does not fit, the tabs are too verbose, not too many.

**That last one holds to about eight tabs.** At 19 packages it stops being true: labels already as terse
as "Auth flow", "Dashboard", "Own activity" still measured 3,414px against 1,337px of room, and no
amount of shortening fits 19 tabs on a laptop. Past eight, group the bar by part (see the group order
below) and make the scroll honest rather than hidden: smooth scrolling with the scrollbar suppressed, a
mask fading **only the end that still has content** so it never suggests a direction that does not
exist, vertical wheel driving it horizontally because a mouse has no horizontal axis, and
`scrollIntoView({inline: 'nearest'})` on selection so a tab already in view is not yanked to the middle.
That is a mitigation. The fix at that scale is a second level of grouping, and a project that needs one
should build it rather than scroll further.

**`shell-check.mjs` reads every rule in this section.** It was specified here from 0.3.0 and enforced by
nothing until 0.9.4, which is why a shell could ship as a document with the viewer buried in the middle
and score clean.

### The shell's own furniture is scoped, because the screens are now in the same document

Inlining puts every screen inside the shell's document, so the shell's stylesheet and the shell's
queries reach into the thing under review. Both did. Measured on one 268-frame shell:

| shell rule | matched inside the screens | what it did |
|---|---|---|
| `main{display:flex}` | 14 | turned each package's `<main class="page">` into a flex **row**: eight groups in one 3,342px line, scrolling sideways |
| `h1{font-size:15px}` | 86 | every screen heading without a text-style class fell to 15px |
| `[role="tab"]{...}` | 39 | the shell restyled the screens' own tabs, same specificity and a later stylesheet |
| `h3`, `.meta` | 32 | page padding and a caveat-line style applied to screen content |

**A review shell that restyles the thing under review is the worst version of this bug**, because every
measured gate stays green and the reviewer reports on a design that was never built. The fix is
mechanical:

- the shell addresses its furniture by **its own classes**, scoped to `header` or `body > main`. No bare
  element selector - not `main`, not `h1`, not `h3`, not `table` - appears in the shell's stylesheet.
  ARIA roles stay on the markup for assistive technology; they are not selectors.
- every shell query is scoped the same way. `document.querySelector('[role="tablist"]')` picks whichever
  comes first, and once Favourites and a day strip are inlined that is **18 tablists**, so the shell's
  keyboard navigation silently drives a screen's tabs instead of its own.
- a handler binds to **the attribute it owns**: `.sw button[data-theme]`, not `.sw button`. A selector
  meaning "every button in this kind of group" breaks the day the second group arrives - here the zoom
  controls, which set `data-theme` to `undefined` and killed both switches.

Worth measuring directly: after inlining, count how many elements inside a pane each shell selector
matches. The answer is 0.

### The shell has a zoom control, and it has three settings

A 1440-wide frame does not fit a 1440-wide laptop, so the reviewer with the smallest screen sees the
product at 70% and never knows. Three settings, and the current one always visible:

| | Does | For |
|:--|:--|:--|
| **Fit width** | scales so the frame's width fills the pane | reading a long page top to bottom |
| **Fit screen** | scales so the whole frame is visible, **which may be above 100%** | judging composition and balance |
| **100%** | one design pixel to one CSS pixel | judging type size, tap targets, and anything measured |

**100% is the one that has to be exact.** It is where a reviewer decides whether 14px is too small, and a
shell that quietly renders at 92% makes that judgement about a size that does not exist. Fit width and
fit screen are conveniences; 100% is a measurement.

**Fit screen may exceed 100%**, and refusing to let it is the common mistake: a 375-wide phone frame on a
2560 display is legible at 180% and postage-stamp sized at 100%. Cap it somewhere sane rather than at
one.

State the scale in the control, not just the mode. *"Fit screen · 143%"* tells the reviewer what they
are looking at; *"Fit screen"* alone does not.

### Frames sit top-left, with the same gap as everything else

Top-aligned, left-aligned, in reading order, and the gap between the frame and the pane edge is **a step
on the spacing scale**, the same one the screens use. A shell with a 20px inset around a design built on
an 8px scale is the first thing a designer notices and the last thing anyone writes down.

Centring is the tempting mistake. It looks composed with one frame and falls apart with three, because
each row centres independently and no two captions line up.

### The tab bar carries groups when it needs them, and the groups are in one order

Past a certain size a flat bar stops being navigable. Group it, and keep the order that makes the
argument:

```
ROLE Employee   ROLE HR Manager   ROLE Admin        the product, one tab per audience
FUTURE …                                            proposed, not built, and labelled so
STATE BOARDS  wp1 … wp7                             the states behind the product
OPTION BOARDS wp9 … wp15                            decisions that were settled
Design system   Tokens                              the system it was built from
```

**Applications and roles first, then the states, then the settled options, then the system.** A reviewer
sees a product, then what is behind it, then what it was built from. Reversed, they see a spec and never
reach the product.

**A proposed feature is labelled as proposed on the tab itself**, not in a footnote. A tab that looks
like the others and is not built is a promise the reviewer will repeat to somebody else.

### One line of meta, and it says what this is NOT

Above the tab bar: the title, the revision date, what this is, **what it does not do**, and the viewports
it was built at.

The caveat is the load-bearing half. *"Sample data, no database, no live API"* and *"nothing is signed or
transacted in the application, it records what happens outside it"* are the two sentences that stop a
demo being mistaken for a product, and both were written after somebody made that mistake.

---

## Options decide. The interactive flow is the deliverable.
<!-- enforced-by: dangling-target, dangling-href, nav-target, unreachable, dead-end, orphan-prototype, flow-declared -->

A work package ships **both**: option boards, which settle a decision, and **one interactive prototype
of its main flow**, which is the thing the human uses. Boards alone are not a package.

Boards are static, so every check in this flow can see them. A flow cannot be checked that way, and on
**every defect a human finds by using a prototype rather than looking at it is a navigation defect with no
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

## Three tags identify a frame
<!-- enforced-by: viewport-tagged, uc-exists, state-captured -->

```html
<div data-viewport="mobile" data-uc="UC-03" data-state="empty">
```

Tagged, never inferred, for the reason `data-viewport` already gives: a caption cannot be parsed
reliably and a fallback that always fires makes the tag inert. A build's captions come from its own
markup and will never match the prototype's, so the tags are the only identity channel both sides
control deliberately.

`data-state` defaults to `default`. Omit it and nothing breaks; omit it on a project that has an empty
state and the build comparison silently pairs the wrong frames.

## The frame size is declared once, and the frame is fluid up to it
<!-- enforced-by: viewport-coverage, dead-breakpoint -->

Set it at intake and hold it for the whole project. The default is **375 x 812**, the iOS idiom,
because it is the tighter constraint.

**Declare it as a maximum, not a fixed width:**

```css
.frame { container-type: inline-size; width: min(var(--frame-w), 100%); }
```

This rule previously said *fixed*, and that single word made responsive design impossible while
`@container` was mandatory below. A container query resolves against its container; a fixed-width
container never changes size; so every `@container` rule in the project evaluated once per frame class
and never again. It looked like responsive CSS and behaved like a hard-coded value. On the project
that found this the sidebar measured 232px at 320, 390, 768, 900, 1024, 1440 and 1600, and the phone
frame overflowed the window by 634px.

`min()` costs nothing and fixes it. At or above the declared width the frame is **exactly** the
declared width, so the capture, the geometry diff and the Figma frame are unaffected. Below it the
frame narrows, container queries fire, and the product is testable at any width.

Whatever it is, **the HTML viewport matches the Figma frame exactly**, or the geometry diff in step 7
compares two different things and every finding is noise.

## Responsive is `@container`, never a width `@media`
<!-- enforced-by: width-media, dead-breakpoint -->

**A `@container` rule whose container cannot change size is dead configuration**, and
`verify-html`'s `dead-breakpoint` check reports it. Writing the query is not the same as being
responsive: see the frame rule above.

**Enforced by `verify-html`'s `width-media` check**, which reads the stylesheets from disk. It was a
rule with nothing behind it until 0.8.0, and the cost of that was invisible: a prototype using a width
`@media` renders correctly in a browser and is measured against the wrong layout by `verify-html`,
`parity-check` and `build-diff` alike, all three reporting clean.

When more than one viewport is declared, **every viewport renders in the same browser window**. A
width-based `@media` rule therefore fires for every column at once and renders the narrow column as
the wide one, and that column is what gets ported. Verified: with a 1440 frame and a 375 frame side
by side, every `@container` rule resolved against its own frame.

Each frame declares `container-type: inline-size`. That contains the **inline axis only**, so frame
height stays content-driven: which is what keeps the tall-screen hug pair working.

Hover cannot use `@media (hover)` either: one window cannot distinguish the columns. Key it off the
frame class.

**`@container` carries no specificity.** A component base class declared *later* in the file wins at
equal specificity, so the container rule silently loses:

```css
.top-nav__burger { display: inline-flex; }
@container frame (min-width: 1024px) { .top-nav__burger { display: none; } }
/* ... 200 lines later ... */
.btn { display: inline-flex; }        /* equal specificity, declared later, wins */
```

The burger rendered on the desktop frame. Every `@container` block that overrides a property also set
by a component base class must be declared **after** that class; keeping them in one trailing section
makes the ordering a visible convention. This trap was hit **three times** in one stylesheet: the
third time it made an icon button 32×40 instead of square and dragged every row it sat in 8px taller.

## Navigation has to reflow too, and pica used to say nothing about it
<!-- enforced-by: none — the pattern is a human decision; flow-reachable catches a section unreachable at a viewport, not a bad choice of pattern -->

A sidebar is the most common navigation pattern in the archetypes pica ships — `erp`,
`admin-console`, `crm` and `hrm` all assume one — and until now nothing here said what happens to it
on a narrow surface. The result on the project that found this: a 232px sidebar at 320, 390, 768, 900,
1024, 1440 and 1600, and a mobile screen whose only exit was a button reading *"Back to the desktop
dashboard"* pointing at a desktop-only frame, which `flow-check` accepted as a valid link.

**Decide the narrow-width behaviour when you declare the viewports, not when you notice.** Three
patterns, and the choice follows from what the navigation is for:

| Pattern | Use when | Cost |
|---|---|---|
| **Collapse to a bar** — the sections become a bottom or top bar | 3–5 sections, all equally important, and the user moves between them constantly | a bar eats 56px of height forever, and it caps you at about five |
| **Collapse to a drawer** — a button opens the full list over the content | more than five sections, or the user settles into one and stays | every navigation is now two taps, and the current section must be named in the header or the user is lost |
| **Promote one, demote the rest** — the primary task is full-width, everything else behind a menu | one section is the reason the product exists on a phone at all | honest about priority, and the demoted sections get noticeably less use |

**A phone screen must be able to reach every section its role can see.** A dead end at one viewport is
a dead end, and `flow-check` cannot see it: a link to a screen that exists only at another viewport
resolves perfectly and strands the user. State the pattern in `state.viewports[].nav` so the decision
is recorded where the idiom is.

**The chrome list in `state.viewports[].chrome` is where this becomes checkable.** A viewport that
declares a `nav-sidebar` as required and a narrower one that declares a `nav-bar` or `nav-drawer` have
said what reflows into what.

## Prefer CSS Grid with named areas for anything that reflows
<!-- enforced-by: none — an implementation preference, not a property of the result -->

A flex row cannot promote a nested child to full width. One mobile card ran to **550px** because its
chip row was a grandchild inside a squeezed column; no amount of flex tuning could fix it, because the
reflow was structurally impossible without changing the DOM.

Grid changes order *and* span from CSS alone, so both viewports keep **identical markup**: which is
what keeps a structural parity check meaningful. Reaching for flex first tends to force either a markup
fork per viewport (which parity then reports forever) or a compromise layout. After the restructure:
550px → 170px, wide viewport unchanged.

## Check for overflow. The frame hides it.
<!-- enforced-by: overflow -->

Frames carry `overflow: hidden`, so content that spills is **clipped, not visible**. Two mobile frames
overflowed by 83px and 34px with nothing to see: no scrollbar, no cut glyph, just content rendered into
a void.

Cause both times: grid items default to `min-width: auto` and refuse to shrink below their min-content
width, so one unbreakable string, a 38-character filename, pushed the column past the frame edge.
`.grid > * { min-width: 0 }` fixes it; **the finding is that nothing would have caught it.** The capture
script already walks every element box and knows each frame's rect, so the check is nearly free.

## Single-line controls must truncate, not wrap
<!-- enforced-by: none — not distinguishable in the capture from a value that simply fits -->

An `<input>` is single-line by definition: the value scrolls and never lays out on a second line. A
design-tool text node wraps as soon as the string exceeds the width: correct for a paragraph, wrong for
a form control. Set `maxLines: 1` with ellipsis truncation **on the component**, so every instance
inherits and any instance added later cannot revert.

Note the ellipsis is a deliberate improvement on the reference, not a match: a browser clips input
overflow with no ellipsis. A static frame cannot scroll, so without it a truncated value reads as the
complete value and a developer builds the wrong field width. Record it as a deviation.

## The tall-screen pair
<!-- enforced-by: tall-screen-pair -->

A screen taller than the viewport ships as **two versions**, side by side:

1. **Interactive.** The real viewport height with genuine `overflow-y: auto` inside it, scrollbar
   hidden, bottom nav pinned, home indicator present.
2. **Full height.** The frame grows to the full content so a reviewer sees everything at once. It
   **still carries the declared chrome**, bottom-pinned like every other frame.

   *Corrected in 0.3.0.* This rule previously said a hug frame carries no home indicator "because it is
   a board rather than a viewport": which contradicted figma-screens.md, where 0.2.0 had already
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
  drift: which is the exact failure the pair exists to expose.
- A hug twin is **not a separate screen** for parity purposes. Its existence depends on content height at
  that viewport, so it is legitimately asymmetric between viewports.

This pair maps directly onto Figma's interactive and hug frames, which is why it exists in this form.

## Real assets, or none
<!-- enforced-by: icon-set -->

- **No emoji standing in for icons.** Use a real icon set. Fifteen emoji and glyph
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
<!-- enforced-by: state-captured, minimum-present, excused-named -->

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
<!-- enforced-by: class-documented, token-shown -->

`design-system.html` is built first, as a storybook: every token and every component with all variants
and states, single file, no build step.

**No check reads this file.** `pica.md` has asked for it since step 3, this rule names it, and the
only script that mentions it is the capture producer, which *excludes* it. So the storybook is a rule
with no executable behind it, which is the class of gap 0.3.0 shipped three of and this project keeps
finding in itself. It is recorded here rather than left for somebody to notice.

What would close it: a check that every token in `tokens/tokens.json` appears on the page, and that
every class a screen uses appears there with at least one variant. Until that exists a component can
enter the product without ever being documented, and nothing will say so. `examples/approvals/` ships
a complete one anyway, and says the same thing at the bottom of it.

From then on, **screens consume kit components.** A one-off built inline on a screen is a review
finding, not a shortcut, because it will not receive the next token change and nobody will notice.

When a pattern repeats within a screen family, promote it. When it repeats across families, it belongs
in the kit.

## Promote slowly, bind always
<!-- enforced-by: raw-colour, raw-radius, raw-spacing, linear-easing -->

The flow-wide statement is in
`core/rules/reference-discipline.md`. In HTML it reads:

**A shared class is a promotion, and the default is no.** Write the markup on the screen; lift it into
the kit when a second occurrence appears that is the same *thing*, not the same shape. Two blocks that
happen to be 328px wide are not one component. A kit class created on a guess is worse than none: it
reads as the current plan, and every later variation arrives as a modifier nobody asked for.

**Every value is a custom property on first use.** Colour, spacing, radius, border width, font size,
line height, weight. No threshold, no "this one is a one-off": a literal in a rule has no second
occurrence to justify it, and it is exactly what will fail to port. The only escape is a
`rawValueExemptions` entry.

The two decisions arrive in the same moment and feel like the same instinct. They are opposite.

## A trap documented beside the code is not a rule
<!-- enforced-by: none — a rule about how to write rules -->

`box-sizing` contains padding and border and **not margin**, so `width: 100%` plus a horizontal margin
overflows its parent. That trap was written out as a comment on one component, and
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
<!-- enforced-by: edge-inset, edge-scale, off-scale -->

Pick one content-edge inset and hold every row to it.

The HTML is authoritative, but **faithful to a broken reference is still broken**.
a row used `justify-content: center`, putting its buttons at 43px while every other element sat at 16px.
Figma reproduced it exactly and correctly, and both were wrong. Fix the HTML rather than porting the
mistake.

Where the HTML is accidentally off-token, a missing `line-height` falling back to `normal` or an inline
height where siblings use a token, fix the HTML. Do not carry it into the design system.

## Length-realistic copy
<!-- enforced-by: length-realism -->

Mock strings should be realistic for the shipping locale. If the product ships in a language that runs
15 to 25 percent longer than your working language, draw at least one screen in it as a length check,
and make long strings degrade predictably: clamp to two lines, then ellipsis.

When you replace mock data later, **match the character count** so nothing reflows. A 22-character
email swapped for a 27-character one can overflow a field that was already signed off.

## No build step
<!-- enforced-by: none — a project property nothing inspects; react-demo.md narrows it to boards -->

Plain HTML and CSS, one `shared.css` carrying the tokens and the phone chrome. No bundler, no framework,
no npm install to view a screen.

The prototype's job is to be opened instantly by a designer and measured by a script. Both get harder
with tooling in the way.

## Mobile web is not desktop made narrow

<!-- enforced-by: none — judgement, not decidable by a script -->

pica's rule set has been bimodal: desktop web, and `native-mobile.md` for a shipped app. The most
common case falls between them — **a responsive web app that someone opens on a phone every day** —
and it inherits neither set.

On one engagement that gap produced a mobile view which was the desktop layout narrowed: zero
bottom navigation, zero safe-area handling, top tabs carried straight down from desktop, and a
frame with no height so the phone screen never ended. `native-mobile.md` was read and correctly set
aside — its subject is store assets, signing keys and release asymmetry, none of which applies to a
web build. So the role did the right thing with the rules it had and still produced something
nobody would recognise as a phone application.

What transfers from app convention to mobile web, and is not native-only:

- **Primary navigation sits at the bottom**, in the thumb zone, when a person uses the product
  daily and moves between two or more areas. Top tabs are a desktop inheritance; on a phone the
  top of the screen is the hardest place to reach and the worst place for the thing used most.
- **A sheet, not a modal.** It rises from the bottom edge, it is dismissible by gesture as well as
  by a control, and it does not ask a thumb to reach a corner.
- **Safe areas are real on web too.** `env(safe-area-inset-*)` exists precisely because a fixed
  bottom bar lands under the home indicator otherwise.
- **The fold is a place.** Frame the declared viewport at both its dimensions and let the frame
  scroll inside itself, or nothing about reach, stickiness or above-the-fold is observable.

The test is not whether it works at 390px. It is whether someone holding a phone would recognise
it as an application rather than a page.


## Operate it with the keyboard before anyone else has to

<!-- enforced-by: focus-order, keyboard-trap, modal-traps-focus, escape-closes, focus-returns, focus-visible-live -->

`a11y-check` asks five questions of a capture: is this control reachable, named, focus-visible,
big enough, and does it carry a role. Every one is a property of a control **in isolation**. None
is a property of the sequence, and the sequence is what a keyboard user actually experiences.

The first time anything operated one finished demo by keyboard it found, in under a minute, that
Tab walked straight out of an open sheet into the list behind it — still there, still operable,
under a scrim saying otherwise — and that Escape did nothing, so the only way out of the dialog
was a pointer. Both had shipped. Neither is visible in a screenshot, neither appears in a capture
that records what each control *is*, and both are exactly what the published limits of static
scanning say will be missed: automated scanners cannot detect focus traps or broken keyboard
interactions.

So: a dialog is a room with a door, and both work from the keyboard. Focus moves into it on open,
cycles inside while it is open, and returns to the control that opened it on close — otherwise a
person is dropped at the top of the document with no idea where they were. Outside a dialog, Tab
can always leave. Focus order follows reading order **within a scroll region**; pinned chrome is
not part of that order and must not be judged against it.

## axe is the floor, and the floor is about a third

<!-- enforced-by: axe-violations -->

Run axe-core over every route. It covers the machine-checkable subset of WCAG — contrast, labels,
ARIA misuse, landmark and heading structure, and roughly a hundred rules more — and published
estimates put that at somewhere between a third and a half of the success criteria. **The rest
needs a person, and a page that passes every rule here can still be unusable with a screen
reader.** Print that limit beside the pass, every time; a green line implying more than it proves
is how a team stops looking.

Two things it caught on a build that had already passed every geometric check pica owns. A
`role="tablist"` that was asserted and never honoured — its children were plain buttons, so it
promised a tab widget and delivered two buttons with no selection state and no relation to the
panel below; every individual control was correct and the *claim* about them was false, which no
screenshot can see. And a scrolling list of seventeen deliberately inert rows, which therefore
contained nothing focusable and could not be scrolled from a keyboard at all.

It also caught a rule this project had just written. "Done work recedes" had been implemented as
`opacity: .55` on a confirmed row's status text, which put it under 4.5:1. **Quiet and illegible
are not the same thing, and a percentage cannot tell them apart** — recede by moving to a quieter
token, never by fading text through the floor.

## A baseline is what catches the second consequence

<!-- enforced-by: visual-baseline -->

Every other check asserts a property: no overflow, one left edge, contrast over the floor. A
committed screenshot asserts something none of them can — that nothing changed except what was
meant to.

The defects this catches all have the same shape: a one-line edit with a consequence somewhere
nobody was looking. A chip removed from a list for good reasons, which silently removed it from a
detail screen too. A divider that stopped drawing when a later rule won a cascade it had never
been checked against. A receding style that crossed the contrast floor. Each was invisible in the
diff that caused it.

Design the flake out rather than tolerating it, along the three axes that cause nearly all of it:
freeze animations at capture, await `document.fonts.ready` — a shot taken before the web font
loads differs from one taken after, every time — and state the viewport explicitly instead of
inheriting it. A small per-pixel tolerance absorbs anti-aliasing without absorbing regressions.
Commit an updated baseline in the same change as the code that moved it, so a reviewer sees the
visual diff beside the diff that caused it; a baseline updated on its own proves nothing.

## Read the tree a screen reader is handed, and watch what it would be told

<!-- enforced-by: unnamed-in-tree, hidden-from-tree, tree-order, silent-change, dialog-unnamed, no-headings -->

axe reads the DOM and the keyboard check operates it. Neither reads the **accessibility tree** —
the structure VoiceOver, NVDA and JAWS actually consume — and neither watches what a live region
would announce. Those are two more channels, and defects hide in both.

On a build that had already passed axe with zero violations and a full keyboard walk with zero
findings, reading the tree found that **the product exposed no heading at all.** Most screen reader
users move through a page by heading first; the rotor had nothing to land on, so the only route
through eleven rows was to read them one at a time from the top. Nothing on screen looks wrong —
the group labels *are* visually headings, they were simply `div`s.

Watching live regions found the other one: the one irreversible action in the product completed,
drew a receipt, and **announced nothing**. A screen reader user pressed it and heard silence. That
is the same defect as a confirm bar vanishing without a trace, in the channel nobody had checked.

Resolve controls to their own tree node by `backendNodeId`, never by matching text. A first version
matched on strings and produced confident nonsense — a row button whose `textContent` is an avatar
initial plus a name plus a project does not equal the platform's computed name, so two correct rows
were reported missing from the tree. **An assertion about the tree has to be made against the
tree.** Scope it to the product frame, too, or the review harness's own controls get filed as
product defects.

**And say what this is not.** It cannot listen. Whether an announcement is the *right* one, whether
the reading order makes sense in the product's own language, and whether a widget behaves the way
its role promises all need a person with the software on. Driving VoiceOver from a script needs
interactive permission and takes over the machine's audio and focus — ask before doing that to
somebody, and until they say yes, report the tree as the tree and the gap as a gap.
