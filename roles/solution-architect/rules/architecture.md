# Architecture rules

Load this for step 5, after the specification is complete and before the demo is built.

---

## Write it down before the demo, or the demo writes it for you

<!-- enforced-by: stack-named, nfr-met, integrations, environments, lock-in -->

The platform is decided on every project. It is not always decided on purpose. Scaffolding a demo
requires a runtime, a package layout, a data-shape convention and a build pipeline, and each one is
a platform decision made by a role whose job is screens.

`architecture-check` requires `state.architecture` before the demo phase closes. Absent, it abstains
rather than passing — an unwritten architecture is not a clean one.

## A layer with no choice is a layer the demo will close

<!-- enforced-by: stack-named -->

Every entry in `architecture.stack` carries a `layer`, a `choice` and `replaceable`. `TBD` fails,
and so does an empty string, because both mean the same thing in practice: whoever builds first
decides.

## Every NFR names its mechanism

<!-- enforced-by: nfr-met -->

A non-functional requirement is a number. An architecture is how the number is met. The two are
recorded together in `architecture.meets`, one entry per NFR, or the requirement is unbacked.

Where an NFR **cannot** be met, that is a finding raised against the requirement — the business
analyst re-negotiates it with the client. Silently dropping it is the failure this prevents.

## Every integration states what happens when it is down

<!-- enforced-by: integrations -->

Direction and protocol are the easy two thirds. `onFailure` is the third, and it is the one that
determines what the interface must show: a stale badge, a queued state, a blocked action. An
integration without it produces a screen nobody designed, at 3 a.m.

## Two environments, minimum

<!-- enforced-by: environments -->

One environment means production is the test environment. Each names a host, because "cloud" is not
a host and neither is "TBD".

## Lock-in is answered per choice

<!-- enforced-by: lock-in -->

A contract clause forbidding vendor lock-in is satisfied by evidence, not assertion. Each stack
entry states whether it can be replaced and at what cost. Three entries marked `replaceable: false`
is a defensible answer; an unanswered field is not.

## The stack is argued from three things, never from what is interesting

<!-- enforced-by: choice-argued -->

The non-functional requirements, the integrations the specification named, and the team that will
maintain it after you leave. Nothing else is evidence.

A choice justified by "it is what everyone uses now" has no argument behind it, and a choice
justified by novelty has an argument against it. Where two options both meet the NFRs, the tie
breaks on **who can maintain it**, not on which is newer.

## Environments are named by what they are for, not by convention

<!-- enforced-by: env-purpose -->

Two is the floor, and each names a host. But the question the entry answers is *what is this
environment for* — where the client accepts, where the team integrates, where real data lives.

An environment nobody can say the purpose of is a machine somebody will eventually deploy to by
mistake.

## Name what you are not building

<!-- enforced-by: exclusions-named -->

The architecture states its exclusions as plainly as the scope does: no multi-region, no
offline-first, no real-time sync, no self-hosting. Each one is a decision somebody could reasonably
have expected the other way.

Left unstated, every one of them becomes a change request with a straight face behind it — *"we
assumed it would…"* — and the fixed price absorbs it.

## An NFR you cannot meet is a finding, not a silence

<!-- enforced-by: nfr-met -->

Where the architecture cannot reach a number the business analyst wrote down, that goes back to the
analyst and to the client as a **renegotiation**, with what is achievable and what it would cost to
reach the original.

Quietly building something that misses it, and discovering that during acceptance, is the failure
this prevents. The number was agreed with somebody; changing it needs the same somebody.

## Data has an owner, a location and a retention period

<!-- enforced-by: data-governed, lock-in -->

For every entity the model declares: who owns it, where it physically sits, how long it is kept and
what happens at the end of that. Sectors with a regulator — finance, healthcare, government — will
be asked this by somebody who is not the client, and the answer cannot be assembled afterwards.

The contract clause forbidding vendor lock-in is answered here too: data that cannot be exported in
a documented format is locked in, whatever the licence says.

**Write for the tech lead who will price it, not for the client.** This document's first reader estimates from it. It needs the shape of the work, the integrations
with their failure modes, and the environments — not a vendor comparison and not a diagram that
explains what an API is.

If a line would not change anybody's estimate, it is not carrying its weight.
