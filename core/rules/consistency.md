# Consistency

Every rule below was written from one mobile engagement, where the client reviewed a file that had
passed every gate pica shipped and said *"this is a lack of consistency, which is the main problem
we see."* They then sent seven principles of their own. This file is those principles turned into
rules, each one named after the defect that produced it.

Load it alongside your role's own rules. It is cross-role on purpose: the decisions it governs are
made by `ux-designer`, spent by `ux-engineer`, and discovered by `design-ops` at the port, and a
rule that lives in only one of those three is a rule the other two break.

## The sentence the whole file turns on

<!-- enforced-by: none — judgement, not decidable by a script -->

The client wrote it as principle six:

> *"Define all variants and states directly within the component, rather than introducing
> screen-specific overrides. Any intentional differences must be clearly specified at the component
> level."*

`figma-elements.md` already says *bind behaviour at the component, never per instance*, and the file
that drew this complaint had been built by people who agreed with that. It still accumulated **5,000
screen-level style overrides** across two pages — every icon colour re-bound per instance, a
calendar's *unavailable day* expressed as `opacity: 0.32`, a bar label re-aligned on 380 screens, a
destructive row's red label painted by hand. Every one had looked like a small local fix at the time.

What was missing was not the principle. It was **a number**. So make it one:

**A screen supplies content. Every other difference lives in the component.** Content is text,
images, the values of the component's own properties, and prototype wiring; auto-layout also imposes
width and height, which are consequences rather than decisions. Everything else — fill, stroke,
radius, alignment, type style, padding, opacity — is a component decision, and a screen that needs a
different one needs the component to grow a variant.

That line is auditable. Walk every top-level instance's `overrides`, classify each `overriddenFields`
entry into *content* or *decision*, and report the count of the second kind per component. Before:
3,000 on one page and 2,068 on the other. After: **1 and 0.** A principle nobody measures is a
principle a file drifts away from while everyone involved still believes in it.

---

# Part 1: Where a decision lives

## Search the client's own product before you build anything

<!-- enforced-by: none — judgement, not decidable by a script -->

`figma-elements.md` has reuse rules for the kit **you** are building — never detach, a local must not
duplicate a global. This is the step before that one, and it is the principle the client stated most
bluntly:

> *"Why are you using custom components instead of the ones we provided, especially the badges and
> its variations. This applies for all the components."*

They had shipped **478 components**. Among them: a badge with 288 variants covering every semantic
colour, and a calendar-day component carrying the exact activity states the product needed, under
their own domain names. The build had hand-made a pill and a day cell instead — not out of
arrogance, but because nobody had opened the library first.

A hand-built equivalent of something the client already ships is worse than a merely redundant
component. It is a second source of truth for their product, in their file, that their team will
have to reconcile forever. **Open the set. Then build only what is missing.**

Adapting one of theirs for a smaller screen is reuse, not divergence, and it is explicitly what they
asked for. Wrapping theirs in a thin component of yours to add what your medium needs — a selection
state, a token binding their raw hex lacks — is also reuse, and it is usually the right shape.

## A component with no variants forces overrides

<!-- enforced-by: none — decidable, and pica has no check for it yet -->

One list row was used **1,500 times with zero variants**. It was not a simple component; it was a
component with nowhere to put a difference, so every difference fell through to the screens — a red
label for delete actions, an icon colour per row, a stroke weight here and there.

A component used everywhere and varying nowhere is not disciplined, it is **unfinished**. The count
of overrides against it is the measure of what it failed to model.

## A property that controls nothing is a lie

<!-- enforced-by: none — decidable, and pica has no check for it yet -->

The app bar carried a `trailing` boolean that referenced no layer. It had been true on dozens of
instances for weeks and had never done anything. A developer reading the file would have wired it.

Every property must change something. An inert one is worse than a missing one, because a missing
property is a gap and an inert property is a false promise.

## A repeated name is not a repeated component

<!-- enforced-by: none — judgement, not decidable by a script -->

A sweep grouped by layer name and reported `field` as "repeated across three screens, componentise
it". It was three different things wearing one name: a height ruler, a date value row, and a
calendar row. Componentising it overwrote the date controls with a ruler on 32 frames.

**Before componentising, compare the children, not the names.** The name is what somebody typed; the
children are what the thing is.

## A swap slot does not inherit the wrapper's paint

<!-- enforced-by: none — judgement, not decidable by a script -->

This is the mechanism behind most of those 5,000 overrides, and it is invisible until you know it.

