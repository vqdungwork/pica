# pica: start a design project

Runs steps 1 to 4: intake, research and tokens, the HTML UI kit, and if Figma is in scope, the
foundations port. These happen in one sitting. Steps 5 onward have their own commands.

Load the research package's `research.md` before anything else.

`$ARGUMENTS` may contain the brief or a path to it. If it is empty, ask for the intake packet.

---

## Step 1: Intake

### 1a. Collect the packet

**Refuse to proceed without all five.** List what is missing rather than filling gaps with assumptions.

| Input | Ask for |
|---|---|
| The brief | Raw and unedited. Not a summary |
| Sources | Every file, URL and capture, each labelled `use` or `ignore` |
| Commercial constraint | Hours or days, fixed-scope or T&M, any existing estimate, and **anything the client must not be told** |
| Environment | Fonts installed, tools live, and **what only the human can do** |
| Figma declaration | Is Figma a deliverable on this project, yes or no |

Ask for all five in one message. Do not interrogate one at a time.

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
  removes the flows the product exists for

Write `docs/exclusions.md`: everything the brief rules out, **quoted from the brief**. Then ask the
human what else to add. This is the single highest-value artefact here.

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

Write `.pica/state.json`:

```json
{
  "figmaInScope": false,
  "viewports": [
    { "name": "desktop", "w": 1440, "h": 900, "idiom": "desktop web, no device chrome",
      "pointer": true,  "breakpoints": [1024], "chrome": [ ... ], "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } },
    { "name": "mobile",  "w": 375,  "h": 812,  "idiom": "mobile web in a device frame",
      "pointer": false, "breakpoints": [],     "chrome": [ ... ], "grid": null }
  ],
  "disclosurePolicy": "",
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
  against these, because on the source project a ruled-out screen got designed anyway and was only caught
  two days later by a human re-reading the brief.
- **`bannedChars`** — declared here rather than buried in the audit script's config, since it is a project
  fact established at intake.
- **`copyRules`** — the client's house conventions on wording and punctuation, each with the check that
  enforces it. On the source project a punctuation ban and a mixed-case wordmark both arrived as asides,
  and both had to be enforced mechanically afterwards. Ask for them at intake; a copy rule that lives only
  in conversation lasts about a day.
- **`dataOwnership`** — per entity, who owns it and what this surface may do with it:
  `{entity, ownedBy, thisSurface, why}`. Read-only is never a blanket. On the source project an instruction
  that the user's data could not be changed on mobile was first applied to everything and disabled the
  request and approval flows the product exists for. What was meant was the **person's own record**, while
  everything a person *does* stays interactive. Per entity, that distinction is designable and checkable.
- **`rawValueExemptions`** — starts empty, grows during the port when a value genuinely has no token.
- **`deviations`** — starts empty, grows when the human approves Figma differing from the HTML.

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

### GATE 1

Present the contract, the exclusions, the costed options and the tiers. **Stop. Wait for approval of
all four.** Do not begin research.

---

## Step 2: Research and tokens

### 2a. Audit

Every source labelled `use`. Then **the sources the brief implies but does not name**: if the brief says
reuse an existing design system, audit where that system actually lives, not only the artefact being
redesigned.

Write `docs/audit-findings.md` with stable IDs.

### 2b. Refuse to invent and call it reuse

If the brief claims an existing design system and no accessible source exists, say so and offer the two
honest options: ask the client for the file, or derive and label it as derived.

### 2c. Extract tokens

Colour, type scale, spacing, radii, elevation. Record **provenance per token**: which source, and taken
or derived, with a rationale for anything derived.

Write `docs/token-provenance.md`, `tokens/tokens.json`, `tokens/tokens.css` from one source.

Guardrail: the result must still read as the client's brand.

### 2d. Research precedent

For anything the product does not already do, research how real products handle it and **cite what you
found**. Name products and conventions. Quote platform guidelines where they apply.

### GATE 2

Present the tokens and the audit. **Stop. Wait for approval.** Everything downstream consumes these, so
a late change is expensive.

---

## Step 3: UI kit in HTML

Load the html package's `html-prototype.md`.

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
`figma-use` skill. Pass `skillNames: "figma-use"` on every `use_figma` call.

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
