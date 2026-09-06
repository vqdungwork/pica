# Engineering rules

Load this for step 7.2 through 7.7, before any screen is built.

`implementation.md` states what **finished** means and runs the checks that decide it. This file is the
other half: what a competent build does between the approved design and that gate. The two were one
package until 0.9.0, and merging them hid the gap — the definition of done said nothing about how the
code gets written, so the craft was left to whatever came out.

---

## The API contract is a seam, and the front end never guesses across it

The Architect settles it at 6.3. Nothing is fetched before it exists.

**A front end that invents a response shape has committed the back end to it silently.** The commitment
is discovered at integration, which is the worst place to discover a disagreement about data, because by
then both sides have built against their own assumption.

Every fetch names the endpoint it calls and the contract entry that endpoint belongs to. A call that
names nothing is a guess with a URL on it.

```json
"apiContract": [
  { "id": "API-01", "method": "GET", "path": "/payments/{id}",
    "returns": "Payment", "errors": ["404 not found", "403 not yours"],
    "agreedBy": ["front end", "back end"], "on": "2026-09-06" }
]
```

**`errors` is not optional and is the half that gets skipped.** A contract listing only the success shape
is a contract for the happy path, and the happy path is not where products fail.

---

## Four places state can live, and choosing wrong is the expensive mistake

| Where | What belongs there | What breaks when it is wrong |
|---|---|---|
| **Server** | anything the server owns: records, lists, anything another user can change | a stale copy in a client store that nobody invalidates, shown confidently |
| **URL** | anything a person should be able to share, bookmark or reload into: filters, tabs, pagination, the open record | the back button loses the state, and a link sends someone somewhere else |
| **Client** | genuinely local: a collapsed panel, an unsent draft, a theme choice | it survives a reload it should not have, or dies on one it should have survived |
| **Form** | what the person is currently typing, until it is submitted | a keystroke re-renders the page, or a half-typed value reaches a store and is treated as real |

**Declare the strategy once in `state.stateStrategy` and hold it.** Most of the mess in a front end is
not bad code; it is server data living in a client store because the first screen was easier that way.

---

## Every failure has a shape, and the shape reaches the screen the copy was written for

The Content step wrote what each error state says. Those words are only reachable if the failure arrives
as something the screen can distinguish.

Four kinds, and they need different screens: **cannot reach** the server, **not allowed** to, **not
found**, and **it broke**. Collapsing them into one "something went wrong" throws away the distinction
that the copy already made, and the copy is the part a person reads.

- Every fetch has an error branch. Not a `catch` that logs
- The branch maps the failure to a state that exists in the state matrix
- **A retry that repeats a request the server already accepted is a duplicate, not a retry.** Anything
  that changes data carries an idempotency key, or retry is unsafe and must not be offered

---

## Components before screens, and the kit is the source

The design shipped a kit. The code mirrors it, one component per kit component, before any screen
consumes them. A component built inline on a screen drifts from the kit, and **the drift is invisible
because both versions look right**.

Tokens are imported from the file the design consumed. Never retyped, never approximated, never
"close enough" — `code-tokens-check` reads the source for exactly this.

---

## Performance is a number from 5.1 or it is a feeling

The NFRs carry the numbers. The build carries a budget that fails the pipeline when it is exceeded, and
the budget names the NFR it serves.

```json
"perfBudget": [
  { "nfr": "NFR-01", "metric": "LCP", "budget": "2.5s",
    "condition": "mid-tier Android over 4G, cold cache",
    "measuredBy": "Lighthouse CI on every pull request, fails on regression" }
]
```

**The condition is what makes it real.** A budget measured on a developer's laptop over office wifi
passes on hardware nobody in the product's audience owns.

---

## Accessibility is code, not a colour

Contrast is measured at the design gate. Everything below it can only be got right in the build, and
every item here is a defect a keyboard user hits on the first screen:

- **Every interactive element has an accessible name.** An icon button with no label is a button that
  announces itself as "button"
- **Focus is visible, and focus order follows reading order.** A positive `tabindex` breaks it for the
  whole page, which is why the check treats one as a defect rather than a preference
- **Every input has a label bound to it**, not a placeholder pretending to be one. A placeholder
  disappears exactly when a person needs it
- **State is announced, not only drawn.** A loading region, an error, a value that changed under the
  user: `aria-live`, or a person using a screen reader is told nothing happened
- **Nothing is reachable only by hover or only by pointer.** There is no hover on a handheld, which the
  sector base already says for three of its fields

---

## Security is at the boundary, and the boundary is the server

The front end is a convenience, never a control. Every rule the interface enforces is enforced again on
the server, because the interface is one devtools panel away from being edited.

- **Authorisation per request, never per session.** "They logged in" is not "they may read this record"
- **Validate at the boundary and store the validated shape.** Validation scattered through a codebase is
  validation that one path skipped
- **No credential in the source.** `impl-check` scans tracked files, and history is scanned separately
  before handover, because a rotated secret in an old commit is still a secret
- **The error a user sees never carries the internal reason.** A stack trace in a message is an
  invitation

---

## Native is a different build, not a viewport

Where a native target ships, the design's mobile viewport is the reference and the platform's own
conventions win over any house pattern that contradicts them. `native-mobile.md` carries the specifics:
safe areas per device class, touch targets, and the release asymmetry.

**The one thing that belongs here:** platform navigation is not a component you build. A tab bar that
looks like the platform's but does not behave like it is worse than one that looks nothing like it,
because the first one lies about what it will do.

---

## Definition of done

- [ ] Every fetch names its endpoint and the `apiContract` entry it belongs to
- [ ] Every contract entry lists its error responses, not only the success shape
- [ ] `stateStrategy` declared, and no server-owned data lives in a client store without a reason
- [ ] Every fetch has an error branch that maps to a state in the matrix
- [ ] Anything that changes data and offers retry carries an idempotency key
- [ ] Components mirror the kit and exist before any screen consumes them
- [ ] Tokens imported from the design's own file, never retyped
- [ ] Every performance NFR has a budget with a condition and something measuring it
- [ ] Every interactive element has an accessible name; no positive `tabindex`; every input labelled
- [ ] Nothing reachable only by hover or only by pointer
- [ ] Every interface rule enforced again on the server
- [ ] No credential-shaped literal in the source
- [ ] `dev-check.mjs` returns zero
