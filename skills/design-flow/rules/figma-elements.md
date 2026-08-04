# Figma element rules

Variables, styles and components. What the system is made of, before any screen uses it.

Load this for step 4 (foundations) and step 6 (port). It pairs with
[figma-screens.md](figma-screens.md), which covers the screens themselves.

---

# Part 1: Variables

## Two layers, always

**Layer 1, primitives.** The raw palette and scales: `Colors` (`primary/700`, `neutral/500`,
`semantic/error-700`), `Spacing`, `Radius`, `Border`, `Typography` (`font-size/*`, `line-height/*`).

`Border` is the one people forget. Without a `STROKE_FLOAT`-scoped scale there is **nothing to bind a
border width to**, so every stroke in the file stays a raw number and a client reviewing token coverage
finds it immediately. Create it at foundations time alongside `Radius`:

```js
// Border, scopes ["STROKE_FLOAT"]
hairline  1     // loading skeletons, hairline dividers
default   1.5   // the standard component border
emphasis  2     // focus rings, checked controls
```

Read the real stroke weights out of the design before choosing the values, and expect two or three, not
eight. Icon artwork imported from SVG carries junk weights (1.17, 1.83, 2.08, 3.33) that are artwork
internals, not borders: leave those raw.

**Layer 2, semantic aliases.** A `Token` collection whose every value is a **VARIABLE_ALIAS** to a
primitive: `text/primary` to `neutral/900`, `surface` to `neutral/100`, `divider` to `neutral/200`,
`state/error` to `semantic/error-500`.

**Screens and components bind to layer 2 only.** No screen references a primitive directly. That is
what makes a re-theme one edit in one collection, and it is what makes an automated contrast audit
possible at all, because you can resolve every colour from token values instead of sampling pixels.

Component-scoped collections are fine on top of that: `Atomic button` (`btn/primary/bg`,
`btn/primary/text-disabled`), `Atomic input` (`input/text/placeholder`, `input/border/focus`).
These alias into layer 2 or layer 1.

## Set scopes explicitly on every variable

The default is every scope, which pollutes every property picker in the file and is almost never
what you want. Use `["FRAME_FILL", "SHAPE_FILL"]` for backgrounds, `["TEXT_FILL"]` for text colour,
`["GAP"]` for spacing, and so on.

## Bind geometry, not only type

Type bindings get all the attention and geometry gets none, so geometry is where a client's token audit
lands. Four families, each of which must be bound wherever a matching token exists:

| Family | Properties | Scope |
|---|---|---|
| Corner radius | `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius` | `CORNER_RADIUS` |
| Padding | `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom` | `GAP` |
| Border width | `strokeWeight` | `STROKE_FLOAT` |
| Colour | every SOLID `fills[]` and `strokes[]` entry | fill and stroke scopes |

Three traps in that table:

1. **All four corners, individually.** Binding "corner radius" in the UI can leave you with only
   `topLeftRadius` bound. A file reviewed by a client had exactly that: one corner bound, three raw, on
   every input field. Set each of the four explicitly and audit each of the four.
2. **`strokeWeight` fans out.** Binding it writes `strokeTopWeight`, `strokeBottomWeight`,
   `strokeLeftWeight` and `strokeRightWeight`, and leaves `boundVariables.strokeWeight` **undefined**. A
   detector that only looks for `strokeWeight` reports every bound border as unbound. Check all five keys.
3. **`GAP` covers padding as well as gap.** A spacing variable scoped `["GAP"]` binds to both, so there
   is no excuse for raw padding when a spacing scale exists.

Bind at the **component**, never the instance. Instances inherit bindings, so a component-level pass of
900 bindings collapses to a few dozen edits. Where an instance still reports unbound after the component
is fixed, it carries a genuine override, and those are worth looking at individually rather than
bulk-binding.

## Raw values need a register, or the rule is unauditable

"Raw values only where no suitable token exists" is the right rule and it is meaningless without a list.
Keep the exemptions in `.pica/state.json` under `rawValueExemptions`, with a reason each:

