# Domain knowledge

Load this with `business-analysis.md` at step 2.0, before the glossary.

A banking product, a clinic system, a law firm tool and a school platform are not the same product in
different colours. Each has entities, events, obligations and vocabulary that are invisible in a brief
and expensive to discover late.

**A domain constraint discovered during build is a redesign. Discovered after launch, it is a
regulatory problem. It costs one question at intake.**

---

## This package ships no table of regulations

Rules differ by country, change without notice, and **stating a legal requirement wrongly is worse than
stating nothing**. What ships is the method: where to look, what to extract, and how to record it so
that a thing nobody verified is visibly a thing nobody verified.

---

## Where to look, in order of authority

| Order | Source | Gives |
|---|---|---|
| 1 | **The sector's standards body** | The domain's own data model, already agreed by everyone in it |
| 2 | **The regulator** | What is obligatory, and what the penalty is |
| 3 | **The client's own compliance officer** | What applies *to them*, in *their* jurisdiction. The only authoritative answer |
| 4 | Professional association guidance | Practice norms the regulator assumes |
| 5 | Shipped products in the sector | How the constraint is usually satisfied in an interface |

**Start at 1, not at a search engine.** Regulated sectors have published their data model, and building
a domain model that ignores it means every future integration is a translation layer.

Known examples of what "the standards body" means, as a shape rather than a list to trust:

- **Healthcare** publishes interoperability standards through HL7 International, an ANSI-accredited
  body: HL7 v2, CDA, and **FHIR**, with ISO guidance layered on top
- **Finance** uses **ISO 20022** for financial messaging, published by ISO

If a sector has one and the domain model ignores it, record that as a deliberate decision with a
reason. Silence there is not a decision, it is an oversight that surfaces at the first integration.

---

## How to acquire it without a workshop

The established technique is **Event Storming**: domain experts and builders in one room, discovering
the business by naming **domain events**, then the commands that cause them, the actors who issue them,
and the aggregates they belong to. It produces the ubiquitous language as a by-product.

This flow rarely gets that room. So run the same shape against the artefacts that exist:

1. **Name the domain events.** Past tense, business language, not system language: *"consignment
   dispatched"*, not *"row inserted"*. Harvest them from the AS-IS, the support logs, the live product,
   and the sector standard.
2. **For each event, ask what caused it.** That is a command, and it usually maps to a use case.
3. **For each command, ask who may issue it.** That is an actor, and it is usually a role with a
   permission attached, which the Designer will need before drawing anything.
4. **Group events that always change together.** That is an aggregate, and it is usually an entity.
5. **Ask what must be true for the event to be legal.** That is a business rule, and often a regulated
   one.
6. **Mark every event you inferred rather than observed.** Those are the assumptions, and they go at
   the top of the business tab in `review.html`, because a domain expert corrects a wrong event in
   three seconds and would take an hour to write the right list unprompted.

**A wrong event list shown to a client is worth more than a right question asked of them.**

---

## Ubiquitous language reaches the code, not just the document

The glossary is not a document convention. In the discipline it comes from, the same terms appear in
meetings, on whiteboards, in documentation **and in the code**.

So the check runs in both directions: `trace-check` verifies the flows and the domain model use
glossary terms, and `code-tokens-check` and the schema review verify the same for table names, column
names and component names. **A schema that says `parcel` for a business that says `consignment` has
already broken the language, and every conversation after it costs a translation.**

---

## What each role must extract

| Role | From the domain |
|---|---|
| **Analyst** | Events, actors, aggregates, business rules, obligations. The vocabulary itself |
| **Architect** | The sector's interoperability standard, retention and audit rules as **NFRs with numbers** |
| **Product Designer** | Identity and approval steps that cannot be skipped, sequences the regulator fixes, and what the field's shipped products look like |
| **Content** | Restricted claims. Medical outcomes, investment returns and legal advice are liabilities, not phrasing |
| **QA** | Audit trail as tests, and the regulated path as a scenario that must pass |
| **Account** | Who in the client organisation is authoritative on this. Usually not the person who wrote the brief |

---

## The eight questions, and the register

Every project answers these, and records the answer with its source:

| Category | Question |
|---|---|
| **Standard** | Does this sector publish a data or messaging standard, and are we using it |
| **Regulator** | Who supervises this sector here, and does the product fall under them |
| **Data protection** | Which regime applies, and does the product cross a border |
| **Identity** | Must a user be verified before acting, and to what level |
| **Retention** | What must be kept, for how long, and what must be destroyed |
| **Audit trail** | What must be provable after the fact, and by whom |
| **Restricted claims** | What the interface may not say |
| **Professional duty** | Does a licensed person carry liability for what the product does |

```json
"domainConstraints": [
  { "category": "retention", "constraint": "clinical notes retained 8 years after last contact",
    "source": "client compliance officer, 2026-09-05",
    "verifiedBy": "human",
    "affects": ["domain model", "deletion path", "NFR-04"] },
  { "category": "standard", "constraint": "not applicable: internal tool, no external exchange",
    "source": "architect, feasibility 1.8", "verifiedBy": "human", "affects": [] }
]
```

**`verifiedBy: "human"` or `verifiedBy: "agent"`, and the difference is the whole point.** Anything an
agent inferred is an assumption, is labelled as one, and is surfaced for the client to correct. Getting
this wrong is not a design defect, it is a liability.

**"Not applicable" is a valid answer and it must be written.** An empty category and a category nobody
asked about look identical, which is the failure every register in this flow exists to prevent.

---

## Definition of done

- [ ] All eight categories answered, including the ones answered "not applicable"
- [ ] Every entry carries a source and a `verifiedBy`
- [ ] Every `verifiedBy: "agent"` entry also exists as a low-confidence assumption
- [ ] The sector standard identified, or its absence recorded as a decision
- [ ] Domain events named in business language, past tense
- [ ] Every inferred event marked and surfaced in `review.html`
- [ ] Every constraint names what it affects, so the Architect and QA can act on it
- [ ] `domain-check.mjs` returns zero
