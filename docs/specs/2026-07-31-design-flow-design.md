# html-first: Design Flow Package

Date: 2026-07-31
Status: awaiting review
Provenance: extracted from one real client design pilot (24h fixed-scope mobile redesign, Jul 2026)

## 1. Objective

A distributable Claude Code plugin that carries a gated design workflow: prototype in HTML, port to
Figma only on approval, verify Figma against the HTML by measurement rather than by eye.

Published publicly as `html-first`, installable in two lines by anyone.

## 2. Decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Structure | Orchestrator commands plus separately loadable rule modules. Mirrors the author's existing `/verify` command pipeline. |
| D2 | Figma trigger | Two levels. Figma declared in or out of scope at intake; each work package still needs explicit per-WP approval before its port. |
| D3 | Complexity routing | Work packages tiered standard or complex during planning, against stated criteria, user confirms the labels. Complex packages get research plus 2 to 3 options plus an agent panel. |
| D4 | Prototype scope | Flow wiring plus component interactions. Motion excluded. |
| D5 | Audience | Public, open source. Requires full scrubbing of client-identifying content. |
| D6 | First release | Everything, versioned 0.1.0, with provenance stated honestly in the README. |
| D7 | Name | `html-first`. Commands ship as explicit `/html-first-*` with short `/hf-*` aliases. |

## 3. Why this exists

The workflow was validated once, on a real paid pilot. Every rule in it earns its place from a
specific failure:

- Work ported to Figma before its HTML was approved, then deleted. Hence D2.
- Four separate false "complete" reports on work that was visibly broken. Hence the self-review gate.
- A review pass reporting "clean, all zero" while Figma disagreed with the HTML, because every check
  compared Figma to itself. Hence HTML as declared source of truth.
- Defects invisible to visual review and obvious to measurement: a hero 47px low across three
  screens, a CTA hugging its label instead of filling, inputs at a stale fixed height clipping their
  own error messages. Hence the capture-and-diff harness.
- An audit that ran as a write against a delivered file, deleting a node unrecoverably. Hence
  report mode as the default.

This history is the package's only evidence. It is one project. The README must say so.

## 4. Repository layout

```
html-first/
  .claude-plugin/
    marketplace.json
    plugin.json
  skills/design-flow/
    SKILL.md
    rules/
      research.md
      html-prototype.md
      figma-elements.md
      figma-screens.md
      review-gates.md
    scripts/
      capture-html-reference.mjs
      figma-audit.js
  commands/
    html-first.md            hf.md
    html-first-wp.md         hf-wp.md
    html-first-port.md       hf-port.md
    html-first-review.md     hf-review.md
    html-first-prototype.md  hf-prototype.md
    html-first-close.md      hf-close.md
  hooks/
    hooks.json
    session-start
    dispatcher.md
  docs/specs/
  README.md  LICENSE  CHANGELOG.md
```

The `hf-*.md` files are thin aliases that defer to their `html-first-*` counterparts. Explicit names
are discoverable in the command list; short names are usable daily.

All internal paths resolve through `${CLAUDE_PLUGIN_ROOT}`. No absolute or home-relative paths
anywhere, since those break on every machine but the author's.

## 5. Three reliability layers

The package assumes model judgement is unreliable. Reliability is layered deliberately.

| Layer | Fires | Carries | Bypassable |
|---|---|---|---|
| `SessionStart` hook | Always, on `startup`, `clear` and `compact` | `dispatcher.md` | No |
| `/html-first-*` commands | When typed, deterministic thereafter | Flow order and its gates | Yes, by not typing them |
| `PreToolUse` hooks | On every matching tool call | The two hard gates | No |

Rationale: the same instruction given in prose decayed inside a single long session on the source
project, agreed on day one and needing to be re-demanded on day two. Anything that must never be
skipped belongs in a hook, not in a rule file.

The skill itself (`html-first:design-flow`) is model-invoked and therefore unreliable. It is not
depended on. The dispatcher is what makes the flow present.

## 6. `dispatcher.md`

Injected into every session. Hard cap of 40 lines: beyond that it competes with everything else in
context and degrades into wallpaper.

Content, in priority order:

1. HTML is the source of truth when HTML and Figma disagree.
2. Never port to Figma without explicit approval for that specific work package.
3. Reviews report by default. Fixing requires a separate instruction.
4. Never modify a delivered artefact.
5. Self-review before handing anything back.
6. For design work, run `/html-first`.

Excluded: any personal stylistic preference. Those belong in the user's own memory or CLAUDE.md, not
in a public package.

## 7. The flow

