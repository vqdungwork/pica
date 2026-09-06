# Implementation rules

Load this for phases 6 and 7, after the contract.

## What this package is, and what it is not

**It does not ship a coding agent.** Writing code is the most mature thing in this ecosystem, and
rebuilding it here would mean competing with the tool this runs on top of, with a worse version, on a
moving target.

**It ships the Definition of Done and the checks.** That is what this project has always contributed:
it never wrote a browser, it wrote the checks. It never wrote Figma, it wrote the gates. Here it does
not write React, it writes what "finished" means and something that returns non-zero when it is not.

A coding agent executes. This decides whether what came out is done.

---

## The default stack is declared, not assumed

**React on the front end, Node on the back, Postgres, GitHub.**

Written down so it can be swapped. Angular and Java are a change to one declaration, not a rewrite of
the flow: every rule below is stated so that only the tool names change.

Declare it in state, because a stack nobody wrote down is a stack the next person guesses at:

```json
"stack": { "fe": "react", "be": "node", "db": "postgres", "vcs": "github" }
```

---

## One design, three viewports, then targets choose

The design is produced once, at **desktop, tablet and mobile**. `review.html` shows three, and a Figma
port carries three.

**Implementation targets then declare which viewports they consume:**

```json
"targets": [
  { "kind": "web",     "viewports": ["desktop", "tablet", "mobile"], "stack": "react" },
  { "kind": "ios",     "viewports": ["tablet", "mobile"],            "stack": "swift" },
  { "kind": "android", "viewports": ["tablet", "mobile"],            "stack": "kotlin" }
]
```

A responsive website takes all three. **A native app takes tablet and mobile and never desktop**, because
a phone app has no desktop layout and asking for one produces a design nobody builds.

The surface is a property of the target, not of the viewport. That keeps viewport parity a single-design
question, and it lets `coverage-check` answer a different one: **can each declared target actually be
built from this design?** A target consuming tablet when nobody drew tablet fails in Phase 3, rather
than in Phase 7 by a developer with nothing to work from.

---

## The approved HTML is what the front end builds from

Not the Figma file. Figma is a rendering of that HTML for people who work in Figma, and where the two
disagree, Figma is wrong.

This matters most for the thing nobody checks: **7.10 compares the built product against the approved
design.** If the developer built from a different artefact, that comparison measures the wrong thing.

**7.10 belongs to Design QA, not to this package.** The builder does not grade their own build: someone
who knows why a value was chosen will find the reason it is acceptable. What this package owes is a
build that **can** be measured — every screen tagged with `data-uc` and `data-state` so pairing works — and a definition
of done that refuses to close until 7.10 returned zero.

---

## Tokens are imported, never retyped

The same `tokens.json` the design consumed, imported as CSS custom properties or a theme object.

A retyped value is identical today and diverges the first time the palette moves. By then there are two
hundred of them and nobody knows which were deliberate. `code-tokens-check.mjs` is what makes this
enforceable rather than hoped for.

---

## Components before screens

Mirroring the kit. A component built inline on a screen is a component that will drift, and the drift
is invisible because both versions look right.

---

## Every state, not the happy path

The state matrix from 3.0c is the build list: empty, loading, error, long content, unauthorised.

**These are most of the states a real product spends its life in.** A build that renders only the happy
path is a demo, and it fails the first time a network is slow.

Every API call handles the documented error shape, not only the success shape.

---

## Branching, and why short-lived

**Trunk-based.** One long-lived branch, `main`. Feature branches small and short-lived, merging back
**within hours, rarely later than a day or two.**

The point is to keep the codebase continuously releasable, and that is only true if integration is
constant. A branch alive for a week is not a branch, it is a fork accruing interest.

---

## Pull requests

| Must | Why |
|---|---|
| Small enough to review in one sitting | A large PR gets approved, not reviewed |
| Say what changed, why, and what was **not** changed | The reviewer needs the boundary |
| Pass lint, type check and tests **before** a human is asked | Automate everything automatable, so review spends attention on logic |
| Carry the `UC-nn` or `BR-nn` it implements | Traceability from requirement to merge |
| Be reviewed for logic, security and standards | Formatting is the linter's job, not a person's |

---

## Environments, and the one rule about them

| Environment | Deploys | Purpose |
|---|---|---|
| **dev** | Every commit on main, automatically | Where QA tests first and a broken deploy is cheap |
| **staging** | From main, on approval or tag | Validation. A tool, not a bottleneck |
| **production** | From main, deliberately | With a rollback that has been executed at least once |

**Every environment deploys from main.** A staging build assembled from a different branch is testing
something that will never ship.

---

## Testing tests use cases, not screens

One end-to-end test per `UC-nn`, one assertion per `BR-nn`, named with the id so the requirement is
greppable from the rule to the test that proves it.

A screen can be perfect and the task still impossible. That is what the use case catches and the screen
test does not.

**Verify a new check by reintroducing the defect it was written for.** A test that has never failed is
a hope.

---

## Responsive web, specifically

- Build from the declared viewports, and the **smallest one is where it breaks**
- Container queries over width media queries wherever the component reflows rather than the page
- Every state at every declared viewport, not the happy path at the widest
- Keyboard reachable end to end, visible focus, tab order matching reading order
- `prefers-reduced-motion` with a real low-motion path, not a dead one

For native, load `native-mobile.md`: two guideline sets, two release pipelines, and one of them cannot
roll back.

---

## Branch protection when the platform API is not reachable

`impl-check` reads branch protection through the GitHub CLI. A repository hosted elsewhere, or a machine
without `gh`, could never pass that check, and **a check that cannot be passed is one people route
around**. So it is waivable the way every other deliberate exception here is, with a reason and a name:

```json
"branchProtection": {
  "verifiedBy": "client platform lead",
  "on": "2026-09-06",
  "note": "GitLab: main requires one approving review and a green pipeline; force pushes disabled. Read from the settings page"
}
```

The report says the evidence was a person's word rather than an API read. That is weaker, and saying so
is the point: an exception is attributable, an omission is not.

## Definition of done

- [ ] `stack` declared in state
- [ ] Tokens imported from `tokens.json`, never retyped
- [ ] `code-tokens-check.mjs` returns zero
- [ ] Every kit component exists in code with every variant
- [ ] Every state in the matrix is reachable and was screenshotted
- [ ] Every API call handles the documented error shape
- [ ] One e2e test per use case, one assertion per business rule, named with the id
- [ ] Every new check **seen to fail** on the defect it was written for
- [ ] PRs small, traceable to a `UC` or `BR`, green before a human is asked
- [ ] `main` protected: no direct push, review required, checks required
- [ ] Every environment deploys from main
- [ ] Secrets in a secret store, **history scanned, not just HEAD**
- [ ] Rollback executed once before the first production release
- [ ] Monitoring and error reporting live **before** launch
- [ ] Every screen in the build carries `data-uc` **and** `data-state`, so 7.10 can pair at all. Use
      case plus viewport is not a unique key: a screen and its empty state share both, and pairing on
      them alone produced four false findings and hid a deleted screen on the project that found it
- [ ] **7.10 returns zero, run by Design QA and not by the builder**
