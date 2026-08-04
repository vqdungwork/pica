# pica-close: prove the delivery, hand over, then freeze

Step 9.

Load `${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/review-gates.md`.

---

## 1. Re-read the original brief. Cold.

**The brief. Not `docs/contract.md`, not the plan, not your memory of it.**

Both the contract and the plan are copies, and copies drift. On the source project this step recovered a
scored deliverable that had been missed entirely: the brief asked for design reasoning, and nothing in
the plan carried it.

Read `docs/exclusions.md` again too, and **check nothing excluded was built** — by comparing, not by
recalling. Copy `exclusions` from `.pica/state.json` into the audit's `EXCLUSIONS` config and let it match
frame names for you. Prose is what the client reads; the register is what gets checked.

If a match comes back, it is one of two things and you have to say which: the brief was misread, or the
scope genuinely changed and nobody updated the exclusions. The second is fine. The first is a finding.

## 2. Required versus present

Write `docs/required-vs-present.md`. Every deliverable the brief names, in a table:

| Required by brief | Present | Where | Note |
|---|---|---|---|

**Gaps are stated, not quietly omitted.** A gap the human knows about is a decision; a gap they discover
at the walkthrough is a failure.

**Recount every number from the file, in the same script that writes it.** Do not carry a count forward
from an earlier document. The audit now parses claims out of the file's own text and recounts them, so a
cover reading "45 designed screens" is checked against the actual frame count rather than trusted — that
exact claim was once counting five annotation boards.

Also empty the registers deliberately. Every `deviations` entry marked `by: "html-fix-pending"` is a
promise to correct the HTML; keep it open at handover and it becomes a defect the client inherits.

## 3. The handoff page

In Figma if it is in scope, otherwise in `docs/handoff.md`:

- **Platform deltas.** One table, each row marked **keep / adjust / swap**. Rows that reliably need work:
  the date picker, the switch, dialog button alignment, press feedback, the active-tab indicator, sheet
  corner radius, the cast affordance.
- **Naming conventions.** What the human will need to keep the file consistent after you leave.
- **The reuse map.** Which component appears on which screens, so a developer knows what a change touches.
- **Open questions**, ordered by how badly they block. Lead with anything that blocks a backend decision;
  those are the only ones that cannot be deferred.
- **Touch-target notes.** Where the drawn box is deliberately smaller than the target, and what expands it.

## 4. The rationale

Finalise `docs/rationale.md` into something client-facing. Every non-obvious decision with its reason and
its evidence.

A brief that says it is evaluating product thinking is scoring this document, not the screens. Treat it as
a deliverable, not a byproduct.

## 5. The effort report

From `docs/effort-log.md`, **within the disclosure policy recorded at intake**.

Read that policy again before writing anything. If it says actual hours are not disclosed, then no
per-session figure, no total, and nothing phrased as faster than estimated or under budget. An estimate
that was correctly priced for the full job should not be undercut by a pilot that came in light.

## 6. The walkthrough agenda

Write `docs/walkthrough-agenda.md`, for a 30-minute screen share:

- **What to open first**, and why
- Minute-by-minute sections
- **The three things to lead with**, usually whatever blocks the build
- **Pre-written answers** to the questions a developer will ask: where the specs are, is this iOS or
  Android, what is custom versus native, how do we theme it, are the strings final, why is this control
  disabled
- **What not to promise**

The point is not to present the design. It is to make sure their developer can build from the file
without coming back.

## 7. Freeze

Set in `.pica/state.json`:

```json
"delivered": true,
"writeAuthorization": null,
"activeReview": null
```

From here the write gate denies every Figma mutation.

**After this point, audits report and do not repair.** If something is found wrong post-delivery, say what
it is and let the human decide. On the source project a post-delivery audit ran as a write and deleted a
node that could not be restored. It was one empty text node, and it was still the only permanent damage in
the entire project.

To reopen deliberately, the human sets `delivered` back to false. Tell them that is what it takes, rather
than working around it.

---

## GATE 9

Present the required-versus-present table first, because it is the one that answers "are we done".

Then the handoff, the rationale, the effort report and the agenda.

**Stop.** Wait for approval of the handover.
