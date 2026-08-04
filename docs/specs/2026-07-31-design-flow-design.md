# pica: Design Flow Package

Date: 2026-07-31
Status: **implemented as 0.1.0. Partly superseded by 0.2.0 — this document is kept as the original design
record and is no longer current.** The `state.json` schema below predates the `exclusions`, `deviations`,
`rawValueExemptions` and `bannedChars` registers, the home-indicator rule changed for hug frames, and the
rules gained a sixth module. See `CHANGELOG.md` for what moved and why.
Provenance: extracted from one real client design pilot (24h fixed-scope mobile redesign, Jul 2026)

## 1. Objective

A distributable Claude Code plugin that carries a gated design workflow: prototype in HTML, port to
Figma only on approval, verify Figma against the HTML by measurement rather than by eye.

Published publicly as `pica`, installable in two lines by anyone.

## 2. Decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Structure | Orchestrator commands plus separately loadable rule modules. Mirrors the author's existing `/verify` command pipeline. |
| D2 | Figma trigger | Two levels. Figma declared in or out of scope at intake; each work package still needs explicit per-WP approval before its port. |
| D3 | Complexity routing | Work packages tiered standard or complex during planning, against stated criteria, user confirms the labels. Complex packages get research plus 2 to 3 options plus an agent panel. |
| D4 | Prototype scope | Flow wiring plus component interactions. Motion excluded. |
| D5 | Audience | Public, open source. Requires full scrubbing of client-identifying content. |
| D6 | First release | Everything, versioned 0.1.0, with provenance stated honestly in the README. |
| D7 | Name | `pica`, the typographic unit. Commands are `/pica-*`. No aliases: the name is already short enough that a second command layer would only add files to maintain. |

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
pica/
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
    pica.md
    pica-wp.md
    pica-port.md
    pica-review.md
    pica-prototype.md
    pica-close.md
  hooks/
    hooks.json
    session-start
    dispatcher.md
  docs/specs/
  README.md  LICENSE  CHANGELOG.md
