---
name: design-flow
description: Use when designing a product interface that will actually be built — an application, a website, a landing page, a set of screens, a dashboard, or the design system behind them. Covers intake as a contract, research and token extraction, HTML prototyping at every declared viewport, measured verification, porting to Figma once the human approves, prototype wiring, and handover. Trigger on "design the app", "design this website", "design a landing page", "design these screens", "design the dashboard", "build a design system", "port the HTML to Figma", "review the Figma against the HTML", "design handoff", or any interface work with a brief, a client, or a deadline. NOT for artwork or media — an illustration, a photograph, an image, a video, an animation, a logo or brand mark, a presentation deck, a document, a diagram, or the styling of CLI and terminal output. pica designs interfaces people navigate and someone has to build; if nothing is going to be implemented from it, this is the wrong tool.
---

# design-flow

A gated design workflow. Prototype in HTML, port to Figma on approval, verify by measurement.

**The commands drive this.** Run `/pica` to start a project; the flow is deterministic from there. This
file is the map. The rules now live with the package that owns them, under `packages/*/rules/`.

## The one non-negotiable

**HTML is the source of truth. Measure, do not eyeball.**

Every serious defect on the project this came from was invisible to visual review and obvious to
measurement: a hero 47px low across three screens, a CTA hugging its label instead of filling, a card
43px too tall, inputs at a stale fixed height clipping their own error messages, 41 text nodes bound to
no font at all on the one page the client was scoring.

All of it looked fine in a screenshot. Eyeballing finds the wrong things and misses the real ones.

**The general form is: measure against a reference, and the reference is read-only.** HTML is that
reference for a port; a client's own file is that reference for a rebuild; the sources named in the brief
are that reference for tokens and copy. How to treat one — never edit it, pair to it by an identity
channel you control, diff its *content* as a criterion of its own, and sort its own defects into the
three kinds — is medium-independent and lives in
[reference-discipline.md](../../packages/core/rules/reference-discipline.md). Read it once; it applies to
every phase.

## The flow

Brief becomes a contract, HTML becomes the design, measurement decides whether it is right. Figma is a
downstream rendering of an approved HTML design — never a parallel effort, never the place a decision
first gets made.

**Phase A — establish (one sitting).** Ends with a UI kit and tokens.

| # | Step | Command | Rules |
|---|---|---|---|
| 1 | Intake, brief becomes a contract. Declares `viewports` and `figmaInScope` | `/pica` | [research.md](../../packages/research/rules/research.md) |
| 2 | Research and tokens | inside `/pica` | [research.md](../../packages/research/rules/research.md) |
| 3 | UI kit in HTML — the design kit every screen consumes | inside `/pica` | [html-prototype.md](../../packages/html/rules/html-prototype.md) |

**Phase B — design and verify (repeats per work package, over days).** This phase is the deliverable.
An HTML-only project ends here, having been fully verified.

| # | Step | Command | Rules |
|---|---|---|---|
| 4 | Build the package at every declared viewport: option boards **and** the interactive main flow | `/pica-wp <name>` | [html-prototype.md](../../packages/html/rules/html-prototype.md) |
| 5 | **Measure it** — capture, `verify-html`, `parity-check`, `flow-check`. All zero, or fix | inside `/pica-wp` | [html-gates.md](../../packages/html/rules/html-gates.md) |
| 6 | Render every frame and look at it, per viewport, and **click the main flow end to end** | inside `/pica-wp` | [review-discipline.md](../../packages/core/rules/review-discipline.md) |
| 7 | **GATE: human approves this package's HTML** | inside `/pica-wp` | [html-gates.md](../../packages/html/rules/html-gates.md) |

**Phase C — Figma (optional; skip entirely when `figmaInScope` is false).** Nothing here may begin for a
package until step 7 passed for that package. The hook enforces it.

| # | Step | Command | Rules |
|---|---|---|---|
| 8 | Foundations into Figma — variables, text styles, components | inside `/pica` or before first port | [figma-elements.md](../../packages/figma/rules/figma-elements.md) |
| 9 | Port the approved package | `/pica-port <wp>` | [figma-screens.md](../../packages/figma/rules/figma-screens.md), [figma-elements.md](../../packages/figma/rules/figma-elements.md) |
| 10 | Verify against the HTML — `geometry-diff`, per frame, re-diff after each fix | inside `/pica-port` | [figma-gates.md](../../packages/figma/rules/figma-gates.md) |
| 11 | Review | `/pica-review [wp]` | [figma-gates.md](../../packages/figma/rules/figma-gates.md) |
| 12 | Prototype | `/pica-prototype` | [figma-screens.md](../../packages/figma/rules/figma-screens.md), [html-gates.md](../../packages/html/rules/html-gates.md) |
| 13 | Closeout | `/pica-close` | [review-discipline.md](../../packages/core/rules/review-discipline.md) |
| — | Feedback arrives | `/pica-feedback` | [review-discipline.md](../../packages/core/rules/review-discipline.md), [figma-mcp.md](../../packages/figma/rules/figma-mcp.md) |

