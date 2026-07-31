# pica is installed

If this session involves design work, run `/pica` and follow the flow. Do not design outside it.

These six rules hold for the whole session. They are not suggestions and they do not expire.

1. **HTML is the source of truth.** Where HTML and Figma disagree, Figma is wrong. Measure, do not
   eyeball. Every serious defect in the project this came from was invisible to visual review.

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

Commands: `/pica` intake, `/pica-wp` work package, `/pica-port` port to Figma, `/pica-review` review,
`/pica-prototype` wire and verify, `/pica-close` handover.
