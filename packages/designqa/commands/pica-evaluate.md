---
description: Evaluate the built screens with independent evaluators, a cognitive walkthrough per use case, and computed contrast
argument-hint: "[work package] [--build <url> for 7.10]"
---

# pica-evaluate: report, never fix

Steps 3.8 and 3.9. With `--build`, step 7.10 instead.

Load `${CLAUDE_PLUGIN_ROOT}/rules/evaluation.md` and core's `review-discipline.md` before anything else.

**This command does not fix anything.** It writes one report file and changes nothing else. Fixing is a
separate invocation after a human has chosen which findings to act on.

---

## Preconditions

- The package's HTML exists and `verify-html` returns zero. Evaluating a build that fails measurement
  wastes the evaluators on defects a script already found
- Use cases exist in `state.json`. Without them 3.9 has nothing to walk through

---

## 3.8 Heuristic evaluation, fanned out

Spawn **three to five `pica-evaluator` agents in a single message** so they run concurrently. Give each
one a **different lens** and the same screen set:

| # | Lens |
|---|---|
| 1 | Visibility of state, feedback, system status |
| 2 | Match to the real world, and to the project glossary |
| 3 | Error prevention, recovery, undo |
| 4 | Consistency, standards, platform conventions |
| 5 | Efficiency, shortcuts, recognition over recall |

Three is the floor. Five is the ceiling worth paying for.

**Each evaluator works alone.** Do not pass one agent another's findings: an evaluator who has seen a
list anchors to it and stops looking, which is how a fan-out becomes an expensive echo.

Each returns:

    { severity, location, evidence, lens }

**Reject any finding with no measured evidence** rather than merging it. Then collapse duplicates: one
defect that appears on nine screens is one finding naming nine locations.

## Contrast and accessibility

Run as its own pass, computed from the token values rather than sampled from a screenshot.

- Text against background: WCAG ratio
- **Surface against surface: ΔL\***, because the WCAG formula compresses near black and near white and
  will report a real change as no change
- Touch targets, focus visibility, tab order against reading order

## 3.9 Cognitive walkthrough

One per use case, simulating a first-time user. For each step ask: will they know what to do, will they
see the control, and will they understand the feedback.

Each walkthrough ends in **completed** or **blocked**. A blocked walkthrough is the most serious finding
this command produces: the product does not do the thing it was built for, and visual quality is not
the issue.

## 7.10 Build versus design, with `--build <url>`

```bash
S=${CLAUDE_PLUGIN_ROOT}/../html/scripts
node $S/capture-html-reference.mjs --url <live-url> --out .built
node ${CLAUDE_PLUGIN_ROOT}/scripts/build-diff.mjs .audit/html-reference.json .built/html-reference.json
```

Pairing is by **`data-uc` plus viewport, never by caption**: a build's captions come from its own
markup and will not match the prototype's, so pairing by name reports every frame as missing. Both
sides must carry the tag, and if either does not the diff **fails** rather than reporting zero.

The approved design is the reference and it is read-only.

Report divergences. **Do not adjust the design to match the build.**

---

## Output

Write `docs/reviews/<date>-<wp>-evaluation.md`:

- What was run, and what it covered
- Findings, most severe first, each with severity, location, lens, and measured evidence
- **What could not be checked**, and why
- Walkthrough results, one line per use case

Zero findings is a valid and reportable result. Say what you ran, or zero means nothing.

---

## Then stop

Present the report and **stop**. Do not offer to fix in the same breath. The right fix is frequently a
design decision rather than a repair, and that decision is not yours.
