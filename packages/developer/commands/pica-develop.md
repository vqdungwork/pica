---
description: Build the approved design into working code, against the engineering rules and the API contract
argument-hint: "[work package] [--web | --native | --api]"
---

# pica-develop

Phase 7.2 to 7.7. Runs after the client approved the design at GATE 4 and after the Architect settled
the API contract at 6.3. `/pica-build` runs after this and decides whether it is finished.

Load `${CLAUDE_PLUGIN_ROOT}/rules/engineering.md`. For a native target also load html's
`native-mobile.md`. **Read the sector entry before writing a line**, because half the decisions below
are the sector's rather than yours:

```bash
node ${CLAUDE_PLUGIN_ROOT}/../analyst/scripts/industry-check.mjs --show <state.industry.key>
```

A dense clinician screen and a gloved warehouse handheld are the same framework and opposite builds.

---

## Preconditions, all hard

- `workPackages.<wp>.htmlApproved` is true
- `tokens/tokens.json` exists
- `apiContract` exists and every entry lists its errors
- `stateStrategy` declares all four placements

**Stop and say which is missing.** Do not proceed on the assumption it appears later.

---

## Order

1. **Declare the stack** in `state.stack`, and record an ADR for each choice
2. **Import tokens** from the file the design consumed. Never retyped
3. **Components mirroring the kit**, before any screen
4. **Screens, every state from the matrix** — empty, loading, error, long content, unauthorised
5. **API integration against the contract**, with all four failure kinds reaching the screens the copy
   was written for
6. **Motion per the declared registers**, transform and opacity only, with a real reduced-motion path
7. **Accessibility in code**: names, focus order, labels, live regions, nothing hover-only

Building screens before components guarantees a rebuild. Building the happy path first guarantees the
error states are done badly at the end, by someone tired.

---

## Check

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dev-check.mjs <src-dir> .pica/state.json
node ${CLAUDE_PLUGIN_ROOT}/../html/scripts/code-tokens-check.mjs <src-dir> tokens/tokens.json .pica/state.json
```

All zero, or fix and re-run. Then hand to `/pica-test` for the test suite, and `/pica-build` for the
release gate.

---

## Definition of done

- [ ] `dev-check.mjs` returns zero
- [ ] `code-tokens-check.mjs` returns zero
- [ ] Every screen in the matrix exists in code, in every state
- [ ] Every screen carries `data-uc` and `data-state`, so 7.10 can pair against the approved design
- [ ] The build is reachable at a URL the capture harness can load
- [ ] **A human has used it**, not read it. Measurement and review find different defects
