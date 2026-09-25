---
name: proving-delivery
description: Close the engagement by proving what was delivered against the original brief — never against the contract, and never against the plan.
argument-hint: "[nothing — it reads state and the brief]"
intent: >-
  A closeout that grades the work against the document the work already renegotiated always
  passes. The only honest comparison is against the brief as it arrived, plus the amendments
  the client agreed to in writing.
theme: delivery
best_for:
  - "Handing over and needing to state what was and was not delivered"
  - "Separating agreed changes from quiet drift"
  - "Producing a number a client can check rather than a claim"
scenarios:
  - "We are done. How do I show them we did what they asked?"
  - "The contract says something different from the brief. Which one counts?"
estimated_time: "45–60 min"
---

## Purpose

At the end, two documents disagree: the brief the client wrote, and the contract you both
signed after analysis moved things. The closeout reads the **brief**. `close-check` fails when
`closeout.briefReadFrom` is anything else, for this exact reason.

## Input

**Works best with:** `docs/brief.md` as it was written, and the amendment record.
**Also useful:** the assumptions log, and every check result.

## The method

**1. Read the original brief, from `briefPath`.** Not the contract, not the PRD, not the last
status update. Each of those drifted, and drifted in your favour.

**2. Walk it line by line.** Every claim the brief made gets one of three answers: delivered,
delivered differently — with the amendment and its date — or not delivered, with why.

**3. Run the full verification and quote the number.**

```bash
node <pica>/core/scripts/pica-verify.mjs .pica/state.json --adopt --evidence
```

*"142 assertions verified, 3 checks abstained"* is something a client can check.
*"Everything passed"* is not.

**4. List the low-confidence assumptions, most consequential first.** These are the things you
decided without being told. The client corrects them now or inherits them.

**5. Name what was not supplied at intake, and what it cost.** The Excel file that never
arrived, the person who was never named. Not as blame — as the reason something is thinner
than it should be.

**6. Say plainly that no human has used it yet**, if none has. A demo evaluated by agents is
not a tested product, and the closeout says so rather than letting silence imply otherwise.

## What good looks like

A reader can find any sentence of the brief in the report and see what happened to it. Every
difference is either an agreed amendment with a date, or a stated gap.

## Common failures

**Reading the contract.** It always passes.

**Reporting a feeling.** "All checks green" without the count is unverifiable.

**Omitting the abstentions.** An abstention is not a pass, and a report that hides them is
reporting a fraction as a whole.

## Done when

```bash
node <pica>/roles/product-manager/scripts/close-check.mjs .pica/state.json
```

returns zero findings, and `delivered` is recorded.
