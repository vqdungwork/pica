# Rebuilding an existing Figma file

The rest of this plugin assumes Figma is downstream of approved HTML. This rule covers the other job:
a client hands you a Figma file they already have, and you rebuild it into something a developer can
build from — tokens, components, states, naming — **without changing what it shows**.

It is not a port. There is no HTML to diff against. The arbiter is the client's own file, and almost
every hard call in the work is some version of "the source does this; is it a decision or a defect?"

The criteria for working against a reference — it is read-only, names are not identity, content parity
is its own criterion, a reference has three kinds of defect, fix at the definition — are flow-wide and
live in [reference-discipline.md](../../core/rules/reference-discipline.md). Read that first. This file
is the Figma application of it, plus what is specific to a rebuild.

Everything in `figma-elements.md` and `figma-screens.md` still applies.

## The source is the arbiter, and it is read-only

Copy the client's pages, work on the copies, and **never write to the originals** — and note the Figma
specific that makes this sharper than elsewhere: **version history is not readable from the Plugin API**,
so an accidental edit is not recoverable from inside the tool.

The contamination check for a Figma rebuild: **does any instance on an original page point at a master
you created?**

```js
const localMasters = {};
{ const st = [...componentsPage.children];
  while (st.length) { const n = st.pop();
    if (n.type === 'COMPONENT') { localMasters[n.id] = 1; continue; }
    (n.children || []).forEach(c => st.push(c)); } }

const contaminated = [];
for (const pid of ORIGINAL_PAGE_IDS) {
  const pg = figma.root.children.find(p => p.id === pid);
  const st = [...pg.children];
  while (st.length) { const n = st.pop();
    if (n.type === 'INSTANCE') {
      const m = n.mainComponent;
      if (m && localMasters[m.id]) contaminated.push(pid + ' ' + n.id + ' ' + n.name);
      continue; }
    (n.children || []).forEach(c => st.push(c)); }
}
// contaminated.length must be 0
```

Run it at closeout. Zero, or the originals are no longer a reference.

## The identity channel is canvas position

Core says to pick an identity channel you control. For a Figma rebuild it is **canvas coordinates**:
place every rebuilt screen at the same position as its source, and pairing becomes a dictionary lookup on
`Math.round(x) + '_' + Math.round(y)`.

It costs nothing at build time and it is the single most useful decision in the job, because it extends
below the screen — any node pairs to its source by position, which turns four separate investigations
into one procedure. Verify the offset rather than assuming it:

```js
// derive from a uniquely-named screen present on both sides, then assert it is 0,0
const dx = rebuilt.x - original.x, dy = rebuilt.y - original.y;
```

## The content-parity check

Core makes content parity a criterion; this is the executable for the Figma side of it.

> **`scripts/source-parity.js`** — configure the page ids at the top, paste as the `code` argument of one
> `use_figma` call. **Passes when** contamination is 0, every source screen is paired, `missingStrings`
> and `extraStrings` are 0 except entries matched by a registered deviation, `displacedToOrigin` is 0,
> and `screensCompared` is greater than 0. It throws on a bad page id and on a zero screen count, so it
> cannot report a clean run for work it did not do.

The shape is:

1. Pair screens by canvas key.
2. On each side collect every TEXT node **whose whole ancestor chain is visible**, with its
   screen-relative x and y.
3. Tally the strings per screen. Report missing and extra.
4. For each mismatch, find the source text nearest in position. A distance of 0 with different strings
   means the geometry is right and the content is wrong.

That last case is the one core is about: five defects on one file, three of them at distance 0. Right
geometry, wrong words, invisible to every structural criterion.

### The 0,0 sweep

Absolutely-positioned nodes lose their offset easily, and they land at the origin. Sweep for children
sitting at their screen's origin — but the sweep is only useful with the second half of the question:
**does the source agree?** On 163 screens it returned 140 nodes at `0,0`, of which 139 were correct
(status bars, top bars, full-bleed containers, at `0,0` in the source too). Without the source
comparison, 140 hits is noise and the one real defect is invisible inside it.

## Every lens needs the source's number

*A number without a baseline is unreadable* — see `review-discipline.md`. A rebuild is where it bites
hardest, because there is no absolute zero anywhere: run each lens over **the untouched original as
well** and record the pair in `lensBaselines`.

| Lens | Rebuild | Source | What it means |
|---|---|---|---|
| low-contrast text | 58 | 870 | the rebuild fixed most of an inherited problem |
| fully invisible text | 5 | 7 | 1 of the 5 is the client's own, 4 are library previews |
| auto-layout self-overflow | 336 | 247 | mostly scroll regions and scrollable tab strips, in both |

And a lens that returns a *higher* number than the source is the one to look at first — that is where
the rebuild introduced something.

## Sorting the source's own defects

Core's three categories, in Figma terms. What they looked like on one project:

1. **Reproduced faithfully** — white text on a white tile, six times, in the client's own file.
2. **An inconsistency you must resolve** — the same filter bar drawn two ways, 60px with the count as a
   separate text run and 72px with one run, on sibling screens of one flow. You cannot make one
   component without choosing; the client chose.
3. **Introduced by the rebuild** — an entire numeric keypad white on white where the source is
   `#3c3c3c`; a Save bar that lost its green fill; a badge at `0,0` at full opacity where the source has
   it at `928,82` at 17%.

The keypad is also core's *fix at the definition* case: twenty-two digits, no overrides, one rebind.

## Done, for a rebuild

- Contamination check: 0.
- Structural audit: every criterion 0 on the rebuilt pages, or registered with a reason.
- Screen inventory: every source screen paired, count matching, unpaired items named.
- **Content parity: 0 missing and 0 extra strings per screen**, except entries explained by a registered
  deviation. Name the deviation next to the number.
- Every lens reported as a pair against the source.
- Every frame rendered and looked at, after the last change.
