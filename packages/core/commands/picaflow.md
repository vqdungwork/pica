---
description: Run a whole engagement from a brief, discovery, analysis, design, demo, stopping only where a human has to decide
argument-hint: "[the brief, or a path to it] [--to design|figma] [--resume]"
---

# picaflow: a brief in, a confirmed demo out

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

## Where it finishes

pica delivers a **confirmed PRD, an agreed scope of work, and a working interactive demo.** What it costs
to build from there is your estimate to make, outside pica.

| `--to` | You get | Stops after |
|:--|:--|:--|
| `design` *(default)* | the PRD, the assumptions register, and **`demo.html`**: React, interactive, served | the freeze |
| `figma` | that, plus the ported Figma file verified frame by frame against the capture | the port |

Figma is **optional and off the critical path**. It is not asked about at intake: after the freeze you
either say "port it", and pica checks the MCP then, or you do not and the port never happens.

---

## Three hard stops, three soft checkpoints

| | What the human does | Why a machine cannot |
|:--:|:--|:--|
| **⏸ 1** | signs the **engagement scope**: what is in, what is out, and anything the client must not be told | a commercial commitment |
| **▸** | reacts to the **restated problem**, the **lo-fi structure**, and the **direction** | each is a built thing to correct, not a question to answer |
| **⏸ 2** | approves the **design system** | it propagates into every screen; reversing it later rebuilds everything |
| **⏸ 3** | confirms the **PRD is correct**, the **scope of work is agreed**, and the **demo does what they expect** | whether this is their business, and whether the assumptions were right |

A soft checkpoint presents and continues. Silence becomes a labelled assumption with a blast radius,
surfaced beside the screen it produced. A hard stop writes a gate to disk and nothing downstream runs.

At stop 3 present, in this order: the **delta** first, then **what they chose and why**, then the
low-confidence assumptions most consequential first, then what was not supplied and what its absence
cost.

**The proposals are not part of the confirmation, they precede it.** `proposals.md` names seven slots:
universal on every project, filled from the sector entry, the measurement and the analysis, never from a
list. A client who first sees the design fully built, in one direction, was not offered the decision that
was theirs; a client asked twenty questions stops reading by the fourth and approves the rest, which
looks like consent and is not.

---

## Every step runs as its role

Each phase is delegated to the agent that owns it, and each agent **reads the sector, audience and
archetype entries before it starts**. That is what keeps a clinician's screen and a warehouse handheld
from coming out of the same template.

| Phase | Agent | Loads |
|:--|:--|:--|
| discover | `pica-discoverer` ×3–5, one per segment | `discovery.md` |
| research | `pica-researcher` ×3–5, one per product, none seeing another's findings | `design-vocabulary.md` |
| analyse A, C | `pica-analyst` | `business-analysis.md`, `domain-knowledge.md`, `industry-knowledge.md` |
| analyse B | `pica-modeller` | `modelling.md` |
| design | `pica-designer` | `html-prototype.md`, `html-gates.md`, `react-demo.md`, `native-mobile.md` |
| the words | `pica-writer` | `content.md` |
| evaluation | `pica-evaluator` ×3–5, one lens each, **no write access** | `evaluation.md` |
| proposals | main thread, **never an agent** | `proposals.md` |
| intake, scope, close | main thread | `intake.md` |
| the port | main thread, gated by hook | `figma-*.md` |

**Fan out measurement. Never fan out judgement.** Research and evaluation are the two places, both
spawned in one message, same return schema, and a unit with no provenance is rejected rather than merged.

---

## Before starting

`$ARGUMENTS` is the brief, or a path to it. **Write it to `docs/brief.md` verbatim the moment it
arrives**, before you have had a chance to tidy it. `briefPath` is a list: an RFP with an annex is one
brief in three documents.

`pica-core` cannot depend on the packages this drives: they all depend on core and a cycle is not
installable, so every script call below is guarded, names the missing package, and prints a line for
every check that did not run. **A chain reported as complete with four of its checks silently absent is
the exact failure this project exists to prevent.**

