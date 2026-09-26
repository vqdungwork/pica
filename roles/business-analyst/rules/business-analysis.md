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
built. See `core/rules/reference-discipline.md`.

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

## The chain is a check, not a chapter

<!-- enforced-by: duplicate-id, broken-link, orphan-segment, orphan-pain, orphan-usecase, orphan-requirement, orphan-rule, orphan-state, orphan-screen, dangling-ref -->

**segment → pain → use case → feature → rule → entity/state → screen**, walkable in both
directions. A screen with no use case, a pain nothing addresses, a rule nothing enforces, a state
no screen draws: each is an orphan and each is a defect. It is the one artefact a machine can
verify completely, which is exactly why it must not be written by hand — a traceability matrix
typed into a document is a table that agrees with itself.

Run on a finished engagement's analysis for the first time, it found four things no review had:

- **A severed hop.** *No* use case carried any link to a pain point — not one of thirteen. Every
  pain was unaddressed and every use case unmotivated, and neither fact was visible because the
  field simply did not exist. Report a hop where nobody carries the field as **one** defect in the
  method, not as forty orphans; the orphan list buries its own cause.
- **A segment nothing hurts.** A whole audience — leadership — was in scope by one client
  sentence, with no researched pain behind it, and three requirements standing on it. The honest
  repair is to record that as what it is (`class: client-stated`, confidence low), never to invent
  the pain that would have justified it.
- **A citation to a rule that is not in the register.** The rule had been *correctly* left
  unwritten — a cut-off time nobody had confirmed — and recorded only as an assumption. Correct to
  refuse to invent it; wrong to leave it out of the register while three documents cite it. An
  open rule belongs in the register **marked open**, so the gap is visible where rules are read.
- **Two state vocabularies that never meet.** Entity lifecycle and screen render-state are
  different things, and a project may say so — but it must *say* so. The check accepts a
  declaration and refuses silence.

**And no id may name two things.** A screen register carried one id twice, deliberately, with a
note explaining that the second entry existed so an archetype check would see a second role. The
intent was sound; the mechanism was not. Anything keyed by id drops all but one entry silently —
a canvas generator drew ten boards for eleven screens without a word — and every citation of that
id is ambiguous about which of the two it means. A variant takes its own id and a `variantOf`
pointing home: one thing in two views, rather than two things under one name.

Two distinctions the check itself had to learn. An id may be namespaced (`nfr:NFR-01`) because ids
are unique only within their own register, and comparing whole strings reported six sound
references as dangling. And a declared exemption must silence the **whole** hop: guarding only the
headline swapped one accurate finding for seven inaccurate ones.

## Assemble it, or nobody reads it

<!-- enforced-by: assemble-spec -->

Thirty-five documents is not a specification, it is a folder. A client asked to open something and
was handed a directory; hunting a fact across twenty markdown files is grepping a spec, not
reading one, and the reasonable conclusion is that nothing was ever assembled.

Route every register to the document it belongs in — **BRD** answers *why*, **PRD** *what*, **FRD**
*how* — make the routing filterable, and make every id a link that lights every place citing it,
in both directions. The traceability matrix is then not a chapter; it is the navigation.

Generate it from `state.json` and nothing else, so the page and the checks read one source and
cannot disagree. A hand-written summary of a register is a second copy, and second copies drift —
which is the same reason an SOW cites frozen ids rather than restating requirements.

## A long list is not a visualisation

<!-- enforced-by: assemble-spec -->

The first assembled spec was 129 items in one linear column: **eighteen and a half screens of
scrolling**, filterable but not navigable, with the diagrams at the very bottom where nobody
reaches them and every register rendered identically — a glossary entry looking exactly like a
screen. On a phone the first screenful was four labels and no content at all.

It was, precisely, the wall of text this project had spent a week diagnosing on somebody else's
report screen: everything shown, in sequence, nothing grouped by what the reader needs. Writing
the rule does not exempt the next thing you build from it.

Four things fix it, and they are the same four every time:

- **Lead with a map, not with the data.** The chain drawn as a chain — *3 segments → 9 pains → 13
  use cases → 29 requirements → 13 rules → 4 entities → 11 screens*, each hop a proportional bar
  and a way in. Navigation answers "where does this one go"; a map answers "how much is there and
  how does it divide", which is the question anyone asks first.
- **Put the pictures where they are read**, not after eighteen screens of list.
- **Collapse the reference registers.** A glossary of seventeen and a requirements list of
  twenty-nine are things to *consult*, not to read through; six visible and a line saying how many
  are behind it. Open items never collapse.
- **On a phone the first screen must carry content.** Four stacked summary cards are four labels.

And two smaller lessons with wider reach. A wide diagram must **scroll, not shrink**: capped at
the column width, a 23-step process became a grey smear — present, unreadable, and worse than
absent because it looks answered. And the "scroll sideways" hint is decided by **measuring at
runtime**, never by a width threshold guessed in the generator: the guess captioned two diagrams
that fitted as needing a scroll they did not, and left the one that did unmarked on a phone. A
caption that asks a reader to do something unnecessary is a caption they learn to disbelieve.

