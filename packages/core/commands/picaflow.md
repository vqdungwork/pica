---
description: Run a whole project from a brief — analysis, design, build, test, release — stopping only where a human has to decide
argument-hint: "[the brief, or a path to it] [--to design|figma|product] [--resume]"
---

# picaflow: a brief in, a delivered thing out

Runs the chain and stops **only** where a person has to decide something a machine cannot.

**It does not stop to ask questions between those points.** That is not a convenience, it is the whole
design. Anything the sources cannot settle becomes a labelled assumption and the chain continues, because
reacting to a built thing is far cheaper than specifying one from nothing. Ask a client what their
business flow is and you get hesitation; show them a wrong one that clicks and you get the correction in
three seconds.

**The demo is the question. It is only packaged as an answer.** What makes that safe is the assumptions
register and nothing else: every decision that would have been gated is recorded with a confidence and a
blast radius, surfaced beside the screen it produced, correctable in one round.

---

## Three places it can finish, and each is a delivery

`--to` names where to stop. **Every one of them is a complete pica project, not a truncated one.**

| `--to` | You get | Stops after |
|:--|:--|:--|
| `design` *(default)* | a measured, clickable `review.html`, the PRD, and the assumptions register | CONFIRM 1 |
| `figma` | that, plus the ported Figma file verified frame by frame against the HTML | CONFIRM 2 |
| `product` | that, plus working front end and back end, tested, released | CONFIRM 3 |

Figma is **optional and off the critical path**. `--to product` goes straight from the approved HTML to
production code without touching it, and that is a supported route rather than a shortcut.

Without `--to`, stop at `design` and say what the next two would cost.

---

## Three confirmations, and nothing else stops

| | What the human confirms | Why a machine cannot |
|:--:|:--|:--|
| **CONFIRM 1** | the business flow **and** the design, in `review.html` | whether this is their business, and whether the assumptions were right |
| **CONFIRM 2** | scope and deadline, written to `scopeFrozen` and `deadline` | a commercial commitment, and an estimate before it prices a guess |
| **CONFIRM 3** | the released product against the original brief | whether what was built is what was wanted |

At CONFIRM 1 present, in this order: the **delta** first, then **what they chose and why**, then the
low-confidence assumptions most consequential first, then what was not supplied and what its absence
cost.

**The proposals are not part of the confirmation, they precede it.** `proposals.md` names seven slots —
universal on every project, filled from the sector entry, the measurement and the analysis, never from a
list. A client who first sees the design fully built, in one direction, was not offered the decision that
was theirs; a client asked twenty questions stops reading by the fourth and approves the rest, which
looks like consent and is not.

---

## Every step runs as its role

Each phase is delegated to the agent that owns it, and each agent loads its own rules and **reads the
sector entry before it starts**. That is what keeps a clinician's screen and a warehouse handheld from
coming out of the same template.

| Phase | Agent | Loads |
|:--|:--|:--|
| 1 · research | `pica-researcher` ×3–5, one per product, none seeing another's findings | `design-vocabulary.md` |
| 1.8 · feasibility | `pica-architect` | `architecture.md` |
| 3.1 · proposals | main thread, never an agent | `proposals.md` |
| 2 · analysis | `pica-analyst` | `business-analysis.md`, `domain-knowledge.md`, `industry-knowledge.md` |
| 3 · design | `pica-designer` | `html-prototype.md`, `html-gates.md`, `native-mobile.md` |
| 3.5 · the words | `pica-writer` | `content.md` |
| 3.8 · evaluation | `pica-evaluator` ×3–5, one lens each, **no write access** | `evaluation.md` |
| 5 · estimate | **each agent, its own line** | `estimation.md` |
| 6 · architecture | `pica-architect` | `architecture.md` |
| 7 · build | `pica-developer` | `engineering.md`, `implementation.md` |
| 7.8 · test | `pica-tester` | `testing.md` |
| 7f · Figma | main thread, gated by hook | `figma-*.md` |

**Fan out measurement. Never fan out judgement.** Research at 1.7 and evaluation at 3.8 are the two
places, both spawned in one message, same return schema, and a unit with no provenance is rejected
rather than merged.

---

## Before starting

`$ARGUMENTS` is the brief, or a path to it. **Write it to `docs/brief.md` verbatim the moment it
arrives**, before you have had a chance to tidy it.

`pica-core` cannot depend on the packages this drives — they all depend on core and a cycle is not
installable — so every script call below is guarded, names the missing package, and prints a line for
every check that did not run. **A chain reported as complete with four of its checks silently absent is
the exact failure this project exists to prevent.**