| Missing | What stops working |
|---|---|
| `pica-discover` | no users, no pain with a frequency, no veto holders, **no audience profile**: every floor the design owes is unset |
| `pica-research` | nothing is measured, and the direction has no precedent behind it |
| `pica-analyst` | no PRD, no glossary, no sector, **no models**. The client has nothing to agree to |
| `pica-html` | nothing is built and nothing is measured |
| `pica-content` | screens carry placeholder text |
| `pica-designqa` | no independent evaluation before the client sees it |

With `--resume`, read `state.chain.completed` and continue from the next step.

---

## The chain

### Intake, discovery, research

| Step | Does | Writes |
|---|---|---|
| **1.1** | The five-input packet. **Derive the field and the archetype** from the brief where it says them, marked derived, and confirm with their consequences | `briefPath`, `field`, `archetype`, `viewports` |
| **1.2** | Limitations **before any capability claim**. The engagement contract, the exclusions, the tiers | `docs/contract.md`, `docs/exclusions.md` |
| **1.5** | Journey spine: the stages, before anybody has been asked about pain | `docs/research/journey.md` |
| **2.1** | **Fan out** `pica-discoverer`, one per segment: pain with a frequency and a class, the people who can veto it, competitor pricing, the market derived | `discovery`, `stakeholders` |
| **2.2** | The **audience profile** across five dimensions, and the **operating model**: how the business earns and who does what | `audience`, `operatingModel` |
| **2.3** | **AS-IS**, observed rather than described, each step carrying its evidence class | `asIs` |
| **3.1** | **Fan out** `pica-researcher`, nine foundations each, on products the archetype picks | `measured`, `tokens/` |

> ### ⏸ Stop 1: the engagement scope
>
> Signed before research spends anything. Nothing downstream runs while `exclusionsConfirmed` is false
> or while no path in `briefPath` exists and `briefAbsent` does not say why.

> ### ▸ The audience profile
>
> Present it with its evidence **and the floors it sets**: type size, contrast, target size. Confirmed
> before tokens exist, so the floors shape the design system rather than being retrofitted onto it.

### Analysis

| Step | Does | Writes |
|---|---|---|
| **4.A** | `pica-analyst`: the real problem, glossary and data dictionary, business rules, domain constraints, **NFRs as numbers** | `problem`, `glossary`, `businessRules`, `nfr` |
| **4.B** | `pica-modeller`: **TO-BE process model** (BPMN when it crosses roles), **domain model**, **CRUD matrix**, **state model** | `toBe`, `domainModel`, `rolesPermissions`, `stateModel` |
| **4.C** | `pica-analyst`: use cases, requirements **classified**, journey maps per laned actor, the delta, **the PRD** | `useCases`, `requirements`, `journeys`, `delta`, `docs/prd.md` |

> ### ▸ The restated problem
>
> The problem as the analysis found it, against the one the brief stated, and the delta. Present and
> continue; silence is an assumption.

### Design

| Step | Does | Writes |
|---|---|---|
| **5.0** | IA, screen inventory traced to use cases, data source per screen. The **state matrix arrives from analysis** | `screens` |
| **5.1** | **Lo-fi structure**: greyscale, real content lengths, every state drawn or excused | `html/structure/` |
| **5.2** | **Offer the direction**: the busiest screen built three ways, three different traditions, one of them the sector's own, each naming its measured source. Then S2–S5 | `proposals` |
| **5.3** | **Foundations**: palette with roles and computed contrast, type scale, spacing, the kit in every state, the icon set, motion tokens | `direction`, `tokens/`, `html/design-system.html` |
| **5.4** | Every screen at every viewport in every state, then `pica-writer` | `html/` |
| **5.5** | **Measure** | see below |
| **5.6** | **Fan out** `pica-evaluator`, then a walkthrough per use case | `docs/reviews/` |
| **5.7** | **`demo.html`**: React, responsive, interactive, mock data, motion behaviour, **every state addressable by URL**, served | the demo |

> ### ▸ Structure, then ▸ the direction
>
> Two soft checkpoints, both a built thing. Structure before anything is styled; the direction as three
> screens, because a client cannot judge `--radius-lg: 12px` and can judge two screens in three seconds.

