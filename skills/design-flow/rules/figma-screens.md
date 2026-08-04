# Figma screen rules

Frames, states, alignment, and the Plugin API calls that fail silently.

Load this for step 6 (port) and step 8 (prototype). It pairs with
[figma-elements.md](figma-elements.md), which covers what the screens are built from.

---

# Part 1: Screens and states

## One set, plus a deltas page

Draw **one** screen set at the project's declared frame size, in the tighter platform's idiom, and
document the other platform in a delta table.

The default is **375 x 812**, the iOS idiom, because it is the tighter constraint. Set it once at
intake and hold it for the whole project. Whatever it is, the HTML prototypes use the same viewport so
ports are 1:1.

Never ship two full screen sets. It doubles the frame count, halves the depth you can afford per
screen, and a reviewer cannot tell what actually differs. A delta table with each row marked
**keep / adjust / swap** tells them in one read.

Rows that genuinely need platform-specific work, from experience: the date picker (a wheel is not
native on Android), the switch, dialog button alignment, press feedback (opacity versus ripple), the
active-tab indicator (dot versus pill), sheet corner radius, and the cast affordance.

## The tall-screen pair

A screen taller than the viewport ships as **two frames**:

1. **Interactive.** Fixed viewport height, real `overflowDirection: VERTICAL` scrolling inside it,
   bottom nav pinned, home indicator present.
2. **Hug.** Height grows to full content so a reviewer sees everything at once. It still carries the
   home indicator, bottom-pinned like every other screen, and no empty container left behind where
   something was removed.

*Changed in 0.2.0.* Earlier guidance omitted the indicator on hug frames on the grounds that a content
board is not a viewport. In review that read as an oversight rather than a decision — a reviewer scanning
for consistency sees a missing element, not a rationale. Every screen frame now carries it, which also
removes a per-frame judgement call from the audit.

Never present a "scrolled" duplicate showing a mid-scroll position. It reads as a third state that
does not exist.

Name them `home / default` and `home / default · hug`.

## Page structure that works

```
Cover               scope, criteria, how to review
01 · Audit          current-build captures by platform, findings, direction statement
02 · Foundations    colour, type, spacing, radius, elevation
03 · Components     globals only, plus a kit-coverage note
04 · <family>       screens + local components + annotations
05 · <family>
08 · Prototype      cloned frames, because links cannot cross pages
09 · Handoff        deltas, decisions, naming, reuse map, effort, open questions
```

Zero-pad page numbers so the sidebar sorts. Prefix documentation frames with a marker so a frame
search never returns notes, but keep that marker out of *body copy*, because most brand fonts have no
glyph for it and it falls back visibly.

## Prototype links cannot cross pages

Figma prototype destinations must be top-level frames **on the same page**. A flow spanning work
packages therefore needs its frames **cloned onto one prototype page**.

Accept the duplication, name the clones by flow (`A01 welcome`, `B02 player playing`,
`C04 live now`), and say in the page legend that the source pages remain the reference for specs. Add
named flow starting points so Present mode offers a real menu.

Then audit for **dead ends**: every frame should have at least one outgoing reaction, or be a
deliberate terminal state. A flow that ends nowhere reads as unfinished. Closing the last frame of an
onboarding flow back to home also makes the flows read as one continuous story.

## States are the deliverable

The states reviewers actually check, and the ones most often missing:

- **default**
- **loading or skeleton**, at least one representative per screen family
- **empty**, and make it useful rather than apologetic
- **error**, per-field where forms are involved, not only a global banner
- **disabled**, especially a CTA gated on a checkbox
- **keyboard-open**, with the content inset, because it changes the layout
- **focus**, on inputs

For a video or live surface, add buffering, connection lost, casting, and the platform's fullscreen
orientation pair.

Enumerate states in a matrix before drawing. It is the cheapest way to avoid discovering a missing
state during handoff.

## Naming

| Thing | Pattern | Example |
|---|---|---|
| Screen frame | `family / state · qualifier` | `home / default · hug` |
| Prototype clone | letter + 2-digit order + name | `C04 live now` |
| Global component | lowercase kebab, no prefix | `card-video` |
| Local component | family prefix + kebab | `pl-transport`, `live-hero` |
| Variant property | `property=value`, lowercase | `size=lg`, `active=library` |
| Variable | `collection.group/name` | `Token.text/secondary` |
| Text style | `role/weight` | `body-m/medium` |
| Annotation frame | leading marker | `▸ 02 Naming conventions` |