| Missing | What stops working |
|---|---|
| `pica-analyst` | no PRD, no glossary, no sector. The client has nothing to agree to |
| `pica-research` | direction has no measured precedent behind it |
| `pica-html` | nothing is built and nothing is measured |
| `pica-content` | screens carry placeholder text |
| `pica-designqa` | no independent evaluation before the client sees it |
| `pica-architect` | no feasibility, no API contract, NFRs are adjectives |
| `pica-developer` | no code |
| `pica-qa` | no test suite, and the release gate has nothing to read |

With `--resume`, read `state.chain.completed` and continue from the next step.

---

## The chain

### Phase 0 to 3 — to a reviewable design

| Step | Does | Writes |
|---|---|---|
| **0.4** | Note what was supplied: analytics, support logs, live product access | `state.inputs` |
| **1.1–1.3** | Split the brief, name the problem, **narrow the field to `state.field`** | `state.problem`, `state.field` |
| **1.5b** | Journey map: stages, goals, pain, opportunity | `docs/research/journey.md` |
| **1.6–1.7** | **Fan out** `pica-researcher`, nine foundations each | `state.measured`, `docs/research/measured.json` |
| **1.8** | `pica-architect --feasibility`: possible, not possible, risky | `state.risks` |
| **2.1–2.1c** | Stakeholders, domain constraints, **the sector resolved** | `state.stakeholders`, `state.domainConstraints`, `state.industry` |
| **2.2–2.11** | Glossary, AS-IS, TO-BE, **delta**, rules, flows, use cases, domain model, PRD | `state.*`, `docs/contract.md` |
| **3.0** | IA, screen inventory traced to use cases, state matrix, data source per screen | `state.screens` |
| **3.1** | **Offer the direction**: the busiest screen built three ways, same content, each naming its measured source. Then S2, S3, S4, S5 | `state.proposals` |
| **3.2–3.3** | The chosen direction asserted as numbers, tokens, kit | `state.direction`, `tokens/` |
| **3.4–3.5** | Screens at every viewport in every state, then `pica-writer` | `html/` |
| **3.7** | **Measure** | see below |
| **3.8–3.9** | **Fan out** `pica-evaluator`, then a walkthrough per use case | `docs/reviews/` |
| **3.11** | Assemble `review.html`, flow leading, assumptions beside the screens that produced them | `html/review.html` |

```bash
# pica_find <package> <script> — the script's path, or nothing when the package is absent.
#
# Two layouts, and only one of them is the one users have. In the repository, packages sit
# side by side under packages/, so a sibling is ${CLAUDE_PLUGIN_ROOT}/../<name>. Installed,
# each package has its own versioned directory under the marketplace cache, so a sibling is
# ../../pica-<name>/<version>. A path that assumed only the first resolved to nothing on
# every real install, and a guarded runner then reported every measured check as SKIPPED:
# honest, and the whole chain silently unavailable.
#
# find, not a glob: an unmatched glob is a hard error in zsh.
pica_find() {
  R="${CLAUDE_PLUGIN_ROOT}"
  [ -f "$R/../$1/scripts/$2" ] && { printf '%s' "$R/../$1/scripts/$2"; return 0; }
  find "$R/../.." -maxdepth 4 -path "*/pica-$1/*/scripts/$2" -print 2>/dev/null | sort -V | tail -1
}

# Every call is guarded and names the package it could not find. A chain reported as
# complete with four of its checks silently absent is the exact failure this project
# exists to prevent.
# Two different absences, and telling them apart matters: "pica-html is not installed"
# sent someone to install a package they already had, when what was missing was one
# script that version does not ship.
pica_has() {
  R="${CLAUDE_PLUGIN_ROOT}"
  [ -d "$R/../$1" ] && return 0
  [ -n "$(find "$R/../.." -maxdepth 1 -name "pica-$1" -print 2>/dev/null)" ]
}
run() { pkg="$1"; sc="$2"; shift 2
  p=$(pica_find "$pkg" "$sc")
  if [ -n "$p" ]; then node "$p" "$@"
  elif pica_has "$pkg"; then
    echo "SKIPPED $sc: pica-$pkg is installed but ships no $sc. Upgrade it. NOT a pass."
  else
    echo "SKIPPED $sc: pica-$pkg is not installed. NOT a pass."
  fi; }

run html      capture-html-reference.mjs --dir html --out .audit
run html      verify-html.mjs      .audit/html-reference.json .pica/state.json
run html      contrast-check.mjs   .audit/html-reference.json .pica/state.json
run html      spacing-check.mjs    .audit/html-reference.json .pica/state.json
run html      coverage-check.mjs   .audit/html-reference.json .pica/state.json
run html      parity-check.mjs     .audit/html-reference.json .pica/state.json
run html      flow-check.mjs       --dir html --state .pica/state.json
run content   copy-check.mjs       .audit/html-reference.json .pica/state.json
run analyst   trace-check.mjs      .pica/state.json
run analyst   domain-check.mjs     .pica/state.json
run analyst   industry-check.mjs   .pica/state.json
run research  schema-check.mjs     .pica/state.json
run architect arch-check.mjs       .pica/state.json --feasibility
run core      proposal-check.mjs   .pica/state.json --phase design
```

