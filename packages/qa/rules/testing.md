# Testing rules

Load this for step 7.8. `evaluation.md` covers evaluating a **design**; this covers testing a **running
product**, and they are different jobs done by different people at different times.

---

## The shape of the suite is a decision, and an inverted one is why the pipeline is slow

A broad base of fast unit tests, a middle of integration tests, a small top of end-to-end. Roughly
**70 / 20 / 10**, and the ratio is a starting point rather than a law.

**Inverted, it fails in a way that looks like flakiness.** A suite that is mostly end-to-end is slow,
brittle against any layout change, and gives a failure that names a screen rather than a cause. Teams
respond by retrying the suite, and a retried test is a test nobody believes.

Ownership is not the same at each level:

| Level | Written by | Answers |
|---|---|---|
| **Unit** | whoever wrote the code | does this function do what it says |
| **Integration** | developer and tester together | do these parts agree about the data |
| **End-to-end** | the tester | can a person complete the use case |

Declare the shape in `state.testStrategy`. A suite with no declared shape drifts toward whatever was
easiest to write last.

---

## End-to-end tests the use case, never the screen

One per `UC-nn`, named with the id so the requirement is greppable from the rule to the test that proves
it. One assertion per `BR-nn`.

**A screen can be perfect and the task still impossible.** That is exactly what a use-case test catches
and a screen test does not: every element renders, every control works, and the sequence does not
complete because step three needs a value step two never offered.

---

## Scripted tests find what somebody already thought of

That is not a criticism, it is their definition. A test is a hypothesis somebody wrote down, and a suite
is the set of failures already imagined.

**Exploratory testing is the other half**, and it is a discipline rather than clicking around. A session
has a charter naming what is being explored, a time box, and notes recorded during rather than after.

```json
"exploratory": [
  { "charter": "Behaviour when a session expires mid-form",
    "minutes": 45, "by": "tester",
    "found": ["draft lost with no warning", "the retry re-submits the payment"] }
]
```

A session with no charter is a walk. A session with no findings is a session that has to say so, because
"nothing found" is a result and silence is not.

---

## What a defect earns is a test

Every defect that reaches a person gets a regression test **before** the fix, and the test fails first.
A test written after the fix proves the fix compiles.

This is the same rule the checks in this repository hold themselves to: **verify a new check by
reintroducing the defect it was written for.** A test that has never failed is a hope.

---

## Severity is a scale or it is a word

If everything is critical, nothing is. Four levels, each with a consequence rather than an adjective:

| | Means |
|---|---|
| **Blocker** | the use case cannot complete, and there is no workaround |
| **Major** | it completes, with a workaround a person has to be told about |
| **Minor** | it completes, and something is wrong that a person will notice |
| **Cosmetic** | a person would have to be looking for it |

**A severity nobody can dispute is a severity nobody chose.** The test is whether two people would land
on the same level from the description alone.

---

## Test data is declared, and it is never real

Real data in a test environment is a breach waiting for a screenshot. Test data carries provenance the
same way mock data does at the design step, and the same defects recur: an identifier belonging to a
different record, a date that predates the screen it appears on, a relationship no flow could produce.

- **Generated or anonymised, and which one is recorded.** "Anonymised" without a method is a claim
- **Enough of it to be realistic.** Three rows tests nothing about a list a person scrolls
- **The edge cases are data, not an afterthought:** the longest legal value, the empty set, the
  duplicate, the one with an apostrophe in the name

---

## The release candidate is smoke-tested, not re-tested

Running the full suite against a release candidate is how a release slips by a day. A smoke suite is a
named, small set that answers one question: **is this build worth testing further.**

Then targeted regression against what changed, and against what that change touches. Everything else was
already green on the commit it merged from.

- The smoke suite is named in `state.testStrategy.smoke` and runs in CI
- A rollback has been **executed once** before the first production release. A rollback plan that has
  never been run is a paragraph, not a path

---

## What testing cannot tell you

It cannot tell you the product is right, only that it does what somebody said. **A green suite on a
product nobody wants is a green suite.**

That is why this step sits after evaluation and after a human has used the build, and why neither
replaces the other.

---

## Definition of done

- [ ] `testStrategy` declares the shape of the suite and who owns each level
- [ ] One end-to-end test per use case, named with its id
- [ ] One assertion per business rule, named with its id
- [ ] Every defect that reached a person has a regression test that **failed before the fix**
- [ ] Every severity is one a second person would land on from the description alone
- [ ] Test data provenance recorded, generated or anonymised, and no real records
- [ ] Edge-case data present: longest legal value, empty set, duplicate, awkward characters
- [ ] At least one exploratory session with a charter, a time box and recorded findings
- [ ] A named smoke suite runs in CI against the release candidate
- [ ] The rollback has been executed once, not planned once
- [ ] `qa-check.mjs` returns zero
