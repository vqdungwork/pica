---
name: contracting-an-integration
description: Write the contract for every system you integrate with — direction, protocol, and what happens when it is unavailable.
argument-hint: "[the system, or the integration list]"
intent: >-
  Direction and protocol are the easy two thirds. The third — what happens when it is down — is
  the one that gets skipped, and it is the one that determines what the interface must show.
theme: platform
best_for:
  - "Integrating with a core system somebody else operates"
  - "Deciding what the screen shows when the other side is unavailable"
  - "Giving the designer a state they would not have invented"
scenarios:
  - "We are pulling valuations from their system. What if it does not answer?"
  - "The client says the API is reliable. Is that a design input?"
estimated_time: "45–60 min per integration"
---

## Purpose

An integration without a failure contract produces a screen nobody designed, discovered at
3 a.m. by somebody who was not in the room.

## Input

**Works best with:** the system's name, who operates it, and its actual documentation.
**Also useful:** its real availability, not its stated SLA.

## The method

**1. Name the direction.** Do you read, write, or both? Both is two contracts, not one.

**2. Name the protocol and the shape.** REST, a message queue, a file drop, ISO 20022 over MQ.
"API" is not a protocol.

**3. Write what happens when it is unavailable.** This is the whole point. The options are a
small set and each produces a different screen:

| Strategy | What the interface shows |
|---|---|
| Queue and retry | a pending state with an age on it |
| Serve stale | the last value with a staleness badge and its timestamp |
| Block the action | a disabled control saying why, not a spinner |
| Fail visibly | an error naming what went wrong and what to do |

**4. Say who is told.** A failure nobody is alerted to is a failure discovered by a customer.

**5. Write the reconciliation.** When it comes back, what happens to what queued? Replay,
discard, or ask a human — and if the answer is a human, that is another screen.

**6. Hand the failure states to the designer as requirements**, not as a footnote. They are
screens in the inventory, and the lo-fi gate is where they should first appear.

## What good looks like

Every integration has all three fields. A designer reading it knows which screens to draw. An
engineer reading it knows what to build when the call times out.

## Common failures

**"It is reliable."** Reliability is a probability, not a design.

**A spinner as the failure state.** A spinner that never resolves is the worst of both.

**Reconciliation left to the build.** Then it is decided by whoever writes the retry loop.

## Done when

The `integrations` check inside `architecture-check` returns zero findings — every declared
system has a direction, a protocol and an `onFailure`.
