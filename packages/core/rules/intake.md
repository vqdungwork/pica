# Intake rules

What has to be true before anything is designed. Load this for step 1.

These rules lived in `packages/research/rules/research.md` until 2.0.0, which meant intake could not
run without the research package installed: on a project that wanted design only and had brought its
own PRD, that pulled in a package it never used. Intake belongs to core. Measurement and tokens belong
to research.

---

## The intake packet

**Five inputs. Refuse to start without all of them**, and say which are missing rather than proceeding
on assumptions. Ask for all five in one message; do not interrogate one at a time.

Two of the five, the field and the archetype, are **derived from the brief where the brief states
them**, marked as derived with the section they came from, and confirmed rather than asked from
scratch. A wrong extraction has to be visible; a silently authoritative one is worse than a question.

### 1. The brief, raw and unedited

Not a summary, not your restatement. The original.

**`briefPath` is a list.** A brief arrives as a document, or three: an RFP with an annex and a spec.
All of them are the brief, all are read-only, all are read cold at closeout. Any format: text,
`.docx`, `.pdf`, `.pptx`. Pasted text is written to `docs/brief.md`; a file stays the file and
`briefPath` points at it. Converting a document to markdown to make it tidier is the tidying this rule
forbids.

Paraphrasing at intake loses the exact wording, and the exact wording is what settles disputes later.
A phrase as specific as "we do not mean the subscription plan picker" is the kind of thing that
settles, months later, whether a screen should ever have been designed.

**Verbatim, in the source language.** A brief in Czech stays in Czech. A translation is a separate,
clearly derived file, `docs/brief.en.md`, so `brief-cold` still reads the original.

The brief is a reference and read-only from the moment it lands: see
[reference-discipline.md](reference-discipline.md). Not to fix a typo, not to make a check pass.

**A client who changes their mind does not edit the brief.** Amendments go in append-only
`docs/brief-amendments.md`, each dated and attributed, and `brief-cold` reads it alongside the
original. The reference stays untouched and reality still gets in. Without this, a legitimate change
in week three makes closeout fail against a brief nobody intended to deliver.

**An absence may be declared.** Of nine real projects, eight had no brief on disk. Record the reason in
`briefAbsent` and what its absence costs. What is still refused is a brief that was recorded and lost:
an undeclared absence and a lost file look identical otherwise.

Length is not a criterion. "A portfolio for a designer" is a complete and valid brief: the brief is
**what the client said**, not a specification. Making it usable is the contract's job, below.

### 2. Sources, each with its authority

Ask explicitly. Do not infer.

An unlabelled folder or Figma file frequently holds several generations of the same product. Any of
them can pass for current, and building against a superseded version is invisible until handover.

| Label | Means | Consequence |
|---|---|---|
| `authoritative` | the live current product | tokens may be `taken` from it |
| `reference` | a competitor, or something to learn from | measured, never taken |
| `historical` | superseded | read for context, never built against |
| `ignore` | not part of this | not read |

Four levels rather than `use` and `ignore`, because research's own definition of done asks for "what
it is and what authority it carries", and two values cannot carry a scale.

**A source labelled anything but `ignore` that cannot be opened stops intake.** A Figma file you have
no access to, a URL behind a login, a file that will not parse: name it and stop. The alternative is
discovering at token time that the system you were told to reuse was never readable, and
"refuse to invent and call it reuse" in `packages/research/rules/research.md` already forbids the way out
of that.

### 3. Environment facts

- Which **MCP servers and tools** are live
- **What only the human can do**: client access, credentials, approvals

pica checks the rest itself and does not ask: `playwright`, node, a package manager, a free port.

**Fonts are not an intake question.** They were until 2.0.0, because Figma's plugin runtime cannot load
a font installed during a session, but that is Figma's limit, and Figma is the derived artefact.
Design in whatever the direction needs; the family is declared in the tokens and on the kit page; the
port resolves it and reports substitutions; `font-check` verifies at handoff that the declared family
actually painted.

