# Structure rules

Load this for step 5, after the specification is complete and before any direction is chosen.

`modelling.md` in `systems-analyst` produced the states, the entities and the permissions. This file
covers turning them into screens: what exists, what order, and what happens when it goes wrong.

---

## Lo-fi is a gate, not a stage you pass through

<!-- enforced-by: lofi-traced, lofi-greyscale, lofi-lengths, lofi-states -->

The industry puts greyscale in front of the client **before** the design system for one reason: it
forces the conversation onto structure while structure is still cheap to change.

pica used to go from the screen inventory straight to three fully-built directions, then approve the
business flow and the visual design together at one confirmation — which bundles the two things this
gate exists to separate. **Structural rework discovered at that point is expensive rework.**

Build it in the same HTML as everything downstream, not in a wireframe tool. One medium carries the
whole chain, the lo-fi is measurable from the first gate, and the next step becomes *apply tokens
over the approved structure* rather than a rebuild.

## Every screen names the use case that needs it

<!-- enforced-by: lofi-traced -->

This is the same link `coverage-check` holds the built screens to, applied before anything is
styled. A screen with no use case behind it is the cheapest scope to delete now and the most
expensive to discover after it has been styled.

It runs in both directions. A use case with no screen is a requirement nobody will build.

## Greyscale is the point, not a limitation

<!-- enforced-by: lofi-greyscale -->

The moment a brand hue appears the client starts reviewing the palette, which is exactly the
conversation this gate defers. No colour outside the grey ramp — not for emphasis, not for a status
chip, not "just to show the idea".

Where a state genuinely needs to be distinguishable at lo-fi, distinguish it with **position, weight
or a label**. If it only reads with colour, that is a finding against the design, not a reason to
add colour early.

## Realistic length, not lorem and not one word

<!-- enforced-by: lofi-lengths -->

A layout approved against short text breaks on the real thing. For a language running about **1.3
against English** it breaks by a third — and the client who approved the English lo-fi will not
accept that as a change request.

Use the longest plausible real value, not the average one: the customer with three middle names, the
product title that fills two lines, the zero-item list and the five-hundred-item one.

## Every state the model declares appears, or is excused by name

<!-- enforced-by: lofi-states -->

The state model exists by now — the systems analyst produced it — so lo-fi is the cheapest place to
find out nobody has thought about the empty one.

Empty, loading, partial, error, success, permission-denied. A state you are deliberately not drawing
is excused **by name**, in writing. Silence is not an exemption.

## A flow without its failures is half a flow

<!-- enforced-by: unhappy-paths -->

Every flow declares what happens when the thing fails: the payment declines, the upload times out,
the integration is down, the permission is missing.

These are the screens nobody designs and everybody ships. They are also where the state model and
the integration contracts become visible — an `onFailure` the architect declared has to appear
somewhere, and this is where.

## No dead ends

<!-- enforced-by: dead-ends -->

Every terminal point in a flow is either a completed job or names where the person goes next. A
screen someone can reach and cannot leave is a defect, and it is invisible in a screen inventory
because the inventory lists screens rather than exits.

Errors count. *"Something went wrong"* with no route forward is a dead end with a sad face on it.

## Structure is validated, not asserted

<!-- enforced-by: ia-evidenced -->

The navigation model carries evidence: a card sort, a tree test, or a stated reason why neither was
possible. An information architecture that has only ever been reviewed by the person who drew it has
been reviewed by nobody.

This is cheap here. After the screens are styled, changing the navigation means restyling all of
them.
