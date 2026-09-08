---
description: Run every applicable check once, in phase order, and print one table with what passed, what failed, and what abstained
argument-hint: "[--phase <name>] [--adopt] [--evidence]"
---

# pica-verify: every check, once, in one table

Until this existed, verifying a project meant twenty-eight separate invocations and
assembling the picture yourself. `pica-status` says what **can** run; this runs it.

**A check that is tedious to run is a check that gets skipped, and a skipped check is not
a pass.** That is the whole reason this command exists.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pica-verify.mjs .pica/state.json
```

---

## Three verdicts, and the last two are not the same thing

| | |
|---|---|
| `pass` | the check ran and found nothing |
| `FAIL` | the check ran and found something |
| `abstain` | the project does not carry what the check reads, so it did not run |

**An abstention is never counted as a pass.** It is counted, named, and told what would
make it run. Confusing the last two is how a project that has not reached a phase comes
to look like a project that is broken.

---

## It carries no list of its own

Every check, its arguments, its phase and what it needs are declared in the owning
package's `package.json`, under `checks`:

```json
{ "run": "value-check.mjs", "args": "<state> --gate", "phase": "value",
  "needs": ["value"], "passes": "0 findings" }
```

`needs` is a state key, or an `@path` on disk, and `a|b` means either will do.

A second list of what to run would be exactly the drift this project keeps finding in
itself, and the copy is always the one nothing reads.

---

## The flags

**`--phase <name>`** scopes to one phase: `intake`, `discover`, `research`, `value`,
`analyse`, `design`, `scope`, `estimate`, `architect`, `build`, `close`. This is what
`picaflow` calls at the end of each phase.

**`--adopt`** prints what a project would have to record to stop abstaining, in the order
the chain asks for it. This is the path for a project that predates a check: **it has not
broken the check, and the difference is the only reason there are three verdicts.**

**`--evidence`** lists every assertion that passed, not only the count. A green run
otherwise prints `0 findings`, which is the least informative true thing available. This
is the output a client review quotes.

**`--json`** for a pipeline.

---

## What it will not do

It does not produce the capture. `capture-html-reference` writes
`.audit/html-reference.json` and needs playwright and a browser, so it stays a separate
step and the eight checks that read a capture **abstain and say so** until it has run.

It also cannot tell you the checks are the right checks. It runs them and shows you what
they said, which is a different and smaller claim than it looks.

---

## Definition of done

- [ ] Exits non-zero when any applicable check fails
- [ ] Every abstention names what it needs
- [ ] `--evidence` output is the record attached to the review
