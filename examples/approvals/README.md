# approvals: a complete pica project

A payment-approval surface for a retail bank, in the `finance` sector. It is small on
purpose and complete on purpose: **every check pica ships either passes on it or says
why it abstains.**

```
node <pica>/scripts/example-verify.mjs        # from the pica repository: the whole chain, as CI runs it
node <pica>/core/scripts/pica-verify.mjs .pica/state.json --evidence   # here, once the artefacts exist
```

`example-verify` does what a project does before it verifies: generates the specification with
pica's own `model-diagram` and `assemble-spec`, captures the boards, serves the demo and captures it
as the build, and hands the result to `pica-verify`, whose exit code it returns.

It exists for two reasons, and the second is the one that keeps it honest.

## 1. Something to read

Before this, learning pica meant reading every check with no example of a project that
satisfies them. Every field here is filled the way a check actually reads it, which is
not always the way the documentation reads:

- `skipped` on a proposal slot **is** the reason, not a boolean beside one
- `testData.provenance` is one of `generated`, `anonymised`, `synthetic`, not a sentence
- a defect's `test` has to appear **verbatim** in a test file
- `rollbackExecuted` is an object that says what happened, not `true`
- `perfBudget` links to an NFR by `nfr`, not by `id`
- S6 and S7 apply to every project and **cannot** be skipped

Each of those cost a round trip to discover. They are worth more written down.

## 2. It is the mutation suite's fixture

`scripts/mutate.mjs --fixture` copies this directory, produces a capture over its html
with the real producer, synthesises a faithful Figma port from that capture, and reintroduces
every defect the suite knows into it one at a time.

So this is not documentation that drifts from the code. **If a field here is wrong, the
suite stops catching something**, and the suite runs on every change. The alternative was
a second hand-written project alongside this one, and the copy is always the one nothing
reads.

## It demonstrates the two rules that are hardest to demonstrate

**Rule 8, one interactive prototype per application.** `html/app-approvals.html` is a real
clickable flow: a queue, a payment, an audit trail, wired with `data-go`, `data-tab` and
`data-popback`. `?scr=payment` or a bare `#payment` lands on a screen (the second is the only deep
link a published Claude Artifact delivers), `?state=held|empty` reproduces each board, and anything
it does not read is refused with a page that says so rather than answered with the home screen. `html/proto.js` is the router, and pica **declares that attribute vocabulary
and ships no implementation of it**, so every project before this one invented one. This is
that implementation, written once so the next project copies it. Its presence is what makes
a file interactive rather than a board, and it is what `flow-check` reads.

Two behaviours in it were navigation defects before they were rules: `data-tab` resets the
stack and `data-go` does not, and an entry point lights the tab that **owns** the screen
rather than the one last active.

**The review shell.** `html/review.html` satisfies all six of `shell-check`: it says what it
is not, the flow leads and is the default tab, all three zoom controls exist with fit-screen
uncapped, no tab navigates away, the groups are in order, and the frame inset is on the
spacing scale.

**The UI kit.** `html/design-system.html` is the storybook pica's step 3 asks for: every token and
every component with all its variants, including the states that matter (a 64-character payee that
wraps rather than truncating, a fee of zero that renders as `0.00`, an empty state that does not read
as loading). `foundations-check` reads it.

**The runners.** `.pica/runners.json` tells pica-verify what only the project knows: how to serve
the demo (`scripts/serve.mjs`, builtins only), how to build it (`scripts/build.mjs`, into `dist/`,
which `artifact-readiness-check` then reads as a publishable page), the routes to walk, and, as
`null`, what it genuinely does not have: no dialog, no harness chrome.

**And one accepted dispute.** `state.checkDisputes` carries a real argument against
`users-sample-size`: the compliance-director segment is three people in the whole bank, so
five is not a sample it failed to reach but more people than exist. Accepted, exempted, and
the exemption names where it lives. That register is how a framework gets argued with rather
than merely complied with.

## What it does not carry

- **No committed visual baselines**, so `visual-baseline-check` abstains. A screenshot taken on one
  operating system does not match one taken on another, so a baseline committed here would fail on
  every other machine, and one written by the run it is compared in proves nothing.
- **No axe-core on a machine that has not installed it**, so `axe-check` abstains there. CI installs
  it, and it runs.
- **No Figma port.** The example is HTML-only, which is a complete pica project and not a truncated
  one, so `geometry-diff` and `frame-inventory-check` abstain. The mutation suite proves both against
  a faithful port it synthesises from the capture.

Everything else runs. An abstention is not a pass, which is why these are listed rather than left
for you to find.

## The numbers

Whatever `example-verify` prints is the number; the ones last written here were several releases out
of date. On 3.19.0 in CI: 55 checks, 52 passing, 0 failing, 3 abstaining (the visual baselines and
the Figma pair). On a machine without axe-core, 51 and 4.
