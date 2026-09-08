---
description: Start a design project: intake as a contract, research, the design direction, tokens and the HTML UI kit
argument-hint: "[the brief, or a path to it]"
---

# pica: start a design project

Runs steps 1 to 4: intake, research and tokens, the HTML UI kit, and if Figma is in scope, the
foundations port. These happen in one sitting. Steps 5 onward have their own commands.

Load the research package's `research.md` before anything else. If the research package is not
installed, stop and say so rather than proceeding without it.

`$ARGUMENTS` may contain the brief or a path to it. If it is empty, ask for the intake packet.

---

## Step 1: Intake

### 1a. Collect the packet

**Refuse to proceed without the first five.** The Figma declaration is the exception: nothing before
phase 7 depends on it, so an unknown answer is recorded as an assumption rather than treated as a
blocker. Figma is a developer handoff artefact, and who builds is often not settled until the contract.

For the rest, refuse. List what is missing rather than filling gaps with assumptions.

| Input | Ask for |
|---|---|
| The brief | Raw and unedited. Not a summary |
| Sources | Every file, URL and capture, each labelled `use` or `ignore` |
| Commercial constraint | Hours or days, fixed-scope or T&M, any existing estimate, and **anything the client must not be told** |
| Environment | Fonts installed, tools live, and **what only the human can do** |
| Figma declaration | Is Figma a deliverable, yes or no. **Ask it now because it is free; it does not bind until the contract** |
| Field and use | The field named **narrowly**, who uses it and how often, and the conditions of use: desk, outdoors, one-handed, gloved, shared device |
| The trigger | What changed, when, what happens if nobody acts, and when the window closes |

Ask for all seven in one message. Do not interrogate one at a time.

The trigger is the cheapest of the seven and the one most often absent. If nothing changed, the
product is being built because it can be, which is the commonest root cause of a product nobody
wanted. It is also what makes a break-even month mean anything: a figure with no window against it
cannot be prioritised against anything else.

And **write down which of scope, date and resources is actually fixed**, and who fixed it. The
deadline is almost never something you derive: it arrives from a funding round, a trade show, a
regulatory date or a competitor. If all three are claimed fixed, record that as the top project
risk and get it acknowledged, because it is the precise condition under which projects fail and it
is nearly always survivable said early and fatal said late.

**Write the brief to `docs/brief.md` the moment it arrives, verbatim.** Not after the contract, not at
the end of intake — the moment it arrives, before you have had a chance to tidy it. It is a reference,
so `reference-discipline.md` governs it: never edit it, and never regenerate it from the contract.

Step 9 re-reads it cold and is forbidden from reading the contract instead, so a brief that lives only
in a chat window makes closeout impossible on any project long enough to span sessions — which is every
project past Phase A.

The last row is the one that gets skipped and the one that most often invalidates a design after it is
built. "Fintech" has a mood behind it; "retail banking dashboard used all day at a desk" has real products
behind it that can be measured. Step 2c cannot run on the broad answer.

### 1b. Present limitations first

Before any capability claim: what cannot be done, what needs the human, what needs a tool that is not
installed. Check whether the Figma MCP is live and whether playwright is available, and say so now
rather than on the day it blocks.

### 1c. Produce the contract

Write `docs/contract.md`:

- one section per work package, with **acceptance criteria in the human's own terms**
- the declared **viewports**, one entry each, and for every one its **idiom**: native app, mobile web
  bare, or mobile web presented in a device frame. The idiom determines the chrome list, and it is a
  human decision the flow may neither infer nor default. A width of 375 tells you nothing about whether
  a home indicator belongs.
- the declared banned characters or house conventions, if any
- the **applications** the product presents as its own, since each one gets its own interactive prototype
- a **data ownership** table: per entity, who owns it and what this surface may create, change or only
  read. See the research package's `research.md`; "read-only" applied as a blanket
  removes the flows the product exists for. If the research package is not installed, stop and say so
  rather than proceeding without it

Write `docs/exclusions.md`: everything the brief rules out, **quoted from the brief**. Then ask the
human what else to add, and **set `exclusionsConfirmed` to true in state once you have asked.**

This is the single highest-value artefact here, and it is weakest exactly where it is needed most. A
one-line brief rules nothing out, so the quoted half comes back empty — on the projects with the least
defined scope, which are the ones where scope grows. The ask is what fills that gap, and until it is
recorded, an empty `exclusions` means two different things: nobody was asked, or they were asked and
there is genuinely nothing. GATE 1 cannot tell those apart, and neither can you in week three.

### 1d. Cost the options

Two or three delivery approaches in **one table with comparable totals**. Two options that cannot be
compared are not a choice. Recommend one and say why.

### 1e. Tier the packages

