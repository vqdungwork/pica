# The React demo

The interactive half of a work package. Load this for D8.

## Why this exists

Until 2.0.0 everything was static HTML, including the thing the client was handed. The rule was "no
bundler, no framework, no npm install to view a screen", and it was right about boards and wrong about
the flow: a non-technical client opens a static mockup, clicks, nothing happens, and concludes the
product is broken. The demo was inert and the client could not tell that was on purpose.

**Boards stay static. The flow becomes React.** The rule now reads *no build step to view a **board***.

| | Static board | React demo |
|---|---|---|
| What it is | option boards, decision records | the flow the client uses |
| Ported to Figma | no: a board stops being a deliverable the moment the decision is made | yes |
| Captured | `--dir` | **`--url`, per route** |
| Opened how | double-click | **a hosted URL** |

## What the port compares against, and why this did not break it

The port never read HTML. `pica-port.md` requires `.audit/html-reference.json` and
`.audit/html-reference-forced.json`, and `geometry-diff` takes a reference and a Figma dump. It
compares captured geometry, so it does not know or care what rendered.

`capture-html-reference.mjs` has had `--url` since it was written, for a step that no longer exists:
*"`--url` captures a running build rather than prototype files, which is what step 7.10 compares
against the approved design."* Step 7.10 went with the build half. The capability it left behind is
exactly what a React demo needs.

## Every state must be addressable

**This is the rule the whole approach depends on.** The capture reaches a screen by URL, so a state
that cannot be reached by URL cannot be captured, cannot be ported, and cannot be compared.

```
/portfolio?vp=desktop&state=default
/portfolio?vp=mobile&state=empty
/portfolio?vp=desktop&state=error
```

Three consequences, and all three are gains:

- `state-coverage-check` multiplies `screens × viewports × states` from `state.stateModel` and
  compares it against what was captured. A state nobody built fails rather than passing quietly.
- **"not addressable" and "not built" become one finding**, which is correct: a state the client
  cannot be sent a link to is a state they have not reviewed.
- Review gets easier. You send a link to the empty state instead of telling somebody which four
  things to click.

The route list is not written by hand. It is the product of `state.screens`, `state.stateModel` and
`state.viewports`, all of which exist before D8.

## Keep the navigation vocabulary in the markup

`flow-check` reads `data-scr`, `data-go`, `data-tab`, `data-sheet`, `data-href` and `data-popback`,
and the reason it can is that they are in the markup. Its own rule: *"a link built in JavaScript is
invisible to it. Keep targets in markup."*

**In JSX they still are.** Emit the same attributes and they land in the rendered DOM, where
`flow-check --url` reads them. What changes is where the check looks, not what it looks for: and
what it catches is the class of defect the rules call out as having **no geometric signature**: a row
on one role's home screen that opens another role's screen. Every screenshot correct, every measured
check green, the wiring wrong.

Losing that check is the one thing a React demo could genuinely cost, and keeping the attributes is
the whole price of keeping it.

## Mock data is one source

`research.md` already requires mock-data provenance, and a shared data layer is where React earns its
place: a figure on the overview and the same figure on the detail screen come from one object, so they
cannot disagree. Two static files can, and nothing checks them against each other.

Length-realistic still applies, and now applies harder. If the audience profile carries a text
expansion above 1, the mock data is written at that length: a layout sized to English breaks at 1.3
and Czech and German both exceed it.

## Two failures the demo introduces, and both are checked

Both are the same shape as a webfont silently falling back: no error, a page that looks right, and
numbers that are entirely wrong.

**Capturing before the page settles.** A route measured mid-render produces geometry for a layout that
existed for 200ms. `capture-settled` asserts no pending requests and no layout shift within the
settle window before measuring, and fails rather than measuring anyway.

**A font that did not load.** The design is font-free by decision, so the family is a webfont and a
webfont can fail. `font-check` records which family actually painted each text run and fails when it
is a fallback rather than the declared face. It runs as a **handoff gate**, not a design gate: during
iteration a fallback is noise, at handoff it is the difference between a measured reference and a
meaningless one.

## The shell links the demo. It does not contain it.