A wrapper exposes an icon slot. You bind a colour token on the wrapper's *default* icon and assume
every instance inherits it. It does not: a swapped-in component arrives carrying its **own** paint,
so every screen that swaps the icon must re-bind the colour, and the file fills with per-instance
colour overrides that all look like carelessness and are actually structural.

**Fix it at the master of the thing being swapped in, not at the wrapper.** In that engagement, 50
icon masters bound once removed 3,492 overrides on one page and 1,944 on the other.

## One asset on many grounds gets a tone axis, not a copy

<!-- enforced-by: none — judgement, not decidable by a script -->

The same icon appeared on a surface that flips with the theme and on a brand-coloured tile that does
not. A single binding cannot serve both, and duplicating the asset splits it forever.

Give the asset a `tone` axis — `default`, `on-accent`, `on-brand` — and let each host select through
a property. The engagement needed exactly three tones for its whole icon set.

## Never fake a variant by renaming a layer

<!-- enforced-by: none — judgement, not decidable by a script -->

A picker needed a close button in the trailing slot. The component had no such variant, so four
screens renamed an invisible spacer layer to `xclose`, painted a chip on it by hand, and shipped.

It renders correctly and it is a lie about the component's API. The person who inherits the file
will look for a `close` variant, find a spacer, and not know which screens depend on the disguise.
**Missing variant means add the variant.**

---

# Part 2: What the eye checks

## Detect the oval by what the container holds, not by what it is called

<!-- enforced-by: geometry -->

`figma-screens.md` already has this rule — *anything that must read as a circle is FIXED × FIXED,
never HUG* — and its audit keys on the layer name: `/dot|check|circle|avatar|ring|radio|thumb/i`.

That detector missed a camera chip authored 36×36 and shipped at **20×36**, because the layer was
called `cam`. Chips get named for their **function**, not their shape — `cam`, `eb`, `fh`, `emore` —
so a name-based filter finds the ones somebody already thought about and misses the rest.

Key on content instead: a radius-999 container **whose entire content is glyphs** is expected to be
circular. And keep the inverse guard, or the check is worse than useless — a pill carrying *text* is
supposed to be long, and the first draft of this version flagged 28 perfectly correct pills as ovals
before that clause was added.

## Alignment is one decision per role, checked at the width you did not author

<!-- enforced-by: geometry -->

Pick the rule once — *list rows centre vertically*, *bar labels align leading* — write it down, and
measure it. The failure is never that somebody chose wrong; it is that forty screens each chose
locally and nobody compared them. **If the same component is aligned two ways on two screens, one of
them is wrong, and "it looks fine on this screen" is not which.**

Then check it at a width you did not author. A calendar cell drawn at 44px rendered at **49px**
because its row stretched to fill; the auto-layout children re-centred and an absolutely-positioned
overlay pinned to the leading edge did not, so the today-marker sat 2.5px off its own numeral and
clipped it. The authored width is the one case guaranteed to work, which is exactly why it proves
nothing.

An overlay anchors to the edge it visually belongs to, and anything that must stay concentric is
centred by the layout, never by a coordinate that was correct once.

## Measure the container, not the glyph's paths

<!-- enforced-by: none — judgement, not decidable by a script -->

When checking whether an icon sits centred in its slot, compare the icon's **container** to the
slot. Comparing the individual vector paths produces a flood of false positives — the dot of an *i*
sits high by design, an arrow's head is off-centre by construction — and a check that cries wolf 64
times gets muted, taking the real finding with it.

This is the same error as measuring scan distance from a stretched flex container in `craft.md`, one
level down: both produce a confident number about the wrong object.

## A breakpoint is a decision, not a scale factor

<!-- enforced-by: viewport-coverage -->

The source product supplies **content, imagery and the semantics of its states**. The brief supplies
**the arrangement at this size**. Treating the first as if it also supplied the second is how a
desktop card arrives intact on a phone.

Measured: a nutrition card drawn 328×432 for the web, carried over unchanged, yielded about **one and
a half cards per mobile screen**. The client's words were *"the user now has to scroll infinitely."*
Their own brief had already answered it — the same content as compact rows, seven visible at once —
and the brief's rows carried **seven** states where the web component had five, adding *downloading*
and *download failed*, which only exist on a device.

Rebuilt that way the list went from 4,764px to **1,084px**. Nothing about the content changed; the
arrangement was re-decided, which is what a breakpoint is for.

So: reuse the component, re-decide the density. And when the two references disagree, they are
usually not in conflict — they are answering different questions. Ask which one owns the question
you are actually asking.

## Anything that clips must be larger than anything it holds

<!-- enforced-by: overflow -->