```json
{ "rawValueExemptions": [
  { "prop": "padding", "value": 32, "why": "iOS status-bar inline inset, not a spacing step" },
  { "prop": "strokeWeight", "value": 2.08, "why": "icon artwork from SVG import" },
  { "prop": "fill", "value": "#1877f2", "why": "Facebook brand mark" }
] }
```

The audit reads it and reports anything raw that is **not** on the list. Without the register, a reviewer
cannot tell a deliberate one-off from an oversight, and neither can you a week later.

Two categories that are always exempt: **third-party brand colours** (Google, Facebook, Apple marks) and
**icon vector internals** from SVG import.

## Alpha belongs in the token

**Binding a paint's colour to a variable overwrites `paint.opacity` with the token's alpha.**

Proven with a throwaway node: a paint at `opacity 0.30`, bound to an opaque token, comes back at
**`1.0`**. Bound to a token carrying `a: 0.45`, it comes back at `0.45`. The variable's RGBA is
authoritative; the paint's own opacity is discarded.

Two consequences, and the first destroyed a file:

**A colour matcher that hashes RGB only cannot see alpha.** A scrim at black 45 percent hashes
identically to opaque black. A bulk "bind every fill to its matching token" pass therefore bound six
full-screen scrims and two buffering overlays to `btn/primary/bg`, flattening them to solid black and
hiding the content behind every bottom sheet. The content was never deleted and every node still read
`visible: true`, so it looked like deletion and audited as success.

It reached white too: an on-video progress track and its fill both ended at opaque white, making the
progress bar invisible, and 56px control circles went opaque white with white icons inside them, so they
rendered as blank discs.

**Never carry alpha as a manual paint opacity on a bound paint.** It is an override, and it re-resolves
away — reliably on nested instance children, which discard it and fall back to the token's alpha. Three
separate attempts to hold `0.2` on a nested skip button reverted to `1.0` before the alpha was moved
into the token.

So: **every translucent surface gets its own token.**

```js
// Token collection, scopes ["ALL_FILLS", "STROKE_COLOR"]
scrim            #000000 @ 0.45   // sheet and dialog scrims, dimming overlays
overlay/pill     #000000 @ 0.68   // dark pill on media: duration, viewer count
overlay/control  #ffffff @ 0.20   // on-video control backgrounds, spinner tracks
overlay/track    #ffffff @ 0.30   // on-video progress track and hairline
```

When you match colours, key on **RGBA**, and never exclude alpha-bearing tokens from the candidate set —
that exclusion is what guarantees the correct token can never win.

**Audit fingerprint for past damage:** any node whose SOLID fill is bound, sits at `opacity 1`, and lies
geometrically inside a node with an IMAGE fill. Cross-check against elements whose own icon or label is
the same colour as their fill: that pair is invisible and proves the flattening.

## Font weight must be numeric

**This is the single most valuable rule here.**

Do not rely on weight *names*. When the family variable changes, Figma remaps each weight by name,
and if the new family spells it differently the weight silently collapses to Regular.

Real failure: a file moved from one family to another. The first ships `SemiBold`, the second ships
`Semibold`. **All 18 text styles and 1753 of 1757 nodes dropped to Regular.** No error, no warning.
The whole type hierarchy flattened, and it was caught only by auditing `fontName.style` node by node.

Instead, create FLOAT variables and bind `fontWeight`:

```js
const W = {};
for (const [name, val] of [["font-weight/regular",400],["font-weight/medium",500],
                           ["font-weight/semibold",600],["font-weight/bold",700]]) {
  const v = figma.variables.createVariable(name, typographyCollection, "FLOAT");
  v.setValueForMode(collection.defaultModeId, val);
  W[name] = v;
}
style.setBoundVariable("fontWeight", W["font-weight/semibold"]);
node.setBoundVariable("fontWeight", W["font-weight/semibold"]);
```

Numbers mirror the CSS tokens (`--font-weight-semibold: 600`) and survive any family change. After
implementing this, the same file survived four consecutive family flips with zero collapse.

Two notes:

- **`setBoundVariable("fontWeight", v)` is the only text write Figma permits when the resolved font
  cannot be loaded.** Everything else, including `characters`, `fontName`, `fontSize`,
  `letterSpacing`, `textAutoResize` and `textStyleId`, throws
  `"Cannot write to node with unloaded font"`. That makes this the one repair available when a
  locally-installed font is invisible to the runtime.
