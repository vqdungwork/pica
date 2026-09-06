---
description: Three-point effort by role, a work order derived from the deadline, and the effort record at closeout
argument-hint: "[--closeout to record actual hours]"
---

# pica-estimate

Steps 5.1 and 5.2. With `--closeout`, step 8.4 instead.

Load `${CLAUDE_PLUGIN_ROOT}/rules/estimation.md` before anything else.

---



## You do not estimate. You collect and you check the arithmetic.

**Each agent estimates its own line and only its own**, per `estimation.md`. Ask each for three points
for its own work: `pica-analyst` for analysis, `pica-designer` for design, `pica-writer` for the words,
`pica-architect` for architecture, `pica-developer` for front end and back end, `pica-tester` for
testing. Project management is a human's line and this package does not price it.

Record `by` on every line. A line with no attribution is the old failure in a new shape: someone
estimated it, nobody knows who, and when it is wrong nobody can say what they misjudged.

**Set `estimate.for` first**, because the gate changes with it:

| | Means | The gate |
|:--|:--|:--|
| `client` | the number leaves the building and becomes a commitment | scope frozen and deadline fixed before a single figure exists, headcount derived |
| `self` | you are sizing your own work to decide whether to start | nothing frozen, no headcount, but three points still |
| `skipped` | there is nothing to price | a reason, and nothing else runs |

## S6: the client draws the line, and sees the price of each thing they are drawing it around

Load core's `proposals.md`. This is the one proposal that can be **priced rather than argued**, because
the use cases exist by 2.7 and the estimate by 5.1.

Offer every use case with what it costs **in hours or days, never in points** — a unit the client cannot
convert is a unit that hides the decision. Record it in `state.proposals`, then:

```bash
# pica_find <package> <script> — two layouts: the repository, where packages sit side by
# side under packages/, and an install, where each has its own versioned directory under
# the marketplace cache. A path assuming only the first resolves to nothing on every real
# install. Prints nothing when the package is absent, which is a finding, not a skip.
pica_find() {
  R="${CLAUDE_PLUGIN_ROOT}"
  [ -f "$R/../$1/scripts/$2" ] && { printf '%s' "$R/../$1/scripts/$2"; return 0; }
  find "$R/../.." -maxdepth 4 -path "*/pica-$1/*/scripts/$2" -print 2>/dev/null | sort -V | tail -1
}
node "$(pica_find core proposal-check.mjs)" .pica/state.json --phase scope
```

## Refuse to run before scope is frozen

Two preconditions, both hard:

- `scopeFrozen` is true (step 4.6), after the client agreed to something they could see and click
- `deadline` is a date (step 4.7), not "soon"

**If either is missing, stop and say which.** An estimate produced now prices a guess, and a guess that
has been sent to a client is a commitment.

### Who writes them, and when

Nothing upstream writes these, deliberately: they are the moment the Account records that a **human
client agreed**, and no command can do that on their behalf. After the client confirms at 4.2 and 4.3,
the Account writes:

```json
"scopeFrozen": true,
"deadline": "2026-11-28",
"durationWeeks": 8,
"hoursPerWeek": 40
```

`durationWeeks` is derived from the deadline, and it is what turns effort into a team. Without it the
arithmetic at 5.2 cannot run and the price is an assertion.

**Refusing to run without these is the point, not an obstacle.** It is the one hard stop between a
demo the client liked and a number they will hold you to.

---

## 5.1 Three points per role

Optimistic, most likely, pessimistic, for each of UI/UX, FE, BE, QA. Never a single number.

```
PERT = (O + 4M + P) / 6
```

Inputs to the spread:

- **Tier from 2.12.** Every `complex` package must spread wider than every `standard` one. If it does
  not, the tier was decorative
- **Risks from 1.8.** Each risk moves a pessimistic figure. A risk that moves nothing was an observation
- **`effortLog` from past projects.** This is what three-point estimation requires and what makes the
  number better than a guess. Say so explicitly if there is no history yet

## 5.2 Work order

Effort divided by duration gives headcount. **Show the arithmetic**, because that is what makes an
estimate look reasoned rather than invented:

```
BE 573h ÷ 8 weeks ÷ 40h = 1.8  →  2 backend developers
```

Two things the arithmetic must not hide, and both go in the presentation:

- **Roles do not compress evenly.** A second backend developer helps a 560h backlog. A second designer
  does not help a 90h direction, because that work is sequential
- **Mobile: iOS review latency is a scheduled line item**, not a risk. External TestFlight review takes
  roughly 48 hours, store review longer

Present effort, deadline and headcount as **one table**, so the conversation becomes "which of these do
you want to change" instead of "that is expensive".

## `--closeout`, step 8.4

Record actual hours per role per package. **`why` is required on any variance over 20%.**

A variance nobody explains teaches nothing, and this record is the only thing that makes the next
estimate better than this one. This loop is open in most agencies: the log gets written and never read.

---

## Verify before sending

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/estimate-check.mjs .pica/state.json
node ${CLAUDE_PLUGIN_ROOT}/scripts/estimate-check.mjs .pica/state.json --closeout
```

Zero findings, or fix. An estimate is the one artefact here that becomes a contractual number the moment
it leaves the building.