Foundations sat at step 4 through 0.3.0, before any HTML was approved. That put Figma writes ahead of the
gate that exists to prevent them and made the optional phase look mandatory. They belong in Phase C: the
kit is settled in HTML at step 3, and pushing it to Figma is only worth doing if Figma is in scope.

Each step from 4 on has its own entry point because no session survives a multi-day project.

`/pica-feedback` is not a step. It runs whenever someone else's review lands, before or after delivery,
and it exists because triaging a client's claims is a different job from auditing your own work: every
item has to be **verified before it is accepted**, and the fix is often a decision rather than a repair.

## The other job: rebuilding an existing Figma file

Sometimes there is no brief and no HTML. A client hands you a Figma file they already have and wants it
rebuilt into something a developer can build from — tokens, components, states, naming — **without
changing what it shows**.

The flow above does not apply. There is nothing to prototype and nothing to approve, because the design
already exists. What replaces it:

| | Port (Phases A–C) | Rebuild |
|---|---|---|
| Arbiter | the approved HTML | the client's untouched pages, which are read-only |
| Gate | `htmlApproved:<wp>` | none — the design is already approved by existing |
| Geometry check | `geometry-diff.mjs` | `source-parity.js` |
| Target | 0 findings | **0 findings, and every lens reported as a pair against the source** |

Three things carry over unchanged: the audit (`figma-audit.js`), the appearance baseline
(`capture-baseline.js`), and every rule in `figma-elements.md` and `figma-screens.md`.

What is **not** specific to a rebuild, despite being discovered in one, is everything about handling the
reference itself — read-only, identity channel, content parity, the three kinds of source defect, fixing
at the definition, promote slowly and bind always. Those are in
[reference-discipline.md](../../packages/core/rules/reference-discipline.md) and they govern the port
flow just as much.

Read [figma-rebuild.md](../../packages/figma/rules/figma-rebuild.md) before starting one. The short
version: never write to the originals, keep the rebuilt screens at the source's canvas coordinates so
pairing is exact, and remember that **a file can pass every structural criterion at zero and still show
the wrong product** — content parity is a separate criterion and only the source can score it.

## Packages

pica is four packages plus a bundle. Each declares what it requires, produces, checks and
considers done, in its own `package.json`.

| Package | Depends on | Owns |
|---|---|---|
| `pica-core` | — | intake, closeout, feedback, the state schema, every gate |
| `pica-research` | core | the source audit and token provenance |
| `pica-html` | core, research | work packages at every viewport, and the measured gate |
| `pica-figma` | core, html | the port, annotations, and the geometry diff |

`pica` installs all four. A project that will never touch Figma installs `pica-html`, which pulls
in `pica-core` and `pica-research` — html needs `tokens/tokens.css`, which only research
produces — and never sees the Figma half.

**No package may grant a gate it benefits from.** `html` requests `htmlApproved`; core
grants it on human approval; `figma` requires it and cannot grant it. Run
`node packages/core/scripts/pica-status.mjs` to see what is ready and what is blocked.

The path past Figma — implementation for web, iOS and Android, then end-to-end testing —
is declared in `packages/_planned/` as contracts only. Those are not built.

## Build order within a project

**variables, then text styles, then global components, then local components, then screens, then
prototype, then handoff.**

Each layer is built from the one below it. Building screens before components guarantees a rebuild.

## The gates

Four are enforced by hook and cannot be talked around:

1. No Figma write for a work package whose HTML the human has not approved.
2. No Figma write while a review is running in report mode.
3. No Figma write after delivery.
4. No `use_figma` call without the `figma-use` skill loaded and `skillNames: "figma-use"` passed.

The rest are yours to hold:

- Present limitations before capability claims.
- **A package ships option boards and an interactive prototype of its main flow.** The boards settle a
  decision and then become provenance; the flow is what the human uses.
- **Look after the last change, not before it,** and click the flow. Ten green checks on one project
  coexisted with four defects visible in a screenshot.
- Self-review and **say what you checked** before handing anything back. Never report complete on work
  you have not verified.
- Verify every mutation in a **separate call**. Same-call read-back returns the in-memory value.
- **Capture an appearance baseline before any bulk mutation.** `packages/figma/scripts/capture-baseline.js`, then diff
  after. Existence checks cannot see a binding that changed what a node renders, and Figma version
  history is not readable from the Plugin API, so a missed baseline means the original values are gone.