<!-- enforced-by: flow-first -->

`state.flows` assumes a flow is a file in `html/`, which was true while everything was static.
It is not true of a demo the client reaches at a URL, and forcing one into that shape is what
put the demo in an iframe inside `review.html`.

That arrangement fails in a specific way, and it failed on a real project: the shell sizes the
iframe at load and the demo keeps growing inside it, so the page gets a second vertical
scrollbar inside the first, and the shell's own "fit screen" control solves against the frozen
height — on a 12,500px document it resolved to **6%**. Neither symptom is visible to a check
that reads the shell, because both live in the relationship between two documents.

So declare the demo separately:

```json
"demo": { "url": "https://…/pos", "routes": ["/pos?vp=desktop&state=default", "…"] }
```

A boards-only `review.html` is then a complete deliverable, **provided it links to that URL**.
`shell-check` requires the link rather than the declaration, because a declaration nothing
points at leaves the reviewer holding the boards with no way to reach the half they were meant
to use — and the boards are the half that stops being a deliverable once the decision is made.

`routes` is not decoration. It is what `state-coverage-check` multiplies against and what lets
a reviewer be sent to one state instead of told which four things to click, so a demo declared
with an empty `routes` is reported rather than accepted.

## What the client receives

**A hosted URL, never a repository.** The toolchain is verified at intake and lives on your machine;
the client gets a prebuilt, served page. Handing over something that needs `npm install` reproduces
the problem this whole change exists to fix, one level up.

## Definition of done

- [ ] Every screen, viewport and state is reachable by its own URL
- [ ] `data-*` navigation attributes are present in the rendered DOM, not only in the router
- [ ] `flow-check --url` returns zero against the running demo
- [ ] `capture-settled` passes on every route before any measurement is trusted
- [ ] `state-coverage-check` returns zero, or every gap is excused by name with a reason
- [ ] Mock data comes from one source and is written at the audience's text expansion
- [ ] The client has a URL, and the boards beside it are still static

## A declared viewport has two numbers; the harness must use both

<!-- enforced-by: none — judgement, not decidable by a script -->

`state.viewports` declares `{ w, h }`. A demo harness that sets only the width does not render a
viewport — it renders a column, and the page grows to whatever the content needs.

Measured on one engagement: a mobile frame declared 390×844 rendered at 390×**1598**. Nearly double
the height, so **the fold did not exist**. Every claim the project had made about what a person sees
before scrolling — how many rows are above the fold, whether the sticky commit bar stays reachable
while the list scrolls under it, whether a disclosure banner costs too much of the screen — had been
computed by slicing 844px out of a 1598px frame. That is arithmetic about a screenshot, not
observation of a screen, and the difference is the whole reason the demo exists.

So: frame the declared viewport at **both** dimensions, with the frame's own overflow scrolling
inside it rather than the page scrolling around it. Then a sticky element is actually sticky, an
empty state actually looks empty, a long list actually scrolls, and the fold is a place rather than
a number someone worked out.

A phone-shaped frame also makes the review honest in a way a tall column cannot: a client opening
the demo sees what a person holding a phone sees, instead of a layout they have to imagine cropped.


## An unrecognised URL parameter must fail loudly, or the reviewer reviews the wrong screen

<!-- enforced-by: url-param-guard -->

A demo addressed by URL is also **reviewed** by URL, and a silently-ignored parameter hands the
reviewer a confident screenshot of the wrong thing. `?viewport=mobile` where the app reads `vp`
returned the desktop frame, at a narrow window, with no warning — and it was captured, looked at,
and reasoned about as if it were the phone. In one engagement that happened three times, twice
while the reviewer was specifically checking a claim that mobile had never been reviewed. The
screenshot is not evidence of the state you asked for; it is evidence of the state the app chose.

Unknown parameters are a hard error: render a full-bleed panel naming the parameter and listing
the ones that exist, and log it. An unknown **value** for a known parameter is the same defect —
`state=sucess` must not fall through to the default. The cost of a loud failure is one re-run; the
cost of a quiet one is a review of a screen nobody asked to see, presented as fact.
