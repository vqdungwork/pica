# pica 0.3.0 — multi-viewport design flow

**Status:** **implemented as 0.3.0. Kept as the design record, not as outstanding work.** The status
line said "awaiting human review" for three releases after the release shipped.

**Where this file was:** `docs/superpowers/specs/`, which is where the brainstorming tool writes by
default, and which this repository's allowlist does not publish. So a design record of the same kind as
the two beside it was silently excluded from every clone. Moved here, which is the repo's own
convention.

**Evidence base:** one desktop trial build, a two-viewport trial build, built from a full set of requirements. Eleven findings,
recorded in that project's own notes. Four of them contradict the design as originally reasoned; three
of those were only found by building.

**The trial build is not in this repository and will not be.** It carries a client's brief, PRD and real copy.
What survived it is in `CHANGELOG.md` under 0.3.0, stated as rules next to the failures that earned
them, which is the durable form. Every path into `trial build/` below is a reference for the author, not a
file a reader can open.

---

## 1. Problem

pica 0.2.0 is mobile-shaped. The README says so plainly: *"Desktop or web variants, since this is
mobile-shaped for now."* Concretely, one viewport is baked in at six points:

| Where | What |
|---|---|
| `.pica/state.json` | `frameSize: {w, h}` — a single object |
| `figma-audit.js` | `SCREEN_W = 375` drives the screen-frame population filter |
| `figma-audit.js` | home indicator required on **every** screen frame, unconditionally |
| `capture-html-reference.mjs` | `--frame .phone`, browser page fixed at 1400×1000 |
| `html/<wp>.html` | one file, one implicit frame size |
| `workPackages.<wp>.htmlApproved` | a single boolean, read by the write-gate hook |

The goal is to support **desktop-only, mobile-only, or both in one project**, without weakening any
guarantee 0.2.0 provides, and without changing anything for a project that declares one viewport.

## 2. Decisions

| Fork | Decision |
|---|---|
| Viewport relationship | Same product, two viewports. 1:1 screen correspondence. |
| HTML shape | One file per work package, one fixed-width frame column per viewport. |
| Responsive mechanism | **`@container`, never width-based `@media`.** Both columns render in one browser window, so a window media query fires for every column at once. |
| Figma organisation | One section per viewport inside each family page. One prototype page per viewport. |
| Gate granularity | Per-viewport `htmlApproved` and `ported`; the hook validates the (package, viewport) pair. |
| New rules | Pointer states, desktop column grid, reflow annotations. |

**The container-query choice is load-bearing and is verified.** Measured, not assumed
(finding F5): with a 1440 frame and a 375 frame in one window, every `@container` rule resolved
against its own frame — nav links, burger, bottom tabs, filter sidebar, filter button, row actions,
and grid column count all differed correctly. Critically, `container-type: inline-size` contains the
inline axis only, so frame height stays content-driven and **the tall-screen hug pair still works**
(900 → 930 with content). Had that failed, this design was dead.

## 3. Data model

`frameSize` becomes `viewports`, an ordered list.

```json
"viewports": [
  { "name": "desktop", "w": 1440, "h": 900,
    "frameSel": ".vp-desktop", "pointer": true, "breakpoints": [1024],
    "chrome": [
      { "name": "top-nav",        "required": true,  "pinH": "STRETCH", "pinV": "MIN" },
      { "name": "filter-sidebar", "required": false, "pinH": "MIN",     "pinV": "STRETCH" }
    ],
    "grid": { "columns": 12, "gutter": 24, "margin": 40, "maxContent": 1200 } },

  { "name": "mobile", "w": 375, "h": 812,
    "frameSel": ".vp-mobile", "pointer": false, "breakpoints": [],
    "chrome": [
      { "name": "top-nav",     "required": true, "pinH": "STRETCH", "pinV": "MIN" },
      { "name": "bottom-tabs", "required": true, "pinH": "STRETCH", "pinV": "MAX" }
    ],
    "grid": null }
]
```

Three corrections the trial build forced on the original schema:

- **`required` per chrome entry** (F1). Chrome is not uniform across frames at one viewport — a
  filter sidebar exists on `search / results` and not on `search / entry`. `required: true` must be
  on every frame; `required: false` may be absent, but if present must match its constraints.
  0.2.0's no-per-frame-judgement property survives for the required subset.
