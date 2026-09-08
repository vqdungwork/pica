# Value modelling rules

Load this for step 1.9b, and again at closeout when the figures are read back.

---

## A design that is correct and unaffordable passes every other check here

pica measured design for nine versions and never once asked what the thing cost to run.
Every check in this repository could return zero on a product that should not be built.
That is what this package is for, and it is why it sits before the design rather than after:
**this is the last point at which saying no is still cheap.**

---

## Build cost comes from the estimate, never from a second guess

Read `state.estimate` and convert. Do not re-derive it here.

Two derivations of the same figure drift, and the one nobody reads is the one that ends up in
the document. If the estimate does not exist yet, the value case is `for: "self"` and the build
figure is explicitly rough, or it waits.

---

## Three points on revenue, for the reason they are used on effort

```
PERT = (O + 4M + P) / 6
```

A single revenue number is a wish. A padded one is a lie you also have to remember.

Two consequences, and the second is the commercial one:

- A range is **defensible in a negotiation** in a way a single number is not. It moves the
  conversation from "that is optimistic" to "which of these assumptions do you disagree with"
- The spread makes the risk **visible** rather than hiding it inside one confident figure

`o == m == p` is one number wearing three hats, and `value-check` reports it. If you genuinely
cannot spread a line, that line is not a forecast, it is a contract, and it belongs in run cost.

---

## Bottom up only

Reachable accounts, times price, times conversion, times retention. Every factor carries a
`from` and a `class`.

> "One per cent of a two billion dollar market" is arithmetic with no mechanism behind it.
> Nothing in it says who buys, or why, or how many of them there are.

`value-check` requires **two or more sourced drivers** per revenue line. One driver is a guess
with a multiplication sign in it.

`class` is `observed`, `stated` or `inferred`, and the distinction is the whole point:

| Class | Means | Example |
|---|---|---|
| `observed` | somebody counted it | 220 branches, from the client's own directory |
| `stated` | somebody said it | five seats per branch, from an interview |
| `inferred` | you worked it out | conversion, from a comparable rollout |

**Revealed beats stated.** What a buyer paid, switched to, or built themselves outranks what
they say they would pay. A survey answer is `stated` and never `observed`, however large the
sample.

---

## Run cost across the whole horizon, and the maintenance rate stated

The line everybody omits, and the one that kills a product in year two when the build team has
moved on and the bill has not.

Every line carries a `basis`: `measured`, `quoted` or `assumed`. All three are acceptable.
**Not saying which is not.** A quoted figure with no source named is an assumption wearing a
better word, and `value-check` says so.

Count: hosting, per-seat and per-call third-party fees, support headcount, on-call, compliance
audits, and the **maintenance tax**. Fifteen to twenty-five per cent of build cost per year is a
defensible planning figure. **State the one you used**, because a plan that folds maintenance
into the build figure spends it without deciding to.

**The horizon is 24 months minimum.** Twelve flatters every product, since most of the run cost
and all of the churn land after it.

---

## The fence, not the tier list

A tier list with no fence is a discount schedule: every buyer picks the cheapest tier and the
ones above it are decoration.

For each tier above the cheapest, say **what it has that a buyer on the cheapest cannot do
without.** That sentence is the fence. If you cannot write it, the tier does not exist yet.

The cheapest tier needs no fence. There is nothing below it to trade down to.

---

## The do-nothing baseline, and the alternative use of the same money

Every project beats zero when zero is never costed.

State what happens if nobody builds it. Sometimes the answer is genuinely "very little", and
that is a finding rather than a failure. Then compare against **the next best use of the same
money**, not against nothing: few projects beat the alternative, and all of them beat zero.

---

## Sensitivity, and it has to name assumptions that exist

Three entries minimum, because the answer always rests on more than one assumption and naming
only the comfortable one is worse than naming none.

Every entry resolves against a driver name or a run-cost item that appears elsewhere in the
case. An entry pointing at something nothing else mentions is theatre, and `value-check`
rejects it: moving a number nothing depends on moves nothing.

---

## Attribution per line, the same rule as effort

Each figure names who produced it. An unowned revenue assumption is nobody's to defend and
nobody's to correct when it turns out wrong.

---

## `for` says who the number binds

**`"client"`.** The full gate. The figure leaves the building and becomes something the client
plans against, so the trigger must exist, the verdict must be recorded, and someone who can
fund it has to be named.

**`"self"`.** You are sizing your own idea to decide whether to start. Nothing leaves the
building. Three points still, because the spread is the part worth having, and the pricing
fence still, because getting that wrong is how you build something correct that has no business.

**`"skipped"`, with a reason.** Valid. The reason is the only thing checked, because a skip
nobody explained looks exactly like a case nobody remembered.

---

## Definition of done

- [ ] `value.for` is declared, and a skip carries its reason
- [ ] Build cost read from `state.estimate` rather than re-derived
- [ ] Run cost covers the whole horizon, every line with a basis, maintenance rate stated
- [ ] Every revenue line has three ordered points that are not the same number
- [ ] Every revenue line rests on two or more drivers, each with a `from` and a `class`
- [ ] Every tier above the cheapest declares its fence
- [ ] Three or more sensitivity entries, each naming something the case actually contains
- [ ] The do-nothing baseline is stated
- [ ] `value-check.mjs` returns zero
- [ ] **The pessimistic column was presented, not the likely one**
