# pica-port: port an approved work package to Figma

Step 6. The package named in `$ARGUMENTS`.

Load `${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/figma-screens.md` and
`${CLAUDE_PLUGIN_ROOT}/skills/design-flow/rules/figma-elements.md`, then load the `figma-use` skill.
Pass `skillNames: "figma-use"` on every `use_figma` call.

---

## Preconditions

Check `.pica/state.json` and **stop** if any fail:

- `figmaInScope` is true
- `workPackages.<wp>.htmlApproved` is true
- `delivered` is false
- `activeReview` is not in report mode

The write gate enforces all of these anyway, so a failure here is a denied tool call rather than a
wrong file. But check first and say which precondition failed, rather than letting the human read a
hook denial.

**If the HTML is not approved, do not port.** On the source project a package was ported before approval
and the entire page had to be deleted. That is the failure this gate exists for.

Set `writeAuthorization` to `{"granted": true, "reason": "port <wp>"}` before the first write, and back
to `null` when the command ends, including on failure.

---

## 1. Capture the HTML reference first

Before touching Figma:

```
node ${CLAUDE_PLUGIN_ROOT}/skills/design-flow/scripts/capture-html-reference.mjs \
  --dir html --out .audit --font "<the family Figma currently resolves>"
```

**Then confirm the HTML side is still clean before porting anything.** `/pica-wp` measured it at
approval, but the HTML may have moved since:

```
S=${CLAUDE_PLUGIN_ROOT}/skills/design-flow/scripts
node $S/verify-html.mjs  .audit/html-reference.json .pica/state.json
node $S/parity-check.mjs .audit/html-reference.json .pica/state.json
```

Both must return 0 findings. Porting from HTML with known defects reproduces them in Figma and costs a
second pass to undo.

Force the family Figma is resolving, so the diff isolates layout from typeface metrics. Run it natively
too, once both sides share a family.

If playwright is unavailable, **say the measured diff cannot run** and stop. Do not fall back to
eyeballing and call it a port; that is the failure mode this whole flow exists to prevent.

## 2. Local components

The repeated patterns specific to this screen family, in a "Local components" section on the package's
page, with a family prefix (`pl-transport`, `live-hero`).

- Locals **compose globals**. They never redraw them.
- A local must not duplicate a global. If a global nearly fits, add a variant there instead.
- Remember you **cannot add a child to an instance**. Put a hidden slot plus a boolean property in the
  component.

## 3. Screens

From instances only. The only raw shapes permitted are photographic fills, gradient scrims and the home
indicator.

- Every frame is auto layout. **No spacer frames.**
- HUG for content height, FILL for widths, FIXED only for literal sizes.
- Centring comes from parent alignment, never from spacers.
- Bind gaps and padding to spacing variables.
- `width: 100%` in the HTML means **FILL**. Getting this wrong makes a primary CTA hug its label.
- `margin-top: auto` means a **FILL-height wrapper** before the last child.
- A hero bleeding behind the status bar is a **negative y**, not `y: 0`.
- Button labels are `textAlignHorizontal = "CENTER"`, set on the component.
- Set instances to HUG unless there is a stated reason to fix. Stale fixed heights cause dead space and
  clipping at the same time.

## 4. The circle sweep

Every circle-intent node, meaning dots, checks, avatars, radios, switch thumbs, rings, numbered badges
and icon-button backgrounds, must be **FIXED on both axes**.

Sweep for width not equal to height on full-radius nodes and restore the **intended** size, never the
collapsed one. Guard `cornerRadius`, which can be `figma.mixed`.

A HUG circle looks perfect in the frame you built it in and becomes an oval the first time its content
changes length.

## 5. Prototype links within the package

Wire what belongs inside this package. Cross-page links are impossible in Figma, so cross-package flows
wait for `/pica-prototype`.

## 6. Audit to zero

```
${CLAUDE_PLUGIN_ROOT}/skills/design-flow/scripts/figma-audit.js
```

Run it as one `use_figma` call. Then diff geometry against the captured reference: **match by text
content, compare position only.** Never compare width or height; the HTML glyph box and the Figma line
box measure different things, and comparing them produces phantom findings by the hundred. Tolerance
roughly 3px.

Fix, then **re-audit in a separate call**. Same-call read-back is not proof. Repeat until every check
returns zero.

## The loop is per frame, and the render is not optional

**Capture the frame → compare it against the HTML capture → measure → fix → re-capture.** Per frame,
immediately after that frame is built, and again after every fix.

Presenting a port as complete on the strength of a spot check is not a lesser version of this; it is a
different and much weaker claim. On one project two frames were reported as matching on the strength of
two numbers, and were in fact missing their last 300px of content — a field, a filter group and the
primary CTA — because **a clipped node still reports its coordinates**, so the position diff called them
merely "over tolerance".

Re-diffing after *each* fix is what makes a wrong fix cheap. On the same project a fix based on one
finding moved a heading from an exact match to 24px out; the next diff run caught it immediately instead
of it shipping.

And a diff finding is **not automatically a design defect**. Of four causes traced on that project, one
was the Figma file, one was a wrong fix, one was a measurement artefact, and one was a corrupted HTML
source. The diff says the two disagree. It does not say which is wrong.

Print the **full font family and style distribution** and read it. Do not ask "is anything not the
target family": that question is blind to nodes with no binding at all.

## 7. Self-review before presenting

Screenshot the page. State what you ran, what it found, and what you fixed. Attach the audit output.

Never present a port as complete without the audit showing zero.

---

## GATE 6

Present the port with the audit output and the geometry diff.

Set `workPackages.<wp>.ported = true` and clear `writeAuthorization`.

**Stop.** The human's review is craft judgement; correctness was already proven by measurement.

Then run `/pica-review <wp>` immediately, per package. Reviews are never saved for the end: deferred
once, they became 64 findings across 12 rounds because two days of divergence had piled up.
