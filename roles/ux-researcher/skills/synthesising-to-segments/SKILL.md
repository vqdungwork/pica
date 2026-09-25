---
name: synthesising-to-segments
description: Turn interview material into ranked pain points with a frequency, an evidence class and a source — and segments defined by what people are doing.
argument-hint: "[the session notes or transcripts]"
intent: >-
  Synthesis is where research either becomes evidence or becomes an opinion with quotes
  attached. The difference is whether every claim can be traced back to something somebody did
  or said, and counted.
theme: discovery
best_for:
  - "Turning eight conversations into something the analyst can build on"
  - "Ranking pain by frequency rather than by how vividly it was described"
  - "Producing segments a designer can design for"
scenarios:
  - "I have twelve hours of interviews. Now what?"
  - "Everyone complained about something different."
estimated_time: "2–4 hours"
---

## Purpose

The output of research is not a summary. It is a ranked list of pains, each carrying how often
it appeared, how it was known, and who said it.

## Input

**Works best with:** raw notes or transcripts, per session, with the segment tagged.
**Also useful:** analytics, support tickets, anything that counts rather than describes.

## The method

**1. Affinity map before you name anything.** Cluster the raw observations first. Naming a
theme early makes every later observation fit into it.

**2. Give every pain three fields.** Frequency — how many sessions it appeared in. Evidence
class — observed, reported, or inferred. Source — which session. A pain missing any of the
three is not yet a finding.

**3. Rank by frequency and cost, not by vividness.** The most articulate complaint is not the
most common one, and one furious participant outweighs four mildly irritated ones in your
memory but not in the product.

**4. Separate what users want from what buyers want.** They are two lists and they conflict.
The person who signs and the person who uses are rarely the same, and designing for the signer
produces software people route around.

**5. Do not rank by what the product already does.** That is the strongest bias in synthesis:
the pains that match the planned solution feel more important.

**6. Map the current journey with its emotional curve.** Where it dips is where the pain
concentrates, and it is usually not where the client thinks.

## What good looks like

Every pain has a number beside it and a session behind it. A reader can pick any claim and
find the evidence in under a minute.

## Common failures

**Adjectives instead of counts.** *"Users are frustrated"* cannot be ranked or tested.

**Personas nobody interviewed.** A persona assembled from three plausible traits is fiction
with a photograph.

**Merging without provenance.** Two researchers' findings combined into one list where nothing
says who found what.

## Done when

```bash
node <pica>/roles/ux-researcher/scripts/discover-check.mjs .pica/state.json
```

returns zero findings — every segment has a job and a context, every pain a frequency, a class
and a source.
