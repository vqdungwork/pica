# HTML gates

The gates the html package owns. Medium-independent review discipline is in core's
`review-discipline.md`, which these assume.

## The measured HTML gate

`scripts/verify-html.mjs <html-reference.json> <state.json>`. **Pass: 0 findings on all five checks.**

Runs in `/pica-wp` before the human is asked to approve anything, and again at the start of a port. For a
project with `figmaInScope: false` it is the **only** verification the work ever receives — which is why
it cannot live in the Figma half of the flow, where it sat through 0.3.0.

| Check | Detects | Pass |
|---|---|---|
| `viewport-tagged` | a frame with no `data-viewport`, or one naming an undeclared viewport | 0 |
| `overflow` | content past the frame's right edge — the frame clips it, so no screenshot shows it | 0 |
| `tall-screen-pair` | content exceeding its viewport by >24px with no `· hug` twin, so the remainder is unreviewable | 0 |
| `viewport-coverage` | a declared viewport that produced no frames at all | 0 |
| `direction` | a screen that breaches the design direction chosen at step 2c — radius, control height, hue budget, tabular figures | 0 |

### The direction check measures a different kind of wrong

The first four checks ask whether the screen is built correctly. `direction` asks whether it is built to
the design system that was chosen, and nothing else here can see that: a screen can be tagged, in bounds,
paired and covered, and still spend eight hues on a product whose direction budgeted three.

It is only checkable because step 2c wrote the direction down **as numbers**. A direction recorded as
prose — "clean, trustworthy, modern" — is not a constraint and the check says so rather than passing it.

Two data rules, both of which cost something to learn elsewhere:

- **Hues are counted across the whole capture, never per frame.** A three-hue budget spent one hue per
  screen is still three. Scoring frames alone calls that a pass and lets a palette sprawl one screen at a
  time.
- **Findings are one per violating value, not one per frame.** A single wrong token appears on every
  screen that uses it, and forty identical lines bury the one value anybody has to change.

Both bounds on control height exist because the directions that care about density want opposite things:
a field tool needs a floor under its touch targets, a dense console needs a ceiling on its rows.

**A declared direction with a pre-0.8.0 capture is a FAIL, not a skip.** The capture carries the census
the check reads; without it nothing can be measured, and that is the `geometry-diff` lesson from 0.7.1 —
a gate that silently cannot check is worse than one that admits it. Re-capture. A project that declares
no direction at all is a different case and reports as not applicable.

## The coverage gate

`scripts/coverage-check.mjs <html-reference.json> <state.json>`. **Pass: 0 findings on all five checks.**

This one was added after testing the flow on a real project, because the boundary between analysis and
design turned out to be the only boundary nothing verified. The Analyst produces use cases, the Designer
produces screens, and every other artefact here is checked against the one before it. These two were
checked against nothing.

| Check | Detects | Pass |
|---|---|---|
| `uc-covered` | a use case with no screen serving it: agreed, then not built | 0 |
| `screen-traced` | a screen with no `data-uc`: either unsold scope, or a use case nobody recorded | 0 |
| `uc-exists` | a screen claiming a use case id that does not exist | 0 |
| `flow-reachable` | a use case served at one viewport and not another, so that user cannot complete it | 0 |
| `target-buildable` | an implementation target consuming a viewport the design never produced. A native app needing tablet when nobody drew tablet cannot be built, and this finds it in Phase 3 rather than in Phase 7 | 0 |

**One design, three viewports; targets choose.** The design is produced once at desktop, tablet and
mobile. Implementation targets then declare which viewports they consume: a responsive website takes
all three, a native app takes tablet and mobile and never desktop. The surface is a property of the
target, not of the viewport, which keeps parity a single-design question.

**A screen's identity is three tags, not one.**

```html
<div data-viewport="mobile" data-uc="UC-03" data-state="empty">
```

`data-uc` and `data-viewport` are not enough on their own: a screen and its empty state serve the same
use case at the same size. Running the build comparison on a real project with that shape broke it
three ways at once — the empty state paired against the populated one and produced four false findings,
and a screen deliberately deleted from the build was never reported, because its sibling absorbed the
pairing. **The check said "0 findings" on the exact defect it was written to catch.**