The weight suffix on text styles is mandatory. There is no bare `body-m`.

## Content and mock data

- Use the client's own assets and captures. Do not introduce photography that has to be sourced.
- Mock personas should suit the product's audience, and mock strings should be **length-realistic** for
  the shipping locale. If the product ships in a language that runs 15 to 25 percent longer than your
  working language, draw at least one screen in it as a length check.
- When you replace mock data, match the **character count** of what you replace so nothing reflows.
  Swapping a 22-character email for a 22-character email is free; swapping it for a 27-character one
  can overflow a field you have already signed off.
- Any placeholder that is not real content must be filled or removed before handover. A frame reading
  "PASTE HERE" is worse than an absent frame.

---

# Part 2: Alignment

## The grid is a promise

Pick one content-edge inset (16px is typical at 375 wide) and hold every row to it: the header, the
hero card, section headings, the nav, everything.

The moment one row sits at a different inset it reads as broken, even to someone who cannot name why.
A real case: a secondary-action row used `justify-content: center`, so its buttons started at **43px**
while every other element sat at 16px. The HTML had the same rule, so Figma was faithfully reproducing
a mistake. Both were changed to `space-between`, which put the button on the content edge and the link
on the right, matching the section-header row directly below it.

**Faithful to a broken reference is still broken.** Check the reference against its own grid.

## CSS to auto-layout, the translations that matter

| CSS | Figma | Trap |
|---|---|---|
| `width: 100%` | `layoutSizingHorizontal = "FILL"` | The default button is often 100% while size modifiers are `auto`. Getting this wrong makes a primary CTA hug its label |
| `width: auto` | `HUG` | |
| `margin-top: auto` | a **FILL-height wrapper** before the last child | Without it the last child stacks directly after content instead of sitting at the bottom. Cost 125px on one screen |
| `justify-content: space-between` | `primaryAxisAlignItems = "SPACE_BETWEEN"` | |
| `flex: 1` | `layoutGrow = 1` or `FILL` on the cross axis | |
| `gap` | `itemSpacing` | Bind it to a spacing variable so the token and the Figma value cannot drift |
| `padding: 0 12px 12px` | `paddingTop = 0` | Easy to set all four to 12 and gain 12px |
| negative margin or bleed | **negative `y` or `x`** | A hero bleeding behind the status bar is `y = -47`, not `y = 0`. This single error pushed every element on three screens 47px down |
| `flex-wrap: wrap` | `layoutWrap = "WRAP"` | Needed, or a chip row that should wrap will overflow or compress |

## Per-child spacing does not exist

Auto-layout applies one `itemSpacing` to every gap. When the design needs a zero gap between an
eyebrow and its heading but 12px elsewhere, **wrap the pair** in a frame with `itemSpacing: 0`.

Do not reach for spacer frames. A semantic wrapper (`heading`, `Main`) is legitimate; an empty
`Spacer` rectangle is not.

## Button labels must be centred

`textAlignHorizontal = "CENTER"` on every button label, set **on the component** so instances follow.

A `LEFT`-aligned label looks perfectly fine while it fits, because the label hugs and the parent
centres it. It reveals itself only when a longer string wraps to two lines and goes ragged-left, which
is exactly the string you did not test. Fourteen buttons in one file were `LEFT` and none of them
looked wrong.

## Icons inside controls centre on the control

Horizontal centring gets a rule and vertical centring gets forgotten, so vertical is what clients find.
The example that came back from a real review: **the eye toggle in a password field.**

Any icon sharing a row with text inside a control — a trailing eye, a clear button, a chevron, a unit
toggle — sits in a horizontal auto-layout with `counterAxisAlignItems = "CENTER"`. Audit it: for every
horizontal frame containing an icon child, flag `counterAxisAlignItems !== "CENTER"`.

**Centre on the field, not on the component.** An `input` is usually label + field + error message
stacked, so the component's own vertical centre is nowhere near the field's. Two unit toggles measured
10px low against their fields for exactly this reason: the row was `MAX`-aligned to the input's full
height. Neither `MAX` nor `CENTER` on that row is right, because the label is in the average.

