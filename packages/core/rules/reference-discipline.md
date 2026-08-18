# Working against a reference

Almost everything pica does is checked against something that already exists: approved HTML, a client's
own Figma file, a previous release, the sources named in the brief. That thing is the **reference**, and
the rules for handling one do not depend on the medium.

`review-discipline.md` covers how to write a check. This file covers how to treat the thing you are
checking against — and the criteria below are flow-wide, not specific to any phase.

## The reference is read-only

Whatever the reference is, you do not edit it. Not to rename a layer, not to fix an obvious typo, not to
make a failing diff pass. The moment you change it you have destroyed the only thing that can settle a
disagreement, and you will not notice until the disagreement arrives.

The failure has a characteristic shape: a diff fails, the reference looks wrong, and editing it is one
keystroke. **Editing the reference to make the check pass is the most expensive keystroke in the
project**, because every later measurement is now against your own opinion.

Applied:

- **HTML → Figma.** The approved HTML is frozen at the gate. If Figma cannot match it, that is a Figma
  finding or a registered deviation — never an HTML edit. If the HTML is genuinely wrong, it goes back
  through the gate.
- **Rebuilding an existing design.** The client's pages are copied, never worked in. See
  [figma-rebuild.md](../../figma/rules/figma-rebuild.md).
- **Feedback.** A claim about the design is checked against the reference before it is accepted, not
  after the fix.

### "I did not touch it" is a claim, not a check

Prove it mechanically, and prove it at closeout rather than trusting the memory of a session that ran
for days. The general form: **does anything in the reference now depend on something you made?** For a
Figma rebuild that is instances on the source pages pointing at your masters; for HTML it is the
approved file importing a stylesheet you wrote after the gate.

Zero, or it is no longer a reference.

## Names are not identity. Establish a channel that is.

Pairing an artefact to its reference by name breaks on the two most ordinary events in a project:
duplicate names and renames. One file had four screens called `Detail objednávky`; renaming is half the
job of a rebuild.

Decide the identity channel **before you build**, make it something you control, and assert it rather
than assume it:

| Medium | Channel |
|---|---|
| HTML | `data-viewport` and a stable frame id per screen — the capture already keys on these |
| Figma port | frame name plus the viewport section it sits in, declared in the frame map |
| Figma rebuild | **canvas coordinates** — keep each rebuilt screen at its source's position, then pairing is a dictionary lookup |

A shared coordinate system is worth the small discipline it costs, because it extends below the screen:
once two page sets align, **any node pairs to its counterpart by position**, and a pair at distance 0
holding different content is a finding no structural check produces.

## Content parity is a criterion of its own

Structure, geometry and tokens are three criteria. **What the screen says is a fourth**, and passing the
first three tells you nothing about it.

A file passed seventeen structural criteria at zero — every node present, bound, on-grid, inside its
parent, sensibly named — while showing the wrong product on one screen, region names in six delivery
rows, a placeholder `124` where the reference reads `12`, four cards in the wrong language, and a keypad
missing a key.

Two things follow.

**Counting is not comparing.** A per-frame text-run *count* against the reference catches absence and
nothing else: a wrong string counts exactly as much as the right one. Content parity needs a per-screen
**string diff** — which strings are missing, which are extra — and then, for each mismatch, the nearest
counterpart by position. Distance 0 with different text is *right place, wrong words*.

**Report what you excluded.** Diff visible text only, and say so: a check that silently includes hidden
placeholder content reports differences nobody can act on, and one that silently excludes a collapsed
section reports parity it did not verify.

Every screen, zero missing and zero extra, except entries matched by a registered deviation — and the
deviation named next to the number, so the exception is legible rather than absorbed.

## A reference has three kinds of defect, and they are decided three ways

The reference is not correct by definition. It is authoritative, which is different. Sorting its defects
is most of the judgement in the work:

1. **A defect you reproduce faithfully.** White text on a white tile, six times, in the client's own
   file. Copy it, then **name it** — clients usually do want it fixed once they can see it stated, and
   surfacing it is free.
2. **An inconsistency you must resolve to build anything.** The same bar drawn two ways on sibling
   screens of one flow. You cannot make one component without choosing. **This is the human's decision,
   not yours.** Put both measurements in front of them.
3. **A defect you introduced.** These are the ones to hunt, and they hide behind category 1.

The question that separates them is never "does this look wrong". It is **"what does the reference
say"**, asked node by node, because the answer differs per node.

## Fix at the definition, not at the occurrence

A defect visible on a screen is usually not a screen defect. Read whether the occurrence overrides
anything before repairing it: if it does not, it is inheriting, and the fix belongs upstream.

One keypad had been "repaired per occurrence against the original" in an earlier round and was still
broken, because none of the twenty-two digits overrode anything — they inherited a white master. One
rebind fixed all of them. Repairing what you can see leaves the definition to keep producing the defect
on every screen you did not open.

This holds in both media: a CSS class, a component master, a token alias. Repair the thing that is
copied, not the copies.

## Promote slowly, bind always

Two instincts feel identical — *make it reusable* — and run in opposite directions.

**Promoting something to a reusable unit is a judgement call whose default is no.** A component, a
shared CSS class, a partial: each is a bet that the thing recurs *and that its recurrences are the same
thing*. A wrong bet is not neutral — it puts a name in the system that reads as the current plan, forces
every later variation through a variant axis, and hides structure behind an instance nobody can edit.

The evidence: one library reached 147 components of which **36 were arrangements rather than things**
and **9 were duplicates** — 30% wrong, every one created by reflex rather than decision, and every one
paid for later at higher cost than never making it.

What earns promotion: the brief **names** it; **two or more occurrences that are the same thing, not the
same shape**; it carries **a state someone switches**. What does not: it appears twice; it is a section;
it is large; it would tidy the layer list.

**Binding a value to a token is not a judgement call at all.** Every colour, gap, padding, radius,
stroke width and type value is bound on first appearance — no threshold, no "this one is a one-off". A
raw value has no second occurrence to justify it; it is wrong the first time, because the whole point is
that someone can resolve it to a name. The only escape is a register entry, which is a decision someone
signed, not a discretion exercised while building.

**Be slow to promote, and never slow to bind.**
