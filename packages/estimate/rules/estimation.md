# Estimation rules

Load this for steps 5.1, 5.2 and 8.4.

---

## Nothing is estimated before scope and deadline are frozen

Two preconditions, both hard:

1. **Scope frozen at 4.6**, after the client agreed to something they could see and click
2. **Deadline fixed at 4.7**, as a date, not "soon"

An estimate produced before 4.6 prices a guess, and a guess that has been sent to a client becomes a
commitment. This is the whole reason estimation sits in Phase 5 rather than in intake: you cannot price
work before the client has agreed what it is.

---

## Three points, never one

Standard practice for work with unknowns is **three-point estimation**: optimistic, most likely,
pessimistic, per role.

```
PERT = (O + 4M + P) / 6
```

The weighting exists because the most likely value genuinely is more probable than either extreme; the
distribution is not triangular.

**Two consequences, and the second one is the commercial reason to do it:**

- A three-point estimate produces a **range**, and a range is defensible in a negotiation in a way a
  single number never is. It moves the conversation from "that is expensive" to "which of these do you
  want to change"
- The spread makes risk **visible** instead of hiding it inside a padded single figure. A padded figure
  is a lie you also have to remember

Three-point estimation explicitly requires experience from past projects. That is what `effort-log` is,
and it is why step 8.4 is not optional bookkeeping.

---

## By role, always

A total with no roles cannot be turned into a team, and a team is what the client is actually buying.

```json
"estimate": {
  "uiux": { "o": 60,  "m": 90,  "p": 140 },
  "fe":   { "o": 160, "m": 220, "p": 320 },
  "be":   { "o": 400, "m": 560, "p": 800 },
  "qa":   { "o": 80,  "m": 120, "p": 200 }
}
```

Tier feeds the spread: a package marked `complex` at 2.12 must have a wider spread than any `standard`
one. If it does not, the tier was decorative.

The Architect's risk list from 1.8 feeds the pessimistic figures specifically. A risk that changes
nothing in P was not a risk.

---

## The deadline is a control, not information

Effort divided by duration gives headcount. That is arithmetic, and showing it is what makes an
estimate look reasoned rather than invented:

```
BE 560h ÷ 8 weeks ÷ 40h = 1.75  →  2 backend developers
```

**A shorter deadline does not mean working faster. It means more people and a higher price.** Present
effort, deadline and headcount as one table and the client can see which lever to pull. Present one
number and they can only accept or reject it.

Two things the arithmetic must not hide:

- **Roles do not compress evenly.** Adding a second backend developer to a 560h backlog helps. Adding a
  second designer to a 90h direction does not, because the work is sequential
- **iOS review latency is a scheduled line item, not a risk.** External TestFlight review takes roughly
  48 hours and store review takes longer. On a mobile project that time is in the plan or the plan is
  wrong

---

## Log the real hours, or the next estimate learns nothing

Step 8.4 records actual effort per role per package, in a format a script reads.

```json
"effortLog": [
  { "package": "search", "role": "fe", "estimated": 220, "actual": 310,
    "why": "state matrix grew by two states after client review" }
]
```

**`why` is required on any variance over 20%.** A variance with no explanation teaches nothing, and the
whole point of the record is to make estimate two better than estimate one.

> This loop is currently open in every agency: `effort-log` gets written and nobody ever reads it back.
> Skip 8.4 once and 5.1 stays a guess forever, because the data never starts accumulating.

---

## What is not this role's job

Scheduling, standups, risk tracking, stakeholder management. Those are PM duties this package does not
cover, and pretending otherwise would make the DoD unmeasurable.

This package prices agreed scope and records what it actually cost. That is all.

---

## Definition of done

- [ ] Scope frozen and deadline fixed before any estimate exists
- [ ] Three points per role, not one number
- [ ] PERT computed and shown alongside the raw three
- [ ] Every `complex` package has a wider spread than every `standard` one
- [ ] The Architect's risks are visible in the pessimistic figures
- [ ] Headcount shown as arithmetic, not asserted
- [ ] Sequential roles flagged as not compressible
- [ ] Mobile: review latency present as a scheduled item
- [ ] At closeout: actual hours per role per package, with `why` on any variance over 20%