| # | Step | Entry | Rules | Trigger |
|---|---|---|---|---|
| 0 | Dispatcher injected | `hooks/session-start` | none | Auto |
| 1 | Intake | `/html-first` | `research.md` | Manual |
| 1a | Contract gate | inside step 1 | none | Auto after 1 |
| 2 | Research and tokens | inside step 1 | `research.md` | Auto after 1a |
| 2a | Token gate | inside step 2 | none | Auto after 2 |
| 3 | UI kit HTML | inside step 1 | `html-prototype.md` | Auto after 2a |
| 4 | Foundations port | inside step 1 | `figma-elements.md` | Conditional on Figma in scope |
| 5 | Work package | `/html-first-wp <name>` | `html-prototype.md`, `review-gates.md` | Manual |
| 5a | HTML gate | inside step 5 | none | Auto after 5 |
| 6 | Port to Figma | `/html-first-port <wp>` | `figma-screens.md`, `figma-elements.md` | Manual, hook-blocked without 5a |
| 7 | Review | `/html-first-review [wp] [--fix]` | `review-gates.md` | Manual |
| 8 | Prototype | `/html-first-prototype` | `figma-screens.md`, `review-gates.md` | Manual |
| 9 | Closeout | `/html-first-close` | `review-gates.md` | Manual |

`/html-first` covers steps 1 through 4, which happen in one sitting. Steps 5 through 9 are separate
entry points because they recur over days and the session will not survive that.

### Step 1, intake

Required inputs, refused if incomplete:

- the brief, raw and unedited
- sources, each labelled `use` or `ignore`
- the commercial constraint, plus any disclosure policy
- environment facts: fonts installed, MCP servers live, what only the human can do
- one declaration: is Figma a deliverable

Outputs:

- the requirement restated as a contract, with per-package acceptance criteria
- an explicit exclusions list: what is deliberately not being built
- options costed in a single comparable table, one chosen by the user
- a risk tier per package, standard or complex, confirmed by the user
- project skeleton: `docs/`, `html/`, `.audit/`, `.hf/state.json`

The exclusions list is the highest-value single artefact here. On the source project a screen the
brief explicitly ruled out was designed anyway, and was caught only by the human re-reading the
brief two days later.

### Step 5, work package loop

Standard tier: build the HTML, self-review, present.

Complex tier: research the precedent, produce 2 to 3 options, run an agent panel across four fixed
lenses (usability, platform conventions and accessibility, product and business, developer
feasibility), present findings, the user chooses, then build.

Complexity criteria, any one triggers the complex tier:

- no precedent for the feature exists in the product being redesigned
- it changes information architecture or navigation
- no reference design exists to work from
- it embodies a decision the client is likely to challenge

Both tiers: the HTML is added as a tab to a single review page. Never separate files, never a
separate scrolled duplicate of a screen. Tall screens get a pair: one fixed-viewport interactive
version with real overflow scrolling, one full-height version equivalent to a Figma hug.

### Step 7, review

Two modes. `report` is the default and modifies nothing. `--fix` is explicit.

Checks:

- Figma against the HTML reference by measurement, per frame
- every text node resolves to a defined text style, every style to a variable
- geometry: circle-intent nodes fixed on both axes, FILL versus HUG correctness, clipped shadows,
  zero-size nodes
- contrast and touch targets
- reuse decay: detached instances, patterns duplicated inline instead of componentised

Runs per work package, not accumulated. On the source project the review was deferred to the end and
became 64 findings across 12 rounds, because two days of divergence had piled up.

### Step 9, closeout

Re-read the original brief cold, not the plan. Produce a required-versus-present table. Then the
handoff page, annotations, and the effort report.

## 8. `.hf/state.json`

The hooks are shell scripts. They cannot know that a human verbally approved a work package, so
approval has to be on disk.

```json
{
  "figmaInScope": true,
  "workPackages": {
    "wp2-onboarding": { "tier": "standard", "htmlApproved": true, "ported": true }
  },
  "activeReview": { "mode": "report", "startedAt": "..." }
}
```

Written by the commands, read by the hooks. Without this file the gates are advisory prose again.

## 9. Hooks

| Hook | Event | Matcher | Behaviour |
|---|---|---|---|
| `session-start` | `SessionStart` | `startup\|clear\|compact` | Injects `dispatcher.md` |
| `gate-port` | `PreToolUse` | `mcp__figma__use_figma` | Deny write when the target package lacks `htmlApproved` |
| `gate-readonly` | `PreToolUse` | `mcp__figma__use_figma` | Deny write while `activeReview.mode == "report"` |
| `gate-figma-use` | `PreToolUse` | `mcp__figma__use_figma` | Deny and instruct to load `figma-use` first when it has not been loaded |

The injector pattern is adapted from superpowers (MIT, Jesse Vincent) and must be attributed in the
README and in a comment in `session-start`.

## 10. Rule modules