- Name the variables semantically (`font-weight/semibold`) not numerically (`font-weight/600`). The
  inspector shows the variable *name*, so a numeric name reads as a duplicate of the value. The
  value is what has to match the CSS.

## Bind all four typographic axes

On every text style, and on nodes that carry no style:

`fontFamily` (STRING), `fontSize` (FLOAT), `lineHeight` (FLOAT), `fontWeight` (FLOAT)

A style bound on only family and size still breaks on a family swap.

## Text styles are stitched from variables

Never from literal values. Naming is `role/weight`, and the weight suffix is mandatory:
`body-m/regular`, `h3/semibold`. There is no bare `body-m`.

## Three silent failure modes

### 1. `setBoundVariableForPaint` does not throw on an undefined variable

It returns the paint unchanged. A mistyped variable name gives you whatever placeholder colour you
seeded the paint with, with no error anywhere.

A whole annotation card once rendered mid-grey with flat typography because the names
`Token.surface/default` and `Token.border/subtle` did not exist. The real ones were
`Token.background` and `Token.divider`. Nothing in the tool result signalled a problem.

**Always guard:**

```js
const bf = (name) => {
  if (!V[name]) throw new Error("NO SUCH VARIABLE: " + name);
  return [figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[name])];
};
```

Enumerate the real names with `getLocalVariableCollectionsAsync` first rather than assuming a scheme.
The same applies to text styles: a missing style name leaves the node at its default weight silently.

**Audit fingerprint for past damage:** scan for SOLID fills at exactly `0.5/0.5/0.5` with no
`boundVariables.color`.

### 2. Reading `fill.color` on a bound paint returns a stale value

The cached `color` is whatever the paint held when bound, **not** the resolved variable value. An
early contrast audit reported 102 failures including four phantom mid-grey labels that were bound
correctly and rendered a different colour entirely.

Resolve through the alias chain:

```js
const resolve = (id, d = 0) => {
  const v = raw[id]; if (!v || d > 8) return null;
  let x = v.valuesByMode[modeOf[id]];
  if (x && x.type === "VARIABLE_ALIAS") return resolve(x.id, d + 1);
  return x && x.r !== undefined ? x : null;
};
const paintColor = (f) => {
  const b = f.boundVariables?.color?.id;
  if (b) { const r = resolve(b); if (r) return r; }
  return f.color;
};
```

### 3. `boundVariables.fontWeight` is an array on text nodes

Colour bindings are objects; typographic bindings on text can be arrays of aliases, one per range.
Handle both or `getVariableByIdAsync` throws `Property "id" failed validation`:

```js
const aliasId = (bv) => {
  if (!bv) return null;
  if (Array.isArray(bv)) return bv.length ? bv[0].id : null;
  return bv.id || null;
};
```

## Changing a font variable needs every affected font loaded

`setValueForMode` on the family variable **re-shapes all bound text**, so it demands every font it
will need, including fallbacks you never chose. One flip failed on a symbols font needed for a single
character the target family lacks.

Retry-loop it, parsing the font out of the error:

```js
for (let i = 0; i < 12 && !done; i++) {
  try { famVar.setValueForMode(mode, TARGET_FAMILY); done = true; }
  catch (e) {
    const m = String(e.message).match(/unloaded font "([^"]+)"/);
    if (!m) break;
    const parts = m[1].split(" ");
    for (let cut = parts.length - 1; cut >= 1; cut--) {
      try { await figma.loadFontAsync({ family: parts.slice(0, cut).join(" "),
                                        style: parts.slice(cut).join(" ") }); break; } catch (e2) {}
    }
  }
}
```

The corollary: **you cannot flip *to* a locally-installed font from the plugin runtime**, because you
cannot load it. Cloud plugin contexts do not see local fonts, and `listAvailableFontsAsync()` will not
list them. That flip has to happen in the Figma UI, by the human, and any text edits have to happen
while a loadable font is active.

**Plan around it:** batch all pending text work into one such window. Do not ask the human for
repeated round-trips of installing, flipping, and flipping back. On the project this came from, that
happened at least six times and every flip cost a re-review.