Give the sibling a slot the height of the field and centre inside it, with the height bound to the same
token the field uses:

```js
const slot = figma.createAutoLayout('VERTICAL', { name: 'unit-toggle-slot' });
slot.fills = [];
row.insertChild(row.children.indexOf(toggle), slot);
slot.appendChild(toggle);                        // load fonts first, see API trap 8
slot.counterAxisSizingMode = 'AUTO';
slot.primaryAxisSizingMode = 'FIXED';
slot.resize(slot.width, 56);
slot.primaryAxisAlignItems = 'CENTER';
slot.counterAxisAlignItems = 'CENTER';
slot.setBoundVariable('height', inputHeightVar);  // tracks the field if it ever changes
```

## A trailing icon belongs inside the component

The eye icon that came back in client feedback was an 18x18 frame **positioned absolutely on the screen**
rather than living in the input. It measured 4px low on four screens and **16px high on the fifth**,
because the error state pushes the field down 20px and a hard-pinned icon does not follow.

That is the whole failure mode: an element positioned relative to the canvas cannot track a sibling that
moves. Absolute positioning is correct for chrome that pins to a **frame edge** and wrong for anything
that must stay with a **sibling**.

The fix is a trailing-icon slot on the component with a boolean property, per the instance-children rule
in [figma-elements.md](figma-elements.md). Repositioning the overlay is a symptom fix: it re-centres the
five copies you can see and breaks again on the next state you add.

## Centring a text box is not centring its glyphs

A text node with `textAutoResize = "NONE"` holds a fixed box, and `textAlignVertical = "TOP"` puts the
glyphs at the top of it. Centre that box on a target and the **box** is centred while the text still
rides high.

A sticker label measured 0.0px off its circle's centre and still looked wrong: a 64x40 box holding two
lines at 14px line-height is 28px of glyphs, so **12px of dead space** sat at the bottom and the text was
6px high.

Set `textAlignVertical = "CENTER"` on any fixed-height text. Detect the condition structurally:

```js
n.textAutoResize === 'NONE' && n.textAlignVertical === 'TOP' && (n.height % lineHeightPx) !== 0
```

A non-zero remainder means the box does not hold a whole number of lines, so there is slack, so the
alignment matters. `HEIGHT` auto-resize with TOP is fine — the box hugs, so there is no slack.

## Siblings that must match height use FILL

Nav tabs, segmented options, stat tiles: anything read as a row of equals. If they `HUG`, any child-count
difference changes their height. A `bottom-nav` measured 38px on inactive tabs and 44 or 45 on active
ones, because the active tab carries a dot the others lack — and the two active variants disagreed with
each other by a pixel.

Set `layoutSizingVertical = "FILL"` on each sibling so all take the container's inner height.

**Keep the content top-aligned.** Switching the tabs to `primaryAxisAlignItems = "CENTER"` equalises the
boxes and then misaligns the icons, because the active tab's extra child shifts its content up. `MIN`
keeps icons and labels on a shared baseline with the dot hanging below.

## Screen chrome pins to the edge it belongs to

Status bars, bottom navs and home indicators are positioned against a **frame edge**, so they need
constraints that say so:

```js
hi.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };   // full width, bottom
if (parent.layoutMode !== 'NONE') hi.layoutPositioning = 'ABSOLUTE';   // required in auto-layout
```

`ABSOLUTE` is what makes this work on a hug frame, where a flow child would be pushed below the content
instead of overlaying the nav's safe-area padding. It is also the reason the hug exception existed at all,
and why it is no longer needed.

All 68 home indicators in one file sat at `MIN/MIN` — pinned to the **top**. They looked correct only
because every frame happened to be 812 tall. Audit `constraints.vertical === 'MAX'` on bottom chrome, and
check the bottom gap is zero rather than trusting the y value.

A last note on layering: the indicator overlaps the bottom nav's lower padding, and that is correct. The
nav reserves that padding as the safe-area inset; iOS draws the indicator over it. Do not "fix" the
overlap by adding height.

## Stale fixed heights are the most damaging defect

An instance carrying a `FIXED` height from an earlier layout produces two symptoms at once:

- **Dead space**, where content is shorter than the stale height, pushing everything below it down
- **Clipping**, where content is taller, hiding it entirely