Two instances, same engagement, both invisible until measured. A checkbox tick authored at 14×14 sat
inside a 12×12 slot with clipping on — cut by 1px on every edge, on every checked row in the product.
And a 132×16 wordmark sat inside a 72×72 app-icon tile, rendering as **"TSHAKE"** across an orange
square.

Fixed size plus clipping is a bet that content will never change. Content always changes — a longer
translation, a different glyph, an asset restored at its natural size. Either the container hugs, or
it scrolls, or you have accepted a crop you must be able to name.

---

# Part 3: Colour that survives a theme

## Choose the token by the surface behind it, not the theme of the screen

<!-- enforced-by: contrast-floor, contrast-proved -->

The most expensive one-line mistake in the file. Binding every icon to the primary content token is
correct reasoning and wrong on any ground that does not flip: in dark mode **544 trophy icons turned
white on a yellow circle** at 1.35:1, a brand mark went white on an orange tile at 1.93:1, and a
badge arrow went white on lavender at 1.60:1.

`craft.md` says dark is designed, never inverted. This is its corollary at the leaf: **a ground that
does not change between themes requires content that does not change either.** Photographs, brand
colours, marketing pastels and illustration plates are all theme-invariant grounds, and they need a
theme-invariant token family of their own.

Read the backdrop, then pick the token. Never read the frame's theme and pick from that.

## Measure the resolved value, in every theme, on fill and on stroke

<!-- enforced-by: contrast-floor, contrast-proved -->

Three ways a contrast audit passes while the screen is unreadable, all observed on one file:

- **The literal, not the resolved value.** A token is an alias to an alias. Auditing the hex sitting
  on the node audits whatever was there before the binding.
- **One theme.** A pair proved on the light surface says nothing about the same pair on the dark one.
- **Stroke without fill.** A vector can carry a *bound* stroke and a *raw* fill simultaneously. A
  stroke-only check reported clean while a three-dot button sat at **2.03:1 in both themes** on 136
  instances of the most-opened card in the product.

## An asset's baked-in ground must match the surface it sits on

<!-- enforced-by: none — render and look -->

A banner photograph carried a flat `#c0c0ff` background; the card behind it was `#c7d2fe`. Two
lavenders seven units apart: no contrast check cares, because neither is text or a control, and at
screenshot scale the seam does not read. On the canvas it is an obvious rectangle, and the client
found it twice.

The tell is a **fit** scale mode, which letterboxes the asset and exposes its own ground where a
**fill** would have cropped it away. Export the asset and sample its border pixels rather than
judging by eye — and note that a surface matched to a baked-in ground can no longer flip with the
theme.

---

# Part 4: State that tells the truth

## A state must agree with the content beside it

<!-- enforced-by: none — judgement, not decidable by a script -->

The one no gate will ever catch, and the one that embarrasses you in review.

**128 screens marked the selected day as a rest day while showing a scheduled, unfinished workout
underneath it.** Every variant was legal. Every contrast pair passed. The component was used
correctly. The screen simply said two contradictory things at once, and the only way to find it was
to derive the expected state from the screen's own content and diff it against the state that was
set.

Do that derivation. It is the cheapest review pass there is and nothing else substitutes for it.

## A fact visible twice is derived once

<!-- enforced-by: none — decidable, and pica has no check for it yet -->

The same date read *scheduled* in the week strip and *rest day* in the month calendar, on the same
screen. Two components, two authors, one truth.

Anything a user can see in two places must come from one source, and where the medium cannot enforce
that, the check must: enumerate the facts that appear more than once and compare them.

## One dataset, one identity

<!-- enforced-by: none — decidable, and pica has no check for it yet -->

The profile said *Muž*; the questionnaire had *Žena* selected; both were the same fictional user.
Mock data drifts silently because each screen is populated when it is built.

Name the person once, with their attributes, and populate every screen from that. `generating-mock-data`
in `ux-engineer` covers deriving it from the entity model; this is the weaker requirement that always
applies: **one set of facts across the whole deliverable.**

## Changing content invalidates every number derived from it

<!-- enforced-by: none — judgement, not decidable by a script -->

A questionnaire was reduced from fourteen questions to ten. Four screens went on saying *"answer 14
questions"* for weeks.

Counts, progress indicators, summary lines and empty-state copy are all derived values wearing the
costume of static text. After changing a set, grep the old cardinality.

## Every state a component declares is reachable, or is dead by name

<!-- enforced-by: none — judgement, not decidable by a script -->

`structure.md` requires every state in the model to appear in lo-fi. This is the same requirement
pointed at the component library: a variant nobody can reach is either a missing screen or dead
weight, and you cannot tell which without asking.