## The reader who decides is the one who does not know the notation

<!-- enforced-by: assemble-spec, model-diagram -->

A specification is signed by someone who knows the business and not the method. They are not
trying to *find* a fact; they are trying to **see** what a person can do, where they go, and what
the system holds — and to recognise their own operation in it. A register dump asks them to do the
opposite: read every line and assemble the picture themselves. They will not, and they are right
not to.

**BABOK names four models a specification owes its readers**, and each answers a question prose
cannot:

| Model | Answers |
|---|---|
| Process | how work flows through the business |
| Use case | what each person can actually do |
| Data / ERD | how information is structured and what relates to what |
| State | how a thing moves between conditions, and what may never happen |

pica held all four as validated data and drew none of them. The data was right and unread.

Three things make the difference between a diagram and a picture of one:

**Colour is the information, and one legend serves the whole document.** *Where a step happens*
and *where a screen's data comes from* are the same question in two places — grey for the upstream
system, blue for what this product adds, olive for what a person does with no system at all. A
reader who learns the legend once reads every grid at a glance, and sees without reading a word
how much of their day the product actually touches.

**A grid beats a graph when the graph does not fit.** Twenty-three steps as nodes and edges is
2860px wide and has to be scrolled; the same steps as cards, grouped by who does them and ordered
by depth, fit any column. **A diagram that must be scrolled sideways is a diagram nobody sees
whole, which is the only reason to draw one.**

**Unconfirmed points are marked, never filled in with a plausible figure.** An open rule in its
own colour, stated as open, is worth more than a confident number nobody agreed to — and it has to
be visible where the work standing on it is, not filed in an assumptions register.

What this replaced: 129 entries in eight registers, 20 325px of scrolling. What it became: a
narrative in parts, each opening with one sentence and then a grid, with the registers moved to a
closed appendix for the one reader in ten who wants to look up a code. 7 700px, and the first
screen carries the argument instead of a table of contents.

## the picture before the paragraph

<!-- enforced-by: figure-rendered-but-not-placed, figure-without-a-caption, no-figures, figure-too-wide-to-read -->

A context diagram is the first thing a business analyst draws and the last thing pica drew. It
answers *what does this system touch* — who uses it, what it connects to, which way the data
moves — and an executive reads it with no preparation at all. Every other model in the document
needs the reader to already know something.

So it opens the document. Everything after it is inside that box.

**How to know it is wrong:** the page begins with a paragraph. Or the diagram exists in
`diagrams/` and nothing in the assembled page points at it, which is the same as not drawing it.

## the matrix is the artefact, not only the check

<!-- enforced-by: orphan-requirement, orphan-screen, broken-link -->

pica has walked the chain `segment → pain → use case → requirement → rule → state → screen` as a
*check* for a while. A check tells one person, once, that nothing is orphaned. It does not settle
the argument that actually happens on a project, which is a client saying *we never asked for that
screen* six weeks in.

A requirements traceability matrix settles it, because it is readable by the person having the
argument: one row per requirement, and the columns walk both directions — which pain it came from,
and which screen it ends up on. A row with no screen is scope with nowhere to land. A screen no row
reaches is a screen nobody asked for.

The data was already there. Only the rendering was missing. **When a check walks a structure, ask
whether the reader should be able to see the same walk.**

## a requirement nobody can test is a wish

<!-- enforced-by: acceptance-coverage-regressed, acceptance-too-thin, acceptance-restates-the-requirement -->

Top-tier requirement documents attach acceptance criteria to every functional requirement: the
condition under which a reviewer says *this is done*. Without them "the system shall display a
report" is unfalsifiable, and the delivery argument has no referee.

pica wrote 29 requirements on one project and 0 acceptance criteria, and every check passed,
because no check asked. `acceptance-check` now does, and it **ratchets** rather than gates: a
project mid-flight is not retroactively broken, but the number of untestable requirements may
never grow.

A criterion that restates the requirement is not a criterion. *"The system must show the report"*
under a requirement to show the report is a sentence that can never fail.


## draw along the page's long axis, not along the tradition's

<!-- enforced-by: figure-too-wide-to-read -->

A swimlane diagram is drawn sideways because the convention was set on paper, which is wider than
it is tall. A web page is the opposite: its width is fixed and its height is free.

Drawn sideways, a 23-step process across three roles came out 1538px wide. The page scaled it to
fit and every label rendered at 6.7px. The figure was there, every check passed, and nobody could
read a word of it. Turned ninety degrees — lanes as columns, the process running down — the same
23 steps came out 968px wide and every label was legible.

The same reasoning caps how many steps may sit side by side in one lane. Laying out everything
simultaneous in one row is correct as a model and wrong as a drawing, because it spends the scarce
axis. Two per lane, and the third drops to a half-row below.

**How to know it is wrong:** measure it. The smallest `font-size` in the SVG, times
`column width ÷ viewBox width`, is what the reader actually gets. Below about 9px, Vietnamese
diacritics stop resolving and the diagram is decoration.

Horizontal scrolling is not the fix. The reader will not do it.
