# HTML gates

The gates the html package owns. Medium-independent review discipline is in core's
`review-discipline.md`, which these assume.

## The measured HTML gate

`scripts/verify-html.mjs <html-reference.json> <state.json>`. **Pass: 0 findings on all four checks.**

Runs in `/pica-wp` before the human is asked to approve anything, and again at the start of a port. For a
project with `figmaInScope: false` it is the **only** verification the work ever receives — which is why
it cannot live in the Figma half of the flow, where it sat through 0.3.0.

| Check | Detects | Pass |
|---|---|---|
| `viewport-tagged` | a frame with no `data-viewport`, or one naming an undeclared viewport | 0 |
| `overflow` | content past the frame's right edge — the frame clips it, so no screenshot shows it | 0 |
| `tall-screen-pair` | content exceeding its viewport by >24px with no `· hug` twin, so the remainder is unreviewable | 0 |
| `viewport-coverage` | a declared viewport that produced no frames at all | 0 |

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

## Definition of done

**HTML side, and the whole list for a project with `figmaInScope: false`:**

- [ ] `verify-html` returns zero on all four checks
- [ ] `parity-check` returns zero, nominal and structural, where two or more viewports are declared
- [ ] `flow-check` returns zero on all seven checks, with a non-zero screen and link count
- [ ] **The main flow of every application clicked end to end**, by a human, from its real entry point
- [ ] Every screen rendered and looked at **after** the last change, not before it
- [ ] Every check written for this project has been **seen to fail** on the defect it was written for
- [ ] Every option board either folded into the flow or labelled as provenance