> ### ⏸ Stop 2: the design system
>
> The foundations page, presented **for approval, not for re-choosing**. The direction already decided
> the type, the buttons and the density; this is a decision being shown, and pica says so rather than
> dressing it as a choice. If it is wrong, the answer is a second round of three directions.

```bash
# pica_find <package> <script>: the script's path, or nothing when the package is absent.
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

# The capture first: it is produced, not checked, and eight checks abstain until it exists.
# --url for the demo, --dir for the static boards. It refuses to write an unsettled capture.
run html      capture-html-reference.mjs --dir html --out .audit

# Then everything applicable, in one table, phase by phase. pica-verify reads what to run
# from each package's own manifest rather than from a list kept here, which is why this
# block no longer has to name twenty-eight invocations and drift from them.
run core      pica-verify.mjs      .pica/state.json --phase intake
run core      pica-verify.mjs      .pica/state.json --phase discover
run core      pica-verify.mjs      .pica/state.json --phase research
run core      pica-verify.mjs      .pica/state.json --phase analyse
run core      pica-verify.mjs      .pica/state.json --phase design --evidence
```

All zero, or fix and re-run. **A failing check is not an assumption**: it is a defect, and continuing
past it produces a demo that breaks in front of the client.

> ### ⏸ Stop 3: the PRD, the scope, and the demo
>
> Three things confirmed together: the PRD is correct, the scope of work is agreed, and **the demo does
> what they expect**. `scopeFrozen` and `deadline` are written by a human recording that a client agreed,
> and by no command, which is the point.
>
> This is the handoff. What it costs to build is yours to estimate from here.

### Close, and the optional port

| Step | Does | Writes |
|---|---|---|
| **6.1** | S6 and S7 offered: what is in the first release, and where it runs | `proposals` |
| **7.1** | Prove against the **original brief** and its amendments, never the contract. Hand over, freeze | `delivered`, `docs/handover.md` |
| **7f** | Only if you ask for it: check the Figma MCP, port, verify frame by frame | `.audit/figma-dump.json` |

```bash
run core      pica-verify.mjs      .pica/state.json --phase scope
run core      pica-verify.mjs      .pica/state.json --phase close

# One run at the end over everything, so the closing report can state a number rather
# than a feeling: how many assertions were verified, and how many checks abstained.
run core      pica-verify.mjs      .pica/state.json --adopt --evidence
```

`close-check` is the one that compares rather than trusts: it fails when `closeout.briefReadFrom`
is anything other than `briefPath`, because a closeout that reads the contract grades the work
against a document the work already renegotiated, and that always passes.

---

## What it cannot do, and says so

**The chain cannot render every screen, look at it, and click the main flow.** Ten green checks once
coexisted with four screenshot-obvious defects and a home row that opened another role's screen.

**And it does not test with real users.** Evaluation is 3–5 agents with distinct lenses plus a cognitive
walkthrough: an established method that recognises up to 80% of usability problems, and one that exists
precisely because users are not always available. It is not a substitute: it cannot find what a
practitioner spots in one second, and it cannot tell you whether anybody wants the thing.

So the closing report says, in this order:

1. **What was delivered**, and which `--to` it stopped at
2. **The low-confidence assumptions**, most consequential first
3. **What was not supplied** at intake, and what that cost
4. **Every check that did not run**, and why
5. **The verification total from `pica-verify --adopt --evidence`**: assertions verified,
   checks abstained, and what each abstention needs. A count is what a client can check;
   "everything passed" is not
6. **Explicitly: no human has used this yet.** Do not report the package complete

---

## Definition of done

- [ ] Ran to its `--to` target without asking a question between the stops
- [ ] Every step wrote its artefact and appended to `state.chain.completed`
- [ ] Every step ran as its role agent, and each read sector, audience and archetype first
- [ ] Every gap became an assumption with a confidence and a blast radius
- [ ] Every measured check returned zero, and every skipped check was named
- [ ] The three hard stops were presented as decisions, never inferred from silence
- [ ] **Nothing was reported complete that a human has not used**
