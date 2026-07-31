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
