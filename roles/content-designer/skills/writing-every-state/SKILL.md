---
name: writing-every-state
description: Write the string for every screen in every state — including the error that says what to do and the empty state that says how to start.
argument-hint: "[the screen inventory and the state list]"
intent: >-
  Copy is derivable from the state list and the glossary before any screen is styled. Written
  first it stresses the layout; written last it flatters one that was approved against
  placeholder text.
theme: content
best_for:
  - "Producing every string a build needs, before the build needs it"
  - "Turning generic errors into something a person can act on"
  - "Keeping the product speaking the business's own language"
scenarios:
  - "The demo is full of 'Something went wrong'."
  - "What does this screen say when there is nothing on it?"
estimated_time: "2–4 hours per work package"
---

## Purpose

Everything here comes from two documents that already exist: the state list, which says which
strings are needed, and the glossary, which says which words to use.

## The method

**1. Work from the state list, screen by screen.** Empty, loading, partial, error, success,
permission-denied. Each is a string somebody has to write, and writing them together keeps the
voice consistent in a way writing them as they come up does not.

**2. Every error names what happened and what to do.** *"Your transfer was not sent"* beats
*"Oops, something went wrong"* — the second does not say whether the money moved, which is the
only thing the person wants to know.

**3. Every empty state says what this is and how to start.** It is the first screen a new user
sees and the one most often left as a shrug. *"No approvals yet — they appear here when a
colleague submits one"* does two jobs.

**4. Bind every term to the glossary.** If the business says *holding*, the interface says
holding. Not *asset*, not *position*. A synonym introduced in the interface becomes a support
ticket.

**5. Write at realistic length, deliberately long.** Use the longest plausible value, not the
average. A layout approved against short strings breaks on the real thing, and in a language
running about 1.3 against English it breaks by a third.

**6. Do not change the layout to fit your copy.** If the string genuinely cannot fit, that is a
finding for the designer, not a licence to shorten it into something that says less.

**7. Write every locale in the same pass.** Translating later means re-testing every layout.

## What good looks like

No screen state has a placeholder. Every error says what to do next. Every term appears in the
glossary. The longest string in each field is a real one.

## Common failures

**Generic errors.** They tell the user nothing and support less.

**Writing to fit.** Copy trimmed until it fits is copy that stopped saying the thing.

**A synonym that felt better.** The glossary was agreed with the client.

## Done when

```bash
node <pica>/roles/content-designer/scripts/copy-check.mjs .audit/html-reference.json .pica/state.json
```

returns zero findings.