- **`pinH` and `pinV`, not a single `pin`** (F2). A left sidebar is
  `{horizontal: MIN, vertical: STRETCH}` — it pins on the axis the original schema lacked and
  stretches on the axis the schema treated as the pin. The zero-gap assertion applies only to a
  pinned axis, never a stretched one.
- **Chrome is declared, never defaulted** (F3, the most important). 0.2.0's chrome list is not
  "the mobile contract", it is **the native-iOS-app contract**. A web application at 375 has no status
  bar, no home indicator and no safe-area inset. Applying 0.2.0's universal
  home-indicator rule would raise a false finding on every mobile frame, and "fixing" it would mean
  drawing iOS chrome into a web page. **A width of 375 tells you nothing about whether a home
  indicator belongs.** `/pica` intake must ask what each viewport *is* — native app, mobile web,
  desktop web — and never infer chrome from a width.

Registers:

```json
"parityExemptions": [],
"reflowNotes": [ { "scope": "compare / results", "component": "cmp-table",
                   "breakpoint": 1024, "behaviour": "table becomes stacked cards below 1024" } ]
```

`scope` is required (F9): either a screen name or `"*"` for chrome reflowing on every screen. A flat
global list was tried first and was too blunt — `.cand` reflows on `compare / results` but appears
legitimately at both viewports on `search / results`, so a global entry would blind the check to real
drift. A measured split in one build: 11 entries at `"*"`, 30 scoped to four screens.

Work packages:

```json
"home": { "tier": "standard",
          "htmlApproved": { "desktop": false, "mobile": false },
          "ported":       { "desktop": false, "mobile": false } }
```

**Backward compatibility.** `viewports` absent + `frameSize` present → synthesise one viewport named
`mobile` with 0.2.0's native-app chrome and `pointer: false`. `htmlApproved: true` (bare boolean) →
read as `{ "<only-viewport>": true }`. Both shims are required in the hook as well as the commands.

**The collapse guarantee**, as a testable property:

> A project declaring exactly one viewport produces artefacts structurally identical to 0.2.0 — one
> HTML column, one review tab per package, no section wrapper in Figma, `08 · Prototype` not
> `08 · Prototype · mobile`, parity check inert, same audit checks firing.

## 4. HTML side

One file per work package, one fixed-width frame column per viewport, `.frame-wrap` / `.frame-cap`
selectors unchanged so the capture script keeps working.

**New rule, from F4.** Every `@container` block that overrides a property also set by a component
base class must be declared **after** that class. Container queries carry no specificity, so:

```css
.top-nav__burger { display: inline-flex; }
@container frame (min-width: 1024px) { .top-nav__burger { display: none; } }
/* ... 200 lines later ... */
.btn { display: inline-flex; }        /* equal specificity, later — silently wins */
```

The burger rendered on the desktop frame. In ordinary responsive CSS this shows the wrong control at
one window size; here it means **the desktop frame renders mobile chrome**, and that frame is what
gets ported to Figma. Invisible to visual review, obvious to measurement — pica's founding claim,
reproduced. Keeping all such blocks in one trailing section makes the ordering a visible convention.
`@layer` is the more principled fix and is plain CSS with no build step; recommended in the rule but
**not exercised in this trial build**, so it ships as a suggestion, not a verified instruction.

## 5. Capture script — now a prerequisite, not polish

`capture-html-reference.mjs` ran against the trial build with **only a `--frame` selector change** and
produced correct output: 14 frames, hidden elements properly excluded (the `r.width < 1` filter
handles `display: none`), desktop and mobile distinguishable by width.

But two additions are **prerequisites for the parity check being shippable at all**, because without
them it can never return zero:

- **F8 — text runs must carry their owning element's classes.** Today a run is
  `[text, x, y, w, h, fontSize, weight]`, with no link to its element, so text belonging to a
  registered reflow cannot be filtered out. On this trial build that is 97 advisory diffs that can never be
  silenced. Fix is one line; `el` is already in scope.
- **F11 — boxes must carry depth and parent index.** Excusing a reflowing component must excuse what
  is *inside* it. `cand__actions` is registered and hidden below 1024, but each contains a
  `.btn--secondary`, so the descendant leaked a 4-count mismatch. The alternative — enumerating every
  descendant class in the register — is unmaintainable.

