# pica is installed

If this session involves design work, run `/pica` and follow the flow. Do not design outside it.

These eight rules hold for the whole session. They are not suggestions and they do not expire.

1. **HTML is the source of truth.** Where HTML and Figma disagree, Figma is wrong. Measure, do not
   eyeball. Every serious defect was invisible to visual review.

   And measurement is not the whole job: **render every screen and look at it, and click the main flow.**
   On one project four screenshot-obvious defects survived ten green checks.

2. **Never port a work package to Figma before the human approves its HTML.** Not "it looks ready",
   not "it is obviously fine". Approved, for that specific package.

3. **Reviews report before they fix.** Finding and fixing are separate passes. An audit that writes
   is not an audit.

4. **Never modify a delivered artefact.** After handover the file is read-only. Report what is wrong;
   do not repair it.

5. **Self-review before handing anything back.** State what you checked and what you found, not that
   it is done. "Complete" on broken work is worse than no report.

6. **Never claim a state you have not verified in a separate call.** Same-call read-back returns the
   in-memory value, which may never reach the document.

7. **Offer before you assert.** Seven slots in `proposals.md` are the client's decisions, not yours —
   the direction above all, built as the same screen three times. The slots are universal; what fills
   them comes from the sector, the measurement and the analysis. A client who first sees the design
   fully built, in one direction, was never offered the decision that was theirs.

8. **A work package ships option boards AND an interactive prototype of its main flow.** Options settle a
   decision; the flow is what the human uses, and it is where the defects nothing can measure live. One
   prototype per application, linked to each other for real.

**`/picaflow <brief>` runs the whole chain**, stopping only at the four points where a person has to
decide: whether it is worth building, the design, the scope and deadline, and the finished product. Everything it cannot derive in
between becomes a labelled assumption the client corrects, because reacting to a built thing is far
cheaper than specifying one.

`--to design` ends at a measured, clickable `review.html`. `--to figma` adds the ported file, verified
frame by frame. `--to product` adds working front end and back end, tested and released. **Each is a
complete project, and Figma is off the critical path.** Every step runs as the agent that owns it, and
each agent reads the sector entry before it starts.

Or run the steps yourself:

| | |
|---|---|
| `/pica` | intake, the contract, exclusions |
| `/pica-discover` | who uses it and what hurts, who can veto it, what the field charges |
| `/pica-analyse` | glossary, AS-IS, TO-BE, business rules, domain model, PRD |
| `/pica-architect` | feasibility before anything is promised, then C4 and ADRs |
| `/pica-model` | cost to build, cost to run, plausible return, and the price fence |
| `/pica-wp <name>` | one work package in HTML at every viewport, measured |
| `/pica-copy` | the words, every state, bound to the glossary |
| `/pica-evaluate` | 3 to 5 independent evaluators, walkthrough, build vs design |
| `/pica-estimate` | three-point effort by role, work order, effort logged back |
| `/pica-develop` | the code: the API contract, where state lives, how failure is shaped |
| `/pica-test` | the shape of the suite, one end-to-end test per use case, the release gate |
| `/pica-build` | the repository: pipeline, branches, environments, secrets |
| `/pica-port` · `/pica-review` · `/pica-prototype` | the Figma half, optional |
| `/pica-close` · `/pica-feedback` | handover, and triaging someone else's review |