## Read the font files before blaming Figma

When a family swap collapses the weights, the cause is often in the font package, not in the file. Two
failures that look identical in Figma and have different fixes:

**1. The static desktop build registers one family per weight.** Several foundries ship OTFs using the
legacy four-style naming: `nameID 1` (family) is `Chillax Semibold` and `nameID 2` (style) is `Regular`,
with the real typographic family in `nameID 16/17`. Apps that read `nameID 1` — Figma among them — see
**six separate families**:

| File | Family it registers as | Style |
|---|---|---|
| `Chillax-Regular.otf` | `Chillax` | Regular |
| `Chillax-Bold.otf` | `Chillax` | Bold |
| `Chillax-Medium.otf` | **`Chillax Medium`** | Regular |
| `Chillax-Semibold.otf` | **`Chillax Semibold`** | Regular |

So `Font-family = "Chillax"` can only ever resolve **400 and 700**. The 500 and 600 weights are in
different families and collapse. No amount of correct binding fixes it, because the token is pointing at
a family that does not contain those weights.

**2. The variable build is a third family name.** `Chillax-Variable.ttf` registers as `Chillax Variable`
with an `fvar` `wght` axis 200–700 and six named instances (Extralight, Light, Regular, Medium, Semibold,
Bold), all in **one** family. That is the build a token architecture needs. Install the variable font,
remove the statics, and set the family variable to the variable font's name — which is neither the
marketing name nor the CSS name. Expect three different strings for one typeface:

| Context | String |
|---|---|
| Marketing / brand guide | `Chillax` |
| Figma family variable | `Chillax Variable` |
| Web CSS `font-family` | `Chillax-Variable` |

Write all three into handoff or someone will trip on it.

Dump the truth straight out of the files, no dependencies:

```python
import struct, glob
def names(p):
    d = open(p,'rb').read(); n = struct.unpack('>H', d[4:6])[0]
    off = next(struct.unpack('>I', d[12+i*16+8:12+i*16+12])[0]
               for i in range(n) if d[12+i*16:12+i*16+4] == b'name')
    _, cnt, so = struct.unpack('>HHH', d[off:off+6]); out = {}
    for i in range(cnt):
        pid,_,_, nid, ln, o = struct.unpack('>HHHHHH', d[off+6+i*12:off+18+i*12])
        s = d[off+so+o: off+so+o+ln]
        try: out.setdefault(nid, s.decode('utf-16-be') if pid == 3 else s.decode('latin-1'))
        except Exception: pass
    return {k: out.get(k) for k in (1, 2, 16, 17)}   # family, style, typoFamily, typoStyle
for f in sorted(glob.glob('*.otf')): print(f, names(f))
```

`OS/2 usWeightClass` at table offset +4 gives the numeric weight, which is what your `font-weight/*`
tokens must match.

## Figma caches the font list at launch

A font installed while Figma is running stays invisible: `listAvailableFontsAsync()` will not list it and
`loadFontAsync` fails. It needs a **full quit and relaunch**, not a file reload.

The tell is a font count that does not move. Two calls minutes apart both returning exactly 8,927 fonts
means the list was never rescanned, so "the font is not installed" is the wrong conclusion. Check the OS
first — on macOS, `ls ~/Library/Fonts` — before asking anyone to reinstall anything.

Locally installed fonts **are** reachable once Figma has rescanned. The hard limit is narrower than "local
fonts are invisible": it is that you cannot pick up a font installed *during* the session.

---

# Part 2: Components

## Two tiers, and the line between them

**Global components** live on one dedicated page, named plainly and with no family prefix:
`btn`, `input`, `chip`, `badge`, `card-video`, `bottom-nav`, `app-bar`, `snackbar`.

These are the shared vocabulary. They are the only thing a screen instantiates directly.

**Local components** live on the page that owns their screens, with a family prefix:
`pl-transport` and `playlist-row` for a player, `live-hero` and `dvr-bar` for a broadcast surface,
`week-strip` and `hero-card` for a dashboard.

These are screen-family composites. They **compose globals** rather than redrawing them, which is
what makes a token change reach every screen.