Label each `standard` or `complex`. Complex if any of: no precedent in the product, changes IA or
navigation, no reference design exists, or the client will challenge the decision.

Present the labels for confirmation. The human knows which are harder than they look.

### 1f. Scaffold

```
docs/  html/  tokens/  .audit/  .pica/
```

`docs/brief.md` is already there from 1a. If it is not, stop: the project has no reference to close
against, and nothing downstream can recover it.

Write `.pica/state.json`:

```json
{
  "figmaInScope": false,
  "viewports": [
    { "name": "desktop", "w": 1440, "h": 900, "idiom": "desktop web, no device chrome",
      "pointer": true,  "breakpoints": [1024], "chrome": [ ... ], "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } },
    { "name": "tablet",  "w": 768,  "h": 1024, "idiom": "tablet web in a device frame",
      "pointer": false, "breakpoints": [768],  "chrome": [ ... ], "grid": { "columns": 8, "gutter": 16, "margin": 24, "maxContent": 1200 } },
    { "name": "mobile",  "w": 375,  "h": 812,  "idiom": "mobile web in a device frame",
      "pointer": false, "breakpoints": [],     "chrome": [ ... ], "grid": null }
  ],
  "briefPath": "docs/brief.md",
  "trigger": { "changed": "", "when": "", "ifNothing": "", "window": "" },
  "commercialConstraint": { "fixed": "", "by": "", "consequence": "", "variable": [] },
  "field": "",
  "measured": [],
  "targets": [
    { "kind": "web",     "viewports": ["desktop", "tablet", "mobile"], "stack": "react" },
    { "kind": "ios",     "viewports": ["tablet", "mobile"],            "stack": "swift" },
    { "kind": "android", "viewports": ["tablet", "mobile"],            "stack": "kotlin" }
  ],
  "direction": null,
  "disclosurePolicy": "",
  "exclusionsConfirmed": false,
  "delivered": false,
  "workPackages": {},
  "activeReview": null,
  "writeAuthorization": null,
  "flows": [
    { "app": "<application>", "entry": "app-<slug>.html", "home": "<screen id>", "owns": [] }
  ],
  "exclusions": [],
  "bannedChars": [],
  "copyRules": [],
  "dataOwnership": [],
  "rawValueExemptions": [],
  "deviations": []
}
```

Populate `workPackages` with one entry per package: `{ "tier": "standard", "htmlApproved": false,
"ported": false }`.

**`flows`** is one entry per application the product presents as its own, and every package's main flow
lands in one of them. Declared here because it is a fact about the product, not a build artefact:
`flow-check` reads it, so "one interactive prototype per application, linked for real" is checkable rather
than a habit. A single-application project declares one entry.

The rest are **registers**, and they are what make later judgement calls checkable rather than
aspirational. Four are filled now, two accumulate:

- **`exclusions`** — a short matchable name for each thing the brief rules out, alongside the prose in
  `docs/exclusions.md`. `["settings", "profile", "onboarding video"]`. The audit compares frame names
  against these, because a ruled-out screen got designed anyway and was only caught
  two days later by a human re-reading the brief.
- **`bannedChars`** — declared here rather than buried in the audit script's config, since it is a project
  fact established at intake.
- **`copyRules`** — the client's house conventions on wording and punctuation, each with the check that
  enforces it. A punctuation ban and a mixed-case wordmark both arrived as asides,
  and both had to be enforced mechanically afterwards. Ask for them at intake; a copy rule that lives only
  in conversation lasts about a day.
- **`dataOwnership`** — per entity, who owns it and what this surface may do with it:
  `{entity, ownedBy, thisSurface, why}`. Read-only is never a blanket. An instruction
  that the user's data could not be changed on mobile was first applied to everything and disabled the
  request and approval flows the product exists for. What was meant was the **person's own record**, while
  everything a person *does* stays interactive. Per entity, that distinction is designable and checkable.
- **`targets`** — the implementation targets, and **which viewports each one consumes**. One design at
  three viewports; a responsive website takes all three, a native app takes tablet and mobile and never
  desktop. The surface is a property of the target, not of the viewport, which keeps parity a
  single-design question and lets the target decide only what gets built. `coverage-check` fails a
  target that names a viewport the design never produced, so "we cannot build iOS, nobody drew tablet"
  is found in Phase 3 rather than in Phase 7.
- **`trigger`** what changed in the world, when, and the window it opens. `problem-check` reads it,
  and `value-check` reads it again for a client case. Collected at 1a because it costs one question
  and because a business case with no trigger is a solution hunting a problem.
- **`commercialConstraint`** which of `scope`, `date` or `resources` is fixed by the outside world,
  **who fixed it**, and what happens if it is missed. Named at length rather than `constraint`
  because this project already carries `domainConstraints` and `constraintsNotApplicable`, and the
  barest of four similar names is the one a reader resolves wrongly. For nine versions the
  commercial constraint was collected here and read by nothing.
