# pica-prototype: wire the flows and verify the behaviour

Step 8. Run after the screens are ported and reviewed.

Load `${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/figma-screens.md` and
`${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/review-gates.md`, then load `figma-use`. Pass
`skillNames: "figma-use"`.

Set `writeAuthorization` to `{"granted": true, "reason": "prototype"}` before the first write, and clear
it when the command ends.

---

## Preconditions

- `figmaInScope` is true
- every package in scope has `ported: true`
- `delivered` is false

If packages are still unported, say which, and wire only the flows whose frames all exist. A flow with a
missing screen is worse than an absent flow.

---

## 1. Frames must be cloned onto one page

Figma prototype destinations must be top-level frames **on the same page**. A flow spanning work packages
therefore needs its frames cloned onto a single prototype page.

Accept the duplication. Name clones by flow: `A01 welcome`, `B02 player playing`, `C04 live now`. Say in
the page legend that the source pages remain the reference for specs, so nobody edits a clone thinking it
is the screen.

Wrap `clone()` and the subsequent move in try/finally. `clone()` parents the copy to the page
immediately, so a failed move leaves an **orphan floating on the canvas**, and orphans resurface later as
phantom overlaps.

## 2. Wire the flows

The flows named in `docs/contract.md`. Screen to screen, plus:

- **Overlays as overlays.** Bottom sheets and modals use overlay actions, not navigate, with correct open
  and close behaviour.
- **Back paths.** Every screen a user can enter, they can leave.
- **Named starting points**, so Present mode offers a real menu rather than one entry.

## 3. Wire component interactions

This is what makes it behaviour rather than a slideshow. Variant switching for:

- pressed and hover states where the platform has them
- disabled to enabled, especially a CTA gated on a checkbox
- open and closed, for accordions, sheets, pickers
- selected and unselected, for tabs, radios, chips

If the screens show a disabled CTA that unlocks on a checkbox, a reviewer must be able to tick the
checkbox and watch it unlock. Otherwise the state is a claim, not a demonstration.

## 4. Walkthrough notes

One note per flow, on the page, saying **what to watch for**. A reviewer who does not know the intent
cannot tell a deliberate constraint from a bug. Say things like "skip-forward is disabled here because it
is the live edge" explicitly.

## 5. The behaviour review loop

Its own pass, and it repeats until it returns nothing:

| Check | Failure it catches |
|---|---|
| Dead ends | A frame with zero outgoing reactions that is not a deliberate terminal state |
| Wrong targets | A link to a frame that looks right but is the wrong state |
| Missing back paths | A screen a user can enter and not leave |
| Unreachable states | A state in the file with no interaction that produces it |
| Implied but absent | An interaction the screens promise that the prototype does not offer |

For unreachable states: either wire them, or label them as documentation only. A state nobody can reach
reads as a broken prototype rather than a specification.

**Verify in a separate call.** `reactions` written and read back in one execution returns the in-memory
value.

Write `docs/prototype-map.md`: every flow, its frames in order, its starting point, and any terminal
state that is deliberate.

---

## Out of scope for 0.1.0

**Motion.** Transition types, timing and easing are not specified here. If asked, say so rather than
improvising values, and offer to note the intent in the handoff instead.

---

## GATE 8

Present the flows. Name the starting points so the human can run them in Present mode.

Clear `writeAuthorization`. **Stop.**

Then `/pica-close`.
