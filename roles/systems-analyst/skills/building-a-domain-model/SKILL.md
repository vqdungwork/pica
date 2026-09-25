---
name: building-a-domain-model
description: Turn use cases and business rules into entities, relationships, attributes and validation — the blueprint everything downstream is built against.
argument-hint: "[the use cases and rules]"
intent: >-
  The domain model is where prose becomes precise. Every screen displays one of these entities,
  every permission acts on one, and every piece of mock data has to be an instance of one.
theme: specification
best_for:
  - "Turning requirements into something engineering can build a schema from"
  - "Finding the entity nobody named because everybody assumed it"
  - "Making validation explicit before it is invented in three places"
scenarios:
  - "The rules mention 'the file' constantly. What is it actually?"
  - "Two use cases use the same word for different things."
estimated_time: "2–4 hours"
---

## Purpose

An entity is a noun the business would recognise and could point at. The model is not a
database schema — it is the shared vocabulary made structural, which is why it is built from
the glossary rather than from a table design.

## Input

**Works best with:** the use cases, the business rules and the glossary.
**Also useful:** existing systems you must integrate with, which constrain names and keys.

## The method

**1. Take the nouns from the glossary, not from your head.** If the business calls it a
*holding*, the entity is `Holding`. Renaming it to `Asset` because that is more general starts
a translation layer that never ends.

**2. One meaning per name.** Where two use cases use one word differently, that is two
entities or a missing qualifier. This is the most common finding and the most expensive one
to leave.

**3. Every attribute gets a type and a validation rule.** *"Amount"* is not a field;
*"Amount, decimal, non-negative, three decimal places, currency required"* is. Validation
written here is validation written once.

**4. Relationships carry cardinality and what happens on delete.** A relationship without
either is a decision deferred to whoever writes the migration.

**5. Check every use case touches at least one entity**, and every entity is touched by at
least one use case. An orphan on either side is a finding — an entity nobody uses, or a
requirement with no data behind it.

**6. Mark what is derived.** A total that is computed is not stored, and a model that does not
say so produces two sources of truth within a week.

## What good looks like

Every entity name appears in the glossary. Every attribute has a type and a rule. Nothing is
orphaned in either direction.

## Common failures

**Designing the database.** Indexes and join tables are not domain concepts.

**Inventing names.** The model stops being reviewable by the business the moment it stops
using their words.

**Leaving validation for later.** Later means three implementations that disagree.

## Done when

```bash
node <pica>/roles/systems-analyst/scripts/domain-check.mjs .pica/state.json
```

returns zero findings.
