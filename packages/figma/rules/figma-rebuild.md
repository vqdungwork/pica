# Rebuilding an existing Figma file

The rest of this plugin assumes Figma is downstream of approved HTML. This rule covers the other job:
a client hands you a Figma file they already have, and you rebuild it into something a developer can
build from — tokens, components, states, naming — **without changing what it shows**.

It is not a port. There is no HTML to diff against. The arbiter is the client's own file, and almost
every hard call in the work is some version of "the source does this; is it a decision or a defect?"

Everything in `figma-elements.md` and `figma-screens.md` still applies. This file is what those two do
not cover.

## The source is the arbiter, and it is read-only

Copy the client's pages, work on the copies, and **never write to the originals**. Not to rename a
layer, not to fix an obvious typo. The moment you edit them you lose the only thing that can settle a
disagreement, and Figma version history is not readable from the Plugin API.

"I did not write to them" is a claim, not a check. The check is contamination: **does any instance on an
original page point at a master you created?**

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

## Keep the coordinate system

Place every rebuilt screen at **the same canvas coordinates as its source**. It costs nothing at build
time and it is the single most useful decision in the whole job.

With a shared coordinate system, pairing a rebuilt screen to its source is a dictionary lookup on
`Math.round(x) + '_' + Math.round(y)` — exact, and immune to the two things that break every other
pairing scheme: duplicate screen names (this project had four screens called `Detail objednávky`) and
renames.

It goes further than screens. Once the pages align, **any node can be paired to its source by position**,
which turns four separate investigations into one procedure. Verify the offset rather than assuming it:

```js
// derive from a uniquely-named screen present on both sides, then assert it is 0,0
const dx = rebuilt.x - original.x, dy = rebuilt.y - original.y;
```

## Pair by position, diff by position

The parity check for a rebuild is a **per-screen positional text diff**, and it is the check that finds
what a structural audit cannot.

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

That last case is the important one. On the project this rule comes from, a file that passed seventeen
structural criteria at zero still had:

- six filter rows carrying region names where the source has delivery names — **distance 0**, right
  place, wrong words
- a screen showing the wrong product entirely
- a stepper showing the master's placeholder `124` instead of `12`
- four cards in Slovak on an English screen
- a keypad's delete key parked at `0,0`, over the status bar, leaving a hole in the grid

Every node was present, bound, on-grid, inside its parent and sensibly named. Structure was perfect and
the screen was wrong. **Content parity is a separate criterion from structural correctness, and only the
source can score it.**

### The 0,0 sweep

Absolutely-positioned nodes lose their offset easily, and they land at the origin. Sweep for children
sitting at their screen's origin — but the sweep is only useful with the second half of the question:
**does the source agree?** On 163 screens it returned 140 nodes at `0,0`, of which 139 were correct
(status bars, top bars, full-bleed containers, at `0,0` in the source too). Without the source
comparison, 140 hits is noise and the one real defect is invisible inside it.

## Every lens needs the source's number

A rebuild has no absolute zero. Run each lens over **the untouched original as well** and report the
pair. Without the baseline the numbers are unreadable, and in both directions:

| Lens | Rebuild | Source | What it means |
|---|---|---|---|
| low-contrast text | 58 | 870 | the rebuild fixed most of an inherited problem |
| fully invisible text | 5 | 7 | 1 of the 5 is the client's own, 4 are library previews |
| auto-layout self-overflow | 336 | 247 | mostly scroll regions and scrollable tab strips, in both |

"58 contrast findings" reads as 58 things you broke. "58 against the source's 870" reads as the truth.
And a lens that returns a *higher* number than the source is the one to look at first — that is where
the rebuild introduced something.

Register the pair, not the rebuild's number alone. A criterion whose target is "0" when the source
scores 247 is a criterion nobody can ever close.

## The source has defects too, and they need a decision each

Three categories, and they are decided differently:

1. **Faithful reproduction of a source defect.** White text on a white tile, six times, in the client's
   own file. The rebuild copied it exactly. Correct until someone says otherwise — and worth surfacing,
   because the client usually does want it fixed once they see it named.
2. **A source inconsistency you must resolve to build a component.** The same filter bar drawn two ways
   — 60px with the count in a separate text run, 72px with one run — on sibling screens of one flow.
   You cannot make one component without picking. **This is the client's decision, not yours.** Put both
   measurements in front of them and let them choose.
3. **A defect you introduced.** These are the ones to hunt. An entire numeric keypad rendered white on
   white where the source is `#3c3c3c`; a Save bar that lost its green fill; a badge at `0,0` at full
   opacity where the source has it at `928,82` at 17%.

Category 3 hides behind category 1. The question that separates them is never "does this look wrong",
it is **"what does the source say"** — and it has to be asked node by node, because the answer differs.

## Fixing a defect at the instance is usually the wrong altitude

The keypad above had been "repaired per occurrence against the original" in an earlier round, and it was
still broken. The instances were not overriding anything; they were inheriting a white master. Repairing
what you can see on a screen leaves the master to keep producing the defect on every screen you did not
look at.

Read the override before repairing. If the instance carries no override, the fix belongs at the master
and repairs every occurrence at once — twenty-two digits in one rebind.

## Done, for a rebuild

- Contamination check: 0.
- Structural audit: every criterion 0 on the rebuilt pages, or registered with a reason.
- Screen inventory: every source screen paired, count matching, unpaired items named.
- **Content parity: 0 missing and 0 extra strings per screen**, except entries explained by a registered
  deviation. Name the deviation next to the number.
- Every lens reported as a pair against the source.
- Every frame rendered and looked at, after the last change.