**State limitations before any capability claim.** What cannot be done, what needs the human, what
needs a tool that is not installed. Say it at hour zero, not on the day it blocks. Missing `playwright`
means nine checks abstain instead of three, and the whole measured gate goes quiet.

**Figma is not asked here either.** The declaration and the MCP check both happen at the port decision,
after the freeze, because that is when the answer is real and cannot go stale.

### 4. The field, named narrowly

"Retail banking dashboard used all day at a desk", not "fintech". "Clinic intake on a shared tablet",
not "healthcare". The narrow name has real products behind it that can be measured; the broad one has
only a mood.

Resolves against `packages/analyst/data/industries.json`. **An unresolvable field is refused, not
approximated**: the `ambiguous` register names what a vague word could mean and stops there.

**Confirmed with its consequences, not just its name.** Show the derived value, the brief section it
came from, and the two or three constraints that follow: *"finance → red means overdrawn, high
density, a regulator applies."* A wrong classification is invisible as a label and obvious as a
consequence.

### 5. The archetype, per application

What shape each application is: a CRM, an admin console, a portal, a dashboard. Resolves against
`packages/analyst/data/archetypes.json`.

**Per application, not per project.** A product with a client portal and a back-office console has two,
and they are different shapes with different screens. This is the same list the contract declares as
applications, and each one gets its own interactive prototype.

Archetype decides which products are worth measuring. Sector alone picks the wrong ones: a
multi-family-office portal should be measured against other wealth portals, not against retail banks.

### What is no longer asked, and where it went

| Was asked | Now |
|---|---|
| The commercial constraint | dropped. Only the disclosure policy ever reached a client-facing artefact, and it is recorded in the engagement scope and enforced by `disclosure-check` |
| Is Figma a deliverable | asked at the port decision, after the freeze |
| Which fonts are installed | not asked; verified at handoff instead |
| The audience | **researched, not declared.** `pica-discoverer` profiles it: most briefs cannot answer it, and a researched answer beats a guessed one |
| The trigger | removed. Discovery researches *why buyers change*, which is the same question asked where it can be answered |

---

## The contract

Restate the brief as a contract before any work starts. This is the **engagement** contract and core
owns it. The **product** requirements are `docs/prd.md` and the analyst owns those.

**Per work package:** acceptance criteria, in the human's own terms, not yours. If the brief says
"redesign the dashboard", the criteria are the four or five things that would make it good, agreed
before drawing.

**The declared viewports, each with its idiom**: native app, mobile web bare, or mobile web in a
device frame. The idiom decides the chrome and it is a human decision the flow may neither infer nor
default. A width of 375 says nothing about whether a home indicator belongs.

**The applications**, each with its archetype. Each one gets its own interactive prototype, linked to
the others for real.

**An exclusions list.** Everything the brief rules out, quoted from the brief. Then ask the human what
else to add, and **set `exclusionsConfirmed` once you have asked.**

That register exists because this artefact is weakest where it matters most. A thin brief rules nothing
out, so the quoted half is empty, and a thin brief is precisely the project whose scope will grow. The
ask is the whole defence, and an unrecorded ask is indistinguishable from one that never happened.

> This is the highest-value artefact in the whole flow. A screen the brief
> explicitly excluded got designed anyway, and it was caught two days later only because a human
> re-read the brief. The exclusions list turns that from luck into a check.

**The disclosure policy.** Anything the client must not be told, recorded here rather than as an intake
input. It is the one commercial fact that reaches every client-facing document, and `disclosure-check`
scans them against it.

**Package tiering.** Each package `standard` or `complex`. Complex if any of: no precedent in the
product, changes IA or navigation, no reference design exists, or the client will challenge the
decision. Present the labels for confirmation: the human knows which are harder than they look.

Costed delivery options are **not** produced here. pica no longer prices work.