- **Say what your filter excluded.** A denominator you did not verify is fiction: one screen audit
  reported "68 of 68 covered" while silently skipping every hug-height frame, which is where the missing
  element was.
- Re-read the original brief at closeout, not the plan. Copies drift.

## Dependencies

| Need | For | If missing |
|---|---|---|
| nothing | steps 1, 2, 3, 5, 7 HTML-side, 9 | the core flow runs |
| Figma MCP server, which provides `figma-use` | steps 4, 6, 7 Figma-side, 8 | say those steps are unavailable, run the rest |
| Figma seat with enough MCP calls | any Figma-side step | size the work to the budget, see [figma-mcp.md](../../packages/figma/rules/figma-mcp.md) |
| playwright | the capture harness in `packages/html/scripts/` | say the measured diff is unavailable, and do not silently fall back to eyeballing |
| superpowers | stronger intake and planning, plus the panel | use `brainstorming`, `writing-plans`, `dispatching-parallel-agents` when present |

Load `figma-use` **before** any `use_figma` call. It owns the API contract; this skill owns the workflow
and the failure modes that skill does not cover.

## State

`.pica/state.json` holds two kinds of thing. The commands write both.

**Read by the hooks**, to gate writes: `figmaInScope`, `delivered`, per-package `tier`, `htmlApproved`
and `ported`, plus `activeReview` and `writeAuthorization`.

**Read by the audit**, to make judgement calls checkable: `rawValueExemptions`, `exclusions`,
`deviations`, `bannedChars`, `parityExemptions`, `reflowNotes`, `flowExemptions`, `copyRules`,
`dataOwnership`, `granularityExemptions`, `lensBaselines`.

Two of those exist only for a rebuild, and both for the same reason as every other register — so a
deliberate call is distinguishable from an oversight:

- **`granularityExemptions`** — a component the granularity rule would dissolve and the human kept.
  `{component, why, by}`. Without it the rule re-reports the same approved component every round.
- **`lensBaselines`** — for each lens, the number the untouched source scores. `{lens, rebuild, source,
  why}`. A criterion whose target is 0 on a dimension where the client's own file scores 247 is a
  criterion nobody can ever close; recording the pair is what makes the number readable.

**The flow declaration**, one entry per application the product presents as its own:

```json
"flows": [
  { "app": "launcher",  "entry": "app-launcher.html", "home": "sign-in", "owns": ["account"] },
  { "app": "<product>", "entry": "app-<slug>.html",   "home": "<screen id>" }
]
```

`flow-check` reads it, so "one interactive prototype per application" is checkable rather than a habit.
`flowExemptions` records a screen the router opens rather than any control, `{file, screen, why}`, and
exists for the same reason every other register does: without it a deliberate case is indistinguishable
from an omission.

`copyRules` and `dataOwnership` carry the client's own rules in a form something can read. See
[research.md](../../packages/research/rules/research.md): a copy rule stated in conversation lasts about a
day, and "the user's data is read-only here" means nothing useful until it is written per entity.

**The viewport declaration**, which everything downstream reads:

```json
"viewports": [
  { "name": "desktop", "w": 1440, "h": 900,
    "idiom": "desktop web, no device chrome",
    "pointer": true, "breakpoints": [1024],
    "chrome": [ { "name": "top-nav", "required": true, "pinH": "STRETCH", "pinV": "MIN" } ],
    "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } }
]
```

One entry behaves exactly as 0.2.0 did. Two or more activates sections per viewport, a prototype page
per viewport, the parity check and the hug pair.

Two registers exist only because multi-viewport work needs them, and each has something that reads it:

- **`parityExemptions`** — a screen deliberately absent at a viewport. `{screen, presentAt[], why}`.
  Without it the parity check reports every deliberate asymmetry forever; with it, a decision is
  distinguishable from an omission.
- **`reflowNotes`** — a component that legitimately differs across viewports. **`scope` is required**:
  either a screen name or `"*"` for chrome that reflows everywhere. A flat global list is too blunt —
  a class can reflow on one screen and be identical on another, and silencing it globally blinds the
  check where it mattered.

A hook is a shell script. It cannot know the human said yes out loud, so approvals have to be on disk.

## A rule with no register is a preference

If the flow says something "must be written down", it needs a **named key in state** and something that
reads it. Otherwise the rule is unfalsifiable: nobody can tell a deliberate exception from an oversight,
including you a week later.

This is why the audit reads `exclusions` and `deviations` rather than trusting that a document mentions
them. Prose artefacts stay — `docs/exclusions.md` is what the human reads — but the machine-checkable
list lives in state alongside it.

The audit runs inside Figma and has **no filesystem access**, so it cannot read state directly. State is
authoritative; populate the script's config block from it before pasting. Never edit the register in the
script only, or the two will drift.

## Scripts

