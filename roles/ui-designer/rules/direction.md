# Direction rules

Load this for step 6, after the structure is drawn and before anything is styled.

`design-vocabulary.md` in `design-researcher` covers the nine foundations and how a tradition is
recognised from measurement. This file covers what happens next: turning measurement into two or
three directions a client can actually choose between, and proving each one is buildable before it
is offered.

---

## The sector has already settled the tradition. Read it before you draw

<!-- enforced-by: style-excluded -->

`industries.json` names one tradition per sector and rules out two to four, each with a reason.
Finance leads with international / Swiss typographic executed flat, and rules out glassmorphism —
*translucency reduces the contrast of the one number that must be unambiguous* — along with
neubrutalism and skeuomorphism.

This is a floor, not a template. Ten products in the same sector should share the conventions the
field settled and share nothing else.

Departing from the default is a **positioning decision, not a taste one**. It is recorded in
`industry.departures` with the argument for it, and `industry-check` fails a project that used an
excluded tradition without one.

## Vary inside the tradition, never across it

<!-- enforced-by: three-offered, traditions-differ, numbers-differ, baseline-present -->

Three tiles that are Swiss against glassmorphic against brutalist is not a choice. It is offering
the client two things you would refuse to build, and the style gate fails two of them anyway.

The spread that means something is **inside** the settled tradition: density, colour temperature,
type voice. Same tradition, three readings of it.

`direction-spread-check` holds the spread by measurement rather than by claim — the traditions, the
numbers, the radius and the flatness all have to differ. Three directions that differ only in accent
colour look like a choice, the client picks one in three seconds as instructed, and the decision they
were actually offered was nothing.

## Prove the contrast before you offer the palette

<!-- enforced-by: palette-declared, pairs-stated, contrast-proved, reserved-respected -->

A palette can look right on a moodboard and be unable to reach **4.5:1** on body text, **3:1** on
large text and **3:1** on interface components and graphical objects.

Found at the tile stage it costs an afternoon. Found after the demo is built it costs the demo.

Some traditions **cannot pass by construction**, and no care in implementation fixes them:

| Tradition | Why |
|---|---|
| **Neumorphism** | the control's fill is set equal to the page's fill, so the boundary ratio is **1:1**. A blurred shadow is a gradient — it has no measurable edge to contrast against |
| **Glassmorphism** | translucent surfaces inherit whatever sits behind them, so a panel passes on one screen and fails on another. Viable only with a solid fallback layer beneath the text |

Offering a style that cannot pass the gate is offering a style you cannot build.

Accessibility is built into the foundations, not audited at the end: the semantic tokens carry the
guarantee forward so every component inherits it.

## The sector's reserved hues are not available to you

<!-- enforced-by: reserved-respected -->

Each sector entry names hues that are load-bearing. In finance red means declined or overdrawn and
green means settled or in credit. Spending either on a brand accent destroys the one signal that
must never be ambiguous.

Red on a factory floor is inherited from site signage, so using it decoratively is a safety problem
rather than a taste disagreement. Blue on a food menu reads as spoilage.

## A style tile is not a moodboard and not a mockup

<!-- enforced-by: tile-complete -->

A moodboard alone is insufficient to establish a visual language. A full mockup goes too far and
starts an argument about details that do not matter yet.

The tile sits between: fonts, colours and interface elements carrying the essence of the visual
brand, with **enough real interface that the client reacts to the product rather than to a collage**
— a button, a form field, one card, an icon set, and one real fragment from the screen inventory.

Derive the palette from what **recurs across** the reference images rather than picking a colour that
stood out in one. A palette chosen from a single photograph is a photograph's palette.

## Every direction names what it serves badly

<!-- enforced-by: tradeoff-stated -->

A client choosing between options with no stated cost is choosing on taste with no information, and
will change their mind in three weeks when someone senior asks why.

One safe, one adventurous, one uncomfortable. The uncomfortable one earns its place by making the
safe one look like a decision rather than a default.

## Record all three: recommended, offered, chosen

<!-- enforced-by: choice-recorded -->

Where they diverge is the only free signal about whether the sector knowledge is any good.

- the default consistently overridden → the sector entry is wrong
- the client consistently picking the tile ranked second → the ranking is wrong

Neither needs a survey. Both are already in the document.
