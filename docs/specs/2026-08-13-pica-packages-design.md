# pica as packages — design

**Status:** approved, not yet implemented. Target `0.6.0`.
**Supersedes:** nothing. Extends the flow described in `skills/design-flow/SKILL.md` at `0.5.0`.

## Summary

pica becomes a set of independently installable packages spanning the whole path from
brief to shipped screen, rather than one plugin covering brief to Figma. Each package
declares what it requires, what it produces, which checks it owns and what "done" means
for it. Packages that do not exist yet are declared with `status: "coming-soon"` so the
contract is agreed before the work starts.

Nothing about the verification discipline changes. This is a restructuring of ownership
and an extension of scope, not a loosening of gates.

## The problem

Three problems, one structural cause.

**pica stops too early.** It ends at a verified Figma file. The path it does not cover —
implementation for web, iOS and Android, then end-to-end and usability testing — is
where the design either survives or quietly stops being the thing that was approved.

**Everything is coupled to everything.** `review-gates.md` is loaded by five of seven
commands and mixes medium-independent review discipline with Figma tolerance guidance
and HTML gate criteria. Changing a Figma rule risks the HTML flow. There is no seam.

**Scope cannot be chosen.** A project that will never touch Figma still installs and
reads the whole Figma half. A project that needs iOS has nowhere to put it.

## Decisions

### D1 — HTML verifies, Figma hands off

Authority over the design transfers from HTML to Figma at the gate where
`geometry-diff` returns zero and the package closes. Before that gate HTML is
authoritative and Figma is a candidate rendering; after it, Figma is what implementation
reads.

*Why not keep HTML authoritative throughout.* HTML is web-shaped — divs, flexbox,
cascade. Translating it literally into SwiftUI or Compose produces code that fights the
platform. Figma describes what a screen looks like without prescribing how it is built,
which is what a native implementer needs.

*Why the transfer must be earned rather than declared.* The port is lossy; every serious
defect in the source projects appeared during or after it. Authority passes only on
proof — a measured diff of zero — never on the port having been performed.

*What remains true.* HTML stays the verification baseline. It is executable, so its
checks re-run at any time; Figma requires a dump to compare at all. If Figma changes
after handoff it must re-verify against HTML, or HTML must be updated to match.

### D2 — the behavioural contract is written into Figma

Devs work in Figma and do not leave it. Three classes of fact cannot be seen in a frame:

| Fact | Why a frame cannot carry it |
|---|---|
| Reflow rules between breakpoints | Figma holds two or three fixed frames; the rule connecting them is `reflowNotes` |
| Flows and routing | Prototype links cannot distinguish "screen in this app" from "different app" |
| Registers — chrome, `copyRules`, `dataOwnership`, `parityExemptions` | No Figma primitive expresses "this entity is read-only" |

The port therefore writes an annotation frame beside each screen carrying these, and the
review gains `annotation-check`: every screen has an annotation and it matches
`state.json`. An annotation that drifts from the contract is a finding, not a surprise
found later in code review.

### D3 — hybrid packaging: one repo, real plugins

One repository, `packages/*` subdirectories, each a genuine installable plugin listed in
`marketplace.json`, each declaring `dependencies` on the packages it needs.

This was chosen after confirming against the Claude Code plugin reference that
`dependencies` with semver constraints, `source: "./packages/x"` in a marketplace, and
custom component paths in `plugin.json` are all supported. An earlier draft rejected
separate plugins on the belief that no dependency mechanism existed and shared rules
would have to be duplicated. That belief was wrong.

**Known constraint: there is no runtime enable/disable.** Once a package is installed its
commands are always visible. "Omitting" a package is therefore an install-time choice,
and a package whose inputs are absent must refuse to run and say why — which is what
`requires` does.

### D4 — pica owns the full path, and says what it has not built

Implementation and test packages are declared now and built later. They appear in the
graph, in `/pica status`, and in the banner — drawn dashed and labelled `PLANNED`.
Declaring the contract early is the point: when the work starts, the interface is
already agreed.