Other changes: viewport tagging per frame record, and page width `Math.max(1400, maxW + 200)` — the
floor keeps a mobile-only project byte-identical.

Also new: a **breakpoint scan** of the CSS. Container breakpoints are declarable, so a breakpoint
between two declared viewports with no `reflowNotes` entry is a third layout that exists in the
prototype and has no frame anywhere. It becomes a finding rather than shipping invisibly. Width-based
`@media` rules are flagged when two or more viewports are declared.

## 6. The parity check, redesigned

The originally designed check compared the **set of screen names** per viewport. The trial build shows it
checks the wrong thing (F6): both columns are the same markup in one file, so name parity is
satisfied by construction and catches nothing. The real risk is **markup drift between hand-copied
columns** — and it is not hypothetical. Building `search.html` produced a stray `ポ` inside a
candidate name in the desktop column only, and `id`/`for` pairs needing manual uniquification per
column.

Redesigned, and prototyped working in a two-viewport trial build:

1. Nominal parity — cheap first pass, catches a screen missing at a viewport entirely.
2. **Structural parity on multisets, not sets** (F10). The set version reported zero findings on all
   seven screens; switching to counts immediately surfaced a real mismatch. Delete one of five
   candidate rows and the class set is unchanged — set comparison fails at precisely the job it was
   added for.
3. Subtree pruning for registered reflow (F11, blocked on the capture change).
4. Text parity, advisory until F8 lands.

Corollary: duplicate `id` attributes in a package file become a hygiene finding.

## 7. Figma side

Sections per viewport inside family pages, created only when ≥2 viewports are declared. Prototype
gets one page per viewport. The audit resolves a frame's viewport **by enclosing section first**,
falling back to width — section-first matters because declaring 375 and 390 would make width matching
ambiguous.

Audit changes: population filter per viewport with per-viewport denominators printed; chrome contract
replacing `hiMissing`/`chromeUnpinned`; parity, grid and reflow checks added; touch targets
parameterised on `pointer`; `PROTOTYPE_PAGE` becomes a list; `VIEWPORT_H` deleted (declared and never
referenced in 0.2.0).

`/pica-port <wp> <viewport>` — viewport required when more than one is portable, since two viewports
roughly double the frame count against the MCP call budget and a half-written viewport is worse than
an unstarted one.

**None of section 7 is verified.** It needs a Figma file and the trial build did not have one.

## 8. The gate

One check added to `hooks/gate-figma-write`, after the existing authorization test:

```python
wp, vp = auth.get("wp"), auth.get("viewport")
if wp:
    approved = ((state.get("workPackages") or {}).get(wp) or {}).get("htmlApproved")
    if approved is True:                      pass          # legacy bare boolean
    elif isinstance(approved, dict) and vp:
        if approved.get(vp) is not True:      deny(...)
    elif isinstance(approved, dict):                        # no viewport named — FAIL CLOSED
        if not all(approved.get(v["name"]) is True for v in state.get("viewports", [])): deny(...)
    else:                                     deny(...)
```

The omitted-`viewport` branch fails closed deliberately; if it allowed, omitting the field would be a
bypass, and a gate with a bypass is a preference.

**A bug the shape change introduces**, worth calling out because it is the silent-wrong class pica
exists to catch. Line 149 today:

```python
unapproved = [k for k, v in wps.items() if not (v or {}).get("htmlApproved")]
```

`not {"mobile": True, "desktop": False}` is `False` — a non-empty dict is truthy — so a package with
desktop unapproved silently vanishes from the deny hint. Must become per-viewport.

Out of scope, noted not fixed: `review fix` authorizations carry no `wp` and can write anywhere.
That is existing 0.2.0 latitude.

## 9. New rules

**Pointer states.** `pointer: false` requires keyboard-open; `pointer: true` requires hover and
focus-visible and does not require keyboard-open. Hover is required on every interactive component
**in the kit**, not on every screen — screen-level hover frames only where hover changes layout.
Without that distinction the frame count doubles for no reviewer benefit. Note that hover must key
off the frame class, not `@media (hover)`, since one window cannot distinguish the columns.

