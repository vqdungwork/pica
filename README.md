# pica

**Design workflow for Claude Code. Prototype in HTML, port to Figma, verify by measurement.**

Version 0.1.0

A pica is the unit designers have measured type in for six centuries. The name is the whole argument:
designs are checked against a measurement, not against an impression.

---

## The problem

Figma is slow to iterate in and easy to declare finished by eye. Design defects survive visual review
routinely: a hero 47px low across three screens, a button hugging its label when it should fill the
width, inputs at a stale fixed height clipping their own error messages. All of that looks fine in a
screenshot. And work gets built in the expensive medium before anyone has approved it in the cheap
one.

This package fixes the order of operations and refuses to trust the eye.

## Install

```
/plugin marketplace add vqdung/pica
/plugin install pica@pica
```

Restart Claude Code. The workflow announces itself at the start of every session from then on. You do
not have to remember to load anything.

## Provenance, honestly

This was extracted from **one** real client design pilot: a fixed-scope mobile app redesign delivered
against a 24 hour cap. Every rule in it comes from a specific failure on that project, which is its
strength and its limit. One project is not evidence that this generalises.

The HTML half is the better tested half. The Figma rules work, but they have been exercised against a
single design system and a single Figma file. That is why this is `0.1.0` and not `1.0`.

## The flow, step by step

| # | Step | Command | Runs |
|---|---|---|---|
| 0 | Workflow loaded | none | Automatically, every session |
| 1 | Intake | `/pica` | Once per project |
| 2 | Research and tokens | inside step 1 | Once per project |
| 3 | UI kit in HTML | inside step 1 | Once per project |
| 4 | Foundations into Figma | inside step 1 | Only if Figma is in scope |
| 5 | Work package | `/pica-wp <name>` | Once per package |
| 6 | Port to Figma | `/pica-port <wp>` | Once per package, after approval |
| 7 | Review | `/pica-review [wp]` | After every port |
| 8 | Prototype | `/pica-prototype` | Once, after screens land |
| 9 | Closeout | `/pica-close` | Once, at handover |

---

### Step 0. The workflow loads itself

A `SessionStart` hook injects the non-negotiables into every session, including after a context
compaction. This matters more than it sounds: on the source project a rule agreed on day one had
decayed by day two inside one long session. Rules that live only in prose get forgotten. These do not.

Six lines, always present: HTML wins when HTML and Figma disagree, never port without approval,
reviews report before they fix, never modify a delivered file, self-review before handing back, and
run `/pica` for design work.

### Step 1. Intake

`/pica` refuses to start without five things:

- the brief, raw and unedited
- your sources, each labelled `use` or `ignore`
- the commercial constraint, and anything the client must not be told
- environment facts: which fonts are installed, which tools are live, what only you can do
- one declaration: is Figma a deliverable on this project

You get back a contract: one section per work package with acceptance criteria, an **exclusions list**
of everything the brief rules out, two or three delivery options costed in one comparable table, and a
complexity tier per package for you to confirm.

The exclusions list is the highest-value artefact in the whole flow. On the source project a screen
the brief explicitly ruled out got designed anyway, and it was caught two days later only because a
human happened to re-read the brief.

Nothing proceeds until you approve the contract, the exclusions, one option, and the tiers.

### Step 2. Research and tokens

Audit before designing. Every source you labelled `use`, plus any adjacent source the brief implies:
if the brief says reuse an existing design system, the audit covers where that system actually lives,
not just the thing being redesigned.

Tokens come out with **provenance recorded per token**, which source it came from and whether it was
taken directly or derived. If the brief claims an existing design system and no accessible source
exists, you get told that, rather than getting an invention presented as reuse.

Output: `tokens.json` and `tokens.css`, the single source for both the HTML and the Figma sides. You
approve them before anything consumes them.

### Step 3. UI kit in HTML

A storybook page showing every token and every component with all its variants and states. Single
file, no build step.

Plus the review shell: **one tabbed page**, a tab per section, so you never open a folder of separate
HTML files. Each work package adds a tab as it lands.

From here on every screen consumes kit components. A one-off built inline on a screen is a review
finding, not a shortcut.

### Step 4. Foundations into Figma

Skipped entirely if Figma is out of scope.

Variables first, in two layers: primitives, then semantic aliases. Scopes set explicitly on every
variable, because the default pollutes every property picker in the file. Text styles stitched from
variables rather than literal values, with **font weight as a numeric variable**, so swapping a
typeface cannot collapse the hierarchy.

Then the global components, the ones reused across screens.

Every created name is asserted against what was intended, because unknown style names and undefined
variables do not throw. They resolve to nothing, and the file still looks plausible.

### Step 5. Work package

Packages are tiered `standard` or `complex` at intake. A package is complex if any of these hold: no
precedent for it exists in the product, it changes navigation or information architecture, no
reference design exists, or it embodies a decision the client will challenge.

**Complex packages** get the long road: re-read the requirement, research precedent and cite it, build
two or three genuinely different options, then run a panel of four agents across four lenses, each
blind to the others.

- **usability**: task walkthrough, where does a user stall
- **platform and accessibility**: conventions, contrast, targets, focus order
- **product and business**: does this serve the goal, what does being wrong cost
- **developer feasibility**: can the backend actually deliver this

You get the options plus the panel findings, **including where the lenses disagree**. You choose. On
the source project the feasibility lens found fifteen backend gaps and several false claims of
component reuse that nothing else would have surfaced.

