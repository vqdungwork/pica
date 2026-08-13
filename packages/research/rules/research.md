# Research rules

Nothing gets designed before the product is understood. Load this for steps 1 and 2.

---

## The intake packet

Five inputs. **Refuse to start without all of them**, and say which are missing rather than proceeding
on assumptions.

### 1. The brief, raw and unedited

Not a summary, not your restatement. The original text.

Paraphrasing at intake loses the exact wording, and the exact wording is what settles disputes later.
On the source project the phrase "we do not mean the subscription plan picker" was the only thing that
proved a screen should never have been designed.

### 2. Sources, each labelled `use` or `ignore`

Ask for the label explicitly. Do not infer it.

An unlabelled folder or Figma file frequently holds several generations of the same product. Any of
them can pass for current, and building against a superseded version is invisible until handover.

Write the labels down. They are part of the contract.

### 3. The commercial constraint

Hours or days available. Whether it is fixed-scope or time-and-materials. Any existing estimate the
work has to stay consistent with. And explicitly: **anything the client must not be told.**

That last item is real. On the source project the delivery came in well under the estimate it was
carved from, and revealing that would have invited a discount on a quote that was correctly priced for
the full job. The disclosure policy was set at intake and recorded, so no later document leaked it.

### 4. Environment facts

- Which fonts are installed locally, and which are missing
- Which MCP servers and tools are live
- **What only the human can do**

That third one prevents the most tedious failure mode. Locally installed fonts are invisible to a
plugin runtime, so only the human can install or switch them. On the source project this was
discovered mid-build and cost at least six install-and-flip round-trips, each one invalidating a
review.

Ask at hour zero. It takes one minute.

### 5. One declaration: is Figma a deliverable

This decides whether four of the nine steps exist. It changes the plan, the hours and the closeout
checklist, so it cannot be answered later.

---

## The contract

Restate the brief as a contract before any work starts.

**Per work package:** acceptance criteria, in the human's own terms, not yours. If the brief says
"redesign the dashboard", the criteria are the four or five things that would make it good, agreed
before drawing.

**An exclusions list.** Everything the brief rules out, quoted from the brief. Then ask the human what
else to add.

> This is the highest-value artefact in the whole flow. On the source project a screen the brief
> explicitly excluded got designed anyway, and it was caught two days later only because a human
> re-read the brief. The exclusions list turns that from luck into a check.

**Options, costed in one table.** Two or three delivery approaches, each with a comparable total. Two
options that cannot be compared are not a choice.

**Limitations, before any capability claim.** What cannot be done, what needs the human, what needs a
tool that is not installed. Say this first, not when you hit it.

---

## Audit breadth

Audit every source labelled `use`. Then audit **the sources the brief implies but does not name.**

If the brief says reuse an existing design system, the audit covers **where that system actually
lives**, not only the artefact being redesigned. A mobile app redesign that claims to reuse a desktop
design system has to look at the desktop product. On the source project the desktop site went
unexamined until the human asked "can you audit the website too", and that audit produced the entire
token foundation.

Log findings with stable IDs so later documents can cite them.

## Refuse to invent and call it reuse

If the brief claims an existing design system and no accessible source for it exists, **say so.**

The honest options are: ask the client for the file, or derive a system from the product's public
surface and label it as derived. What is not acceptable is inventing a system and presenting it as
reuse, because the whole commercial basis of a "reuse the existing system" estimate depends on that
being true.

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

Guardrail: the result must still read as the client's brand, not a new one. Drifting to an unrelated
identity contradicts a reuse estimate.

Output `tokens.json` and `tokens.css` from the same source, so the HTML and Figma sides cannot drift.

## Mock data provenance, which matters as much as token provenance

Real-looking data is self-certifying, and that is what makes it dangerous. Nobody checks a screen that
looks right. On the source project, where the mock data came from the product's own seed, the defects were:

- a real person's name under someone else's job title
- an identifier that belongs to a **different** real person in the roster, invented to fill a row
- a feed whose newest item predated the screen's own "today"
- a notification crediting the wrong author for a real post
- a post that no screen in the flow could produce

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

A rule stated in conversation lasts about a day. On the source project three of them arrived as asides and
all three had to be enforced mechanically afterwards:

| Rule | Register | Enforced by |
|---|---|---|
| a banned punctuation mark in product copy | `copyRules` | a rewriter over text nodes and the spoken attributes, plus a count that must reach zero |
| a mixed-case wordmark that must never be upper-cased | `copyRules` | exact-case grep across every file |
| the person's own record is read-only on this surface | `dataOwnership` | no editable control inside the declared read-only regions |

Two details the punctuation rule needed before it could run, and both were found by running it: script,
style and comment text are not product copy and must be skipped, and a mark at the boundary **between two
inline tags** is joining them, so deleting it welds two words together. Substitute by what follows the mark
rather than deleting it blindly.

## Declare who owns each piece of data

When a surface is one of several clients of the same account, write down what it may change, per entity,
before designing anything that looks editable.

```json
"dataOwnership": [
  { "entity": "the person's own record", "ownedBy": "launcher", "thisSurface": "read", "why": "changed once, centrally" },
  { "entity": "requests they raise",     "ownedBy": "this",     "thisSurface": "create, cancel" },
  { "entity": "approvals they give",     "ownedBy": "this",     "thisSurface": "approve, reject" }
]
```

Read-only is not a blanket. On the source project an instruction that the user's data could not be changed
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