**Column grid.** The desktop analogue of "hold one content-edge inset across every row", failing the
same way — faithful to a broken grid is still broken. Declared as `grid`; checked as row content
edges on column boundaries and content width never above `maxContent`. `/pica-port` writes a real
Figma layout grid from the declared values so `frame.layoutGrids` is auditable.

**Reflow annotations.** `reflowNotes`, read by both the breakpoint scan and the parity check. Two
consumers is what makes it a register rather than a document nobody checks.

## 10. Change map

| File | Change | Size |
|---|---|---|
| `scripts/figma-audit.js` | population, chrome contract, parity, grid, reflow, pointer targets, prototype list, delete `VIEWPORT_H` | large |
| `rules/figma-screens.md` | sections, declared chrome, mobile↔desktop deltas, grid, reflow, naming | large |
| `rules/html-prototype.md` | viewports, container queries, F4 ordering rule, columns, pointer states, grid | large |
| `scripts/capture-html-reference.mjs` | **F8 + F11 (prerequisites)**, viewport tagging, page width floor, breakpoint scan | medium |
| `rules/review-gates.md` | checklist gains 4 rows, parameterises 3 | medium |
| `commands/pica.md` | intake asks what each viewport *is*, scaffold writes `viewports`, new registers | medium |
| `commands/pica-wp.md` | per-viewport matrix and columns, GATE 5 per viewport | medium |
| `commands/pica-port.md` | required viewport arg, sections, declared chrome, layout grids | medium |
| `README.md` / `CHANGELOG.md` | 0.3.0, breaking notes | medium |
| `hooks/gate-figma-write` | pair validation + the truthy-dict hint bug | small, critical |
| `pica-review` / `-prototype` / `-close` / `-feedback` | per-viewport reporting, prototype page per viewport, reflow table at handoff | small |
| `SKILL.md`, `figma-mcp.md`, `figma-elements.md`, `plugin.json` | state docs, call budget, hover variants, version | small |
| `scripts/capture-baseline.js` | none — paints are viewport-agnostic | — |

**Ordering change forced by the trial build:** the capture-script work (F8, F11) comes *before* the audit
work, not after. The parity check cannot return zero without it.

## 11. Verification

1. **Collapse regression** — a mobile-only project through 0.3.0 must produce an identical reference
   JSON, HTML structure and set of firing audit checks to 0.2.0. Protects every existing project and
   is fully runnable today.
2. **The trial build as fixture** — a two-viewport trial build is a working two-viewport project with a populated
   register. Its parity check currently reports **1 finding, not zero**: the `btn--secondary`
   count mismatch from F11, which cannot be silenced until subtree pruning lands. That single
   finding is the fixture's expected value today, and reaching zero is the acceptance test for the
   F11 work. Any *other* finding is a regression.
3. **Planted-defect tests** — each new check must find exactly its planted defect **and nothing
   else**. False-positive count is part of the pass criterion, per review-gates rule 5.
4. **Hook unit tests** — all four `htmlApproved` shapes including legacy boolean and the
   omitted-viewport fail-closed case.

## 12. Known limits

- The Figma half (section 7) is **entirely unverified**. No Figma file was available. It ships marked
  unverified, in the same register 0.2.0 uses for its own Figma half.
- One desktop trial build behind it, not a body of delivered work.
- That build never ran `/pica` intake to completion — only the brief existed, so GATE 1 stayed shut
  and no package HTML was ever approved. The gate logic in section 8 is designed, not exercised.

## 13. Open question for the human

**F7 — markup duplication.** `search.html` is ~700 lines for four screens at two viewports, and the
columns are near-identical. The kit removes styling duplication entirely but does nothing about
markup duplication, which is where the copy errors live. Three options:

1. Accept it, and let the structural parity check catch drift after the fact. What this design
   currently assumes, and defensible.
2. A small inline `<script>` rendering one screen definition into both frames. Eliminates drift by
   construction, kills the duplicate-`id` problem, and is not a build step. Cost: the file stops
   being readable as markup and needs JS to view.
3. Duplicate screens, template only the chrome — which is most of the repetition.

This trades pica's "a designer can open and read the file" property against correctness by
construction. **Not mine to decide.**
