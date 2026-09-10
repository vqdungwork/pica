# Research rules

Nothing gets designed before the product is understood. Load this for steps 1 and 2.

---

## Audit breadth

Audit every source labelled `use`. Then audit **the sources the brief implies but does not name.**

If the brief says reuse an existing design system, the audit covers **where that system actually
lives**, not only the artefact being redesigned. A mobile app redesign that claims to reuse a desktop
design system has to look at the desktop product. The desktop site went
unexamined until the human asked "can you audit the website too", and that audit produced the entire
token foundation.

Log findings with stable IDs so later documents can cite them.

## Refuse to invent and call it reuse

If the brief claims an existing design system and no accessible source for it exists, **say so.**

The honest options are: ask the client for the file, or derive a system from the product's public
surface and label it as derived. What is not acceptable is inventing a system and presenting it as
reuse, because the whole commercial basis of a "reuse the existing system" estimate depends on that
being true.

## The direction, and why pica ships no catalogue of fields

Every product has a house style its field already expects, and a brief almost never states it. Before any
token is written, the flow proposes one and the human settles it. That is step 2c.

**pica holds no built-in knowledge about fields.** There is no table here saying banking means small radii
or that healthcare means blue. Such a table would be exactly the thing this file already refuses:

> "Best practice suggests" is not research. Name real products and real conventions.

A canned catalogue is a preference with a confident tone, it cannot be defended in a client review, and it
is wrong the moment a field moves. What pica ships instead is the method, which does not go out of date.

### Deriving a direction

1. Take the field, audience and conditions from intake input 6.
2. Find **three to five real products** in that field that a client would recognise. Named products, not
   categories.
3. **Measure them.** Corner radius, control height, how many hues the interface actually spends, whether
   figures are tabular, how tight the spacing scale runs. A screenshot and a ruler is enough; a browser's
   inspector is better.
4. Write down what they agree on, and — more informative — what they disagree on. Where a field is
   unanimous, that is a convention and departing from it costs something. Where it is split, that is a
   genuine choice and it belongs to the human.
5. Propose **two or three named directions**, each citing what it was derived from, each with the
   consequences spelled out in numbers.

A precedent with no measurement is not a precedent. "Stripe feels clean" cites nothing. "Stripe's dashboard
runs a 6px radius, 32px controls, tabular figures and two hues" is a position that survives a review.

### Two modes, and the second one is where the value is

**Propose** — no accessible brand exists. The directions are the palette's origin. The human picks one and
that pick is what step 2d derives tokens from.

**Audit** — a brand exists and tokens were taken from it. The direction is then *the client's own system*,
and the job is not to replace it but to **score it against what its field does** and report the gaps. A
retail banking dashboard whose figures are proportional, or whose controls are 24px on a screen people
work in all day, is worth one question before a hundred screens inherit it.

The audit mode never overrides the brand. It asks. Everything in "Refuse to invent and call it reuse"
still holds, and so does the guardrail that the result must read as the client's brand rather than a new
one. Each gap the human accepts is written into `deviations` **with the reason**, because an accepted gap
and an unnoticed one look identical three weeks later.

### The direction is written as numbers or it is not written

```json
"direction": {
  "name": "Instrument",
  "field": "retail banking dashboard",
  "mode": "propose",
  "precedent": [
    { "product": "<real product>", "measured": "radius 6, control 32, tabular figures, 2 hues" },
    { "product": "<real product>", "measured": "radius 6, control 36, tabular figures, 2 hues" }
  ],
  "rationale": "Figures are the content. Large radii and a wide palette both cost column scannability.",
  "assert": {
    "radius.max": 8,
    "control.height.min": 32,
    "numerals.tabular": true,
    "hue.count.max": 3
  },
  "deviations": []
}
```

`assert` is the part that survives. A direction agreed in conversation and recorded as prose lasts about
as long as a copy rule does — which is to say, about a day — and this file already has a table of three
that had to be made executable after the fact. `verify-html` reads `assert` and fails the package on a
breach, so the direction is still in force at package eleven. Every field in `assert` is optional; what is
not optional is that a declared direction assert **something**, since a direction that asserts nothing
passes every screen by default and is worse than none.

`radius.max` and `control.height.min` / `.max` are in px. `hue.count.max` counts non-neutral colour in 30°
buckets across the whole capture, so two shades of one blue are one hue and a three-hue budget cannot be
spent one screen at a time. `numerals.tabular` is only meaningful as `true`.

## Token provenance

Every token records where it came from and whether it was **taken** or **derived**.

```json
{
  "color.primary.700": { "value": "#1f2328", "source": "web/buttons", "origin": "taken" },
  "color.accent.500":  { "value": "#d97706", "source": "derived",     "origin": "derived",
                          "rationale": "existing accents were incoherent across surfaces" }
}
```

Provenance is what lets you defend the palette in a review. "Derived and refined, here is the
rationale" is a position. "It looked good" is not.

A token with no client source takes a third origin, **`proposed`**, and it carries the direction and the
precedent it came from:

```json
"color.accent.500": { "value": "#1d4ed8", "source": "direction:Instrument", "origin": "proposed",
                      "precedent": "<real product>, measured", "rationale": "field convention, 2 hues" }
```

`taken` and `derived` both claim a client source. `proposed` claims a **field** source, and keeping it a
separate word is what stops a greenfield palette from later reading as reuse.