**Both tiers** then build: state matrix first, every screen and every state. Real assets, no emoji
standing in for icons. Screens taller than the viewport come as a **pair**, one fixed-viewport version
that really scrolls with pinned chrome, and one full-height version. Never a separate "scrolled"
duplicate frame.

Then a self-review, then your approval. Your approval is what unlocks step 6, and it is recorded.

### Step 6. Port to Figma

Blocked at the tool level until the package's HTML is approved. Not discouraged, **blocked**: the
write is denied. On the source project a package got ported early and the whole page had to be
deleted.

The port captures a measured reference from the HTML first: true text-run rectangles, every element
box, computed font size and weight, with the font forced to whatever Figma resolves so the diff
isolates layout from typeface metrics.

Then local components (composing globals, never duplicating them), then screens built from instances
only. Every frame auto layout, no spacer frames. HUG for content height, FILL for widths, FIXED only
for literal sizes.

A circle sweep runs every time: radios, checkboxes, avatars, icon buttons, rings must be fixed on both
axes. Anything full-radius with unequal width and height gets restored to the intended size, never the
collapsed one. This single defect class was the most common on the source project.

Then diff against the captured reference, fix, re-diff, repeat until every check returns zero.

**HTML is the source of truth. Where Figma and HTML disagree, Figma is wrong.**

### Step 7. Review

Two modes. **Report is the default and changes nothing.** Fixing requires `--fix`.

That default exists because an audit once ran as a write against a delivered file and deleted a node
unrecoverably. While a report-mode review is running, every Figma write is denied.

Seven check families, all measured:

1. per-frame geometry against the HTML reference
2. every text node resolving to a style, every style to variables, and **unbound nodes reported
   explicitly**, because asking "is anything the wrong value" is blind to nodes with no binding at all
3. geometry: circles, FILL versus HUG, clipped shadows, zero-size nodes, overlaps
4. contrast for every text-on-background pair, including text over images
5. touch targets against platform minimums
6. reuse decay: detached instances, inline duplication, locals duplicating a global
7. prototype: dead ends, wrong targets, states with no way in or out

Reviews run **per package, right after its port**. Not saved for the end. On the source project they
were deferred and became 64 findings across 12 rounds, because two days of divergence had piled up.

### Step 8. Prototype

Flow wiring plus component interactions: screen to screen, overlays as overlays, variant switching for
pressed, disabled, open and closed states. Each flow gets a walkthrough note saying what to watch for.

Its own review loop then checks behaviour rather than links: dead ends, wrong targets, missing back
paths, states with no way in or out, and interactions the screens imply but the prototype does not
offer. Repeat until it comes back empty.

Motion is out of scope for 0.1.0, and the flow says so rather than improvising it.

### Step 9. Closeout

**Re-read the original brief cold.** Not the contract, not the plan. Both are copies and copies drift.

Then a required-versus-present table: every deliverable the brief names against what exists and where,
with gaps stated rather than quietly omitted. Then the handoff page, platform deltas, naming
conventions, the reuse map, and the open questions ordered by how badly they block. Then the design
rationale, because a brief that scores product thinking is scoring exactly that. Then the effort
report, within whatever the disclosure policy allows.

Then a freeze. Every artefact becomes read-only and further writes are denied.

---

## What is enforced, and how

Three layers, with honest reliability:

| Layer | Fires | Bypassable |
|---|---|---|
| `SessionStart` hook | Always, including after compaction | No |
| Commands | When you type them, deterministic after that | Yes, by not typing them |
| `PreToolUse` hooks | On every matching tool call | **No** |

Four things are enforced by hook rather than by instruction, because instructions decay:

- no Figma write for a package whose HTML is not approved
- no Figma write while a report-mode review is running
- no Figma write after delivery
- no Figma write before the Figma API rules are loaded

Approvals live in `.pica/state.json` in your project. A hook is a shell script; it cannot know you said
yes out loud.

## Requirements

| Tier | Needs | Gives you |
|---|---|---|
| **Core** | nothing | Steps 1, 2, 3, 5, 7 (HTML side), 9 |
| **Figma** | the Figma MCP server | Steps 4, 6, 7 (Figma side), 8 |
| **Enhanced** | [superpowers](https://github.com/obra/superpowers) | Better intake, planning, and the agent panel |

The core tier works with nothing else installed. If you never touch Figma, the whole HTML flow still
runs and the Figma steps say clearly that they are unavailable rather than failing halfway.

## The rules

Five modules, each readable on its own:

- **`research.md`** research before designing, audit breadth, token extraction with provenance
- **`html-prototype.md`** frame size, the single tabbed review page, the interactive and full-height
  pair, real assets, state matrices
- **`figma-elements.md`** two token layers, explicit scopes, numeric font weights, styles stitched
  from variables, global versus local component tiers
- **`figma-screens.md`** frames, states, FILL versus HUG, the circle rule, alignment measured against
  HTML, and the Plugin API calls that fail silently
- **`review-gates.md`** the self-review checklist, report versus fix, complexity criteria, panel
  lenses, and what "zero" means

## Not included

Motion design and transition specs. Generating production code from designs. Exporting tokens into a
codebase. Any Figma community plugin. Desktop or web design variants; this is mobile-shaped for now.

## Attribution

The `SessionStart` injection pattern is adapted from
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, MIT licensed.

## Licence

MIT.
