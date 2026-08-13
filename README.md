<div align="center">

<img alt="pica — from the brief to the shipped screen. Intake, research, HTML, Figma, then implementation and test. Every step verified by measurement, never by opinion." src="assets/banner.svg" width="100%">

**A design workflow for Claude Code.**

[![version](https://img.shields.io/badge/version-0.6.0-1f2328)](https://github.com/vqdungwork/pica/releases)
[![licence](https://img.shields.io/badge/licence-MIT-1f2328)](LICENSE)
[![requires](https://img.shields.io/badge/requires-Claude%20Code-1f2328)](https://claude.com/claude-code)
[![figma](https://img.shields.io/badge/Figma-optional-1f2328)](#requirements)

</div>

---

> A **pica** is the unit designers have measured type in for six centuries.
> The name is the whole argument: work is checked against a measurement, not against an impression.

---

## The problem

Your design looks right. It is not right.

A hero sitting 47px low across three screens. A primary button hugging its label when it should fill
the width. Inputs holding a stale fixed height, quietly clipping their own error messages. A
component library with fifteen emoji standing in for icons. Forty-one text nodes bound to no font at
all, on the one page the client is actually scoring.

Every one of those passed visual review. Every one was obvious to a measurement.

Meanwhile the expensive medium gets built before anyone approved the cheap one, reviews and fixes
collapse into the same pass so nothing is auditable, and the file gets declared clean by comparing it
against itself.

`pica` fixes the order of operations and refuses to trust the eye.

## Install

```bash
/plugin marketplace add vqdungwork/pica
/plugin install pica@pica
```

That installs the bundle — all four packages, so an existing install keeps working unchanged.
Restart Claude Code. The workflow announces itself at the start of every session from then on,
including after a context compaction. You never have to remember to load it.

**Or install only what the project needs.** pica is four independently installable packages;
`pica-html`, `pica-research` and `pica-figma` each declare `pica-core` as a dependency and pull it
in automatically:

```bash
/plugin install pica-core@pica    # required by everything below
/plugin install pica-research@pica  # the source audit and token provenance
/plugin install pica-html@pica    # work packages in HTML, and the measured gate
/plugin install pica-figma@pica   # the port, annotations, and the geometry diff — needs pica-html
```

A project that will never touch Figma installs `pica-core`, `pica-research` and `pica-html`, and
never sees the Figma half. `pica-html` depends on both `pica-core` and `pica-research` — it needs
`tokens/tokens.css`, which only research produces — so installing it pulls both in. `pica-figma`
depends on `pica-core` and `pica-html`, so installing it pulls in the whole chain.

## The flow

```mermaid
flowchart TD
    A["pica: intake"] --> B{"contract approved?"}
    B -->|no| A
    B -->|yes| C["research + tokens"]
    C --> D{"tokens approved?"}
    D -->|no| C
    D -->|yes| E["UI kit in HTML"]
    E --> F{"Figma in scope?"}
    F -->|yes| G["foundations into Figma"]
    F -->|no| H
    G --> H["pica-wp: work package"]
    H --> I{"HTML approved?"}
    I -->|no| H
    I -->|yes| J["pica-port: to Figma"]
    J --> K["pica-review: measure against HTML"]
    K -->|findings| J
    K -->|zero| L{"more packages?"}
    L -->|yes| H
    L -->|no| M["pica-prototype: wire + verify"]
    M --> N["pica-close: handover, then freeze"]

    style B fill:#fff4e5,stroke:#d97706,color:#1f2328
    style D fill:#fff4e5,stroke:#d97706,color:#1f2328
    style I fill:#fff4e5,stroke:#d97706,color:#1f2328
    style K fill:#e8f5e9,stroke:#2e7d32,color:#1f2328
    style N fill:#f3e5f5,stroke:#7b1fa2,color:#1f2328
```

The amber diamonds are **your** gates. Nothing crosses one without you.

| # | Step | Command | Runs |
|:--|:--|:--|:--|
| 0 | Workflow loads itself | none | Every session, automatically |
| 1 | Intake | `/pica` | Once per project |
| 2 | Research and tokens | inside step 1 | Once per project |
| 3 | UI kit in HTML | inside step 1 | Once per project |
| 4 | Foundations into Figma | inside step 1 | Only if Figma is in scope |
| 5 | Work package | `/pica-wp <name>` | Once per package |
| 6 | Port to Figma | `/pica-port <wp>` | Per package, **after approval** |
| 7 | Review | `/pica-review [wp]` | After every port |
| 8 | Prototype | `/pica-prototype` | Once, after screens land |
| 9 | Closeout | `/pica-close` | Once, at handover |
| — | Feedback triage | `/pica-feedback` | Whenever someone else's review lands |

---

## The steps in detail

<details>
<summary><b>Step 0. The workflow loads itself</b></summary>

<br>

A `SessionStart` hook injects the non-negotiables into every session, and re-injects them after a
context compaction.

That last part matters more than it sounds. On the project this came from, a rule agreed on day one
had decayed by day two inside one long session, and had to be demanded again. Rules that live only in
prose get forgotten. These do not.

Six lines, always present:

1. HTML is the source of truth when HTML and Figma disagree.
2. Never port to Figma without approval for that specific work package.
3. Reviews report before they fix.
4. Never modify a delivered artefact.
5. Self-review before handing anything back.
6. For design work, run `/pica`.

</details>

<details>
<summary><b>Step 1. Intake</b>: the brief becomes a contract</summary>

<br>

`/pica` refuses to start without five things:

| Input | Why it is required |
|:--|:--|
| The brief, raw and unedited | Paraphrasing loses the exact wording that later settles disputes |
| Sources, each labelled `use` or `ignore` | An unlabelled folder once held several old versions of the same app, any of which could pass for current |
| The commercial constraint | Hours, cap, fixed-scope or time-and-materials, and anything the client must not be told |
| Environment facts | Which fonts are installed, which tools are live, what only you can do |
| One declaration | Is Figma a deliverable on this project |

You get back:

- a **contract**, one section per work package, each with acceptance criteria in your own terms
- an **exclusions list**, everything the brief rules out, quoted
- **two or three delivery options**, costed in one comparable table
- a **complexity tier** per package, for you to confirm

> **The exclusions list is the highest-value artefact in the whole flow.** On the source project a
> screen the brief explicitly ruled out got designed anyway. It was caught two days later, and only
> because a human happened to re-read the brief.

Nothing proceeds until you approve all four.

</details>

<details>
<summary><b>Step 2. Research and tokens</b>: evidence before invention</summary>

<br>

Audit before designing. Every source you labelled `use`, plus any adjacent source the brief implies:
if the brief says reuse an existing design system, the audit covers where that system actually lives,
not only the artefact being redesigned.

Tokens come out with **provenance recorded per token**: which source it came from, and whether it was
taken directly or derived.

If the brief claims an existing design system and no accessible source for it exists, you get told
that plainly, rather than getting an invention presented to you as reuse.

Output: `tokens.json` and `tokens.css`, one source feeding both the HTML and the Figma sides.

</details>

<details>
<summary><b>Step 3. UI kit in HTML</b>: the system, reviewable on its own</summary>

<br>

A storybook page showing every token and every component with all its variants and states. Single
file, no build step, opens in a browser.

Plus the review shell: **one tabbed page**. You never open a folder of separate HTML files. Each work
package adds a tab as it lands.

From here on, every screen consumes kit components. A one-off built inline on a screen is a review
finding, not a shortcut.

</details>

<details>
<summary><b>Step 4. Foundations into Figma</b>: skipped entirely if Figma is out of scope</summary>

<br>

Variables first, in two layers: primitives, then semantic aliases. Scopes set explicitly on every
variable, because the default pollutes every property picker in the file.

The primitives are `Colors`, `Spacing`, `Radius`, **`Border`** and `Typography`. `Border` is the one
people forget, and its absence is not a small gap: with no `STROKE_FLOAT` scale there is nothing to bind a
border width to, so every stroke in the file stays a raw number and a client reviewing token coverage
finds it immediately.

Any translucent surface gets its **own** token carrying the alpha — `scrim`, `overlay/pill`,
`overlay/control`. Binding a paint's colour makes the variable's RGBA authoritative and **overwrites the
paint's opacity**, so alpha held as a manual opacity on a bound paint does not survive.

Text styles stitched from variables rather than literal values, with **font weight as a numeric
variable**. Swap a typeface later and the hierarchy cannot collapse.

Then the global components, the ones reused across screens.

Every created name is asserted against what was intended, because unknown style names and undefined
variables **do not throw**. They resolve to nothing, and the file still looks plausible.

</details>

<details>
<summary><b>Step 5. Work package</b>: with a harder road for the hard ones</summary>

<br>

Packages are tiered at intake. A package is **complex** if any of these hold:

- no precedent for it exists in the product being redesigned
- it changes navigation or information architecture
- no reference design exists to work from
- it embodies a decision the client will challenge

**Complex packages** take the long road: re-read the requirement, research precedent and cite it,
build two or three genuinely different options, then run a panel of four agents, each blind to the
others.

| Lens | Asks |
|:--|:--|
| Usability | Task walkthrough. Where does a user stall |
| Platform and accessibility | Conventions, contrast, touch targets, focus order |
| Product and business | Does this serve the goal. What does being wrong cost |
| Developer feasibility | Can the backend actually deliver this |

You get the options plus the panel's findings, **including where the lenses disagree**. Then you
choose.

> On the source project the feasibility lens found fifteen backend gaps and several false claims of
> component reuse. Nothing else would have surfaced them.

**Both tiers** then build: state matrix first, every screen and every state. Real assets, no emoji
standing in for icons. Screens taller than the viewport come as a **pair**, one fixed-viewport version
that really scrolls with pinned chrome, and one full-height version. Never a separate "scrolled"
duplicate frame.

**And the flow, interactively.** Options settle a decision and then become provenance; the deliverable is
something you click, one prototype per application, linked to the others for real. `flow-check.mjs` proves
every link resolves, every screen is reachable and nothing is a dead end. Whether a link goes somewhere
*sensible* is what your click is for, and on the source project that is where every routing defect was
found.

Then the measured checks, then rendering every screen and looking at it, then a self-review, then your
approval. Your approval is what unlocks step 6, and it is recorded to disk.

</details>

<details>
<summary><b>Step 6. Port to Figma</b>: blocked at the tool level until approved</summary>

<br>

Not discouraged. **Blocked.** The write is denied if the package's HTML is not approved.

> On the source project a package was ported early and the entire page had to be deleted.

The port captures a measured reference from the HTML first: true text-run rectangles, every element
box, computed font size and weight, with the font forced to whatever Figma resolves so the diff
isolates layout from typeface metrics.

Then local components, composing globals rather than duplicating them. Then screens built from
instances only. Every frame auto layout, no spacer frames. HUG for content height, FILL for widths,
FIXED only for literal sizes.

A **circle sweep** runs every time. Radios, checkboxes, avatars, icon buttons, rings must be fixed on
both axes. Anything full-radius with unequal width and height is restored to the intended size, never
the collapsed one. This was the single most common defect class on the source project.

Then diff against the captured reference, fix, re-diff, repeat until every check returns zero.

**HTML is the source of truth. Where Figma and HTML disagree, Figma is wrong.**

</details>

<details>
<summary><b>Step 7. Review</b>: report first, fix second, never both at once</summary>

<br>

Two modes. **Report is the default and changes nothing.** Fixing requires `--fix`.

> That default exists because an audit once ran as a write against a delivered file and deleted a node
> unrecoverably.

While a report-mode review is running, every Figma write is denied.

Ten check families, all measured:

1. **Geometry against the HTML reference**, per frame, position and size
2. **Text bindings**: every node resolving to a style, every style to variables, and **unbound nodes
   reported explicitly**, because asking "is anything the wrong value" is structurally blind to nodes
   with no binding at all
3. **Layout**: circles, FILL versus HUG, shadows clipped by the wrong container, zero-size nodes,
   overlaps
4. **Contrast** for every text-on-background pair, including text over images and scrims
5. **Touch targets** against platform minimums, noting where the drawn box is deliberately smaller
6. **Reuse decay**: detached instances, inline duplication, locals duplicating a global
7. **Prototype**: dead ends, wrong targets, states with no way in or out
8. **Hygiene**: placeholders, banned characters, home indicators, and every published number recounted
9. **Geometry token binding**: all four corner radii individually, all four padding sides, border width,
   and every fill and stroke matched on **RGBA** — with anything raw needing a registered reason
10. **Appearance preserved**: a binding that changes what a node renders is a defect, caught by diffing
    an appearance baseline rather than by counting bindings

That last one exists because the other nine can all pass on a file that renders wrongly. A token-binding
pass once bound ~2,000 properties, reported zero unbound on every page, and had silently flattened 38
translucent surfaces to opaque.

Reviews run **per package, immediately after its port**. Never saved for the end.

> Deferred once, review became 64 findings across 12 rounds, because two days of divergence had piled
> up.

</details>

<details>
<summary><b>Step 8. Prototype</b>: behaviour, not just links</summary>

<br>

Flow wiring plus component interactions: screen to screen, overlays as overlays, variant switching
for pressed, disabled, open and closed states. Each flow gets a walkthrough note saying what to watch
for.

Its own review loop then checks behaviour: dead ends, links to the wrong target, missing back paths,
states with no way in or out, and interactions the screens imply but the prototype does not offer.
Repeat until it comes back empty.

Motion is out of scope for 0.2.0, and the flow says so rather than improvising it.

Prototype pages hold **clones**, because Figma cannot link across pages. Component-level fixes reach them
automatically; frame-level fixes do not, so the review re-measures each clone against its source rather
than assuming they match.

</details>

<details>
<summary><b>Step 9. Closeout</b>: then the file freezes</summary>

<br>

**Re-read the original brief cold.** Not the contract, not the plan. Both are copies, and copies
drift.

Then:

- a **required-versus-present table**: every deliverable the brief names, against what exists and
  where, with gaps stated rather than quietly omitted
- the **handoff page**: platform deltas, naming conventions, the reuse map, and the open questions
  ordered by how badly they block
- the **design rationale**, because a brief that scores product thinking is scoring exactly this
- the **effort report**, within whatever the disclosure policy allows

Then a freeze. Every artefact becomes read-only and further writes are denied.

</details>

---

## What is enforced, and how

Three layers, with honest reliability. This package assumes model judgement is unreliable and is built
accordingly.

| Layer | Fires | Bypassable |
|:--|:--|:--|
| `SessionStart` hook | Always, including after compaction | **No** |
| Commands | When you type them, deterministic after that | Yes, by not typing them |
| `PreToolUse` hooks | On every matching tool call | **No** |

Four things are enforced by hook rather than by instruction, because instructions decay:

- no Figma write for a package whose HTML is not approved
- no Figma write while a report-mode review is running
- no Figma write after delivery
- no Figma write before the Figma API rules are loaded

Approvals live in `.pica/state.json` in your project. A hook is a shell script; it cannot know you
said yes out loud.

## Requirements

| Tier | Needs | Gives you |
|:--|:--|:--|
| **Core** | `bash` and `python3`, for the hooks | Steps 1, 2, 3, 5, 7 (HTML side), 9 |
| **Figma** | the Figma MCP server, plus a Dev or Full seat | Steps 4, 6, 7 (Figma side), 8 |
| **Measured diff** | playwright | The HTML capture harness that step 6 diffs against |
| **Enhanced** | [superpowers](https://github.com/obra/superpowers) | Stronger intake and planning, plus the agent panel |

**The core tier works with nothing else installed.** If you never touch Figma, the whole HTML flow
still runs, and the Figma steps say clearly that they are unavailable rather than failing halfway
through.

**The Figma tier needs enough MCP calls to finish.** The rate limits are real and they do not degrade
gracefully — they return a paywall message where you expected data, mid-task. A **View or Collab seat gets
6 calls per month**, which is not enough to port anything; Dev and Full seats get 200 to 600 per day. Run
`whoami`, which is exempt from the limits, and size the work to the budget before starting. See the figma
package's `figma-mcp.md`.

## The rules

Eight modules, split across the four packages, each written to be read on its own.

| Module | Package | Covers |
|:--|:--|:--|
| `research.md` | research | Research before designing, audit breadth, token extraction with provenance, mock-data provenance, the client's copy rules and data-ownership table |
| `html-prototype.md` | html | Frame size, the single tabbed review page, option boards versus the interactive main flow, navigation state, the interactive and full-height pair, real assets, state matrices |
| `html-gates.md` | html | The measured HTML gate, the flow gate, viewport parity, HTML-only coverage, behaviour review for prototypes |
| `figma-elements.md` | figma | Token layers including `Border`, binding geometry as well as type, alpha living in the token, numeric font weights, font-package forensics, global versus local component tiers |
| `figma-screens.md` | figma | Frames, states, FILL versus HUG, vertical centring, screen-chrome pinning, the circle rule, alignment measured against HTML, and the Plugin API calls that fail silently |
| `figma-mcp.md` | figma | Rate limits and the call budget, `page.loadAsync` for whole-file reads in one call, write discipline |
| `figma-gates.md` | figma | The Figma audit checklist, appearance baselines, geometry-diff tolerances, the deviations register |
| `review-discipline.md` | core | The self-review checklist, report versus fix, complexity criteria, panel lenses, writing checks that can fail, audit integrity, and what "zero" means |

## Where this came from

This was extracted from **one** real client design pilot: a fixed-scope mobile app redesign delivered
against a 24 hour cap. Every rule in it earns its place from a specific failure on that project.

`0.5.0` adds the first **HTML-only** project: the mobile design of a live enterprise product, several
applications behind one launcher, 60 screens across four interactive prototypes, no Figma anywhere in it. Two things
came out of it.

The deliverable was wrong-shaped. A work package produced option boards, which every check can see, and
the flow between them was left implicit. But **every defect the client found by using the prototype was a
navigation defect with no geometric signature**: a home row that opened another role's screen, an entry
point that lit the tab it came from, a shared screen whose back control left the application, a deep link
that travelled via the launcher. So a package now ships boards **and** an interactive prototype of its main
flow, one per application, and `flow-check.mjs` reads the wiring.

And the checks were the wrong shape too. Ten hand-written harnesses ran green three times in a row while
four defects sat visible in a screenshot: duplicated rows in a sheet, a spacer orphaned between two
dividers, an open sheet leaving the header undimmed, a 20px white strip under a collapsed header. **A
harness is good at properties of elements that exist and blind to space that should not be there.** Six
other checks returned zero because their sample excluded the case, one of them measuring a screen
configuration the product cannot produce. Two of the fixes only worked once the original defect was put
back and the check was watched failing.

`0.4.0` is the release that made `0.3.0` true. `0.3.0` documented a viewport parity check and a geometry
diff in full detail — passes, pruning, tolerances, pass criteria — and **shipped neither**. Both lived only
in the project the rules came from, so a fresh install read instructions to run something absent. Worse,
the HTML was never measured at all: verification began at the port, so an HTML-only project got none,
while "HTML is the source of truth" stayed the first rule in the skill. `0.4.0` ships the checks, moves
them ahead of the approval gate, and makes every one of them **fail closed** — a selector matching
nothing, an empty frame map, a comparison of zero nodes each exit non-zero instead of printing a
reassuring zero. The capture script's frame selector had defaulted to `.phone` since the mobile-only era,
so a desktop project captured zero frames and passed every check downstream.

The lesson is in the audit method. `0.3.0`'s coverage audit reported 39 concepts covered and 0 gaps, and
was right: every concept *was* documented. **Audit for executability, not for mention** — does the file
exist, does it run, does the rule say what passing means. A grep for concepts also cannot find a
contradiction, since both sides of one are on-topic; one survived in a second file for a whole release.

`0.3.0` adds a third project, and the first that is not mobile-only: a desktop-shaped recruitment web
application from a real PRD, designed at two declared viewports and ported to Figma in full. It produced
**35 findings**, four of which contradicted the multi-viewport design as originally reasoned. The most
valuable were found by a human looking at a rendered frame *after* every automated check returned zero —
which is why the definition of done now lists rendering and looking as a step separate from the audit.

`0.2.0` adds a second round of evidence from the same file: the client's review of that pilot, and the
repair pass afterwards. The client raised two items — incomplete variable bindings, and icons not centred
in inputs — and **`0.1.0` would have caught neither.** It bound type thoroughly and geometry not at all,
and it had no `Border` collection, so there was nothing to bind a border width to in the first place.

The repair pass then introduced a worse defect than the ones it fixed, by flattening every translucent
surface it bound. Both facts are why `0.2.0` exists, and both are written into the rules.

That is its strength and its limit. Two rounds on one file is not evidence that this generalises, and you
will hit cases it has never seen.

The HTML half is still the better tested half, and `0.4.0` and `0.5.0` widened the gap again by design:
the HTML gate now has four shipped scripts, every check in them negative-tested by being broken on purpose
to confirm it reports, while the Figma side has one. `geometry-diff.mjs` is generalized from the version that reached zero findings during
the `0.3.0` port, but **its clean run is reported history rather than something you can re-run** — the
dumps it ran against were mid-port intermediates measured against a superseded reference, so they proved
nothing and were not worth keeping.

Hence `0.5.0`, and not `1.0`.

### What this repo does and does not contain

It ships the **method**: rules, commands, hooks and the seven checks. It does **not** ship the projects the
rules were derived from. Those carry briefs, PRDs, real copy and client identifiers, and none of that is
yours to receive — so `spike/` is in `.gitignore` and stays on the author's disk.

That means the findings arrive as claims you cannot re-run, and you should read them that way. The durable
form of each one is in [CHANGELOG.md](CHANGELOG.md): a rule, and the specific failure that earned it. A
rule whose failure is not written down next to it is the kind of rule that gets deleted by the next person
who finds it inconvenient, which is why the changelog is long and why every entry names what broke.

To generate your own evidence, run the flow on a project of your own. The checks are self-contained: point
`capture-html-reference.mjs` at a directory of HTML, then run `verify-html.mjs` and `parity-check.mjs`
against the artefact and your `.pica/state.json`, and `flow-check.mjs` against the HTML directory itself. Each states its pass criterion, and each fails closed —
if it cannot do its job it exits non-zero rather than reporting a clean run.

Four projects is not proof that this generalises, and you will hit cases it has never seen.

## Not included

Motion design and transition specs. Generating production code from designs. Exporting tokens into a
codebase. Any Figma community plugin. Responsive breakpoints as a continuum — the flow guarantees the
**declared** viewports and says nothing about the widths between them.

## Contributing

Issues and pull requests welcome, particularly from anyone who runs this on a project it was not built
for. That is the evidence it currently lacks.

## Attribution

The `SessionStart` injection pattern is adapted from
[superpowers](https://github.com/obra/superpowers) by Jesse Vincent, MIT licensed.

## Licence

[MIT](LICENSE)

<div align="center">
<br>
<sub>Designers have measured for six centuries. Keep measuring.</sub>
</div>