In that engagement the audit found both. *Partially complete* had never been drawn on any screen —
a real gap, and the client had asked for exactly it: *"the status/state have opportunities to show
the multiple status through the flow."* Meanwhile an age scale on a ruler was genuinely dead, left
over from a control that had been replaced. **Register the dead ones with a reason.** Silence reads
as an oversight, because usually it is.

---

# Part 5: Chrome

## Leading is back; trailing is dismiss

<!-- enforced-by: none — decidable, and pica has no check for it yet -->

The client's words: *"close button should be on the right side (applies for the whole project), left
is mostly for the back button navigation."*

The two are different verbs. Back moves you up a stack that still exists; close destroys a context.
Putting them in one slot means a person cannot learn what the corner does, and the cost lands on the
screens where both are present.

Measurable: every visible dismiss control sits past 60% of the frame's width.

## Every non-entry step of a dismissible flow exits in one tap

<!-- enforced-by: dead-ends -->

`structure.md` forbids dead ends — a screen you can reach and cannot leave. This is the softer
version that still fails users: a screen you can leave only by pressing back four times.

Back counts as an exit **only when back itself lands outside the flow**. Otherwise the step needs its
own dismiss, or a skip.

## A screen beneath an overlay keeps its own identity

<!-- enforced-by: none — judgement, not decidable by a script -->

When a sheet opens over a screen, the screen behind it keeps the label it had — which is the
*destination its back control returns to*, not its own name. Twenty-four frames drew a bar reading
*Settings* over a heading reading *Settings*, which tells the user the back arrow returns them to
where they already are.

A bar label equal to the screen's own heading is always wrong. Compare each overlaid frame against
the standalone version of the same screen; the two must agree.

---

# Part 6: Verifying without breaking what you verified

## Validate the instrument before the verdict

<!-- enforced-by: none — a rule about how to write rules -->

Two of the checks written for that engagement were wrong on their first run and would each have
generated a day of busywork: the oval check flagged 28 correct text pills because it keyed on radius
instead of content, and the viewport-coverage check reported six screens missing three breakpoints
because it counted asset-parking frames as screens.

**A check that fires a lot is a check to re-read, not a backlog to work.** Before acting on a new
measurement, confirm it fires on a case you know is broken and stays silent on one you know is
fine.

## Verify after the cleanup, not before

<!-- enforced-by: none — render and look -->

The app-icon tile was rendered, inspected and correct. A later bulk cleanup — a legitimate one, on a
different defect — dropped a size override, and the tile shipped reading *"TSHAKE"*. Nobody would
have reopened a screen already signed off.

The gate runs **last**, over everything, after the final edit. A screenshot taken before the last
change is evidence about a file that no longer exists.

## Restore by position, never by name

<!-- enforced-by: none — judgement, not decidable by a script -->

Bulk edits capture state, mutate, and restore. If the restore matches on layer name and the siblings
share one — three navigation tabs all called `nav-tab`, three labels all carrying the default
string — then **every slot receives slot zero's value** and the originals are gone. That is how 148
navigation bars came to read *Overview / Overview / Overview*.

Capture and restore by index. And give any bulk operation an invariant to check afterwards: node
counts, string counts, link counts. Without one you cannot tell what you deleted.

## `resetOverrides()` also resets what the parent configured

<!-- enforced-by: none — judgement, not decidable by a script -->

`figma-elements.md` already names this as a destructive last resort needing a full capture of texts,
image hashes, variant props and reactions. One case belongs on that list and is not obvious from it.

**It does not reset a nested instance to what the parent component configured. It resets it to the
nested component's own defaults.** A navigation bar whose master sets its three tabs to *Overview*,
*Exercises*, *Programmes* — each through the tab's own text property — came back from a reset reading
**Overview / Overview / Overview**, on 148 instances. The master was correct throughout; nothing in
the capture-and-restore was missing, because the values had never been overrides in the first place.

So add to the capture list: **every nested instance's property values, read back from the master
after the reset, not from the instance before it.** And a swap has its own omission — it silently
drops **size**, which is how a 132×16 wordmark ended up at natural size inside a 72×72 tile.

## A defect you were shown is a class, not a point

<!-- enforced-by: none — judgement, not decidable by a script -->

The client pinned a comment to one screen and expected the file swept. Their words: *"please kindly
have a look at other screens also, not just the screen with the comments, then update them also to
prevent the same problems."*

`craft.md` has the sibling rule for reuse — *a fix belongs in the shape, not at the site*. This is
the reporting half: fix the root, sweep every screen for the same class, and **report the count of
the class**, not the one instance you were handed. One comment about a misaligned icon closed as
"fixed" is a comment you will receive again.
