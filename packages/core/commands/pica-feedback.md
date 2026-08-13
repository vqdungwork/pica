# pica-feedback: triage feedback from someone else

Third-party feedback has arrived — client, reviewer, stakeholder. `$ARGUMENTS` is the feedback itself, or
a path to it. Screenshots usually come with it.

Load `${CLAUDE_PLUGIN_ROOT}/rules/review-discipline.md` and the figma package's
`figma-mcp.md`. For Figma reads, load the `figma-use`
skill and pass `skillNames: "figma-use"`.

This is not `/pica-review`. That one measures your own work against the HTML. This one takes someone
else's claims and establishes which are true.

---

## Mode

**Report first, always.** Set `activeReview` to `{"mode": "report"}` in `.pica/state.json` so the write
gate holds while you are still establishing facts. Clear it when the command ends, including on failure.

Fixing is a second pass with explicit authorisation, because the person giving feedback described a
**symptom** and the fix is frequently a decision.

---

## 1. Verify every claim before accepting it

A screenshot with an arrow on it is a symptom report, not a diagnosis. Measure the claim in the file
before agreeing with it, and before fixing it.

Each item lands in one of four buckets. Say which, for every item:

| Bucket | Meaning |
|---|---|
| **Confirmed** | measured in the file, with the number |
| **False positive** | the file is correct; say what the reviewer was probably seeing |
| **True, different cause** | the symptom is real, the stated cause is not |
| **Not reproducible** | cannot be measured; say what you checked |

"True, different cause" is the most valuable bucket and the easiest to skip. On the source project the
client reported an off-centre icon in a password field. The icon was not mis-aligned inside the input at
all: it was an 18x18 frame positioned absolutely **on the screen**, so it was 4px low on four screens and
16px high on the fifth, where the error state pushed the field down 20px. Re-centring the five copies
would have fixed the screenshot and left the cause in place.

## 2. Check the claim is even actionable

Some feedback asks for something the file cannot currently do, and saying so is part of the answer.

The same project was asked to bind all border widths to tokens. There was no `STROKE_FLOAT` variable
anywhere in the file, so there was nothing to bind to: the ask required **creating a scale first**. That
is a different conversation from "you missed some bindings", and reporting it as a simple omission would
have been wrong.

## 3. Generalise the class, not the scope

If a reviewer found one instance, find them all — that is the job. Their screenshot is a sample.

But keep two lists apart:

- **their items**, extended across the file
- **what you noticed while looking**

Present the second separately and let them choose. Merging the two turns their five-item note into your
forty-item rewrite, and the scope was theirs.

## 4. Distrust your own detectors

The detector you write to find every instance will produce false positives, and reporting those to a
client costs credibility. Three real ones from one session:

- frames inside a **kit-coverage annotation board** carry component names as labels, so a name-matching
  detector reported five detached instances that were text rows
- a **white glyph on a coloured logo circle** read as a contrast clash, because the coloured layer is a
  sibling of the glyph rather than an ancestor
- a regex for a sticker's copy matched ordinary body text that happened to contain the same letters

Corroborate before reporting: two independent signals, or one measurement you can state as a number. And
if three detectors in a row come back mostly noise, stop writing detectors and find ground truth — a
surviving correct example, the design's own convention, or the human. See `review-discipline.md`, Audit
integrity.

## 5. Look for the convention already in the file

Before inventing a value, look for the same element done correctly somewhere else. The file usually
answers the question.

Dark pills over media on one project were flattened to opaque by an earlier pass — but three of them had
been skipped, and those three still carried the project's real convention: bound to a `scrim` token at
0.68. That is a measured answer, not a guess, and it beats any value you would have picked.

## 6. Capture a baseline before fixing anything in bulk

the figma package's `scripts/capture-baseline.js`, before the fix pass, then again after. Feedback fixes are exactly the
situation this exists for: someone is watching, the file is already reviewed, and a regression introduced
while fixing a cosmetic note is the worst outcome available.

---

## Output

Write `docs/reviews/<date>-feedback.md`:

- their items, one row each, with **bucket + measured evidence + proposed fix**
- items needing a decision rather than a repair, stated as a question
- anything blocked, and what unblocks it
- separately: what you noticed, unprioritised

Then present it and **stop**. Do not fix in the same breath.

## Reply to the reviewer in their terms

They wrote prose, not a defect list. Answer point by point in the order they raised them, lead with the
verdict, and give the number. "The eye icon was 16px high on the error screen because the field shifts
down 20px in that state" is worth more than "fixed alignment issues".

Say what you changed beyond their ask, and why. Say what you deliberately left alone. Both build more
confidence than a clean-sounding summary.
