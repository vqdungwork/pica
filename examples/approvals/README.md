# approvals: a complete pica project

A payment-approval surface for a retail bank, in the `finance` sector. It is small on
purpose and complete on purpose: **every check pica ships either passes on it or says
why it abstains.**

```
node <pica>/packages/core/scripts/pica-verify.mjs .pica/state.json --evidence
```

It exists for two reasons, and the second is the one that keeps it honest.

## 1. Something to read

Before this, learning pica meant reading 153 checks with no example of a project that
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
with the real producer, and reintroduces 87 defects into it one at a time.

So this is not documentation that drifts from the code. **If a field here is wrong, the
suite stops catching something**, and the suite runs on every change. The alternative was
a second hand-written project alongside this one, and the copy is always the one nothing
reads.

## It demonstrates the two rules that are hardest to demonstrate

**Rule 8, one interactive prototype per application.** `html/app-approvals.html` is a real
clickable flow: a queue, a payment, an audit trail, wired with `data-go`, `data-tab` and
`data-popback`. `html/proto.js` is the router, and pica **declares that attribute vocabulary
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
as loading). **No check reads it**, and the page says so at the bottom.

**And one accepted dispute.** `state.checkDisputes` carries a real argument against
`users-sample-size`: the compliance-director segment is three people in the whole bank, so
five is not a sample it failed to reach but more people than exist. Accepted, exempted, and
the exemption names where it lives. That register is how a framework gets argued with rather
than merely complied with.

## What it does not carry

- **No `build-reference.json`**, so `build-diff` abstains. That capture comes from a
  running build at 7.10, and there is no running build here.
- **No `figma-dump.json`**, so `geometry-diff` abstains. The Figma half is optional and
  this example is HTML-only, which is a complete pica project and not a truncated one.

Two abstentions, both named. An abstention is not a pass, which is why they are listed
rather than left for you to find.

## The numbers

| | |
|---|---|
| Checks passing | 26 of 28 |
| Assertions verified | 160 |
| Abstentions, both named | 2 |
| Mutations it carries material for | 89 of 89 |
