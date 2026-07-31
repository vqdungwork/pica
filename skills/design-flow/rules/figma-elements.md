# Figma element rules

Variables, styles and components. What the system is made of, before any screen uses it.

Load this for step 4 (foundations) and step 6 (port). It pairs with
[figma-screens.md](figma-screens.md), which covers the screens themselves.

---

# Part 1: Variables

## Two layers, always

**Layer 1, primitives.** The raw palette and scales: `Colors` (`primary/700`, `neutral/500`,
`semantic/error-700`), `Spacing`, `Radius`, `Typography` (`font-size/*`, `line-height/*`).

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
