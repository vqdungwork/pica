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

## The tall-screen pair

A screen taller than the viewport ships as **two versions**, side by side:

1. **Interactive.** The real viewport height with genuine `overflow-y: auto` inside it, scrollbar
   hidden, bottom nav pinned, home indicator present.
2. **Full height.** The frame grows to the full content so a reviewer sees everything at once. No home
   indicator, because it is a board rather than a viewport.

**Never a third "scrolled" version** showing a mid-scroll position. It reads as a state that does not
exist, and it is the thing reviewers ask about every time.

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
