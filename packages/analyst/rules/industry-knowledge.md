# Industry knowledge

Load this for step 2.1b, alongside `domain-knowledge.md`.

---

## Domain knowledge is not the regulation

For most of this project's life, "domain knowledge" meant which standard governs the exchange, who the
regulator is, and how long the data has to be kept. That is the part that is easiest to look up and the
smallest part of what actually matters.

**An education product built like an admin dashboard passes every other check in this repository.** The
tokens reference correctly, the geometry measures clean, the copy has next steps, every use case has a
screen. And a teacher opens it and knows in one second that whoever built it has never watched a
classroom.

What decides whether a product belongs to its sector is five things the regulation never mentions:

| | What it answers | What goes wrong without it |
|---|---|---|
| **Stakeholders** | who is in the room, and which of them can say no | a veto discovered after the contract |
| **Colour convention** | which hues the sector has already spent, and on what | spending red on a button in a product where red means overdrawn |
| **Style tradition** | what the sector settled on, and what misreads in it | a learner's screen that looks like accounting software |
| **Density** | how much belongs on one screen, per audience | a clinician paginated away from a fact they needed |
| **Tone** | how this sector is allowed to speak | reassuring a patient about an outcome the product cannot know |

---

## One product frequently has two or three densities

This is the discovery that keeps recurring across sectors, and it is the one most often missed.

- **Education**: low for the learner, high for the teacher's gradebook, medium and translated for the parent
- **Healthcare**: high for the clinician, because pagination hides facts, and low for the patient
- **Logistics**: low on the gloved handheld, very high on the dispatcher's desk
- **Energy**: medium for the customer, high in the control room, low in the field

**Declare each density separately or one of them will be wrong.** A single density decision applied to a
product with two audiences is a decision that serves neither.

---

## Colour in most sectors is already spent

`colour.reserved` records this as data rather than prose: **22 hues across 14 sectors**, each with what
it already means. The other 14 sectors carry `reservedNote` saying no hue is load-bearing there, because
silence and "none" look identical. `--show` prints the reserved list under the palette.

In consumer software a palette is a brand decision. In most sectors it is not, because the hues are
already carrying meaning the user learned somewhere else:

- **Red in healthcare means clinical emergency.** It was that in every hospital before it was anything in
  your product
- **Red in finance means negative or declined.** A red primary button destroys the one signal that has to
  stay unambiguous
- **Green, amber and red on a factory floor** are inherited from physical plant signage. Using them
  decoratively is a safety defect, not a taste disagreement
- **Blue on a food menu** reads as spoilage, because very little edible food is blue. It is fine in the
  booking flow and wrong on the plate
- **Red for a wrong answer to a young learner** carries a shame response that classroom practice has
  documented for decades

The knowledge base records these with the reason, because **a convention without its reason gets
overridden by the next person who finds it inconvenient**, and they cannot tell whether they are making a
correction or an error.

---

## Departing from a convention is allowed. Departing silently is not

The check does not require you to follow the sector's convention. It requires you to have **decided**.

Each of the five axes is either followed with a note saying how, or departed from with a reason. Silence
on an axis is the failure, because an undecided axis does not stay undecided — it gets filled with
whatever the model produced by default, and nobody can tell afterwards that a decision was never made.

```json
"industry": {
  "key": "education",
  "conventions": [
    { "about": "colour", "followed": true,
      "note": "blue base with an amber accent. Incorrect answers use a neutral state plus guidance, never red" },
    { "about": "style", "followed": true,
      "note": "friendly geometric with generous rounding on learner screens, restrained on the gradebook" },
    { "about": "density", "followed": true,
      "note": "three declared: learner comfortable, teacher dense, parent translated" },
    { "about": "typography", "followed": true,
      "note": "18px minimum body for under-11s, 1.6 line height, letterforms with distinct b/d/p/q" },
    { "about": "tone", "followed": false,
      "why": "client's house voice is formal and their market expects it. Encouragement is carried by what the copy offers next rather than by exclamation" }
  ],
  "forbiddenPrevented": [
    { "forbidden": "ranking learners against each other without an explicit decision to do so",
      "preventedBy": "progress is against the learner's own history. No cohort ranking exists in the data model" }
  ],
  "departures": [],
  "evidenceNote": ""
}
```

---

## A field that says nothing is not an answer

Every field in this register can be filled with a word that means nothing, and for one revision every
one of them was. A healthcare project with `"n/a"` in all five convention notes, `"not applicable"` in
every prevention, and ten waived stakeholders with no reason between them **passed all seven checks with
zero findings**. The whole gate was defeated by two characters, because each check only asked whether a
field was non-empty.

`domain-check` accepts "not applicable" everywhere, and is right to. It asks whether the question was
**asked**, and a null is a real answer to that. These checks ask whether the sector's requirement has a
**real** answer, and a null is not one. Two checks, two questions, and only one of them may accept a
void.