Guardrail: the result must still read as the client's brand, not a new one. Drifting to an unrelated
identity contradicts a reuse estimate.

Output `tokens.json` and `tokens.css` from the same source, so the HTML and Figma sides cannot drift.

## Mock data provenance, which matters as much as token provenance

Real-looking data is self-certifying, and that is what makes it dangerous. Nobody checks a screen that
looks right. When mock data is drawn from a real seed, five defect shapes recur and every one renders as
a plausible screen:

- a name paired with somebody else's job title
- an identifier that belongs to a **different** record in the same set, invented to fill a row
- a feed whose newest item predates the screen's own "today"
- a notification crediting the wrong author
- an item no screen in the flow could produce

Each one reads as authoritative. So:

**Cross-reference against the source, and assert ownership rather than membership.** The first version of
that check confirmed the value existed somewhere in the source data, which is exactly why it passed on an
identifier belonging to somebody else. It has to bind each value to the **nearest name in the markup**, and it has to
strip relationship fields (`Manager`, `Approver`, `Reviewer`) first, or a row resolves to the person it
references instead of the person it is about.

**Identify a row by the name beside it, never by initials.** In a 32-person roster, 14 initial forms were
ambiguous, and a plausible face on the wrong row invites even less scrutiny than a plausible job title.

**A nullable field is two states, and both are content.** 12 of 32 people in one roster had an account
photo and only 9 of those were usable, so the prototype shows photographs and initials side by side,
because that is what the product renders. Filling the gap with a generated face would have designed away a
state the build has to handle.

**Internal consistency is a check, not a proofread.** Dates monotonic against the screen's own today,
counts equal to the rows they count, authors matching between an item and the notification about it, every
referenced entity reachable from some screen.

## Client rules become contract entries, and each one gets an executable

A rule stated in conversation lasts about a day. Three of them arrived as asides and
all three had to be enforced mechanically afterwards:

| Rule | Register | Enforced by |
|---|---|---|
| a banned punctuation mark in product copy | `copyRules` | a rewriter over text nodes and the spoken attributes, plus a count that must reach zero |
| a mixed-case wordmark that must never be upper-cased | `copyRules` | exact-case grep across every file |
| the person's own record is read-only on this surface | `dataOwnership` | `verify-html`'s `data-ownership` check: no `<input>`, `<textarea>`, `<select>` or `<button>` inside the declared `region` |

Two details the punctuation rule needed before it could run, and both were found by running it: script,
style and comment text are not product copy and must be skipped, and a mark at the boundary **between two
inline tags** is joining them, so deleting it welds two words together. Substitute by what follows the mark
rather than deleting it blindly.

## Declare who owns each piece of data

When a surface is one of several clients of the same account, write down what it may change, per entity,
before designing anything that looks editable.

```json
"dataOwnership": [
  { "entity": "the person's own record", "ownedBy": "launcher", "thisSurface": "read",
    "region": "profile-card", "why": "changed once, centrally" },
  { "entity": "requests they raise",     "ownedBy": "this",     "thisSurface": "create, cancel" },
  { "entity": "approvals they give",     "ownedBy": "this",     "thisSurface": "approve, reject" }
]
```

Read-only is not a blanket. An instruction that the user's data could not be changed
on mobile was taken too far on the first pass and disabled the request and approval flows, which are the
reason the product exists. The correction was that **the person's record** is view-only while everything a
person *does* stays interactive. A per-entity table makes that distinguishable; a sentence in a review
document does not.

The same table settles the launcher question: one application owns the account, every other application
syncs from it and can never write to it. Design the others without an edit affordance at all, rather than
with one that fails.

## Precedent research

For anything the product does not already do, research how real products do it, and **cite what you
found**.

Name real products and real conventions. "Best practice suggests" is not research. On the source
project, "research how a named video platform behaves on its live surface, then adapt it" produced a
control layout that survived review, after an invented one had not.

Where a platform's own guidelines have something to say, quote them. A convention you can attribute
is defensible in a client review; a preference is not.

## Ask, then research, then propose

The order matters. A question the human can answer in ten seconds should not be researched for an
hour. Collect the open questions, ask them together, and research only what remains genuinely open.

---

## Definition of done

This file had none, and its criteria appeared in no other rule's either: the intake packet, token
provenance, `copyRules` and `dataOwnership` were governed by prose alone. Nothing here is new; each line
restates a rule stated above.

**Intake, step 0.4 to 1.3**

- [ ] The brief is on disk verbatim, before anyone tidied it
- [ ] Every source named in the brief is labelled with what it is and what authority it carries
- [ ] What was asked for and not supplied is recorded, with what its absence costs
- [ ] `exclusionsConfirmed` set once the client has been asked what the brief rules out
- [ ] The field is narrowed to a name with real shipped products behind it, at `state.field`

**Audit and tokens, step 1.6 to 3.2**

- [ ] Three to five shipped products measured, never concepts
- [ ] Every token records its source and whether it was **taken** or **derived**
- [ ] A derived token records what it was derived from and by what rule
- [ ] Tokens sit in three tiers and each references exactly one tier below, never sideways, never skipping
- [ ] `schema-check.mjs` returns zero

**The client's own rules, recorded so something can read them**

- [ ] Every copy rule stated in conversation is in `copyRules` with a pattern and an expected count
- [ ] Every entity whose ownership is not ours is in `dataOwnership`, with the `region` that locates it
- [ ] Mock data bound to the nearest real name, with its provenance recorded