`data-state` defaults to `default`, so a project with no state variants needs nothing. States come from
the matrix at 3.0c: `empty`, `loading`, `error`, `long`, `unauthorised`.

**Screens declare what they serve with `data-uc="UC-02"`**, comma-separated where one screen serves
several. Tagged, never inferred, for the same reason `data-viewport` is.

> **Why this is not covered by the other checks.** On the test project, `verify-html` returned
> *"0 findings, HTML passes the measured gate"* on a capture where one agreed requirement had no screen
> at all and one screen served no requirement. Every frame was tagged, in bounds, paired and covered.
> The geometry was perfect and the product was both incomplete and over-scoped.

Contract when the data is thin, following `geometry-diff`: **no use cases in state means not
applicable**, and it says so. **Use cases declared with no frame tagged is a FAIL**, because the link
cannot be checked and a check that cannot run is not a pass.

## The flow gate

`scripts/flow-check.mjs --dir html [--state .pica/state.json]`. **Pass: 0 findings on all seven checks**,
and a non-zero number of screens and links, because zero of either means a selector missed rather than a
sound flow.

It measures the one thing a geometry diff structurally cannot: whether the prototype goes where it says it
goes. Every destination renders perfectly in a screenshot, which is why this class of defect reaches the
human every time.

| Check | Detects | Pass |
|---|---|---|
| `dangling-target` | `data-go`, `data-tab` or `data-sheet` naming something that does not exist | 0 |
| `dangling-href` | a cross-application link to a missing file, or a deep link to a missing screen | 0 |
| `nav-target` | a router root or tab id that resolves to no screen, or a tab set that will not parse | 0 |
| `unreachable` | a screen no control opens, so a reviewer is told about it and never sees it | 0 |
| `dead-end` | a screen with nothing outgoing and no back affordance, which traps the reviewer | 0 |
| `orphan-prototype` | an interactive file with no tab in the review shell | 0 |
| `flow-declared` | a `flows` entry whose entry file or home screen does not exist | 0 |

Pass `--allow-none` for a package that genuinely ships boards only, and **say so at the gate**. Without
the flag, no interactive prototype is a failure, because that is the normal way this deliverable goes
missing.

Two things it cannot do. It reads markup, so a link built in JavaScript is invisible to it: keep targets in
attributes. And it cannot tell whether a link goes somewhere *sensible*, which is why "the human clicks the
main flow end to end" is a separate line in the definition of done.

The 24px threshold is calibrated, not chosen: on the project this came from, real overflows were 90px and
up while sub-pixel scroll-region noise never exceeded 8px. A threshold in that gap separates them without
tuning per screen.

## The viewport parity check

`scripts/parity-check.mjs <html-reference.json> <state.json>`. **Pass: 0 findings.**

Only with two or more declared viewports; with one it says so and exits 0. It answers one question: **do
the viewports of a screen say the same thing, apart from the differences we declared?**

**Compare per-class COUNTS, not sets — a set comparison misses count drift.** A set comparison reported zero findings on every screen of a
project while missing real drift: delete one of five candidate rows from one column and the class *set*
is unchanged — `.cand` is still present — so the check passes on a screen that lost content. Since
hand-copied columns are where drift lives and a dropped row is the likeliest copy error, set comparison
fails at exactly the job it was added for.

Two passes, and they answer different questions:

1. **Nominal** — is the screen present at every declared viewport? Cheap, catches a whole screen
   missing. An absence is a finding unless `parityExemptions` records it as a decision. A tall-screen
   **hug twin is not a separate screen** here; fold it into its base.
2. **Structural** — per-class counts, **subtree-pruned**, plus text attributed to its owning element.

Three things it needs to avoid firing forever on correct work:

- **Prune the subtree of an excused component.** Excusing `cand__actions` must excuse the
  `btn--secondary` inside it, or the descendant leaks a count gap the register does not cover. And the
  parent link must be the nearest **classed** ancestor — an unclassed wrapper such as a `<td>` around a
  pill silently breaks the chain and defeats the pruning.
