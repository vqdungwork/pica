---
description: Test the running product — the suite's shape, use-case coverage, regression, exploratory sessions, and the release gate
argument-hint: "[work package] [--release]"
---

# pica-test

Phase 7.8. Runs after `/pica-develop` and before `/pica-build` closes the release gate.

Load `${CLAUDE_PLUGIN_ROOT}/rules/testing.md`. Read the sector entry first — what the field treats as a
defect decides what the highest-risk paths are:

```bash
# pica_find <package> <script> — two layouts: the repository, where packages sit side by
# side under packages/, and an install, where each has its own versioned directory under
# the marketplace cache. A path that assumed only the first resolves to nothing on every
# real install. Prints nothing when the package is absent, which is a finding, not a skip.
pica_find() {
  R="${CLAUDE_PLUGIN_ROOT}"
  [ -f "$R/../$1/scripts/$2" ] && { printf '%s' "$R/../$1/scripts/$2"; return 0; }
  find "$R/../.." -maxdepth 4 -path "*/pica-$1/*/scripts/$2" -print 2>/dev/null | sort -V | tail -1
}
node "$(pica_find analyst industry-check.mjs)" --show <state.industry.key>
```

A dispensing queue and a portfolio have the same test pyramid and completely different blockers.

---

## Order

1. **Declare the shape** in `state.testStrategy`: proportions, and who owns each level
2. **One end-to-end test per use case**, named with its `UC-nn`
3. **One assertion per business rule**, named with its `BR-nn`
4. **Edge-case data**: the longest legal value, the empty set, the duplicate, the awkward character
5. **At least one exploratory session** with a charter and a time box, findings recorded during
6. **A regression test per defect**, written before the fix and seen to fail
7. **A named smoke suite** that runs in CI against the release candidate

---

## Check

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/qa-check.mjs <repo-dir> .pica/state.json
```

---

## `--release`

Before the release candidate ships: the smoke suite green, targeted regression against what changed and
what it touches, and **the rollback executed once**. Not planned once.

---

## Definition of done

- [ ] `qa-check.mjs` returns zero
- [ ] Every defect that reached a person has a test that failed before its fix
- [ ] At least one exploratory session, because scripted tests only find what somebody thought of
- [ ] The rollback has been run
- [ ] **Said plainly what testing cannot tell you**: that the product is right. Only that it does what
      somebody said