```

Six commands, no aliases. `pica` is short enough to type in full, so a second command layer would
add files to maintain and two names to document for no gain.

All internal paths resolve through `${CLAUDE_PLUGIN_ROOT}`. No absolute or home-relative paths
anywhere, since those break on every machine but the author's.

## 5. Three reliability layers

The package assumes model judgement is unreliable. Reliability is layered deliberately.

| Layer | Fires | Carries | Bypassable |
|---|---|---|---|
| `SessionStart` hook | Always, on `startup`, `clear` and `compact` | `dispatcher.md` | No |
| `/pica-*` commands | When typed, deterministic thereafter | Flow order and its gates | Yes, by not typing them |
| `PreToolUse` hooks | On every matching tool call | The two hard gates | No |

Rationale: the same instruction given in prose decayed inside a single long session on the source
project, agreed on day one and needing to be re-demanded on day two. Anything that must never be
skipped belongs in a hook, not in a rule file.

The skill itself (`pica:design-flow`) is model-invoked and therefore unreliable. It is not
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
6. For design work, run `/pica`.

Excluded: any personal stylistic preference. Those belong in the user's own memory or CLAUDE.md, not
in a public package.

## 7. The flow, overview

| # | Step | Entry | Rules | Trigger |
|---|---|---|---|---|
| 0 | Dispatcher injected | `hooks/session-start` | none | Auto |
| 1 | Intake | `/pica` | `research.md` | Manual |
| 2 | Research and tokens | inside `/pica` | `research.md` | Auto after gate 1 |
| 3 | UI kit HTML | inside `/pica` | `html-prototype.md` | Auto after gate 2 |
| 4 | Foundations port | inside `/pica` | `figma-elements.md` | Conditional on Figma in scope |
| 5 | Work package | `/pica-wp <name>` | `html-prototype.md`, `review-gates.md` | Manual |
| 6 | Port to Figma | `/pica-port <wp>` | `figma-screens.md`, `figma-elements.md` | Manual, hook-blocked without gate 5 |
| 7 | Review | `/pica-review [wp] [--fix]` | `review-gates.md` | Manual |
| 8 | Prototype | `/pica-prototype` | `figma-screens.md`, `review-gates.md` | Manual |
| 9 | Closeout | `/pica-close` | `review-gates.md` | Manual |

`/pica` covers steps 1 through 4, which happen in one sitting. Steps 5 through 9 are separate
entry points because they recur over days and the session will not survive that.

---

## 8. The flow, full detail

### Step 0. Dispatcher injection

**Purpose.** Make the flow present in every session without anyone remembering to load it.

**Entry.** `hooks/session-start`, registered in `hooks.json` for `SessionStart` with matcher
`startup|clear|compact`.

**Trigger.** Automatic. Not skippable. Re-fires after compaction, which is the case that matters:
on the source project a rule agreed on day one had decayed by day two inside one long session.

**Actions.**
1. Read `${CLAUDE_PLUGIN_ROOT}/hooks/dispatcher.md`.
2. Emit it as `hookSpecificOutput.additionalContext`, JSON-escaped.
3. Emit nothing else. No status lines, no version banner. Every line spent here costs attention.

**Outputs.** The six non-negotiables from section 6, in context, before the user's first message.

**Failure mode.** If the file is unreadable, emit a single line saying the dispatcher failed to load.
Never fail silently, because a silent failure looks identical to a working install.

---

### Step 1. Intake

**Purpose.** Convert a brief into a contract before any work starts.

**Entry.** `/pica`, typed by the user.

**Rules loaded.** `research.md`.

**Required inputs.** The command refuses to proceed without all five:

| Input | Why |
|---|---|
| The brief, raw and unedited | Paraphrasing at intake loses the exact wording that later resolves disputes |
| Sources, each labelled `use` or `ignore` | On the source project an unlabelled file held several old versions of the same app, any of which could have been mistaken for current |
| The commercial constraint, plus any disclosure policy | Hours, cap, fixed-scope or time-and-materials, and what the client must not be told |
| Environment facts | Fonts installed, MCP servers live, and what only the human can do |
| One declaration: is Figma a deliverable | Determines whether steps 4, 6 and 8 exist at all |

**Actions.**
1. Read the brief and restate it as a contract: one section per work package, each with acceptance
   criteria in the user's own terms.
2. Extract an **exclusions list**: everything the brief rules out, quoted. Ask the user to add
   anything missing.
3. State the limitations honestly before any capability claim: what cannot be done, what needs the
   human, what needs a tool that is not installed.
4. Produce 2 to 3 delivery options, each costed in the **same table** with a comparable total.
5. Tier every work package `standard` or `complex` against the criteria in step 5, and present the
   labels for confirmation.
6. Create the project skeleton: `docs/`, `html/`, `.audit/`, `.pica/state.json`.
7. Open three parallel artefacts that run for the life of the project: the effort log, the reasoning
   log, and the annotation list.

**Outputs.** `docs/contract.md`, `docs/exclusions.md`, the costed options table, tier labels,
`.pica/state.json` initialised.

**Gate 1.** The user approves the contract, the exclusions list, one option, and the tier labels.
Nothing proceeds until all four are approved.

**State written.** `figmaInScope`, one entry per work package with its `tier`, `disclosurePolicy`.

**Why the exclusions list matters most.** On the source project a screen the brief explicitly ruled
out was designed anyway, and was caught only when the human re-read the brief two days later.

---

### Step 2. Research and tokens

**Purpose.** Ground the design system in evidence rather than invention.

**Entry.** Automatic, after gate 1.

**Rules loaded.** `research.md`.

**Actions.**
1. Audit the existing product across every source labelled `use`. Log findings with stable IDs.
2. Audit any adjacent source the brief implies. If the brief says reuse an existing design system,
   the audit must cover that system's actual home, not just the artefact being redesigned. On the
   source project the brief said reuse the desktop design system, and the desktop site had not been
   looked at until the human asked.
3. Extract tokens: colour, type scale, spacing, radii, elevation. Record provenance per token, which
   source it came from and whether it was taken or derived.
4. Research precedent for anything the product does not already do. Cite sources.
5. Write `tokens.json` and `tokens.css` as the single source for both the HTML and the Figma sides.

**Outputs.** `docs/audit-findings.md`, `docs/token-provenance.md`, `tokens/tokens.json`,
`tokens/tokens.css`.

**Gate 2.** The user approves the tokens. Everything downstream consumes them, so a late token change
is expensive.

**Refusal.** If the brief claims an existing design system and no accessible source for it exists,
say so at this step rather than silently inventing one and calling it reuse.

---

### Step 3. UI kit HTML

**Purpose.** Make the system reviewable on its own, before any screen uses it.

**Entry.** Automatic, after gate 2.

**Rules loaded.** `html-prototype.md`.

**Actions.**
1. Build `html/design-system.html`: a storybook showing every token and every component with all its
   variants and states. Simple, single file, no build step.
2. Build `html/review.html`: the tabbed shell. One tab per section, lazy iframes, so the per-section
   files stay the source and the shell is only navigation.
3. Add the design system as the first tab.
4. Self-review before presenting, per `review-gates.md`.

**Outputs.** `html/design-system.html`, `html/review.html`, `html/shared.css`.

**Gate 3.** The user confirms the kit.

**Hard rule.** Every later screen consumes kit components. A one-off built inline on a screen is a
review finding, not a shortcut.

---

### Step 4. Foundations port

**Purpose.** Put the system into Figma once, correctly, before any screen depends on it.

**Entry.** Automatic after gate 3, **only if** `figmaInScope` is true. Skipped entirely otherwise.

**Rules loaded.** `figma-elements.md`. `figma-use` must be loaded before the first write.

**Actions.**
1. Create the variable collections: primitives, spacing, typography, semantic aliases, and one
   collection per major component atom.
2. Set `scopes` explicitly on every variable. The default pollutes every property picker.
3. Create text styles stitched from variables, never from literal values. Font weight is a numeric
   variable, not a style name, so a typeface swap cannot collapse the hierarchy.
4. Build the global components: the ones reused across screens.
5. Assert every created name against what was intended. Unknown style names and undefined variables
   do not throw; they resolve to nothing and the file looks plausible.
6. Screenshot and self-review before presenting.

**Outputs.** Figma pages for foundations and components. `docs/figma-inventory.md` recording every
variable, style and component created.

**Gate 4.** The user reviews the foundations.

**Failure mode to guard.** A binding call that returns a new object which must be captured and
reassigned. Ignoring the return value silently applies nothing.

---

### Step 5. Work package

**Purpose.** Design one coherent slice, in the cheap medium, to an agreed standard.

**Entry.** `/pica-wp <name>`, typed per package.

**Rules loaded.** `html-prototype.md`, `review-gates.md`.

**Branch on tier.**

*Complex tier.* Triggered when any one of these holds, decided at step 1 and confirmed by the user:
- no precedent for the feature exists in the product being redesigned
- it changes information architecture or navigation
- no reference design exists to work from
- it embodies a decision the client is likely to challenge

Complex tier actions, in order:
1. Re-read the requirement for this package. Not the plan, the brief.
2. Research precedent strictly. Name real products and real conventions. Cite.
3. Build 2 to 3 genuinely different options in HTML, not variations of one.
4. Run an agent panel across four fixed lenses, each blind to the others:
   - **usability**: task-based walkthrough, where does a user stall
   - **platform and accessibility**: platform conventions, contrast, touch targets, focus order
   - **product and business**: does this serve the goal, what does it cost to be wrong
   - **developer feasibility**: can the existing backend deliver this, what is claimed that does not exist
5. Present the options with the panel findings, including disagreements between lenses.
6. The user chooses. Record the choice and its reasoning in the reasoning log.

*Standard tier.* Straight to build.

**Both tiers, build actions.**
1. Write the state matrix first: every screen, every state, default plus loading plus empty plus
   error plus whatever the feature implies.
2. Build the screens in HTML at the configured frame size.
3. Use real assets. No emoji standing in for icons, no generic stock imagery unrelated to the
   content. On the source project fifteen emoji placeholders had reached the component library.
4. For any screen taller than the viewport, produce a **pair**: one fixed-viewport interactive version
   with real overflow scrolling and pinned chrome, and one full-height version equivalent to a Figma
   hug. Never a separate "scrolled" duplicate frame.
5. Add the package as a new tab in `review.html`.
6. Self-review against `review-gates.md` before presenting. State what was checked and what was
   found, not just that it is done.

**Outputs.** `html/<wp>.html`, a new tab in `review.html`, `docs/<wp>-state-matrix.md`, reasoning log
entries, and for complex packages `docs/<wp>-options-report.md`.

**Gate 5.** The user approves the package's HTML. This is the gate that blocks step 6.

**State written.** `workPackages.<wp>.htmlApproved = true`, only on explicit approval.

---

### Step 6. Port to Figma

**Purpose.** Reproduce approved HTML in Figma to handoff grade, and prove it matches.

**Entry.** `/pica-port <wp>`, typed by the user.

**Rules loaded.** `figma-screens.md`, `figma-elements.md`. `figma-use` before the first write.

**Precondition, hook-enforced.** `workPackages.<wp>.htmlApproved` must be true. A `use_figma` write
is denied otherwise. This is not advice; the hook blocks the call. On the source project a package
was ported before approval and the whole page had to be deleted.

**Actions.**
1. Capture the HTML reference: run `capture-html-reference.mjs` to record, per frame, true text-run
   rectangles via range geometry rather than element boxes, every element box with its class, and
   computed font size and weight. Force the font to whatever Figma currently resolves, so the diff
   isolates layout from typeface metrics.
2. Build local components: the repeated patterns specific to this screen family. Locals compose
   globals. A pattern that already exists as a global gets a variant there, never a local duplicate.
3. Build the screens from instances only. Every frame is auto layout. No spacer frames.
4. Sizing: HUG for content height, FILL for widths inside the screen, FIXED only for literal sizes.
   Centring comes from parent alignment, never from spacers.
5. Circle sweep: every circle-intent node, radio, checkbox, avatar, icon button, ring, must be FIXED
   on both axes. Sweep for width not equal to height on full-radius nodes and restore the intended
   size, never the collapsed one.
6. Run `figma-audit.js` and diff against the captured reference. Fix every non-zero result.
7. Re-audit. Repeat until every check returns zero.
8. Add prototype links within the package while porting.
9. Self-review, then present with the audit output attached.

**Outputs.** Figma screens for the package, local components section, `.audit/<wp>-*.json`,
`.audit/<wp>-*.png`.

**Gate 6.** The user reviews. Craft judgement is theirs; correctness was already proven by
measurement.

**State written.** `workPackages.<wp>.ported = true`.

**The non-negotiable.** HTML is the source of truth. Where Figma and HTML disagree, Figma is wrong.
Measure, do not eyeball. Every hard defect on the source project was invisible to visual review and
obvious to measurement.

---

### Step 7. Review

**Purpose.** Find defects by measurement, and separate finding from fixing.

**Entry.** `/pica-review [wp] [--fix]`, typed by the user.

**Rules loaded.** `review-gates.md`.

**Modes.**

| Mode | Flag | Behaviour |
|---|---|---|
| Report | default | Reads and measures. Changes nothing. Writes only its own report file |
| Fix | `--fix` | Applies fixes, then re-audits to zero |

Report is the default because on the source project an audit ran as a write against a delivered file
and deleted a node unrecoverably. While a report-mode review is active, the `PreToolUse` hook denies
every `use_figma` write.

**Checks, all of them measured, none by eye.**
1. **Against HTML**: per-frame geometry diff, position and size, using the captured reference.
2. **Text**: every text node resolves to a defined text style; every style resolves to variables;
   font family and weight bound rather than literal. Report unbound nodes explicitly, since a check
   asking "is anything the wrong value" is structurally blind to nodes with no binding at all.
3. **Geometry**: circle-intent nodes fixed on both axes; FILL versus HUG correctness against the HTML;
   shadows clipped by the wrong container; zero-size nodes; overlapping siblings.
4. **Colour**: contrast against the standard for every text-on-background pair, including text over
   images and scrims.
5. **Targets**: touch targets against platform minimums, noting where the drawn box is smaller than
   the target by design and what expands it.
6. **Reuse decay**: detached instances, patterns duplicated inline that should be local components,
   locals duplicating an existing global.
7. **Prototype**: dead ends, links pointing at the wrong frame, states with no way in or out.

**Outputs.** `docs/reviews/<date>-<wp>.md`, one row per finding with severity, location, measured
evidence, and the fix. Zero findings is a valid and reportable outcome.

**Cadence.** Runs per package, immediately after its port. Not accumulated. On the source project
review was deferred until the end and became 64 findings across 12 rounds, because two days of
divergence had piled up.

**State written.** `activeReview.mode` while running, cleared on exit.

---

### Step 8. Prototype

**Purpose.** Make behaviour reviewable, not just appearance.

**Entry.** `/pica-prototype`, typed after screens are delivered.

**Rules loaded.** `figma-screens.md`, `review-gates.md`.

**Actions.**
1. Wire the flows the contract named, screen to screen, on a dedicated page holding copies rather
   than the source screens.
2. Wire overlays and sheets as overlays, with correct open and close behaviour.
3. Wire component interactions: variant switching for pressed, disabled, open and closed states.
4. Add a walkthrough block per flow saying what to watch for, so a reviewer knows the intent.
5. Review loop, its own pass: dead ends, links to the wrong target, missing back paths, states with
   no way in or out, and any interaction the screens imply but the prototype does not offer.
6. Repeat until the loop returns nothing.

**Outputs.** A prototype page per flow, `docs/prototype-map.md`.

**Gate 8.** The user runs the flows.

**Excluded.** Motion. Transition types, timing and easing are out of scope for 0.1.0. Say so rather
than improvising them.

---

### Step 9. Closeout

**Purpose.** Prove the delivery matches the brief, and hand over something a developer can build from.

**Entry.** `/pica-close`, typed by the user.

**Rules loaded.** `review-gates.md`.

**Actions.**
1. **Re-read the original brief cold.** Not the contract, not the plan. The brief. Both are copies
   and copies drift.
2. Build a **required-versus-present table**: every deliverable the brief names, against what exists,
   with a location for each. Gaps are stated, not quietly omitted.
3. Build the handoff page: platform deltas, naming conventions, the reuse map, and the open questions
   that need answers from the client, ordered by how badly they block.
4. Finalise the reasoning log into a client-facing rationale, because a brief that scores product
   thinking is scoring this.
5. Finalise the effort report against whatever the disclosure policy from step 1 allows.
6. Draft the walkthrough agenda: what to open first, what to say, and pre-written answers to the
   questions a developer will ask.
7. Freeze. After this point every artefact is read-only. Audits report; they do not write.

**Outputs.** `docs/required-vs-present.md`, the Figma handoff page, `docs/rationale.md`,
the effort report, `docs/walkthrough-agenda.md`.

**Gate 9.** The user approves the handover.

**State written.** `delivered = true`. Every write hook denies from here on unless explicitly
overridden.

---

## 9. `.pica/state.json`

The hooks are shell scripts. They cannot know that a human verbally approved a work package, so
approval has to be on disk.

```json
{
  "figmaInScope": true,
  "disclosurePolicy": "fixed-scope, no actual hours",
  "delivered": false,
  "workPackages": {
    "wp2-onboarding": { "tier": "standard", "htmlApproved": true, "ported": true }
  },
  "activeReview": { "mode": "report", "startedAt": "..." }
}
```

Written by the commands, read by the hooks. Without this file the gates are advisory prose again.

## 10. Hooks

| Hook | Event | Matcher | Behaviour |
|---|---|---|---|
| `session-start` | `SessionStart` | `startup\|clear\|compact` | Injects `dispatcher.md` |
| `gate-port` | `PreToolUse` | `mcp__figma__use_figma` | Deny write when the target package lacks `htmlApproved` |
| `gate-readonly` | `PreToolUse` | `mcp__figma__use_figma` | Deny write while `activeReview.mode == "report"` |
| `gate-delivered` | `PreToolUse` | `mcp__figma__use_figma` | Deny write when `delivered` is true |
| `gate-figma-use` | `PreToolUse` | `mcp__figma__use_figma` | Deny and instruct to load `figma-use` first when it has not been loaded |

The injector pattern is adapted from superpowers (MIT, Jesse Vincent) and must be attributed in the
README and in a comment in `session-start`.

## 11. Rule modules

| Module | Content | Source |
|---|---|---|
| `research.md` | Research before designing, audit breadth, token extraction with provenance, precedent research | New |
| `html-prototype.md` | Configurable frame size, single tabbed review page, interactive and full-height pair, real assets not placeholders, state matrix | New |
| `figma-elements.md` | Two token layers, explicit scopes, numeric font weights, text styles stitched from variables, global versus local component tiers, naming | Merge of existing variable and component rule files |
| `figma-screens.md` | Frames, states, FILL versus HUG, the circle rule, alignment measured against HTML, Plugin API traps | Merge of existing screen, alignment and API-trap rule files |
| `review-gates.md` | Self-review checklist, report versus fix modes, complexity criteria, panel lenses, definition of zero | Existing verification rules plus new material |

Each module must be readable standalone. A reader pulling only `figma-elements.md` should not need
the others to act on it.

## 12. Dependency tiers

| Tier | Requires | Provides |
|---|---|---|
| Core | nothing | Steps 1, 2, 3, 5, 7 HTML-side, 9 |
| Figma | Figma MCP server, which supplies `figma-use` | Steps 4, 6, 7 Figma-side, 8 |
| Enhanced | superpowers | `brainstorming` at intake, `writing-plans` for the plan, `dispatching-parallel-agents` for the panel |

Plugins have no dependency resolution, so every optional dependency must degrade gracefully with a
stated fallback. The core tier having zero dependencies is a deliberate property: the HTML half works
for anyone who installs nothing else.

No skills from the author's personal setup are vendored. Accessibility and handoff checks live in
`review-gates.md` instead of depending on anything external.

## 13. Scrubbing, mandatory before publication

- Replace all client defect examples with generic or synthetic equivalents. No project name.
- Remove every author-specific skill name and namespace prefix.
- Remove all issue-tracker hosts, client names, Figma file keys and node IDs.
- Make the frame size configurable, with a stated default rather than a hardcoded device.
- Remove language-specific and locale-specific assumptions.

The methodology is the author's own. No client design, asset or identifier ships.

## 14. README

Structure:

1. **One-line pitch.** "Design workflow for Claude Code. Prototype in HTML, port to Figma, verify by
   measurement."
2. **The problem**, in three sentences: Figma is slow to iterate and easy to declare finished by eye;
   design defects survive visual review; work gets built before it is approved.
3. **Install**, two commands, then restart.
4. **Provenance and honesty.** Extracted from one real client pilot. The Figma rules are the least
   battle-tested part. Version 0.1.0 for that reason.
5. **The flow**, as the overview table from section 7.
6. **Dependency tiers**, section 12, with the core-needs-nothing point made explicitly.
7. **Command reference**, all six commands with their arguments.
8. **The rules**, one paragraph per module with a link.
9. **What the hooks enforce**, and why hooks rather than instructions.
10. **Not included:** motion design, code generation, design token export to code, anything
    Figma-plugin-side.
11. **Attribution:** superpowers, MIT, for the SessionStart injector pattern.
12. **Licence.**

Tone: state what it does and what it does not. No claim that it is a general solution to design
workflow, because one project is not evidence for that.

## 15. Build order

Ordered by dependency, not by visibility.

1. Repo skeleton, `plugin.json`, `marketplace.json`. Installable while empty; verify install works
   before adding content.
2. Hooks: `dispatcher.md`, `session-start`, `hooks.json`, and `.pica/state.json` handling. The
   reliability layer comes first because everything else assumes it fires.
3. `figma-elements.md`, `figma-screens.md`, and both scripts. Lifted from the existing archive and
   scrubbed. Hardest content, already written.
4. `skills/design-flow/SKILL.md`.
5. The six commands.
6. `research.md`, `html-prototype.md`, `review-gates.md`. New writing.
7. `README.md`, `LICENSE`, `CHANGELOG.md`.

## 16. Acceptance criteria

- A clean machine can install the package with the two documented commands and see the dispatcher
  appear in a fresh session.
- With no Figma MCP and no superpowers installed, the core flow runs end to end and states clearly
  which steps are unavailable.
- A `use_figma` write is denied when the target package is not approved in `.pica/state.json`.
- A `use_figma` write is denied while a review is active in report mode.
- A `use_figma` write is denied after `delivered` is set.
- `grep` across the published repo returns no client name, no Figma file key, no issue-tracker host,
  and no author-specific skill namespace.
- Every rule module reads correctly in isolation.

## 17. Out of scope for 0.1.0

Stated explicitly so it does not creep in:

- motion design and transition specification
- generating production code from designs
- exporting tokens into a codebase
- any Figma plugin published to the Figma community
- Windows-specific hook shims, and Cursor, Codex or Gemini variants
- a second flow variant for desktop or web design, as opposed to mobile
