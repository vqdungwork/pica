# The state schema

`.pica/state.json` is the one artefact every role reads and writes. It is not a document a person
composes: each key is written by exactly one role and read by the checks that hold it.

Until 3.0.0 this file did not exist. The schema lived in two places — the worked example under
`examples/approvals`, and the source of whichever check happened to read a key — so populating a new
project meant guessing a shape and correcting it against error messages. A first run of a small project
took six rounds of that, which is six rounds nobody should repeat.

**Shapes below are taken from the worked example, not written by hand.** Where a key is absent from it,
that is said rather than invented.

---

## Intake — written by `product-manager`

<!-- enforced-by: archetype-declared, archetype-resolved, archetype-ambiguous, archetype-screens -->

### `applications`

`[ { name, archetype } ]`

Written by `nobody` · read by `archetype-check`

### `archetype`

`{ approvals }`

Written by `product-manager` · read by `archetype-check`

## Discovery — written by `ux-researcher`

<!-- enforced-by: audience-resolved, audience-dimensions, audience-floors, audience-evidence, segment-defined, pain-frequency, said-no, buyer-named -->

### `audience`

`{ dimensions, floors }`

Written by `ux-researcher` · read by `audience-check`

### `discovery`

`{ segments, painPoints, saidNo, competitors, market }`

Written by `ux-researcher` · read by `discover-check`

## Research — written by `design-researcher`

<!-- enforced-by: sample-size, foundations, type-roles, provenance, shipped, tradition -->

### `measured`

`[ { product, url, shipped, method, tradition, typography, … }, … ]`

Written by `design-researcher` · read by `schema-check`

## Analysis and specification — `business-analyst`, `systems-analyst`, `solution-architect`

<!-- enforced-by: as-is-present, activity-traced, all-categories, stack-named, nfr-met, integrations, environments -->

### `architecture`

*not in the worked example*

Written by `solution-architect` · read by `architecture-check`

### `asIs`

`str`

Written by `ux-researcher` · read by `process-check`

### `businessRules`

`[ { id, rule, enforcedBy, source } ]`

Written by `business-analyst` · read by `trace-check`

### `commercialConstraint`

*not in the worked example*

Written by `nobody` · read by `problem-check`

### `domainConstraints`

`[ { category, affects, constraint, source, verifiedBy }, … ]`

Written by `systems-analyst` · read by `domain-check`

### `field`

`str`

Written by `product-manager` · read by `industry-check`

### `journeys`

`[ { actor, stages } ]`

Written by `systems-analyst` · read by `journey-check`

### `nfr`

`[ { id, kind, requirement, condition, measuredBy } ]`

Written by `business-analyst` · read by `requirements-check`

### `problem`

`{ statement, whose, metric, unit, baseline, baselineMeasuredBy, … }`

Written by `business-analyst` · read by `problem-check`

### `requirements`

`[ { id, class, text }, … ]`

Written by `business-analyst` · read by `requirements-check`

### `rolesPermissions`

`{ account holder, compliance officer, fraud analyst, regulator }`

Written by `systems-analyst` · read by `permissions-check`

### `stateModel`

`[ { entity, states }, … ]`

Written by `systems-analyst` · read by `requirements-check`, `state-coverage-check`

### `toBe`

`{ notation, notationWhy, lanes, nodes, edges }`

Written by `systems-analyst` · read by `journey-check`, `process-check`

### `trigger`

*not in the worked example*

Written by `nobody` · read by `problem-check`

### `useCases`

`[ { id, name, actor, tracesTo, touches } ]`

Written by `business-analyst` · read by `coverage-check`, `trace-check`

## Design — `ux-designer`, `ui-designer`, `content-designer`, `ux-engineer`

<!-- enforced-by: three-offered, traditions-differ, palette-declared, contrast-proved, unhappy-paths, dead-ends, lofi-traced, lofi-states -->

### `flows`

`[ { app, entry, home, owns } ]`

Written by `product-manager` · read by `flow-check`, `flow-paths-check`

### `proposals`

`[ { slot, presented, axis, options, chosen, by, … }, … ]`

Written by `product-manager` · read by `direction-spread-check`, `palette-check`, `proposal-check`

### `viewports`

`[ { name, w, h, idiom, pointer, breakpoints, … }, … ]`

Written by `product-manager` · read by `verify-html`

### `workPackages`

`{ approvals }`

Written by `evaluator` · read by `concept-check`, `pre-gate-lens-check`

## Close — `product-manager`

<!-- enforced-by: brief-cold, delivered-frozen, assumption-outcome, family-declared -->

### `closeout`

`{ briefReadFrom, metricNow, metricMeasuredOn, shipped, dropped }`

Written by `product-manager` · read by `close-check`

### `direction`

`{ name, field, mode, precedent, rationale, assert, … }`

Written by `ui-designer` · read by `font-check`

## Carried by decision, read by no check

<!-- enforced-by: brief-cold, delivered-frozen -->

`state-contract-check` requires every produced key to be read by a check **or** named in
`scripts/state-carried.json` with a reason. That file is a ratchet: the count may fall, never rise.


**gates** — recorded by a human to mark that a client agreed, and read by the runner rather than by a check. A check that verified them would be verifying its own input.

- `delivered` — written by `product-manager`
- `exclusionsConfirmed` — written by `business-analyst`
- `figmaInScope` — written by `product-manager`
- `intakeApproved` — written by `product-manager`
- `scopeFrozen` — written by `product-manager`

**commercial** — facts about the engagement, not about the product. They belong in the SOW and are carried here so the chain can read them.

- `deadline` — written by `product-manager`
- `exclusions` — written by `product-manager`

**build-markers** — written by a phase to record that it ran. The artefact they point at is what gets checked, not the marker.

- `demo` — written by `ux-engineer`
- `packages` — written by `design-ops`

**not-yet-checked** — genuinely unvalidated, and named here rather than left invisible. Each is a check somebody has not written.

- `copyRules` — written by `content-designer`
- `delta` — written by `business-analyst`
- `domainModel` — written by `systems-analyst`
- `glossary` — written by `business-analyst`
- `industry` — written by `business-analyst`
- `operatingModel` — written by `ux-researcher`
- `stakeholders` — written by `business-analyst`

## Present in the example, declared by nobody

<!-- enforced-by: as-is-present, slot-addressed -->

Conventions the worked example carries that no manifest declares. Each is either a key a role
should claim, or a habit that outlived its reason.

- `assumptions`
- `briefPath`
- `changeControl`
- `checkDisputes`
- `frozenBy`
- `stateExemptions`
- `structureExemptions`
