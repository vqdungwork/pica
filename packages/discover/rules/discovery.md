# Discovery rules

Load this for step 0.9, before `/pica-analyse`.

---

## pica measured nine foundations for nine versions and never asked a person anything

`pica-researcher` measures the design surface of shipped competitors. That is real research and
it is not user research. The personas were sector archetypes from a curated table, and
`/pica-analyse` said so outright:

> Analytics and support logs are the substitute for user interviews, and without them the AS-IS
> rests on assertion.

That was honest, and it was still a hole. This package is the hole closed.

---

## Three lists, not one

| List | Has | Field that matters most |
|---|---|---|
| **Users** | pain | `nOf`, the frequency |
| **Buyers** | a budget and a different pain | `isBuyer` |
| **Stakeholders** | a veto | `fears` |

Stakeholders live in **`state.stakeholders`**, the register written at 2.1 and read by
`industry-check`. Discovery enriches it rather than shadowing it: a second copy under
`discovery` would drift, and the copy is always the one nothing else reads.

Merging them is how a well-researched product gets blocked in week nine by somebody nobody
interviewed. In B2B the buyer and the user are different people; research one and you build a
product that either nobody chooses or nobody uses, and which of the two failed is invisible
until launch.

---

## Evidence has a class, and the class is checked

| Class | Means | Highest confidence it may carry |
|---|---|---|
| `observed` | somebody counted it, or the analytics show it | high |
| `stated` | somebody said it in an interview | high |
| `inferred` | you worked it out | **medium** |

**An inferred pain point presented as observed is the defect that survives every review**,
because it reads identically to a real finding. `discover-check` checks `class` and `confidence`
together, so a guess cannot be laundered into a finding by relabelling one of them.

**Revealed beats stated.** What somebody paid, switched to, or built themselves in a
spreadsheet outranks what they say they would do. A survey answer is `stated` and never
`observed`, however large the sample.

**Observed beats both.** If an existing product is reachable, analytics and support logs outrank
every interview, because they show what people do rather than what they report doing.

---

## Frequency, not adjectives

"Most users" is not a finding. `nOf: [6, 7]` is.

The difference is between a pain point and the one interview that stuck in your memory, and
without the denominator nobody can tell which they are reading.

**Five interviews per segment** is roughly where new themes stop appearing in B2B. Below that
you are quoting anecdotes with a percentage sign attached. A shortfall is allowed and has to be
recorded in `shortfallWhy`, because an unrecorded shortfall reads exactly like a full sample.

---

## Talk to somebody who said no

Churned users. Lost deals. The team that evaluated the product and kept its spreadsheet.

Interviewing only the people who stayed builds a product for the customers you already have.
The ones who left know the thing your happy users cannot tell you, and they are the only source
for the switching cost.

If nobody was reachable, say why in `saidNoWhyNone`. An unreachable sample and an unattempted
one look identical otherwise.

---

## The context of use is the input nobody asks for

At a desk, outdoors, one-handed, wearing gloves, in a noisy room, on a shared device.

This is the field that most often invalidates a design after it has been built. The same
clinical product is a different product in a lit consulting room and in a moving ambulance, and
nothing in a screenshot distinguishes them.

And the frequency: a tool somebody lives in for six hours a day and one they open twice a year
are opposite designs.

---

## The market is derived, never asserted

Reachable accounts, times seats, times price. Each factor with a source.

`discover-check` multiplies the sourced factors and requires the stated size to be **within an
order of magnitude** of the product. That test is deliberately loose: it catches a size nobody
derived, not a forecast somebody disagrees with.

Two more, and both decide whether a better product actually wins:

- **Switching cost.** A market analysis without it assumes nobody is already using something.
- **Why buyers change.** The trigger event in the buyer's world. Nobody replaces working
  software on a Tuesday for no reason, and on this project the answer was an inspection finding.

---

## Competitors: what they charge, not what they look like

`pica-researcher` measures a competitor's radius and control height. **What it charges and how
it packages decides whether anyone switches**, and nothing in nine versions measured that.

Pricing is public for nearly every product. Packaging, meaning what sits in which tier, is how
the field fences its own price and it is the most useful single fact about a competitor.

---

## Rank by frequency and severity, never by what the product already does

Ordering pain points by which ones the planned product happens to address is how research
becomes a justification. It is the same failure as a researcher who names the design direction:
the measurement was replaced by the conclusion it was supposed to test.

---

## Definition of done

- [ ] Every segment has a job to be done, a context of use and a frequency
- [ ] Five interviews per segment, or `shortfallWhy` recorded
- [ ] Every pain point carries `nOf`, a `class`, a `confidence` and a `source`
- [ ] No pain point is both `inferred` and high confidence
- [ ] Somebody who said no was interviewed, or `saidNoWhyNone` says why not
- [ ] Every stakeholder has `wants`, `fears`, `decides`, `vetoes`, and veto holders have `wouldBlockIf`
- [ ] At least one segment marked `isBuyer` and one `isUser`
- [ ] Every competitor carries pricing and packaging
- [ ] The market size is derived from two or more sourced factors, with switching cost stated
- [ ] `discover-check.mjs` returns zero
