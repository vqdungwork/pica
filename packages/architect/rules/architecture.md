# Architecture rules

Load this for steps 1.8, 3.0b, 6.1 and 6.4.

---

## Feasibility runs in Phase 1, and that placement is the whole point

Step 1.8 sits before the contract, before the design, before anything is shown to a client. It is the
only step in the flow whose job is to say **"no"** while saying no is still free.

Everything after 1.8 is a promise. A capability discovered to be impossible at 7.5 is a redesign, a
renegotiation, and an apology.

Produce three lists and nothing else:

- **Possible** — and roughly at what cost
- **Not possible** — with a reason a non-technical reader understands, because the Account has to say it out loud
- **Risky** — the ones that feed the pessimistic column of the estimate at 5.1

A risk that changes no number at 5.1 was not a risk. It was an observation.

---

## The structural problem this role exists to reduce

This flow designs screens in Phase 3 and defines the API in Phase 6, **after the contract**. In a
product lifecycle those run in parallel and have to meet; here they cannot.

**So designing a screen that shows data the system cannot produce is not a risk in this flow. It is the
default.**

The mitigation is two passes, not one, because they read different artefacts:

**1.8 asks whether it can be built at all**, from the brief and the client's systems. It runs before any
promise, and the screen inventory does not exist yet.

**3.0b asks where each screen's data comes from**, once the inventory does exist. Asking it at 1.8 would
mean inventing screens to answer it, which is analysis pretending to be design.

> Where does this data come from?

Every screen that cannot answer becomes a low-confidence assumption, surfaced in `review.html`, so the
client corrects it before the contract rather than a developer discovering it after.

---

## An NFR without a number is not a requirement

"Fast" is not a requirement. "p95 under 300ms at 500 concurrent users, measured on the production
instance type" is.

Every non-functional requirement carries three things: **the number, the condition it holds under, and
how it will be measured.** Without the third, nobody can tell whether it was met.

```json
"nfr": [
  { "id": "NFR-03", "kind": "performance",
    "requirement": "p95 response under 300ms",
    "condition": "500 concurrent users, production instance type",
    "measuredBy": "load test in CI, gate on regression",
    "source": "client ops, 2026-09-04" }
]
```

Cover at minimum: performance, availability, security, scalability, and whatever the domain constraints
register demands. **Retention and audit trail from `domainConstraints` become NFRs here**, or they
become nothing.

---

## C4, and stopping at the right level

Four levels exist: context, container, component, code. **Draw the first three. Stop before code**
unless something genuinely needs it.

A code-level diagram is out of date the week after it is drawn, and maintaining it costs more than the
clarity it buys. The three above it change slowly enough to stay true.

---

## Architecture Decision Records

One record per non-obvious decision, carrying four parts:

```
CONTEXT       what was true when this was decided
OPTIONS       what else was considered, and why each was rejected
DECISION      what was chosen
CONSEQUENCES  what this makes easy, and what it makes hard
```

**`CONSEQUENCES` is the part that gets skipped and the part that matters.** A decision recorded without
its downside reads as a free choice, and the next person reverses it having never seen the cost.

This is the same shape as this project's changelog discipline: a decision recorded together with the
reason that earned it. A decision with no recorded reason gets reversed by the next person who finds it
inconvenient, and nobody can tell whether that was a correction or an accident.

**Every technology choice needs one.** "We used Postgres" is not a decision, it is a fact. "We used
Postgres over the client's existing MySQL because the retention rule at DC-02 needs partitioned
time-series and the migration cost is one week" is.

---

## Mobile changes the shape

A native app is two release pipelines with two review authorities, and one of them cannot roll back the
way the web can.

- **Android supports percentage-based staged rollout. iOS does not.** A bad iOS release is fixed by
  shipping another build and waiting for review again, so the cost of an iOS defect is measured in
  days
- **Signing keys are a single point of catastrophe.** Losing the Android app signing key means the app
  can never be updated under the same listing again. This belongs in the architecture, not in a
  deployment checklist nobody reads
- iOS review latency is a **scheduled line item** at 5.1, not a risk

---

## What is checked and what is not

`arch-check.mjs` decides seven of the twelve items below from state: the feasibility verdict and its
reason, whether a risky item names what it affects, whether every NFR carries a number, a condition and a
measurement method, whether a retention or audit constraint became an NFR, whether every ADR carries all
four parts, whether every technology in `stack` is named by some ADR, and whether a native target records
signing key custody and the rollback asymmetry.

**The other five stay with a human, and the script says so on every run:** whether a "not possible" reads
plainly to a non-technical reader, whether the C4 diagrams say anything useful, whether an ADR's
consequences are honest, whether a screen's named data source is real, and whether the decisions were the
right ones. A check that pretended to judge those would be worse than no check.

This package shipped a twelve-item definition of done and no executable until 0.8.0, the only one in the
repository in that position.

## Definition of done

**Feasibility, 1.8, before any promise**

- [ ] Every capability the brief implies marked possible, not possible, or risky
- [ ] Every "not possible" has a reason a non-technical reader understands
- [ ] Every risky item appears in the pessimistic column at 5.1

**Data source, 3.0b, once the screen inventory exists**

- [ ] Every screen in the inventory can name where its data comes from
- [ ] Screens that cannot are low-confidence assumptions, surfaced in `review.html`

**Architecture, Phase 6**

- [ ] C4 context, container and component diagrams exist
- [ ] One ADR per non-obvious decision, all four parts present
- [ ] Every technology choice has an ADR
- [ ] Every NFR carries a number, a condition, and a measurement method
- [ ] Every entry in `domainConstraints` that implies retention or audit has become an NFR
- [ ] Every entity in the domain model appears in the data design
- [ ] Mobile: signing key custody and rollback asymmetry recorded