One `input` component was fixed at 84px throughout. On screens where the visible field was 56px it
added 28px of dead space and broke the CTA position. On error screens where the real content was 96px
it **clipped its own validation message**, so the error text was invisible.

Set instances to `HUG` unless there is a stated reason to fix. Then audit: for every auto-layout frame,
sum the visible flow children plus gaps plus padding and compare to the box. Exclude
`layoutPositioning === "ABSOLUTE"` children and `layoutWrap === "WRAP"` frames, or you will generate
false positives.

## Mixed sizing in a stack

A vertical stack whose children mix `FILL` and near-full-width `FIXED` gives ragged edges. Flag it
unless the fixed child is deliberately bleeding past the container. A chip row that intentionally
overflows to the screen edge as a scroll affordance is correct, and should carry
`overflowDirection: HORIZONTAL` so it reads as scrollable rather than clipped.

## Circles: the oval trap

**Any element that must read as a circle is `FIXED` x `FIXED`.** Never HUG on either axis.

Applies to dots, check marks, avatars, radio buttons, switch thumbs, rings, numbered badges, and
icon-button backgrounds.

A HUG circle looks perfect in the frame you built it in and becomes an oval the first time its content
changes length: one more character in a day number, a longer label. Nothing warns you.

Audit for it: any `ELLIPSE`, or any `FRAME` with `cornerRadius === 999`, whose name suggests roundness,
with a width/height ratio outside **0.92 to 1.08**.

```js
const cr = typeof n.cornerRadius === "number" ? n.cornerRadius : null;  // can be figma.mixed
if ((n.type === "ELLIPSE" || (n.type === "FRAME" && cr === 999))
    && /dot|check|circle|avatar|ring|radio|thumb/i.test(n.name || "")) {
  const r = n.width / n.height;
  if (r > 1.08 || r < 0.92) flag(n);
}
```

Guard `cornerRadius`: it returns `figma.mixed`, a Symbol, on mixed-radius nodes, and comparing a Symbol
numerically throws `cannot convert symbol to number`.

## Clipping that hides work

`clipsContent` on a frame with no `overflowDirection` will eat:

- **Child drop shadows**, so cards look flat
- **Horizontal rails**, so a scrollable row looks like a truncated one

Audit both. A rail that should scroll needs `overflowDirection: HORIZONTAL` and should bleed to the
frame edge rather than stopping short inside the safe area. A chip cut at the screen edge reads as
"more to scroll"; one cut 8px inside reads as a bug.

---

# Part 3: Plugin API traps

Failure modes that **return success and produce a wrong result**. The `figma-use` skill covers the
basic API contract; these are the ones it does not.

## 1. Load the page before traversing, or instances are invisible

`findAll` and `findAllWithCriteria` on a node from `getNodeByIdAsync` **silently skip instance
children** if that node's page is not current. Figma loads pages lazily.

A welcome frame reported **4 text nodes instead of 10**. The status bar, input, button and social
labels were all inside instances and simply absent from the traversal. No error.

```js
const pg = await figma.getNodeByIdAsync(pageId);
await figma.setCurrentPageAsync(pg);          // MANDATORY before any deep read
const frame = await figma.getNodeByIdAsync(frameId);
frame.findAllWithCriteria({ types: ["TEXT"] });
```

Any audit that iterates pages must switch to each one.

## 2. Same-call read-back is not proof

Writing a value and reading it back **in the same execution** returns the in-memory value, which may
never reach the document.

A badge opacity fix reported success, verified as correct in the same call, verified again in a
*separate* call, and then reverted. The write was never persisted.

**Verify every mutation in a separate call.** For instance-related changes, prefer a verification that
forces reconciliation.

## 3. Nested instance child overrides do not persist

Writes to a property of a child *inside* an instance live in the plugin's scene graph and are discarded
when anything forces the instance to reconcile with its main component.

**`getMainComponentAsync()` triggers exactly that reconciliation.** This is why a large audit that
calls it appears to "re-break" a fix that a small audit reported as fine.

The stored override sits on the **outer** instance:

```js
outer.overrides  // [{ id: "I37:569;36:512", overriddenFields: ["fills"] }]
```

Do not fight it. Add a new node to the component instead, since new children do propagate, or fix at
the nearest unpinned ancestor. `resetOverrides()` works but wipes texts, image fills, variant props and
**reactions**, so it needs a full capture-and-restore and risks losing prototype links.