- **`briefPath`** — where the verbatim brief was written at 1a. Step 9 reads it and is forbidden from
  substituting the contract, so this is the one path that must survive the whole project. A rule that
  says "write it down" with nothing naming where is a preference; this is the name.
- **`exclusionsConfirmed`** — false until the human has been asked what to exclude **beyond** what the
  brief quotes. Distinguishes an empty `exclusions` that was checked from one that was never asked about.
- **`direction`** — starts `null`, filled at step 2c with the design direction and the assertions
  `verify-html` holds every package to. A project may finish without one; a project may not have one that
  asserts nothing.
- **`rawValueExemptions`** — starts empty, grows during the port when a value genuinely has no token.
- **`deviations`** — starts empty, grows when the human approves Figma differing from the HTML.

  **Ask this as S7 in `proposals.md`, in consequences rather than platforms.** *"Only on a phone, or on
  a laptop too?"* is answerable by anyone; *"iOS native or React Native?"* is answerable by about four
  per cent of clients and is the wrong question anyway — the platform follows from the answer. State
  what each target buys: a native build is two release pipelines, one of which cannot be rolled back the
  way the web can.

A register with no entries is a valid state and means something: nothing has been excused yet.

**Chrome is declared, never defaulted.** Each `chrome` entry carries a name, `required` (must be on
every frame at that viewport) or optional (may appear; if it does, it must match), and `pinH`/`pinV` —
two axes, because a sidebar pins horizontally and stretches vertically. Record **who** declared it: a
rule that says "declare X" is violated just as much by the assistant quietly declaring X as by nobody
declaring it.

Open three artefacts that run for the life of the project, and say they exist:

- `docs/effort-log.md`, per package, from hour zero
- `docs/rationale.md`, every decision and why, because briefs that score product thinking score this
- `docs/annotations.md`, what will need calling out in the file

> **Under `/picaflow` this gate does not stop.** That command collapses GATE 1, 2 and 3 into the single
> gate after the build, because a human judges a working product better than a contract. Everything
> that would have been decided here is recorded as an assumption instead. Run `/pica` directly and the
> gates below apply normally.

### GATE 1

Present the contract, the exclusions, the costed options and the tiers. **Stop. Wait for approval of
all four.** Do not begin research.

**Refuse to pass this gate while `exclusionsConfirmed` is false, while `docs/brief.md` does not
exist, or while `commercialConstraint.fixed` names none of scope, date or resources.** Both are one question and one file, and both are unrecoverable later: the brief because the
session that carried it will be gone, the ask because nobody remembers whether it happened.

---

## Step 2: Research and tokens

### 2a. Audit

Every source labelled `use`. Then **the sources the brief implies but does not name**: if the brief says
reuse an existing design system, audit where that system actually lives, not only the artefact being
redesigned.

Write `docs/audit-findings.md` with stable IDs.

**Verify the measurement table before it is handed to design:**

**`pica-core` cannot depend on `pica-research`**: research depends on core, and a cycle is not
installable. So check before calling, and when the file is absent say which package is missing rather
than failing with a path error. A silently skipped verification is the failure this whole file exists to
prevent.

```bash
# Two layouts: the repository, where packages sit side by side under packages/, and an
# install, where each has its own versioned directory under the marketplace cache. A path
# that assumed only the first resolves to nothing on every real install.
pica_find() {
  R="${CLAUDE_PLUGIN_ROOT}"
  [ -f "$R/../$1/scripts/$2" ] && { printf '%s' "$R/../$1/scripts/$2"; return 0; }
  find "$R/../.." -maxdepth 4 -path "*/pica-$1/*/scripts/$2" -print 2>/dev/null | sort -V | tail -1
}
S=$(pica_find research schema-check.mjs)
[ -n "$S" ] || echo "SKIPPED schema-check: pica-research is not installed. NOT a pass."
if [ -f "$S" ]; then node "$S" docs/research/measured.json
else echo "pica-research is not installed, so the measurement table was NOT verified. That is a stated limitation, not a pass."; fi
```

Six checks: sample size, all nine foundations, typography as roles, provenance, shipped-not-concept,
tradition named. A measurement with no source URL is rejected rather than merged, because a lazy unit
and a careful one have the same shape without it.

### 2b. Refuse to invent and call it reuse

If the brief claims an existing design system and no accessible source exists, say so and offer the two
honest options: ask the client for the file, or derive and label it as derived.

### 2c. Settle the design direction

Load the research package's rules for this if they are not already loaded. The field, audience and
conditions came from intake input 6.

Find **three to five real products** in that field and **measure** them: radius, control height, hue
count, whether figures are tabular, how tight the spacing runs. Then:

- **No accessible brand** → propose **two or three named directions**, each citing the measured products
  it came from, each with its consequences in numbers. Recommend one and say why. The human picks. This
  is the same shape as `1d`: options that cannot be compared are not a choice.
- **A brand exists** → the direction is the client's own system. Score it against what the field does and
  present the gaps as questions, not corrections. The brand wins unless the human says otherwise; each
  accepted gap goes into `deviations` **with its reason**.

Write the pick into `.pica/state.json` as `direction`, with `name`, `mode`, `precedent` (each entry
carrying what was **measured**, not an impression), `rationale`, and `assert`.

**The field itself lives at `state.field`, not inside `direction`.** It is narrowed at 1.3, long before
a direction exists, and `industry-check` resolves the sector from it. Carrying a second copy inside
`direction` is how the two drift, and the copy is the one nothing reads.

**The measurement table goes into `state.measured` as well as `docs/research/measured.json`.** The file
is what a human reads; the state key is what `schema-check` and `industry-check` read, and until 0.8.0
nothing wrote it, so the evidence check had nothing to find.

**`assert` is the whole point.** A direction recorded as prose lasts about a day, exactly like a copy
rule. `verify-html` reads `assert` and fails any package that breaches it, so the direction is still in
force at package eleven. Do not write a direction with an empty `assert` — the check reports that as a
finding, because a direction nothing can breach passes every screen by default.

### 2d. Extract tokens

Colour, type scale, spacing, radii, elevation. Record **provenance per token**: which source, and taken
or derived, with a rationale for anything derived.

Write `docs/token-provenance.md`, `tokens/tokens.json`, `tokens/tokens.css` from one source.

A token with no client source takes the origin `proposed`, naming the direction and the measured
precedent behind it. `taken` and `derived` claim a client source; `proposed` claims a field source, and
the separate word is what stops a greenfield palette from later reading as reuse.

Guardrail: the result must still read as the client's brand.

### 2e. Research precedent

For anything the product does not already do, research how real products handle it and **cite what you
found**. Name products and conventions. Quote platform guidelines where they apply.

### GATE 2

Present the audit, the direction and the tokens together. **Stop. Wait for approval.** Everything
downstream consumes these, so a late change is expensive — and the direction is the most expensive of the
three to change, because every screen built after it inherits it.

---

## Step 3: UI kit in HTML

Load the html package's `html-prototype.md`. If the html package is not installed, stop and say so
rather than proceeding without it.

1. `html/shared.css`, tokens plus the phone chrome, no build step
2. `html/design-system.html`, a storybook: every token, every component, all variants and states
3. `html/review.html`, the tabbed shell with lazily-loaded iframes, design system as the first tab
4. **Self-review it, and say what you checked**

### GATE 3

Present the kit. **Stop. Wait for confirmation.**

---

## Step 4: Foundations into Figma — Phase C, optional

**Skip this step entirely if `figmaInScope` is false.** Say so and finish: the project is HTML-only and
the next thing to run is `/pica-wp <name>`. An HTML-only project is a complete pica project, not a
truncated one — it is verified by the measured gate in `/pica-wp`, which is where the checks live.

**This step is not required before the first work package, and running it early is usually wrong.** It
belongs to the optional Figma phase. Building the kit in HTML (step 3) is what every screen consumes;
pushing it into Figma is worth doing only once Figma is genuinely in scope, and it is easier to do after
one package's HTML is approved, because the approved package tells you which components the screens
actually needed. Through 0.3.0 this sat mid-flow, ahead of every HTML approval gate, which made the
optional phase read as mandatory.

Load the figma package's `figma-elements.md`, then load the
`figma-use` skill. Pass `skillNames: "figma-use"` on every `use_figma` call. If the figma package is not
installed, stop and say so rather than proceeding without it.

Set `writeAuthorization` to `{"granted": true, "reason": "foundations"}` in `.pica/state.json` before the
first write, and back to `null` when the step ends. The write gate reads it.

Build in this order, verifying each layer in a **separate call** before the next:

1. Variable collections: primitives, then semantic aliases. **Set `scopes` explicitly on every
   variable.**
2. Text styles stitched from variables. **Font weight is a numeric FLOAT variable**, never a style name.
   Bind all four axes: family, size, line-height, weight.
3. Global components, plain kebab names, on one page.
4. **Assert every created name** against what you intended. Undefined variables and unknown style names
   do not throw.
5. Screenshot the pages and self-review before presenting.

Write `docs/figma-inventory.md`: every variable, style and component created, with counts recounted from
the file.

### GATE 4

Present the foundations with the inventory. **Stop.**

---

## When this command finishes

Tell the human what comes next: `/pica-wp <name>` for the first work package, and which packages are
tiered complex.