| Module | Content | Source |
|---|---|---|
| `research.md` | Research before designing, audit breadth, token extraction, precedent research | New |
| `html-prototype.md` | Configurable frame size, single tabbed review page, interactive and full-height pair, real assets not placeholders, state matrix | New |
| `figma-elements.md` | Two token layers, numeric font weights, text styles stitched from variables, global versus local component tiers, naming | Merge of existing `variable-rules.md` and `component-rules.md` |
| `figma-screens.md` | Frames, states, FILL versus HUG, the circle rule, alignment measured against HTML, Plugin API traps | Merge of existing `screen-rules.md`, `alignment-rules.md`, `api-traps.md` |
| `review-gates.md` | Self-review checklist, report versus fix modes, complexity criteria, panel lenses, definition of zero | Existing `verification.md` plus new material |

Each module must be readable standalone. A reader pulling only `figma-elements.md` should not need
the others to act on it.

## 11. Dependency tiers

| Tier | Requires | Provides |
|---|---|---|
| Core | nothing | Intake, research, HTML prototype, review, closeout |
| Figma | Figma MCP server, which supplies `figma-use` | Foundations port, screen port, Figma review, prototype |
| Enhanced | superpowers | `brainstorming` at intake, `writing-plans` for the plan, `dispatching-parallel-agents` for the panel |

Plugins have no dependency resolution, so every optional dependency must degrade gracefully with a
stated fallback. The core tier having zero dependencies is a deliberate property: the HTML half works
for anyone who installs nothing else.

The author's personal `duncan-ux-*` skills are not vendored. Their accessibility and handoff checks
fold into `review-gates.md` instead.

## 12. Scrubbing, mandatory before publication

- Replace all client defect examples with generic or synthetic equivalents. No project name.
- Remove `duncan-*` naming throughout.
- Remove the Jira host, all client names, Figma file keys and node IDs.
- Make the frame size configurable, with a stated default rather than a hardcoded device.
- Remove language-specific and locale-specific assumptions.

The methodology is the author's own. No client design, asset or identifier ships.

## 13. README

Structure:

1. **One-line pitch.** "Design workflow for Claude Code. Prototype in HTML, port to Figma, verify by
   measurement."
2. **The problem**, in three sentences: Figma is slow to iterate and easy to declare finished by eye;
   design defects survive visual review; work gets built before it is approved.
3. **Install**, two commands, then restart.
4. **Provenance and honesty.** Extracted from one real client pilot. The Figma rules are the least
   battle-tested part. Version 0.1.0 for that reason.
5. **The flow**, as the step table from section 7.
6. **Dependency tiers**, section 11, with the core-needs-nothing point made explicitly.
7. **Command reference**, explicit names with the short aliases noted.
8. **The rules**, one paragraph per module with a link.
9. **What the hooks enforce**, and why hooks rather than instructions.
10. **Not included:** motion design, code generation, design token export to code, anything
    Figma-plugin-side.
11. **Attribution:** superpowers, MIT, for the SessionStart injector pattern.
12. **Licence.**

Tone: state what it does and what it does not. No claim that it is a general solution to design
workflow, because one project is not evidence for that.

## 14. Build order

Ordered by dependency, not by visibility.

1. Repo skeleton, `plugin.json`, `marketplace.json`. Installable while empty; verify install works
   before adding content.
2. Hooks: `dispatcher.md`, `session-start`, `hooks.json`, and `.hf/state.json` handling. The
   reliability layer comes first because everything else assumes it fires.
3. `figma-elements.md`, `figma-screens.md`, and both scripts. Lifted from the existing archive and
   scrubbed. Hardest content, already written.
4. `skills/design-flow/SKILL.md`.
5. The six commands plus their six aliases.
6. `research.md`, `html-prototype.md`, `review-gates.md`. New writing.
7. `README.md`, `LICENSE`, `CHANGELOG.md`.

## 15. Acceptance criteria

- A clean machine can install the package with the two documented commands and see the dispatcher
  appear in a fresh session.
- With no Figma MCP and no superpowers installed, the core flow runs end to end and states clearly
  which steps are unavailable.
- A `use_figma` write is denied when the target package is not approved in `.hf/state.json`.
- A `use_figma` write is denied while a review is active in report mode.
- `grep` across the published repo returns no client name, no Figma file key, no Jira host, and no
  `duncan` string.
- Every rule module reads correctly in isolation.

## 16. Out of scope for 0.1.0

Stated explicitly so it does not creep in:

- motion design and transition specification
- generating production code from designs
- exporting tokens into a codebase
- any Figma plugin published to the Figma community
- Windows-specific hook shims, Cursor, Codex and Gemini variants
- a second flow variant for desktop or web design, as opposed to mobile
