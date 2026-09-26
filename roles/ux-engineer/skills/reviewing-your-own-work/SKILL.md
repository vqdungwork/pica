---
name: reviewing-your-own-work
description: Critique what you built, three to five times, a different question each pass, and write down what each pass found — before anyone else sees it.
argument-hint: "[the screens you just built, and a renderer if you have one]"
intent: >-
  Blind evaluation runs once, at the end, on everything. Nothing asks the builder to look
  again before handing over, so defects visible in one screenshot reach the client instead,
  one round each. Looking five times with the same question is re-reading; the passes work
  because they ask different things.
theme: build
best_for:
  - "Before reporting any screen as done"
  - "After a round where a client found something in seconds that a builder missed"
  - "Any surface that summarises, where the five-second pass is the whole job"
scenarios:
  - "The build passed every check and the client called it unusable"
  - "A defect was visible in a screenshot and invisible in the diff"
  - "You have no renderer and need to say so honestly"
estimated_time: "20–30 minutes for five passes on one screen"
---

## Purpose

pica runs a blind evaluation at 5.6: three to five evaluators, one lens each, no write access. It
runs **once, at the end, on everything**.

Nothing asks the person who built a screen to look at it again before handing it over.

The cost is measurable. On one engagement a client found, in seconds and across four separate
rounds: the build was ugly, it broke below 1440px, the guideline was tangled into the screen, the
demo was built for the wrong user, the report was a wall of text, and there was no way between the
two applications. Every one of those was visible in one look at the finished artefact. None was
caught by the builder, who had reported the work as done each time.

**Looking at the same thing five times with the same question is not review. It is re-reading.**
What makes repeated critique work is a different question each pass.

<!-- enforced-by: none — judgement, not decidable by a script -->

## When this runs

Before you report anything as done. Not after a reviewer asks.

<!-- enforced-by: none — judgement, not decidable by a script -->

## The method

Render it. Then run these passes in order, and **write down what each one found, including the
passes that found nothing** — a pass that found nothing is evidence; a pass nobody recorded is not.

**Pass 1 — the five-second pass.** Open it and look for five seconds. What did you learn? If the
honest answer is "I would have to read it", say that. For any surface that summarises — a report, a
dashboard, an overview — this pass is the whole job, and failing it is not a detail.

**Pass 2 — the count.** Count displayed strings of prose against graphic marks. Count rows above
the fold. Count taps to the primary action. Numbers, not impressions. A report at 26 strings to 4
marks is a document, whatever else it is.

**Pass 3 — the wrong-user pass.** Who is this for, and what does their job make them need? A
founder scanning thirty-four people needs shape. An employee confirming six items needs
identification. Re-read the screen as that person, with their five seconds, not as its author.

**Pass 4 — the empty and broken pass.** Render every declared state, not the happy one. The empty
state, the stale state, the error, the first-run. Then break it: the longest plausible string, the
narrowest viewport, zero rows, forty rows.

**Pass 5 — the what-would-I-remove pass.** Name three things you would delete. If you cannot name
three, you have not looked hard enough; if deleting any of them would not be missed, delete it now.

<!-- enforced-by: none — judgement, not decidable by a script -->

## Say what you could not check

If you have no renderer, say so in the report, plainly, in a sentence. That sentence is what tells
a reviewer where to look — on one project it is exactly what led a coordinator to find a 1312×1312px
icon and 32px of horizontal overflow that a complete arithmetic audit had passed.

Claiming a pass you did not run is worse than skipping it, because it spends the reviewer's trust
on the passes you did run.

<!-- enforced-by: none — judgement, not decidable by a script -->

## What good looks like

Five short findings, one per pass, written before the handover. At least one of them uncomfortable.
A report that says "pass 1 failed: I could not tell what this screen was for without reading it" is
worth more than a green summary, and it costs one round instead of four.

<!-- enforced-by: none — judgement, not decidable by a script -->

## Common failures

**Reviewing the code instead of the artefact.** The defects that reach a client are visible in a
screenshot and invisible in a diff.

**Running all five passes as one.** They find different things precisely because they ask different
questions; collapsed together they become "does it look alright", which is pass zero and always
passes.

**Reporting the passes that succeeded.** The useful half is what failed.

<!-- enforced-by: none — judgement, not decidable by a script -->

## Done when

Five passes are written down, each with what it found, including the ones that found nothing — and
at least one finding is uncomfortable. Every declared state for the screen has been rendered, not
just the happy one. The counts from pass 2 are numbers in the report. If you had no renderer, the
report says so in a sentence, and says which passes were therefore not run.

```bash
node <pica>/roles/ux-engineer/scripts/screen-states-check.mjs .pica/state.json
```

A report whose five passes all succeeded is a report that ran pass zero five times.

## Pass 6 — the two-screen pass

Added after a client, not a check, found that a phone frame changed size between two screens of
the same product. Open **two** screens of the build side by side and ask what differs that should
not: the device's own dimensions, the header's height, where the first row starts, whether a
marker sits at the same offset, whether a scroll region behaves the same way.

Every pass before this one looks at one screen. A defect that only exists as a **difference
between** screens is invisible to all of them, and it is the defect a person notices first,
because switching is what they do with the product and looking is what a reviewer does to it.