## The package contract

Every package ships a `package.json` alongside its `plugin.json`:

```json
{
  "name": "figma",
  "status": "stable",

  "owns": {
    "commands": ["pica-port", "pica-prototype"],
    "rules":    ["figma-screens.md", "figma-elements.md", "figma-mcp.md"],
    "scripts":  ["geometry-diff.mjs", "figma-audit.js", "annotation-check.mjs"]
  },

  "requires": {
    "state":     ["viewports", "figmaInScope=true"],
    "artifacts": [".audit/html-reference.json"],
    "gates":     ["htmlApproved:<wp>"]
  },

  "produces": {
    "state":     ["ported:<wp>", "annotated:<wp>"],
    "artifacts": [".audit/figma-dump.json"]
  },

  "checks": [
    { "run": "geometry-diff.mjs",    "passes": "0 findings AND >0 runs compared" },
    { "run": "figma-audit.js",       "passes": "every count returns 0" },
    { "run": "annotation-check.mjs", "passes": "every screen annotated, matching state" }
  ],

  "definitionOfDone": [
    { "type": "check", "run": "geometry-diff.mjs", "passes": "0 findings" },
    { "type": "check", "run": "annotation-check.mjs", "passes": "0 findings" },
    { "type": "human", "says": "every frame rendered and looked at, after the last change" },
    { "type": "gate",  "grants": "figmaVerified:<wp>" }
  ]
}
```

`requires` is what makes omission and reordering safe rather than silently broken. A
package refuses to start when its inputs are missing and names exactly which:

```
BLOCKED  package "figma" cannot run
  requires gate      htmlApproved:search          -> not granted
  requires artifact  .audit/html-reference.json   -> present
  requires state     figmaInScope=true            -> true

  Run /pica-wp search and get HTML approval first.
```

Carrying `passes` in the manifest makes the `0.3.0` failure — rules naming checks that
nothing could run — structurally impossible: a declared check with no executable is a
manifest error.

## The packages

```
                     ┌─ research ─┐
         core ───────┼─ html ─────┼──[htmlApproved]──> figma ──> impl-* ──> e2e
                     └────────────┘                             PLANNED   PLANNED
```

| Package | Owns | Requires | Produces |
|---|---|---|---|
| **core** | `/pica`, `/pica-close`, `/pica-feedback`, session hook, write gate, state schema and registers, `pica-status.mjs` | — | contract, exclusions, `state.json`, all gates |
| **research** | `research.md`, token provenance | core | `tokens.json`, `tokens.css`, audit findings |
| **html** | `/pica-wp`, `html-prototype.md`, `capture-html-reference`, `verify-html`, `parity-check`, `flow-check` | core, tokens | UI kit, screens, prototypes, `htmlApproved:<wp>` |
| **figma** | `/pica-port`, `/pica-prototype`, `figma-*.md`, `geometry-diff`, `figma-audit`, `capture-baseline`, `annotation-check` | core, html, `figmaInScope` | verified frames and annotations, `ported:<wp>` |
| **impl-web / impl-ios / impl-android** | *coming-soon* | core, figma | platform code |
| **e2e** | *coming-soon*, one per platform | an impl package | test reports |

**`review-gates.md` must be split, and this is where isolation is won or lost.** Core
keeps what is medium-independent: report before you fix, a check must fail closed, a
green check is not evidence the check works, audit integrity, the definition-of-done
framework. `html` takes the measured HTML gate and parity. `figma` takes the geometry
diff, tolerance calibration and annotation rules.

`/pica-close` and `/pica-feedback` stay in core. Both are project-level and
medium-independent: closeout freezes whatever was delivered, and feedback triage —
verify every claim before accepting it — applies whether the claim concerns HTML, Figma
or shipped code.

`e2e` lives per platform rather than as one package, because Playwright, XCUITest and
Espresso share almost nothing. Usability testing is the exception and would be its own
cross-platform package.

