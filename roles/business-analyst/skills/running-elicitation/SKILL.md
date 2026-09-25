---
name: running-elicitation
description: Surface what stakeholders actually need rather than what they asked for — the BABOK distinction that decides whether requirements describe the problem or your assumptions about it.
argument-hint: "[the stakeholder, or the area to elicit]"
intent: >-
  BABOK states the purpose plainly: elicitation exists to ensure a stakeholder's actual
  underlying needs are understood, rather than their stated or superficial desires. A BA who
  writes down what was said is a scribe.
theme: analysis
best_for:
  - "A stakeholder who describes a solution instead of a problem"
  - "Getting to the rule behind the request"
  - "Finding the constraint nobody mentioned because everybody knows it"
scenarios:
  - "They asked for a dropdown. Why?"
  - "Two departments described the same process completely differently."
estimated_time: "45–90 min per session"
---

## Purpose

Skipping the first beat of BABOK's four — elicitation, analysis, specification, validation —
produces requirements that describe your assumptions rather than their problem.

## Input

**Works best with:** who you are talking to and what they own.
**Also useful:** the AS-IS as currently understood, so you can test it rather than ask for it.

## The method

**1. Ask for the last time it happened, not the policy.** Policy is what people believe the
rule is. The last instance is what the rule actually is, including the exception nobody
documented.

**2. When they describe a solution, ask what it would prevent.** *"We need a dropdown"* becomes
*"what goes wrong when it is free text"* becomes the validation rule you were actually after.

**3. Find the rule's owner and its source.** Every business rule has somebody who can change it
and a document or a decision it came from. A rule with neither is a habit, and habits are
negotiable in a way regulations are not.

**4. Ask what happens when it fails.** The exception path is where the real complexity lives
and where the stated process is always thinnest.

**5. Interview the people who disagree, together and separately.** Two departments describing
one process differently is not a communication problem to smooth over — it is two processes.

**6. Say back what you heard, in their vocabulary.** If they correct your word, that word goes
in the glossary. The glossary is built here, not afterwards.

## What good looks like

Every rule has a source and an owner. The exception paths are as well described as the happy
one. Terms are theirs, not yours.

## Common failures

**Writing down the request.** The request is a hypothesis about a solution.

**Accepting "it depends" and moving on.** That is the moment the real rule was about to appear.

**Building the glossary at the end.** By then you have written 40 pages in your own words.

## Done when

Every elicited rule carries a source and an owner, and the terms you are using came back
uncorrected from the person who owns them.