Every check named in a rule ships here and is runnable. A rule that names a check with no executable
behind it is a rule nobody can follow — 0.3.0 shipped three such rules, documenting a parity check and a
geometry diff that existed only in the project they were written from.

**HTML side — runs in Phase B, before approval. The only verification an HTML-only project gets.**

| Script | Proves | Passes when |
|---|---|---|
| `capture-html-reference.mjs` | measurement is possible | it writes an artefact; it refuses on 0 frames rather than emitting an empty one |
| `verify-html.mjs` | the HTML is internally sound | 0 findings across viewport-tagged, overflow, tall-screen-pair, viewport-coverage |
| `parity-check.mjs` | the viewports agree | 0 findings, nominal and structural. 2+ viewports only |
| `flow-check.mjs` | the prototype goes where it says it goes | 0 findings across dangling-target, dangling-href, nav-target, unreachable, dead-end, orphan-prototype, flow-declared, **and** a non-zero screen and link count |

The capture records true text-run rectangles via range geometry, every element box with its classes,
depth and nearest classed ancestor, computed font size and weight, each run's owning element and
text-align, and per frame the tagged viewport, hug flag, content height and horizontal overflow. Frames
are located by `data-viewport` — the same attribute that names the viewport.

**Figma side — Phase C only.**

| Script | Proves | Passes when |
|---|---|---|
| `geometry-diff.mjs` | Figma matches the HTML | 0 findings above tolerance, **and** a nonzero number of runs compared |
| `figma-audit.js` | **structure** — the whole audit checklist in one `use_figma` call | every count returns zero |
| `capture-baseline.js` | **appearance**, which the audit cannot | resolved RGBA of every paint identical before and after a bulk mutation |
| `source-parity.js` | **content**, for a rebuild — that each screen still says what the client's file says | contamination 0, 0 missing and 0 extra strings per screen, and a nonzero screen count |

**Every one of these fails closed.** A selector that matches nothing, a frame map with no entries, a
comparison of zero nodes: each exits non-zero rather than reporting a clean run. A check that cannot
tell you it did nothing is worse than no check, because its silence reads as a pass.

**None of them can detect absence.** A node never created has no coordinates, so it cannot be over
tolerance; a frame missing a third of its content still reports everything it does have as correct.
Inventory and count checks cover that, and rendering every frame and looking at it covers what no
script does.

**And none of them can tell you a link is wrong, only that it is broken.** `flow-check` proves every
destination exists; whether it is the *right* destination is answered by a human clicking. On the source
project ten green harnesses coexisted with a home-screen row that opened another role's screen.

## Rules

Each rule now lives with the package that owns it.

- [research.md](../../packages/research/rules/research.md) — research package. Intake packet, contract, exclusions, audit breadth, token provenance, mock-data provenance, client copy rules, data ownership
- [html-prototype.md](../../packages/html/rules/html-prototype.md) — html package. Layout, the tabbed review page, options versus the interactive flow, navigation state, the tall-screen pair, real assets, state matrices
- [html-gates.md](../../packages/html/rules/html-gates.md) — html package. The measured HTML gate, the flow gate, viewport parity, HTML-only coverage, behaviour review for prototypes, definition of done
- [figma-elements.md](../../packages/figma/rules/figma-elements.md) — figma package. Token layers including Border, geometry binding, alpha in tokens, numeric font weights, font-package forensics, component tiers, instance constraints, component granularity, fake variant axes, naming by role, merge mechanics
- [figma-screens.md](../../packages/figma/rules/figma-screens.md) — figma package. Frames, states, alignment and vertical centring, screen chrome pinning, CSS to auto-layout, the circle trap, API traps
- [figma-mcp.md](../../packages/figma/rules/figma-mcp.md) — figma package. Rate limits and call budget, `page.loadAsync` for whole-file reads, write discipline
- [figma-gates.md](../../packages/figma/rules/figma-gates.md) — figma package. The Figma audit checklist, appearance baselines, geometry-diff tolerances, the deviations register, definition of done
- [figma-rebuild.md](../../packages/figma/rules/figma-rebuild.md) — figma package. Rebuilding a client's existing Figma file: the source as arbiter, the shared coordinate system, positional parity, baselining every lens against the source, deciding the source's own defects
- [reference-discipline.md](../../packages/core/rules/reference-discipline.md) — core package. Medium-independent: the reference is read-only and it is checkable, names are not identity, content parity as its own criterion, the three kinds of reference defect, fix at the definition, promote slowly and bind always
- [review-discipline.md](../../packages/core/rules/review-discipline.md) — core package. Medium-independent: report versus fix, self-review, complexity routing, the panel, verification method, writing your own checks, audit integrity, reading a property instead of deducing it, baselining a number, guards that must fail rather than skip