All zero, or fix and re-run. **A failing check is not an assumption**: it is a defect, and continuing
past it produces a demo that breaks in front of the client.

> ### ⏸ CONFIRM 1 — the business flow and the design
>
> Present `review.html`, the delta, and the low-confidence assumptions. **Stop.**
>
> `--to design` ends here. Say what `--to figma` and `--to product` would add.

### Phase 4 to 6 — to something buildable

| Step | Does | Writes |
|---|---|---|
| **4.5** | **Offer S6 and S7**: every use case priced, and where it runs stated in consequences | `state.proposals` |
| **4.6–4.7** | The human records the frozen scope and the deadline | `scopeFrozen`, `deadline` |
| **5.1–5.2** | **Each agent estimates its own line, and only its own.** Three points each, then the arithmetic. `estimate.for` says whether this is for a client, for yourself, or skipped with a reason | `state.estimate`, `state.workPackages` |
| **6.1–6.4** | `pica-architect`: C4, ADRs, NFRs as numbers, **the API contract with its errors** | `state.nfr`, `state.adr`, `state.apiContract` |

```bash
run estimate  estimate-check.mjs   .pica/state.json
run architect arch-check.mjs       .pica/state.json
run core      proposal-check.mjs   .pica/state.json --phase scope
```

> ### ⏸ CONFIRM 2 — scope, deadline and the estimate
>
> **Only when the estimate is for a client.** `estimate.for: "self"` is sizing your own work and commits
> nobody, so nothing has to be frozen first; `"skipped"` with a reason skips the phase entirely. Both are
> recorded, because a skip nobody explained looks exactly like an estimate nobody remembered.
>
> For a client: **nothing downstream runs until `scopeFrozen` and `deadline` are on disk.** They are written by a
> human recording that a client agreed, and by no command, which is the point.

### Phase 7 to 8 — to a released product

| Step | Does | Writes |
|---|---|---|
| **7.1–7.7** | `pica-developer`: stack, tokens, components, screens in every state, API, motion, a11y | `src/`, `state.perfBudget` |
| **7.8** | `pica-tester`: the suite's shape, one e2e per use case, exploratory, regression | `state.testStrategy`, `state.defects` |
| **7.9** | The repository gate: tests traced, pipeline, branches, environments, secrets | |
| **7.10** | **`pica-evaluate --build <url>`: the built product against the approved design** | `docs/reviews/` |
| **7f** | Only with `--to figma`: port, verify, wire the prototype | `.audit/figma-dump.json` |
| **8.1–8.5** | Prove against the **original brief**, hand over, freeze, log the real hours | `state.effortLog` |

```bash
run developer dev-check.mjs         src .pica/state.json
run html      code-tokens-check.mjs src tokens/tokens.json .pica/state.json
run qa        qa-check.mjs          . .pica/state.json
run impl      impl-check.mjs        . .pica/state.json
run estimate  estimate-check.mjs    .pica/state.json --closeout
```

**7.10 is not run by whoever built it.** The builder does not grade their own build: someone who knows
why a value was chosen will find the reason it is acceptable.

> ### ⏸ CONFIRM 3 — the product against the brief
>
> Re-read `docs/brief.md`, not the contract. Copies drift, and substituting the contract for the brief
> is exactly what closeout exists to prevent.

---

## What it cannot do, and says so

**The chain cannot perform step 3.10 or its equivalent at 7.10: render every screen, look at it, and
click the main flow.** Ten green checks once coexisted with four screenshot-obvious defects and a home
row that opened another role's screen.

So the closing report says, in this order:

1. **What was delivered**, and which `--to` it stopped at
2. **The low-confidence assumptions**, most consequential first
3. **What was not supplied** at 0.4, and what that cost
4. **Every check that did not run**, and why
5. **Explicitly: no human has looked at this yet.** Do not report the package complete

---

## Definition of done

- [ ] Ran to its `--to` target without asking a question between confirmations
- [ ] Every step wrote its artefact and appended to `state.chain.completed`
- [ ] Every step ran as its role agent, and each agent read the sector entry first
- [ ] Every gap became an assumption with a confidence and a blast radius
- [ ] Every measured check returned zero, and every skipped check was named
- [ ] The three confirmations were presented as decisions, never inferred from silence
- [ ] **Nothing was reported complete that a human has not looked at**
