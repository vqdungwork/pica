---
description: Find out who uses it and what actually hurts, who can veto it and what they fear, what the field charges, and how big the reachable market really is
argument-hint: "[empty, or a segment name to research just that one]"
---

# pica-discover: evidence instead of assertion

Step 0.9. Runs after `/pica` intake and **before** `/pica-analyse`, because the AS-IS at 2.3 and
the delta at 2.5 are only as good as what this step found.

Load `${CLAUDE_PLUGIN_ROOT}/rules/discovery.md` before anything else. If it is missing, stop and
say so rather than proceeding without it.

Then read the sector entry, **before choosing who to talk to**:

```bash
node $(find ~/.claude/plugins -path "*analyst/scripts/industry-check.mjs" | head -1) --show <sector>
```

It names every stakeholder the sector has with what they want and fear, and it will name a veto
holder the brief does not.

**Do not stop to ask questions.** What cannot be settled becomes an assumption with a confidence
and a blast radius, and a segment nobody interviewed is recorded as `interviews: 0` with its pain
points classed `inferred`. That is a valid state; pretending otherwise is not.

---

## 0.9.1 Segments, fanned out

Spawn `pica-discoverer` **one per segment**, and none of them sees another's findings before
reporting. Convergence is the classic contamination in interview synthesis: the second synthesis
agrees with the first because it read it, and the agreement then reads as a finding.

Per segment: the job to be done, the **context of use** (desk, outdoors, one-handed, gloved,
shared device), how often, technical fluency, `interviews`, and `isUser` / `isBuyer`.

## 0.9.2 Pain points

In the user's own words. Each with `nOf: [n, N]`, a severity, the current workaround, what it
costs them, a `class`, a `confidence` and a `source`.

**Rank by frequency and severity.** Ranking by what the planned product addresses is how
research becomes a justification.

## 0.9.3 The people who said no

Churned users, lost deals, whoever evaluated the product and kept the spreadsheet. If none was
reachable, write `saidNoWhyNone`.

## 0.9.4 Stakeholders and their vetoes

**Write into `state.stakeholders`, the register the analyst uses at 2.1.** Do not open a second
list under `discovery`: `industry-check` resolves the sector's deciding roles against that
register, and a second copy drifts from it while being the one nothing else reads.

Enrich each entry with `wants`, `fears`, `decides`, `vetoes`, and for every veto holder,
`wouldBlockIf`.

## 0.9.5 Competitors: pricing and packaging

Three to five named. What they charge, what sits in which tier, who they serve, their positioning
claim, and a source. **The design surface belongs to `pica-researcher`; this is the commercial
half.**

## 0.9.6 The market, derived

Reachable accounts times seats times price, each factor sourced. Then the switching cost and the
trigger that makes a buyer change.

---

## Write to state and to disk

`state.discovery` and `state.stakeholders`, plus `docs/research/pain-points.md`, `stakeholders.md`, `competitors.md` and
`market.md`. **The state keys are what gets checked; the files are what get read.**

Those files are also where `/pica-model` points its revenue drivers, so a driver's `from` should
name a real line in one of them.

---

## Verify before handing back

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/discover-check.mjs .pica/state.json
```

Zero findings, or fix. Then report what you checked, what you found, and **which pain points are
inferred rather than observed**, because those are the ones the client should correct first.

---

## When this finishes

`/pica-model` can price it and `/pica-analyse` can write the PRD on it. Say plainly how many
people were actually interviewed, and name any segment that is still a hypothesis.