So a note, a reason or a prevention has to carry a thought: present, long enough to say something, and
not one of the phrases that empties a field while looking filled.

## Waiving is allowed. Waiving unsigned is not

Two registers exist for the cases where a sector requirement genuinely does not apply, and both need a
reason **and a name**:

```json
"stakeholdersNotApplicable": [
  { "role": "regulator", "why": "internal tool, never exposed to a supervised activity", "by": "client lead" }
],
"constraintsNotApplicable": [
  { "category": "retention",
    "why": "this build stores every habit on the device only, with no account and no server, so there is no retained record to set a period against. Revisit the moment accounts enter scope",
    "by": "client lead" }
]
```

A departure in `departures` works the same way: without a reason it does not silence anything, or the
register becomes the way round the register.

**Writing "not applicable" into `domainConstraints` does not waive anything.** That field answers a
different question, and three real projects had voided a sector requirement there — one of them with
sound reasoning, written in the place nothing reads it.

---

## An unknown sector fails, and that is the point

If a brief names a sector the knowledge base does not cover, `industry-check` **fails and refuses to run
the six checks below it.**

That is deliberate, and it is the same principle this repository keeps rediscovering in itself: a check
that returns zero on the thing it exists to catch is worse than no check. Passing an unknown sector would
mean **the least-supported projects get the quietest gate**, which is exactly backwards.

The failure message names the gap and says what closing it requires, because a gate that blocks without
saying what would unblock it is a gate people route around.

**This has already caught a real hole.** The project's own north-star test — a portfolio for a fullstack
developer — resolved to no sector at all, because the base had twenty-one industries and none of them was
professional practice. The check found that; reading the base would not have.

---

## Ambiguous terms are not guessed at

Four terms name two sectors each, and their conventions are opposites:

| Term | Could be | Why guessing is wrong |
|---|---|---|
| `training` | education / fitness | one avoids red for failure to protect a learner, the other to protect a habit |
| `delivery` | hospitality / logistics | warm appetite palette against high-contrast sunlight-readable utility |
| `games` | gaming / media | diegetic art-directed against editorial |
| `infrastructure` | construction / devtools | hi-vis site conventions against a dark-first developer console |

The check reports the ambiguity and stops. Set `state.industry.key` to resolve it.

---

## Reading the base

```bash
node packages/analyst/scripts/industry-check.mjs --list
node packages/analyst/scripts/industry-check.mjs --show education
node packages/analyst/scripts/industry-check.mjs --audit     # the base against itself
```

`--audit` reads the base for contradictions: a sector whose own tradition is one it rules out, a
constraint category `domain-check` does not know, a reserved hue that no part of the entry states as a
constraint, a colour to avoid with no reason, an exemplar list that repeats itself, a name that means two
sectors without being recorded as ambiguous. **Run it after editing `industries.json`.** The base was
prose until 0.8.0 and the only way to find a sector contradicting itself was to read all twenty-eight
entries, which is the reading-is-not-measuring failure this project was built around.

`--show` prints every stakeholder with what they want, what they fear and what that means for the design;
the standards and the regulator; the colour convention with its reasons; the style tradition and what it
rules out; density, typography and tone; what the sector treats as a defect; and shipped products worth
measuring at step 1.7.

**Read `--show` before step 3.1.** The direction is where sector knowledge either lands or does not, and
the base exists so that a direction can be argued from precedent rather than from taste.

---

## Extending it

The base is `packages/analyst/data/industries.json`. A new sector needs every field the others carry, and
the two that take real work are the ones worth taking it over:

- **`colour.avoid`** — each entry needs `what` and `why`. An avoidance with no reason will be overridden
- **`forbidden`** — what this sector treats as a defect regardless of what the client asked for. These
  become required entries in `forbiddenPrevented`, so each one has to be preventable by a design decision
  rather than a policy

`aka` entries must not collide with another sector's own name. A collision between two `aka` entries is
recorded as ambiguous and the check refuses to guess, which is the correct outcome.

---

## Definition of done

- [ ] `state.field` resolves to exactly one sector, or `state.industry.key` names it
- [ ] Every stakeholder the sector says can decide or veto is in the register, or waived with a reason and a name
- [ ] Every constraint category the sector requires is present in `domainConstraints` with a real constraint, or waived in `constraintsNotApplicable` with a reason and a name
- [ ] No note, reason or prevention is a void phrase. "n/a" is not an answer to any of these questions
- [ ] All five convention axes carry a decision: followed with a note, or departed from with a reason
- [ ] Every sector-forbidden pattern has a named prevention, not an acknowledgement
- [ ] The direction's tradition is not one the sector rules out, or the departure is recorded
- [ ] At least one product from the sector appears in the measured research
- [ ] Where the sector has more than one audience, each density is declared separately