`research` is separate rather than folded into core because the real case is not
skipping it but **swapping** it: a client with an existing design system needs something
that produces `tokens.json` from their library instead of from an audit. Same contract,
different implementation.

## State and gates

`state.json` is the bus, namespaced so packages cannot collide:

```json
{
  "contract":  { },
  "viewports": [ ],
  "gates":     { "htmlApproved:search": { "granted": true, "by": "human", "at": "…" } },
  "packages":  { "figma": { "ported": ["search"], "annotated": ["search"] } }
}
```

**No package may grant a gate it benefits from.** `html` requests `htmlApproved`; only
core grants it, and only on human approval. `figma` requires that gate and cannot grant
it. Without this rule a package self-certifies, which is the failure pica exists to
prevent.

## Definition of done

Each item is typed, so `/pica status` can report what is satisfied:

- `check` — an executable and its pass criterion
- `human` — a person must do it; **no script can satisfy it, and the schema enforces that**
- `gate` — the human approval this package requests on completion
- `artifact` — a file that must exist

The `human` type is load-bearing. On the fourth source project ten harnesses ran green
three times and a human found four defects in a screenshot the same afternoon. Encoding
that as data rather than prose is what stops it being skipped.

## Review agents

Each package may declare reviewers that run against its own outputs.

| Package | Reviewer | Looks for |
|---|---|---|
| html | screenshot reviewer | what measurement is blind to — duplicated rows, orphaned spacing, an undimmed header |
| figma | visual parity reviewer | Figma frames against HTML screenshots, beyond what `geometry-diff` sees |
| figma | rule reviewer | naming, variable binding, chrome pinning, annotation completeness |
| impl-* | e2e and usability | *coming-soon* |

Two constraints:

1. **Reviewers report, never fix.** Already pica rule 3; it applies doubly to agents.
2. **Reviewers cannot grant gates.** They produce findings; the human still approves.

An agent looking at a screenshot is a third category, not a replacement for a human
looking. It is far better than a script at "that looks wrong" and worse than a person at
knowing what the client meant. It reduces how much reaches the human. It does not delete
the `human` line.

## Migration

Ordered so nothing breaks at any step:

1. **Write manifests describing today's ownership.** No files move; packages exist as data.
2. **Split `review-gates.md`.** The real work, and the point of the exercise.
3. **Move files into `packages/*`**, one `plugin.json` each.
4. **List them in `marketplace.json`** with `dependencies`.
5. **Keep `pica` as a bundle** depending on core, research, html and figma, so existing
   installs continue to get everything.

Step 5 matters: anyone who installed `pica` must not have it break because it became six
things.

## What this does not decide

- **Which stacks the impl packages target.** React versus Vue, SwiftUI versus UIKit,
  Compose versus Views. Deliberately deferred to when those packages are built.
- **How generated code is verified against the design.** The hardest open problem: it is
  a third artifact needing its own diff, and no equivalent of `geometry-diff` exists for
  a running application. `e2e` is a partial answer, not a complete one.
- **Whether annotations can be verified as *correct*** rather than merely present and
  matching `state.json`. A wrong reflow rule recorded consistently in both still ships.
- **Usability testing.** No source project has ever run any. Nothing here should be read
  as claiming otherwise.

## Risks

- **The split of `review-gates.md` is where this succeeds or fails.** If the shared half
  stays large, packages stay coupled and the whole exercise is cosmetic.
- **Six plugins is more surface to keep consistent** than one. Version skew between
  packages is a new failure mode that does not exist today.
- **A declared package must not read as a built one.** The mitigation is presentation,
  never removal: `coming-soon` packages stay in the graph, in `/pica status` and in the
  banner, drawn dashed and labelled `PLANNED`. They are work in progress, and deleting a
  roadmap entry because it has not shipped yet would lose the agreed contract — which is
  the whole reason for declaring it early. **Nothing is removed from the roadmap
  automatically.** If a package should go, that is the author's explicit call.
