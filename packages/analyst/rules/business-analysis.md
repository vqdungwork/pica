# Business analysis rules

Load this for steps 2.1 to 2.11. It is grounded in BABOK, which organises the discipline into six
knowledge areas and a four-beat process: **elicitation, analysis, specification, validation.**

Skipping the first beat produces requirements that describe your assumptions rather than their
business, and nothing downstream can tell the difference.

---

## Analysis is not design

The most common way this role goes wrong is by quietly becoming a designer.

**Information architecture, screen inventory and the state matrix are not business analysis.** They are
UX design and they belong to the Product Designer at 3.0a to 3.0c. An analyst who produces a sitemap
has skipped the part only they can do: understanding what the business actually needs.

The boundary is: analysis says **what must be true**. Design says **what it looks like**.

---

## AS-IS and TO-BE are two models, and the delta is the deliverable

A single "business flow" is the mistake this rule exists to prevent.

- **AS-IS**: how the business works today. Observed from the live product, the analytics and the
  support logs wherever possible, not only from what someone describes in a meeting.
- **TO-BE**: how it works with the product.
- **The delta**: what actually changes.

**The delta is what is being bought.** Without an AS-IS beside it, nothing proves the new design fixes
anything, an improvement is indistinguishable from a lateral move, and at handover there is no way to
show what was gained.

Describing only the TO-BE is faster, reads better, and is unfalsifiable. That is why it happens.

**The AS-IS is a reference and it is read-only.** Once recorded, it is not edited to match what got
built. See `packages/core/rules/reference-discipline.md`.

---

## The glossary comes before the flows

One concept, one word. Written before anything uses it, because everything downstream will.

The client says "order", the developer says "request", the interface says something else again. Three
words for one thing, and nobody notices until testing, when a bug report about "orders" cannot be
reproduced because that screen calls them something else.

The glossary is a **reference**: every flow, use case, entity, screen label and column name is checked
against it. A term used anywhere that is absent from the glossary is a term nobody agreed on.

```json
"glossary": [
  { "term": "consignment", "means": "a batch of goods moving under one waybill",
    "notOurTerm": ["shipment", "delivery"], "source": "client, kickoff" }
]
```

`notOurTerm` matters as much as the definition: it records the synonyms you are deliberately not
using, so the next person does not reintroduce them.

---

## Business rules are numbered, sourced, and individually confirmable

Extract them from the sources, select the relevant ones, document them in **one format**, number them,
and confirm each with a stakeholder.

A rule left inside prose cannot be checked, cannot be traced, and cannot be individually disputed. The
client agrees to "the document" instead of agreeing to twenty specific statements, which means they
have not really agreed to anything.

```json
"businessRules": [
  { "id": "BR-07", "rule": "A consignment over 50kg requires a manager approval before dispatch",
    "source": "ops lead, 2026-09-02", "confirmed": true,
    "enforcedBy": "UC-04 approval step" }
]
```

**Each rule carries what enforces it.** A rule with nothing enforcing it is a preference, which is the
same standard every other register in this flow is held to.

---

## Domain knowledge: find the constraints, do not memorise the laws

A banking product, a clinic system, a law firm tool and a school platform are not the same product with
different colours. Each carries constraints that are invisible in the brief and expensive to discover
late.

**This package ships no table of regulations.** Rules differ by country, change without notice, and
stating a legal requirement wrongly is worse than stating nothing. What ships is the **list of question
categories**, which is stable, plus the requirement to record the answer with its source.

For every project, find and record:

| Category | The question | Where it usually bites |
|---|---|---|
| **Regulator** | Who supervises this sector here, and does the product fall under them | Financial services, healthcare, legal, education |
| **Data protection** | Which regime applies, and does the product cross a border | Everywhere. Cross-border is the part people miss |
| **Identity** | Must a user be verified before acting, and to what level | Banking and finance: onboarding is a regulated flow, not a form |
| **Retention** | What must be kept, for how long, and what must be destroyed | Health records, financial records, student records |
| **Audit trail** | What must be provable after the fact, and by whom | Anything with money, medicine, or a legal deadline |
| **Restricted claims** | What the interface may not say | Medical outcomes, investment returns, legal advice |
| **Accessibility mandate** | Is conformance a legal obligation rather than a quality goal | Public sector, education, and increasingly everywhere |
| **Professional duty** | Does a licensed person carry liability for what the product does | Law, medicine, accounting, engineering |

```json
"domainConstraints": [
  { "category": "retention", "constraint": "clinical notes retained 8 years after last contact",
    "source": "client compliance officer, 2026-09-03", "verifiedBy": "human",
    "affects": ["data model", "deletion path", "NFR 6.4"] }
]
```

**`verifiedBy` is required and may not be an agent.** A constraint the flow inferred rather than
confirmed is an assumption, and it is recorded as one. Getting this wrong is not a design defect, it is
a liability.

**Who else reads this register:** the Architect turns retention and audit into NFRs at 6.4, the QA
engineer turns audit trail into tests, the Content writer turns restricted claims into `copyRules`, and
the Designer turns identity requirements into flows that cannot be skipped.

> A domain constraint discovered during build is a redesign. Discovered after launch, it is a
> regulatory problem. It costs one question at intake.

---

## Everything traces

Need → requirement → solution → test. Requirements traceability is an entire BABOK knowledge area and
it exists for one reason: **an untraceable requirement cannot be dropped safely,** because nobody can
tell what it was for.

- Every use case traces to a business rule or to the delta.
- Every entity traces to a glossary term.
- Every screen the designer later invents traces to a use case.
- Every test the QA engineer later writes traces to a use case or a rule.

This is token provenance, applied to requirements instead of to colours.

---

## Acceptance criteria in the client's own words

Criteria written in your language are criteria you will grade yourself against.

If the brief says "redesign the dashboard", the criteria are the four or five things that would make
it good **stated by them**, agreed before drawing. Quote where you can.

---

## Elicitation includes confirming what you heard

The four beats are elicitation, analysis, specification, validation, and the first one has a step
inside it that is almost always skipped: **confirm the results.** Take what you elicited back and check
you understood it.

This flow gates once, at 4.2, after the build. That is right for design, where reacting to a built
thing is cheaper than specifying one. It is riskier for business: an AS-IS misunderstood at 2.3 is
inherited by fifteen steps.

The mitigation is not another gate. It is that **the AS-IS and the delta must be the two most prominent
low-confidence assumptions in `review.html`**, at the top of the business tab, because those are the two
a client can judge correctly in three seconds.

---

## Definition of done

- [ ] Stakeholder register names at least one decider and one veto holder
- [ ] Glossary has one entry per domain concept, and `notOurTerm` filled where synonyms exist
- [ ] AS-IS and TO-BE both exist, as separate models
- [ ] The delta is stated explicitly, not left to be inferred
- [ ] Business rules numbered `BR-nn`, each with a source, a confirm state, and what enforces it
- [ ] Every use case `UC-nn` traces to a rule or to the delta
- [ ] Every entity in the domain model uses a glossary term
- [ ] PRD contains no unglossed jargon
- [ ] `exclusionsConfirmed` is true
- [ ] Every gap became an assumption with a confidence and a blast radius
- [ ] `trace-check.mjs` returns zero
