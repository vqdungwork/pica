# Proposal rules

Load this at 0.5, and again before each slot's phase.

Everything else in pica is about deciding correctly. This file is about **which decisions are not
pica's to make**, and how to hand those back without handing back a questionnaire.

---

## The law

> **Propose where the decision is the client's AND they can judge it by looking.
> Decide silently where it is craft AND looking would not help them.**

Both halves matter. A decision that is theirs but unjudgeable — "Postgres or MySQL" — is not a
question, it is a transfer of risk to someone with no instrument to carry it. A decision that is
judgeable but not theirs — which easing curve a sheet uses — is a question that costs their attention
and buys nothing.

**The failure this prevents runs both ways.** A flow that asks nothing produces a design the client
first sees fully built, in one direction, with the taste question already answered by whoever wrote it.
A flow that asks everything produces a client who stops reading by the fourth question and approves the
rest, which is worse than not asking: it looks like consent.

---

## The slots are universal. What fills them is derived.

This is the whole design, and getting it backwards is the obvious mistake. A rule that said *"offer
streak, chain or run as the name"* is a habit-tracker rule wearing a general one's clothes, and it is
noise on a payments product.

**Every slot below exists on every project.** What goes in it comes from the sector entry, the
measurement and the analysis — never from a list in this file. A slot whose material this project does
not have is **skipped with a reason recorded**, the same way every other absence in pica is, because a
question nobody asked and a question with no answer look identical afterwards.

| | Slot | Fills from | When |
|:--:|:--|:--|:--|
| **S1** | Direction | `measured` products, `style.tradition`, `style.notThis` | always |
| **S2** | Default mode and density | `colour.leads`, `density` | always |
| **S3** | The sector's signature moment | the stakeholder whose `designImplication` names it | when the sector names one |
| **S4** | The word the product turns on | `delta` crossed with `glossary` | when the delta turns on a term |
| **S5** | Who sees what | `stakeholders` crossed with `forbidden` | when two or more actors share data |
| **S6** | What is in the first release | `useCases` priced against `estimate` | always |
| **S7** | Where it runs | `targets`, in consequences rather than platforms | always |

---

## S1 · Direction

**Three, rendered as the same screen three times.** Not three palettes, not three type scales, not a
mood board. The busiest real screen the analysis produced, built three ways, with the same content.

A client cannot judge `--radius-lg: 12px`. They can judge two screens side by side in three seconds, and
the judgement they make is the one that matters: *is this the product I wanted*.

Each option carries:

- **the tradition it names**, from the ten in `design-vocabulary.md`
- **the measured product it argues from**, and the numbers that make the argument
- **what it costs** — a denser direction fits more and reads slower; a warmer one reads faster and fits
  less
- **why the sector might refuse it**, when `style.notThis` rules it out

**One of the three should be the sector's own tradition.** Offering three departures and no baseline
makes the baseline unavailable, which is a choice made by omission.

**Never offer an option you would refuse to build.** A three-way where one is deliberately weak is not a
choice, it is a rendering of a decision already made, and the client can feel it.

---

## S2 · Default mode and density

Two questions that look like taste and are conditions of use.

**Mode.** The sector says which is normal — `colour.leads` carries it, and for several sectors dark is
the default rather than the alternative. The client knows something the sector does not: when and where
they will actually use it. Ask in those terms. *"Early mornings and a dim room"* is an answer; *"dark
mode?"* invites a preference and gets one.

**Density.** Several sectors name more than one density in a single product, and **that is itself the
proposal**: whether this build carries one surface or two. Two densities is a real cost and a real gain,
and it is a decision the client should make knowing which.

---

## S3 · The sector's signature moment

Every sector base entry carries the failure that field designs into its own products. Fitness: the
broken streak. Finance: the silently failed transfer. Education: being shown you are behind, in front of
others. Pharmacy: the look-alike name.

**This is the highest-value proposal in the flow and it is the one nobody thinks to make**, because it
does not look like a design question. It looks like an edge case, gets built the obvious way, and the
obvious way is the one the sector base says causes the damage.

The slot is universal. The moment is read from the sector — never invented here, and never carried over
from the last project.

**Offer how the product behaves at that moment, not how it looks.** Three plausible behaviours, each
honest about what it costs. And **every option must clear the sector's `forbidden` list**: if a
behaviour is one the field treats as a defect, it does not go in the set. Offering it and letting the
client pick it launders a defect through their approval.

---

## S4 · The word the product turns on

The delta names what changes. Usually one term carries it, and that term will be read a thousand times.