- **Attribute text to its owner.** Otherwise every legitimately reflowing component reports its own
  labels as drift.
- **Scope the register.** See `reflowNotes` in SKILL.md: `scope` is required.

Correctly built, this returns **zero** on a correct two-viewport project. On the source project it went
from 305 raw deltas to 0 findings once subtree pruning and owner attribution were in place — and the
remaining text differences were the calibration artefacts described in the figma package's
`figma-gates.md` ("Calibrate the tolerance, or the check fires forever"), not defects.

## A structural check is only as good as its model of legitimate difference

Three times on one project a check was arithmetically right and conceptually wrong, and each time the
fix was to teach it a distinction the design already made — **never to loosen the tolerance**:

| Check | What it got wrong |
|---|---|
| Reflow register | A flat global list silenced a component everywhere; it needed a per-screen scope |
| Count comparison | A flat tolerance; it needed `+1 per input`, `−2 per emphasis run` |
| Nominal parity | Counted each tall-screen hug twin as its own screen, producing 8 phantom findings |

"Nominal parity" and register scoping are defined in full by the viewport parity check above, in this
same file; this table only names the lessons learned from getting them wrong.

## HTML-only coverage

An HTML-only project gets the four shipped HTML-side scripts and nothing else, so most of its
verification is harnesses written for that project. The source project ended with ten of them, green three
runs in a row, and four defects the human found in a screenshot the same afternoon. Everything in this
part comes out of that gap.

## Behaviour review, for prototypes

Links are not behaviour. Check:

- **Dead ends.** Every frame has an outgoing reaction or is a deliberate terminal state.
- **Wrong targets.** A link pointing at a frame that looks right but is the wrong state.
- **Missing back paths.** Any screen a user can enter and not leave.
- **Unreachable states.** A state that exists in the file with no interaction that produces it. Either
  wire it or explain why it is documentation only.
- **Implied but absent interactions.** The screens show a disabled CTA gated on a checkbox, so the
  prototype should let a reviewer tick the checkbox.

Repeat until the pass returns nothing.

## The approved HTML is a reference, and references are read-only

Once a package passes its gate, its HTML is frozen. See
`packages/core/rules/reference-discipline.md` — the rule that matters here is the
one that costs a keystroke to break: when `geometry-diff` fails on the Figma side, the cheapest way to
make it pass is to edit the HTML, and doing so destroys the only thing that could have settled the
disagreement.

A failing diff is a Figma finding or a registered deviation. If the HTML is genuinely wrong, it goes back
through the gate — re-measured, re-rendered, re-approved — and the deviation register records why.

## Content parity is not a text-run count

`verify-html`, `parity-check` and `flow-check` prove structure, symmetry and navigation. None of them
proves the screen **says the right thing**, and neither does a per-frame count on the Figma side: a wrong
string counts exactly as much as the right one.

Where the package has a reference for its copy — the client's own file, a source app, a supplied copy
deck — diff the strings, not the totals: which are missing, which are extra, per screen. Then, for each
mismatch, find the nearest counterpart by position; **distance 0 with different text is right place,
wrong words**, and it is invisible to every other check here.

Diff visible text only, and say so. `copyRules` and `dataOwnership` in state are what make this
checkable rather than a habit.

## Definition of done

**HTML side, and the whole list for a project with `figmaInScope: false`:**

- [ ] `verify-html` returns zero on all seven checks
- [ ] `contrast-check` returns zero, at the level `contrastLevel` declares. AA unless the project says otherwise, and a public-sector service has no choice about that
- [ ] `coverage-check` returns zero on all five checks
- [ ] `copy-check` returns zero, or the words are not written
- [ ] `parity-check` returns zero, nominal and structural, where two or more viewports are declared
- [ ] `flow-check` returns zero on all seven checks, with a non-zero screen and link count
- [ ] **The main flow of every application clicked end to end**, by a human, from its real entry point
- [ ] Every screen rendered and looked at **after** the last change, not before it
- [ ] Every check written for this project has been **seen to fail** on the defect it was written for
- [ ] Every option board either folded into the flow or labelled as provenance
