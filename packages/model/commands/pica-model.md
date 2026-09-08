---
description: Price the product before it is built: cost to build, cost to run, plausible return, the pricing fence, and the sensitivity the answer rests on
argument-hint: "[empty for a client case, or --self to size your own idea]"
---

# pica-model: what it costs, and what it returns

Step 1.9b. Runs after `/pica-analyse` and `/pica-architect --feasibility`, and **before any
design**, because this is the last point at which saying no is still cheap.

Load `${CLAUDE_PLUGIN_ROOT}/rules/value-modelling.md` before anything else. If it is missing,
stop and say so rather than proceeding without it.

**Do not stop to ask questions.** Anything the sources cannot settle becomes an `assumption`
with a confidence and a blast radius, and the chain continues. The client corrects it at the
business-case confirmation, which is cheaper than a round trip now.

---

## Inputs

| Source | For |
|---|---|
| `state.estimate` | Build cost. **Read it, never re-derive it**: two derivations drift and the one nobody reads ends up in the document |
| `state.trigger` | Why now, and the window the break-even month is measured against |
| `state.problem` | The metric, so a saving can be tied to the number that moves |
| `docs/research/market.md`, if it exists | Reachable accounts, switching cost, why buyers change |
| `docs/research/competitors.md`, if it exists | What the field charges, and how it packages |

**If no market research was supplied, say so explicitly and record it as a limitation.** Every
revenue driver still needs a `from`, and "the client told us" is a real source with a real
class. What is not acceptable is a figure with no provenance at all.

---

## 1.9b.1 Cost to build

Convert `state.estimate` at real rates. Three points in, three points out.

## 1.9b.2 Cost to run, for the whole horizon

Twenty-four months minimum. Hosting, per-seat and per-call fees, support, on-call, compliance
audits, and the maintenance rate **stated as a number** rather than folded into the build.

Every line takes a `basis` of `measured`, `quoted` or `assumed`, and anything not assumed names
its source.

## 1.9b.3 Revenue, bottom up

Units times price times conversion times retention. Two or more drivers per line, each with a
`from` and a `class` of `observed`, `stated` or `inferred`.

Three points per line. A line you cannot spread is not a forecast.

## 1.9b.4 Pricing, and the fence

The model, the tiers, and for every tier above the cheapest, **what it has that a buyer on the
cheapest cannot do without.** That sentence is the fence, and without it the tier list is a
discount schedule.

**Offer the tiers as a proposal, do not set them.** Pricing is the client's decision, and an
agent that picks it has replaced a commercial judgement with a preference. Write the options
into `proposals.md` with what each one buys and what it costs to serve.

## 1.9b.5 Break-even, sensitivity, and the do-nothing baseline

The break-even month. Then the three assumptions with the widest range, each shown at
pessimistic, likely and optimistic, each naming something the case actually contains.

Then what happens if nobody builds it. Sometimes the answer is "very little", and that is a
finding rather than a failure.

## 1.9b.6 The verdict

`build`, `do-not-build` or `revisit`, and **who decided**. A verdict with no name against it
binds nobody.

---

## Write to state

```json
"value": {
  "for": "client", "currency": "", "horizonMonths": 24,
  "buildCost": { "o": 0, "m": 0, "p": 0, "from": "estimate", "by": "" },
  "runCost": [ { "item": "", "annual": 0, "basis": "quoted", "source": "", "by": "" } ],
  "maintenancePct": 20,
  "revenue": [ { "line": "", "model": "per-seat", "o": 0, "m": 0, "p": 0, "by": "",
    "drivers": [ { "name": "", "value": 0, "from": "", "class": "observed" } ] } ],
  "pricing": { "model": "tiered", "tiers": [ { "name": "", "price": 0, "includes": [], "fence": "" } ] },
  "breakEvenMonth": 0,
  "sensitivity": [ { "assumption": "", "low": 0, "mid": 0, "high": 0, "swings": "" } ],
  "doNothing": "", "verdict": "", "decidedBy": ""
}
```

Write `docs/value-case.md` for the human as well. **The state keys are what gets checked; the
file is what gets read.**

---

## Verify before handing back

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/value-check.mjs .pica/state.json --gate
```

Zero findings, or fix. Then report what you checked, what you found, and **which assumptions
are low confidence**, because those are the client's questions rather than your findings.

---

## When this finishes

Present **the pessimistic column, not the likely one.** Then the three assumptions the answer
rests on, then the do-nothing baseline. Say plainly that this is the last confirmation at which
stopping is cheap.

If the verdict is `do-not-build`, that is a successful run of this command.
