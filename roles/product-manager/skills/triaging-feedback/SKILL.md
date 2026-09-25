---
name: triaging-feedback
description: Sort client or reviewer feedback into defect, clarification and change request — verifying every claim before accepting it.
argument-hint: "[the feedback, or a path to it]"
intent: >-
  Feedback arrives as one undifferentiated list. Three different things are in it, each with a
  different owner and a different cost, and treating them alike is how fixed-price engagements
  lose money quietly.
theme: delivery
best_for:
  - "A review comes back with 40 comments and no priority"
  - "Deciding what is free to fix and what is a change request"
  - "Checking a claim before acting on it"
scenarios:
  - "The client sent a list. Which of these are actually our fault?"
  - "They say the flow is wrong, but it matches the approved use case."
estimated_time: "20–40 min per batch"
---

## Purpose

Every item of feedback is exactly one of three things, and the classification decides who pays.

| | Means | Owner |
|---|---|---|
| **Defect** | it does not match what was agreed | you, at your cost |
| **Clarification** | it matches, but the agreement was ambiguous | shared — tighten the spec |
| **Change** | it does not match, and the agreement was clear | a change request, priced |

## Input

**Works best with:** the feedback verbatim, and who said it.
**Also useful:** the artifact they were looking at, and its version.

Feedback supplied with the invocation counts as already given. Do not ask them to repeat it.

## The method

**1. Verify before you classify.** Open the artifact and check the claim. A reviewer saying
*"the total is wrong"* is a hypothesis until you have looked. Roughly a third of review items
do not reproduce.

**2. Find what it was agreed against.** A use case, a business rule, an approved screen. An
item with no agreed reference behind it cannot be a defect, because there was nothing to
violate.

**3. Classify, and say which.** Out loud, per item, with the reference. *"Change — UC-07 says
the approver is a second person, and this asks for self-approval."*

**4. Route it to the artifact that owns it**, not to whoever is nearest. A wrong label is the
content designer's; a wrong rule is the analyst's; a wrong state is the systems analyst's.

**5. Keep the reviewer's own words.** Paraphrasing feedback into your own framing is how the
second round finds the same problem again.

## What good looks like

Every item has a classification, a reference and an owner. The client can see why something
was a change request rather than being told it was.

## Common failures

**Accepting a claim because it came from the client.** Verifying is not disagreeing.

**Classifying by effort.** A five-minute fix that contradicts an approved use case is still a
change.

**Silently absorbing changes to stay agreeable.** On fixed price this is the single most
reliable way to lose the margin, one small yes at a time.

## Done when

Every item carries a classification and a reference, and the ones classified as changes have
been put to the client with their cost — before any of them was built.