Offer the alternatives **with what each implies**, not as a vocabulary preference. A word that describes
a streak of days differently is a different promise about what happens when it ends; a word that
describes a payment state differently is a different promise about whether it can be undone.

**Skip this slot when the delta turns on no term** — a rebuild with the same vocabulary, a product whose
words the client already owns. Skipping is normal. Skipping silently is not.

---

## S5 · Who sees what

Runs only when the analysis found two or more human actors with anything shared between them, which is
most products and not all of them.

**Default visibility is a product decision with a legal edge**, and several sectors list a default in
their `forbidden` entries — default-public sharing of health or location data is one. Those constraints
bound the options; they do not replace the question.

Offer it as **what each person sees of the other**, in their own words, with a worked example. Not as a
permissions matrix. A permissions matrix is a correct artefact that a non-technical reader approves
without reading.

---

## S6 · What is in the first release

**Every use case, with what it costs, and a line the client draws.**

The estimate exists by phase 5 and the use cases by 2.7, so this is the one proposal that can be priced
rather than argued. It runs at CONFIRM 2, where scope is being frozen anyway — the difference is that
the client sees the price of each thing they are freezing rather than the total of all of them.

**Show hours or days, never story points.** A unit the client cannot convert is a unit that hides the
decision.

---

## S7 · Where it runs

Ask in consequences. **Never in platforms.**

*"Only on your phone, or on a laptop too?"* is answerable by anyone. *"iOS native or React Native?"* is
answerable by about four per cent of clients and is the wrong question anyway: the platform follows from
the answer, and `targets` records it.

State the asymmetries the client is buying, from `native-mobile.md`: a native build is two release
pipelines and one of them cannot be rolled back the way the web can, an iOS defect costs days rather
than minutes, and a lost Android signing key ends the listing.

---

## Every option carries its provenance

An option with no source is a preference the model had, dressed as a recommendation. Each one names
where it came from: a measured product and its numbers, a sector field and its reason, a use case and
its cost.

This is the same rule as everywhere else in pica. A direction argued from no measured precedent is a
preference wearing a rationale, and it does not become a choice by having two siblings.

---

## Options in a slot differ on one stated axis

Three options that differ on everything are not comparable, and the client picks the one that renders
best rather than the one that fits. Name the axis — density, warmth, how much the product says when
something goes wrong — and hold the rest constant.

**A slot with one option is not a proposal.** It is a decision being shown, and it should be reported as
one rather than presented as a choice.

---

## The choice is recorded, with who and when

`state.proposals` is the register, and `proposal-check.mjs` reads it:

```json
"proposals": [
  { "slot": "S1", "presented": true, "axis": "how much the product says at a glance",
    "options": [
      { "id": "A", "names": "flat",     "from": "measured: Streaks — 2 hues, 1 radius, no motion",
        "costs": "fits less on a screen, reads faster" },
      { "id": "B", "names": "editorial", "from": "measured: <product> — 5 hues, serif display",
        "costs": "slower to scan, stronger identity" },
      { "id": "C", "names": "material",  "from": "sector tradition, the baseline",
        "costs": "familiar, and familiar to a fault" }
    ],
    "chosen": "A", "by": "<the person>", "on": "2026-09-07",
    "why": "their words, not a paraphrase" },

  { "slot": "S4", "presented": false,
    "skipped": "the delta turns on no term; the client's existing vocabulary carries through unchanged" }
]
```

**`why` records what they said, not what you concluded from it.** A paraphrase is a second decision
wearing the first one's authority, and by review round three nobody can tell which of the two is being
defended.

---

## What this cannot do

It cannot tell you an option set was *good*. Three weak options produce a choice, a recorded decision, a
clean check and a bad product, and nothing here can see it. `proposal-check` verifies that a slot was
addressed, that options carry provenance, that they differ on a stated axis, and that a choice was
recorded. **Whether the three were worth choosing between is a human's judgement, and the report says so
on every run.**

It also cannot stop a client approving without reading. The defence against that is few slots, each
answerable by looking, and the expensive ones asked first.

---

## Definition of done

- [ ] Every slot is either presented or skipped with a reason in `state.proposals`
- [ ] Every presented slot names the axis its options differ on
- [ ] Every option names its provenance — a measured product, a sector field, or a use case with a cost
- [ ] No option violates the sector's `forbidden` list
- [ ] Every presented slot records a choice, who made it, when, and their own words
- [ ] S1 rendered the same screen three times, with the same content
- [ ] S6 priced each use case in hours or days, never in points
- [ ] S7 was asked in consequences, and `targets` records what the answer implies
- [ ] The report said which slots a human still has to judge the quality of
