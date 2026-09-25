---
description: Write the words for every state, bound to the glossary, with length-realistic copy and mock data that is not quietly wrong
argument-hint: "[work package]"
---

# pica-copy: the words

Runs alongside 3.4 and 3.5, and again at 7.5 when copy goes into code.

Load `${CLAUDE_PLUGIN_ROOT}/rules/content.md` before anything else.

**A screen without real words has not been designed.** Length changes layout, and the writing that
matters most lives in the states nobody demos.

---

## Inputs

`glossary` and `businessRules` from the Analyst. `domainConstraints` for restricted claims. The state
matrix from 3.0c, which is the list of writing tasks.

---

## Work

1. **Terms from the glossary only.** Anything in `notOurTerm` is a defect, not a preference.
2. **Every state gets its words.** Empty says why and how to fill it. Error says what happened **and
   what to do next**. Unauthorised says why and who to ask.
3. **Longest realistic value**, never lorem. Lorem is uniformly medium-length, which makes every
   fragile layout look safe.
4. **Mock data cross-referenced against the source.** Bind each value to the nearest name in the
   markup, strip relationship fields first, never identify a row by initials.
5. **Nullable fields shown in both states** where both occur in the source. Filling a gap with a
   generated face designs away a state the build has to handle.
6. **House rules into `copyRules`**, each with a pattern. A rule stated in conversation lasts a day.
7. **Restricted claims from `domainConstraints`** become `copyRules` with patterns, or they are not
   being enforced.

---

## Verify

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/copy-check.mjs .audit/html-reference.json .pica/state.json
```

Zero findings, or fix. Then say what you checked, and **say if there is no glossary or no copyRules**:
those checks did not run, which is not the same as passing them.