**Screens contain instances only.** The only raw shapes allowed in a screen frame are things that are
genuinely not components: photographic fills, gradient scrims, and the home indicator, and even that
is better as a component once it appears more than a few times.

## Reuse rules

1. **Never detach.** If an instance needs to differ, add a variant to the component. A detached
   instance is invisible in review and silently stops receiving fixes.
2. **A local must not duplicate a global.** If you find yourself rebuilding a segmented control as a
   local, either use the global or promote the local and delete the global.
3. **Delete components that document a rejected design.** A component with zero instances encoding an
   IA you abandoned is worse than no component: it reads as the current plan.
4. **Unused-but-legitimate primitives get labelled, not deleted.** If the full build needs `list-row`
   but this slice has no settings screens, keep it and add a short "kit coverage" note naming each
   unused component and why. Handing a client components nothing instantiates looks like dead weight
   unless you say otherwise.
5. **Audit reuse by counting**, not by feel: instances per component, detached count, and locals whose
   job overlaps a global.

## What you cannot do to an instance

This is the constraint that catches people out most.

**You cannot add, remove or reorder an instance's children.** `insertChild` and `appendChild` throw
`"Cannot move node. New parent is an instance"`.

So when a screen needs a chip with a leading icon and the component has no icon:

**Wrong:** clone an icon and insert it into each chip instance. It throws, and worse, `clone()` has
already parented the clone to the page, so a failed insert leaves **orphaned nodes floating on the
canvas**. Wrap clone-then-move in a try/finally that removes the clone on failure.

**Right:** add a hidden icon to every variant of the component, expose it as a boolean property, and
switch it on per instance:

```js
// on the component set
for (const v of set.children) {
  const ic = iconSource.clone();
  v.insertChild(0, ic);
  ic.resize(12, 12);
  ic.visible = false;
  v.itemSpacing = 4;
}
const propId = set.addComponentProperty("icon", "BOOLEAN", false);
for (const v of set.children) {
  const ic = v.children.find(c => c.name === "icon/check");
  ic.componentPropertyReferences = { visible: propId };
}
// on the instance
chip.setProperties({ [propId]: true });
```

`addComponentProperty` returns an id like `"icon#213:0"`. Keep it; `setProperties` needs the exact
string.

## Propagation: children yes, overridden properties no

**New children added to a component DO propagate to existing instances.** Worth stating, because it
is easy to assume otherwise and build a worse solution.

**Overridden properties do not.** If an instance has an explicit value for a property, changing the
component will not move it. The instance's `overrides` array records exactly which fields are pinned:

```js
instance.overrides  // [{ id: "I37:569;36:512", overriddenFields: ["fills"] }]
```

And critically: **writes to a nested instance child's properties do not persist from the plugin
runtime.** They apply in memory, survive across calls, and are discarded the moment anything forces
the instance to reconcile with its main component, which `getMainComponentAsync()` does. See
[figma-screens.md](figma-screens.md), API traps.

When a nested instance child has a wrong pinned value, three options in order of preference:

1. **Add a new node** to the component that achieves the result, since new children propagate.
2. **Fix it at the nearest unpinned ancestor.**
3. **`resetOverrides()` and re-apply everything.** Destructive: it needs a full capture of texts,
   image hashes, variant props and reactions first. Last resort, and reactions are easy to lose.

## Variant hygiene

- Variant properties are `property=value`, both lowercase, reusing existing vocabulary: `size`,
  `state`, `count`, `active`, `variant`. Do not invent a synonym for a property you already have.
- When a component needs a second dimension, add the property rather than forking the component. A
  `bottom-nav` that needs both a tab count and an active tab wants `count=3|4` **and**
  `active=home|library`, not four separate components.
- Keep a rollback variant when a design decision is provisional, and say so in the kit note. If a
  fourth nav tab is justified against a reach threshold, the 3-tab variant is the documented rollback
  and belongs in the kit.

## Assert every name you create

Unknown style names and undefined variables do not throw. They resolve to nothing, and the file still
looks plausible. After creating variables, styles or components, read back the real names in a
**separate call** and compare against what you intended.