## 4. `clone()` then a failed `insertChild` leaves an orphan

`clone()` parents the copy to the source's page immediately. If the subsequent move throws, for
instance because the target is an instance, the clone stays on the canvas.

Six orphaned 14px icons were left floating on two pages this way, and surfaced later as twelve phantom
page-level overlaps.

```js
let ic = null;
try { ic = src.clone(); target.insertChild(0, ic); ic = null; }
finally { if (ic) ic.remove(); }
```

## 5. `cornerRadius` can be `figma.mixed`

It returns a Symbol on mixed-radius nodes, and any numeric comparison throws
`cannot convert symbol to number`. Guard it:

```js
const cr = typeof n.cornerRadius === "number" ? n.cornerRadius : null;
```

`fontName`, `fontSize` and `textStyleId` can be `figma.mixed` too. Same treatment.

## 6. SECTION nodes lack layout properties

`node.layoutSizingHorizontal` throws `no such property on SECTION node`. Any walk up a parent chain or
over `page.children` must guard on `type !== "SECTION"` before reading layout, padding or sizing.

## 7. `setBoundVariableForPaint` does not throw on an undefined variable

It returns the paint unchanged, so a typo silently yields your placeholder colour. See
[figma-elements.md](figma-elements.md) for the guard, and for the two other variable traps: stale
cached `fill.color`, and `boundVariables.fontWeight` being an array.

## 8. Text writes need the resolved font loadable

Every text mutation, including `characters`, `fontName`, `fontSize`, `letterSpacing`, `textAutoResize`
and `textStyleId`, throws `"Cannot write to node with unloaded font"` when the resolved family cannot
be loaded.

**A font the runtime cannot see makes the file read-only for text.** Two distinct causes, and only one of
them is permanent:

- **Installed during the session.** Figma caches the available-font list at launch, so a font installed
  while it is running stays invisible until a full quit and relaunch. Recoverable. The tell is an
  unchanged font count between calls.
- **Not reachable by this runtime at all.** A cloud plugin context does not see the designer's local
  fonts. Not recoverable from the runtime; the flip has to happen in the Figma UI.

Check which one you have before asking anyone to reinstall: look at the OS font directory, then at
`listAvailableFontsAsync()` after a relaunch. See
[figma-elements.md](figma-elements.md) for the font-package forensics, because a family that appears
"missing" is often present under a different family name.

The one exception is `setBoundVariable("fontWeight", v)`, which is permitted.

Consequences to plan around:

- Batch all pending text work into a single window where a loadable font is active. Do not ask for
  repeated flips.
- If you set one property and the next throws, you can be left **half-applied**, for example 20px
  padding around 12px text. Revert to a consistent state rather than leaving it.
- A file can be rendered stale: Figma caches glyph runs, so after a family change untouched nodes keep
  drawing the old face until something touches them. Rebinding to the *same* variable is a no-op and
  changes nothing. A real value change re-shapes. If the canvas still looks stale, that is a client
  cache issue, and no file edit will fix it.

## 9. `figma.notify()` throws; `console.log` is not returned

Use `return` for all output.

## 10. Sub-property writes: clone, modify, reassign

`fills` and `strokes` are read-only arrays. Mutating `fills[0].opacity` does nothing.

```js
const f = JSON.parse(JSON.stringify(node.fills[0]));
f.opacity = 0.68;
if (node.fills[0].boundVariables) f.boundVariables = node.fills[0].boundVariables;  // preserve bindings
node.fills = [f];
```

Dropping `boundVariables` on the round-trip silently unbinds the paint.

## 11. Binding a paint's colour overwrites its opacity

`setBoundVariableForPaint` makes the variable's **RGBA** authoritative, so the paint's own `opacity` is
replaced by the token's alpha. A paint at `0.30` bound to an opaque token comes back at `1.0`, with no
error and no warning.

This is the single most destructive trap in this file, because a bulk token-binding pass flattens every
translucent surface it touches and still audits as success. Full treatment, including the alpha-token
architecture that avoids it, in [figma-elements.md](figma-elements.md).

## 12. Work in small calls

Large scripts fail in ways that are hard to attribute, and a 20KB result gets truncated mid-JSON.
Return compact shapes: arrays rather than objects, short strings, rounded numbers. Split wide reads
across calls. Build, then verify, as separate steps.
