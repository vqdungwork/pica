---
description: Build the approved design into a working product, against a definition of done that returns non-zero
argument-hint: "[work package] [--web | --native | --api]"
---

# pica-build

Phase 7. Runs after the contract, after the design was approved at GATE 5, and after the Architect has
settled the API contract at 6.3.

Load `${CLAUDE_PLUGIN_ROOT}/rules/implementation.md`. If native is in scope, also load html's
`native-mobile.md`.

**This command does not replace a coding agent.** It states what finished means, in an order that keeps
the checks meaningful, and it runs them.

---

## Preconditions, all hard

- `workPackages.<wp>.htmlApproved` is true. Building an unapproved design is building a draft
- `tokens/tokens.json` exists. Without it there is nothing for the code to consume
- The API contract exists at 6.3, agreed by both sides. Without it the front end guesses at data, which
  is the one structural risk this flow carries by design

**Stop and say which is missing.** Do not proceed on the assumption that it will appear later.

---

## Order, and why it is this order

1. **Declare the stack** in `state.stack` if it is not already there
2. **Import tokens.** As CSS custom properties or a theme object, from the same file the design
   consumed. Never retyped
3. **Components, mirroring the kit.** Before any screen. A component built inline on a screen drifts,
   and the drift is invisible because both versions look right
4. **Screens, every state from the matrix.** Empty, loading, error, long content, unauthorised. These
   are most of the states a real product lives in
5. **API integration against the contract**, error shape handled, not only the happy path
6. **Motion per the declared registers.** transform and opacity only, and a real reduced-motion path
7. **Tests: one per use case, one assertion per business rule**, named with the id

Building screens before components guarantees a rebuild. Building the happy path first guarantees the
error states are done badly at the end, by someone tired.

---

## Check

```bash
S=${CLAUDE_PLUGIN_ROOT}/../html/scripts
node $S/code-tokens-check.mjs <src-dir> tokens/tokens.json .pica/state.json
```

And against the repository itself:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/impl-check.mjs <repo-dir> .pica/state.json
```

Eight checks that read git, the CI config and the platform API rather than `state.json`, because that
is where the answers are: **test trace** (every `UC-nn` and `BR-nn` named in a test), **CI pipeline**
(lint, types, tests), **branch protection**, **branch age** against the trunk-based window,
**environments**, **secrets in tracked files**, **NFR measured** (an NFR claiming CI measurement that
no workflow mentions is a gate on paper only), and **stack declared** (state says React and the
repository shows no sign of it).

If `gh` is unavailable, branch protection reports as a **failure, not a skip**. Verify it by hand and
say so, or install `gh`. A gate that silently cannot check is worse than one that admits it.

Then, once a build is running, **7.10**:

**This command does not run 7.10.** `/pica-evaluate --build <url>` does, and the separation is the
same principle as report-before-fix: **the builder does not grade their own build.** Someone who knows
why a value was chosen will find the reason it is acceptable.

What this command owes 7.10 is a build it can measure:

- **every screen carries `data-uc`**, matching the prototype's tag. Pairing is by use case plus
  viewport, never by caption, because a build's captions come from its own markup
- the build is reachable at a URL the harness can load

Its definition of done then **requires that 7.10 returned zero**, run by someone else. A build that has
not been compared against the approved design is not finished, it is merely running.

The approved HTML is the reference and it is read-only. **Report divergence. Never adjust the design to
match the build.**

---

## Release

`main` protected, every environment deploying from main, secrets in a secret store with history scanned
rather than just HEAD, and a rollback that has been **executed once** before the first production
release.

A rollback plan that has never been run is a paragraph, not a path.

For native: signing keys backed up off-machine, Android released as a **staged rollout**, and iOS review
latency already in the schedule from 5.1 rather than discovered now.

---

## Then report

What was built, what the checks returned, and **what a human still has to do**: click the flow on a real
device, and look at the screens after the last change rather than before it.

Ten green checks once coexisted with four defects visible in a screenshot.
