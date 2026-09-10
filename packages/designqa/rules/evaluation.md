# Evaluation rules

Load this for steps 3.8, 3.9, 7.10, and for feedback triage at 4.4 and 8.1.

Medium-independent review discipline is in core's `review-discipline.md`, which this assumes. This
file covers only what is specific to evaluating a built interface.

---

## Three evaluators is not a preference, it is the coverage threshold

**Heuristic evaluation performed by three to five evaluators recognises up to 80% of usability
problems.** One evaluator does not, and a single-evaluator pass reporting "no findings" says nothing
about the product.

So 3.8 is a **fan-out**, and the count is part of the method:

- Three to five evaluators, spawned in one message so they run concurrently
- **Each works alone.** An evaluator who has seen another's findings anchors to them and stops looking
- Findings merged afterwards, duplicates collapsed to one finding naming many locations

This is the clearest case of the general rule: evaluation is measurement, and measurement parallelises.

### Give each evaluator a different lens

Five evaluators on "usability" produce five copies of the most obvious answer. Split by lens, so the
branches ask different questions:

| Evaluator | Lens |
|---|---|
| 1 | Visibility of state, feedback, and system status |
| 2 | Match to the real world, and to the glossary the business agreed |
| 3 | Error prevention, error recovery, and undo |
| 4 | Consistency, standards, and the platform's own conventions |
| 5 | Efficiency, shortcuts, and recognition over recall |

Accessibility and contrast run as their own pass, because they are computed rather than judged.

---

## Heuristic evaluation and cognitive walkthrough answer different questions

They are not redundant and neither replaces the other.

| | Heuristic evaluation | Cognitive walkthrough |
|---|---|---|
| Asks | Does this violate a known principle | **Can a first-time user learn this** |
| Finds | More unique problems, lower average severity | Fewer problems, better at diagnosing interaction |
| Needs | The screens | The screens **and a use case** |
| Runs at | 3.8 | 3.9, one per use case |

A walkthrough that cannot complete its task is the most serious finding this package produces. It means
the product does not do the thing it was built to do, and no amount of visual polish addresses it.

---

## Contrast is computed, never sampled

Sampling a screenshot measures the compression artefact, not the colour. Compute from the token values.

**WCAG ratio is the wrong instrument near black and near white.** The formula compresses at the ends of
the range: a change that took one surface from invisible to clearly separated moved the WCAG figure from
1.03 to 1.13, which reads as no change at all. Use **ΔL\*** for surface against surface, and reserve the
WCAG ratio for text against its background, which is what it was designed for.

**A surface role must stay distinguishable from its neighbours.** Reproducing a palette perfectly and
collapsing two roles into one colour are the same failure, and only the second one is visible.

---

## Report before fix, and make it structural

The rule is old: *reviews report before they fix; an audit that writes is not an audit.*

Stated as an instruction it is a rule the model can reason past on a busy afternoon. **Stated as a tool
list with no `Write` and no `Edit`, it is a capability the evaluator does not have.** Use the agent
definition in `agents/pica-evaluator.md`, which is defined that way for exactly this reason.

Fixing is a second pass, entered only after a human has said which findings to act on.

---

## Build versus design, the step nobody owns

At 7.10 the built product is compared against the approved design. In the industry this is the most
reliably abandoned check: the designer assumes QA covers it, QA assumes the designer does, and the code
quietly reinterprets the design in between.

Everything needed already exists. The reference is the approved HTML. The measurement is the same
geometry comparison used for the Figma port, pointed at the live DOM instead. The gate is a human.

**What it cannot do: detect absence.** A component never built has no coordinates, so it cannot be out
of tolerance. Inventory counts cover that, and rendering every screen and looking at it covers what no
script does.

---

## Verify a new check by reintroducing the defect

A check that has never failed is not a check, it is a hope. Before trusting any new lens or script,
reintroduce the defect it was written for and confirm it fires.

This catches the failure mode that costs the most: a selector that matches nothing, reporting zero
forever, in a colour that looks like success.

---

## Feedback triage is evaluation, not negotiation

At 4.4 and 8.1 every client claim is verified before it is accepted. Both outcomes are findings:

- **True**: reproduce it, measure it, record the evidence
- **False**: say so, with the measurement that shows it. Accepting a false claim to be agreeable
  spends the budget on a defect that does not exist

**Whether a true finding is in scope or chargeable is not this role's call.** That is a commercial
decision and it belongs to the Account, against `exclusions` and the frozen scope. Evaluation stops at
"this is true and here is the evidence".

---

## Definition of done

- [ ] 3 to 5 independent heuristic evaluations, each with its own lens, merged
- [ ] No evaluator saw another's findings before reporting
- [ ] One cognitive walkthrough per use case, each ending in completed or blocked
**The register, when a run is deliberately below the level:**

```json
"contrastLevel": "AA",
"contrastExemptions": [
  { "text": "Optional", "owner": "hint",
    "why": "disabled-state hint, never the only route to the action, client accepted on 6 Sep",
    "by": "client lead" }
]
```

`text` and `owner` are the matching pair: the run's exact string and the class of the element that owns
it, both of which the capture records. An exemption that matches nothing is reported, because a silenced
check waiting on text that changed is a check hiding a real defect.

- [ ] `contrast-check.mjs` returns zero: every text run reaches the declared WCAG level, computed from
      the resolved foreground and background rather than from an impression. ΔL* still applies to surface
      against surface, which a text ratio does not cover
- [ ] Every finding carries severity, location, lens, and measured evidence
- [ ] Duplicates collapsed: one defect, one finding, many locations
- [ ] Anything that could not be checked is reported as such, not omitted
- [ ] Zero findings reported together with what was run and what it covered
- [ ] No fix applied in the same pass as the report
