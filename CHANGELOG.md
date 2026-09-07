# Changelog

## 0.9.4

### The shell was specified in 0.3.0 and nothing ever read it

`html-prototype.md` has described `review.html` for six releases: a tab bar, the interactive
flow leading it, applications before boards before the system, one line of meta above it and
nothing else. Every rule in there was earned by a review that went wrong, and all of them
stayed enforceable only by somebody remembering.

`shell-check.mjs` reads the shell as text, the way flow-check does and for the same reason:
it has to work when the page is broken, and a shell that fails to render is exactly when you
want to know why.

Six checks. The shell says what this is **and what it does not do**, with a revision date and
the viewports. The interactive flow is the first or second tab and the default. All three
zoom controls exist. No tab navigates away. The groups run product, states, options, system.
The frame inset is on the spacing scale.

### Three things the rule never covered, added because a real shell needed them

**The zoom control, and it has three settings.** A 1440-wide frame does not fit a 1440-wide
laptop, so the reviewer with the smallest screen sees the product at 70% and never knows.
Fit width for reading, fit screen for composition, and **100%, which is the one that has to
be exact**: it is where a reviewer decides whether 14px is too small, and a shell quietly
rendering at 92% makes that judgement about a size that does not exist.

**Fit screen may exceed 100%.** Refusing to let it is the common mistake: a 375-wide phone
frame on a 2560 display is legible at 180% and postage-stamp sized at 100%. The check fails
a `Math.min` against 1.

**Frames sit top-left, and the gap is a step on the spacing scale.** A 20px inset around a
design built on an 8px scale is the first thing a designer notices and the last thing anyone
writes down. Centring is the tempting mistake: composed with one frame, and with three each
row centres independently so no two captions line up.

And the tab bar carries groups when it needs them, in one order, with a proposed feature
**labelled on the tab itself**. A tab that looks like the others and is not built is a promise
the reviewer repeats to somebody else.

### The check passed because of a CSS declaration

Scoped to the whole document, the exact-size check matched `html,body{height:100%}` in the
stylesheet and a sentence in a code comment. Removing the 100% button entirely still reported
the control as present. It reads the controls now, not the file: a check passing because of a
CSS rule is a check measuring the wrong thing.

Eight mutations, all caught: the caveat removed, the date and viewports removed, no tab naming
the flow, the flow demoted to fourth, the exact-size control removed, fit screen capped at 1,
a tab linking away, and a 20px frame inset.

  check scripts 20 -> 21 · checks 110 -> 116

## 0.9.3

### It measured overflow and it measured spacing literals, and between those two it never measured a gap

Asked whether pica checked the distance between the content and the edge of the screen, the
honest answer was no. It checked whether content overflowed the frame, and it checked
whether a spacing LITERAL in source text was on the token scale. Neither is the thing a
person reads as "tidy".

**A screen with a 16px margin could sit beside one with 24px through every green gate in
this repository.** Nobody sees it on one screen. Everybody sees it on two, and by then the
kit is built.

`spacing-check.mjs`, four checks: content does not touch the frame edge, every screen at
one viewport sits the same distance from it, every gap between stacked siblings is on the
declared scale, and the edge inset itself is on it. Rhythm is reported and never failed,
because a heading sitting closer to its own paragraph than to the next section is good
typography rather than a defect.

A rendered gap is not the same fact as a source literal. `code-tokens-check` reads
`padding: 24px` in a stylesheet; a flex container with `space-between` produces a gap no
literal predicts, and that gap is what the user looks at.

### Two things it needed that did not exist, and the first cut got both wrong

**The capture recorded only CLASSED elements.** A table of 24 rows where 3 carry a class
reported those 3 as adjacent siblings 280px apart, and the check called it a defect. It was
the absence of the other 21. Measuring a gap needs EVERY sibling, so `layout` was appended
to each frame: every block-level element, classed or not, in the same shape as `boxes`. A
separate array rather than an extension of that one, because parity-check counts `boxes`.

**And the "spacing scale" was every px token in the file**, which meant it contained
`--control-h`, `--tap-min` and `--content-max`. It compared gaps against a list of control
heights and reported **201 findings on 227 gaps**, which is exactly the false-positive flood
this repository has a rule against and which the script's own docblock warned about. A
token's NAME is the only place its role is recorded: a 40px spacing step and a 40px row
height are identical as values.

The narrowed version measures 32 gaps on the same project instead of 227, because 126 of
the 160 boxes on one frame were spans and it had been measuring the leading between two
words in a flex row.

### What it found once it worked

On a project that had passed every other gate: **the phone header padded 16px horizontally
while the body padded 12px**, so the title sat indented further than the content beneath
it. Invisible on one screen, and the check names it by comparing the two.

`fullBleed` is the register for a component that reaches the edge on purpose, and excusing
one excuses what is inside it. A table declared full-bleed still has rows and none of them
carry the table's class, which the first version of that rule missed exactly as
parity-check once missed it for `reflowNotes`.

Five mutations, all caught: an off-scale inset, an off-scale gap, content flush to the
edge, three screens disagreeing with the rest, and the register removed.

  check scripts 19 -> 20 · checks 106 -> 110

## 0.9.1

### The flow decided almost everything, and a client cannot approve what they were never offered

pica had three stops and no offers. A client first saw the design fully built, in one
direction, with the taste question already answered by whoever wrote it. Real users asked
for a design system proposal, which is the visible half of a larger gap.

`proposals.md` and `proposal-check.mjs` close it, and the whole design is in one
distinction: **the slots are universal, and what fills them is derived.**

Getting that backwards is the obvious mistake. A rule that offered "streak, chain or run"
as the name would be a habit-tracker rule wearing a general one's clothes, and noise on a
payments product. So the file names seven slots that exist on every project, and every one
of them is filled from the sector entry, the measurement and the analysis — never from a
list in the file:

| | Slot | Fills from |
|:--:|:--|:--|
| S1 | the direction | measured products, plus the sector tradition as the baseline |
| S2 | default mode and density | the sector's colour lead and density conventions |
| S3 | the sector's signature moment | the stakeholder whose fear names it |
| S4 | the word the product turns on | the delta crossed with the glossary |
| S5 | who sees what | the actors, bounded by the sector's forbidden defaults |
| S6 | what is in the first release | use cases, priced |
| S7 | where it runs | targets, stated in consequences |

The material was already in the base and nothing read it that way. The same slot fills
differently per field: fitness names the broken streak, finance the silently failed
transfer, education being shown you are behind in front of others, pharmacy the look-alike
name. **S3 is the highest-value question in the flow and the one nobody thinks to ask**,
because it does not look like a design question — it looks like an edge case, gets built
the obvious way, and the obvious way is the one the field already knows causes the damage.

### The law, and both halves of it

> Propose where the decision is the client's AND they can judge it by looking.
> Decide silently where it is craft AND looking would not help them.

A decision that is theirs but unjudgeable — "Postgres or MySQL" — is not a question, it is
a transfer of risk to someone with no instrument to carry it. A decision that is judgeable
but not theirs costs their attention and buys nothing. **A flow that asks everything
produces a client who stops reading by the fourth question and approves the rest, which is
worse than not asking: it looks like consent.**

### Six checks, and what they refuse

`proposal-check.mjs` verifies the SHAPE of a proposal and never the content: a slot
addressed or skipped with a reason, an axis its options differ on, provenance per option,
two or more options, nothing the sector's own forbidden list names, and a choice recorded
with who, when and **the client's own words** — because a paraphrase is a second decision
wearing the first one's authority.

It refuses to run at all on a project with no register. Reporting zero findings there
would be a lie: it would mean every design decision was made by whoever built it, scoring
clean.

A slot marked "not applicable" on a project that HAS the material is reported, because a
skip on available material is a decision someone made rather than an absence. And a slot
that always applies cannot be skipped at all, however good the reason: skipping it is a
decision to make the client's choice for them.

Verified by twelve mutations, all caught: a dropped slot, a slot skipped with a good
reason, a skip voided to "n/a", a missing axis, an unsourced option, a source voided, a
single-option slot, an option describing something the sector forbids, a missing
attribution, a missing quote, a paraphrase in place of the quote, and a choice naming an
option that was never offered.

**What it cannot do**, and says on every run: tell you the options were worth choosing
between. Three weak ones produce a choice, a recorded decision, a clean check and a bad
product.

| | 0.9.0 | 0.9.1 |
|---|---|---|
| rule modules | 22 | 23 |
| check scripts | 18 | 19 |
| checks | 100 | 106 |

## 0.9.0

### The flow reaches the product, and every step has a role

0.8.0 claimed a chain "from a brief to a released product" while `implementation.md` said, in its own
first paragraph, that it did not ship a coding agent. Both statements shipped. The banner, the README
and the release commit carried the first; the package carried the second. **The claim was wrong and the
package was right**, and the gap was found by running the flow rather than by reading it again.

Two packages close it:

**`pica-developer`** — the code. The API contract as a seam with mandatory `errors`, the four places
state is allowed to live and why each is wrong for the other three, the four kinds of failure and the
shape each needs so the copy can reach it, components before screens, a performance budget with the
condition it holds under, accessibility written in rather than retrofitted, and security at the
boundary. `dev-check.mjs` decides seven of those from the source.

**`pica-qa`** — the tests. The pyramid with an owner per layer, one end-to-end test per use case rather
than per screen, every business rule asserted somewhere, a regression test that failed before it passed,
four severity levels with a release gate that reads severity rather than a count, and test data that is
never real. `qa-check.mjs` decides seven of those.

`pica-impl` keeps the repository — pipeline, branches, environments, secrets — and its "what this is
not" section now names the split instead of denying the capability.

### Nine role agents, and none of them were loading

Every step now runs as the agent that owns it: `pica-researcher`, `pica-analyst`, `pica-architect`,
`pica-designer`, `pica-writer`, `pica-evaluator`, `pica-estimator`, `pica-developer`, `pica-tester`.
Each loads its own craft rules **and reads the sector entry before it starts**, which is what keeps a
clinician's screen and a warehouse handheld from coming out of the same template.

Three defects were found in that wiring, and only by measuring it:

- **No `plugin.json` declared `agents`, so not one of the nine loaded.** Nine files, correct in
  themselves, in a directory Claude Code never read.
- **`validate-packages.mjs` did not know `agents/` existed**, so all nine shipped unowned and the
  orphan scan reported clean. A directory the validator does not know about is a directory that can be
  wrong forever, which is the failure mode it was written to end. `agents` now sits alongside
  `commands`, `rules`, `scripts` and `hooks` in both loops.
- **Six of the nine did not load the sector**, while `/picaflow` asserted in writing that all of them
  did. Each now names what the sector decides for its own role: NFRs the client will never raise
  because to them it is the law they already live under; a register the reader is fluent in; hues
  already spent on a meaning; the approval body that lands on the critical path.

### `/picaflow` runs the whole project, and stops in three places

It covered phases 0 to 3. It now runs to whichever `--to` target is named, and **each of the three is a
complete project rather than a truncated one**: `design` ends at a measured, clickable `review.html`;
`figma` adds the ported file verified frame by frame; `product` adds working front end and back end,
tested and released.

**Figma is off the critical path.** `--to product` goes straight from the approved HTML to production
code without touching it. That was always the intent and was never stated as a supported route.

Between the three confirmations it does not ask. Everything the sources cannot settle becomes a
labelled assumption carrying a confidence and a blast radius, surfaced beside the screen it produced.

### Eight defects the flow found in itself, by being run

The chain was run end to end on a real product — a community-pharmacy dispensing queue,
brief to released code, Figma skipped — and it found more in pica than pica found in it.
Every fix below is a check that could not have bitten before, and every one was
mutation-tested in both directions afterwards: the defect is caught, no other check
co-fires, and the legitimate artefact still passes clean.

**`copy-check` printed a pass over a state it never looked at.** Its error-state scan
matched "error", "failed" and "offline", and the product's refusal screens were captioned
"refused" — so it reported `0 findings (0 error frames)`. Now it also matches refused,
denied, blocked, rejected and unavailable.

**And then it passed a dead end anyway.** With the frames finally in scope, a refusal
reading only "This item cannot be checked by this person" still passed, because an
unrelated card on the same screen was titled "Check against the prescription" and "check"
is in the imperative list. The scan now narrows to the runs the error component owns, and
says so in the report when it has to fall back to the whole frame.

**Which needed the capture to record something it never had.** A message inside
`<span class="warn"><span>…</span></span>` has an empty owner class, so scoping on it
alone saw the label and not the sentence beneath it. Text runs now carry the nearest
classed ancestor at index 11, appended so every existing consumer keeps its positions.

**`dev-check` crashed on the documented shape.** `enforcedBy` is a string in
`business-analysis.md` and in `trace-check`, and `dev-check` read it as an array —
`TypeError: (r.enforcedBy || []).map is not a function` on the first project that
followed the documentation.

**Its server-guard vocabulary missed the strongest guarantee in the build.** A rule
enforced by revoking `UPDATE` on an append-only table was reported as client-only,
because the word list had "database" and not "table" or "grant".

**And it had no way to say a rule is presentational.** "A drug name is never truncated"
is a rendering guarantee no API can hold. `presentationOnly` plus `presentationWhy` is
now the register — declared, reasoned, counted in the report — because every other
deliberate exception in this repository has one.

**`impl-check` could not see Postgres.** The stack alias map held one needle per
technology, and a JavaScript repository spells Postgres `pg` in `package.json` and
`postgres:16` in a compose file. Aliases are lists now, matched on a word boundary below
four characters so `pg` does not match `jpg`.

**It also reported someone else's test fixture as your credential.** A tracked
`node_modules` flooded the secrets scan; the one finding was a credential-shaped string
in a vendored type definition. Vendored paths are still scanned — a real secret vendored
in is real — and a finding inside one says so, while the tracked dependency directory is
reported as the defect to fix first.

**`branch-protect` told you how to satisfy it and then ignored the answer.** Its message
said "record `state.branchProtection` with who verified it, when, and what they saw", the
field is `note`, and a project that wrote `what` kept failing with the same advice. It
names the three fields now.

**`arch-check` could not match "GitHub Actions" to `github-actions`.** Punctuation is
normalised on both sides.

**`qa-check` demanded a bare `true` for the rollback.** `rollbackExecuted: true` is a
claim with nothing behind it; `{on, by, what}` records who ran it and what happened, which
is what someone asks for six months later. Both are accepted, the object is reported, and
one that says nothing is refused.

### What the run could not have found any other way

Three defects in the product itself came from steps no script performs, and they are
worth naming because they are the argument for those steps existing:

- **Two tall-man forms were wrong** — `ceftAZIDime` for `cefTAZidime`, and `morphINE`,
  which is not on the ISMP list at all. A patient-safety error in a pharmacy product that
  all eleven design gates passed. Found by rendering the screen and reading it.
- **Every queue row opened the clinical screen** whatever stage its item was at, so a
  checked item opened the pharmacist's screening form. `flow-check` passed it: the target
  existed and was reachable. Found by clicking.
- **A control labelled "Back to the queue" went to the accuracy check** the user had just
  been refused on. Found by clicking.

A fourth came from using real data rather than invented data: `co-amoxiclav 875mg/125mg
film-coated tablets` is an ordinary dispensed product and it overflowed the 390 viewport,
where six invented drug names had all fitted.

### Two more, from ten review passes that ran things instead of reading them

**Every cross-package script path was wrong in an install.** In the repository, packages
sit side by side under `packages/`, so a sibling is `${CLAUDE_PLUGIN_ROOT}/../<name>`.
Installed, each package has its own versioned directory as `pica-<name>/<version>`, and
that path resolves to nothing. Seven commands and all nine agents carried it. `/picaflow`
therefore reported **every one of its measured checks as SKIPPED on every real install** —
honest, and the whole chain silently unavailable. The agents were worse: they used
repo-relative paths, which resolve only when the project being worked on *is* the pica
repository.

Both now resolve at runtime and were verified by running the flow end to end against a
simulated install, not by reading the paths again. The runner also tells the two absences
apart: "pica-html is not installed" sent someone to install a package they already had,
when what was missing was one script that version does not ship.

**The delivery freeze could be turned off by a typo.** `gate-figma-write` checked
`delivered is True`, so `"delivered": "true"` — a plausible hand-edit of a file anyone can
edit — read as not-delivered and let writes through. A non-boolean is now refused as
malformed. This is the same fail-open the file's own closing comment exists to prevent, in
the one gate nobody would think to re-test, because the project it protects is already
handed over.

The ten passes also confirmed, by running them: 26 bad-input probes and every script fails
closed; 26 adversarial payloads and the hook holds; 49 mutations and every one is caught
with no co-fire; 380 check runs across the existing corpus with zero crashes; every count
in the README matching what the repository actually contains.

### Counted rather than claimed

| | 0.8.0 | 0.9.0 |
|---|---|---|
| packages | 10 | 12 |
| commands | 14 | 16 |
| rule modules | 20 | 22 |
| check scripts | 15 | 18 |
| checks | 86 | 100 |
| role agents | 1 | 9 |

The README's check table sums to its own total, and the badge follows the table rather than the other
way round. The first recount put it at 101: `trace-check` was credited with eight checks because a
summary-table row and a `fail()` label were counted as two different things. Seven is correct.

## 0.8.0

### Six new packages, and the flow now reaches past the design

pica was four packages that took a brief to an approved HTML design. It is now ten, and the chain runs
from a thin brief to a released product: **`pica-analyst`** (elicitation, domain knowledge, AS-IS and
TO-BE, business rules, the domain model, the PRD), **`pica-content`** (the words), **`pica-designqa`**
(independent evaluators and the build-versus-design comparison), **`pica-architect`** (feasibility,
C4, ADRs, NFRs), **`pica-estimate`** (three-point effort, the work order, the effort record), and
**`pica-impl`** (the definition of done for building and releasing).

Each installs on its own with only what it needs. A team that wants the business analysis takes
`pica-analyst` and gets `pica-core` with it, and nothing else.

**`/picaflow <brief>` runs phases 0 to 3 unattended**, and never pauses to ask: anything it cannot
derive becomes a labelled assumption the client corrects at review. That is the whole design. Ask a
client what their business flow is and you get hesitation; show them a wrong one that clicks and you
get the correction in three seconds.

### Every runnable check now runs on every project

Three scripts had only ever run on the six hand-built fixtures, which meant "84 of 84 green" described
ten checks and not thirteen. All three now run on all eighty-four:

| | |
|---|---|
| `code-tokens-check` | 84 of 84 clean, against a real token file and front-end source per project |
| `impl-check` | 84 of 84 clean, against **84 real git repositories** with CI, branches and tests |
| `build-diff` | 84 of 84 clean on an identical build, and **84 of 84 caught** on a seeded divergence |

The divergences were spread across the four kinds it exists to find, 21 projects each: a radius changed,
a control height changed, a hue introduced, and a screen deleted from the build. Every one was caught,
and the identical builds stayed silent, which is the pair that matters. A check that only fires is as
useless as one that never does.

### Three assertions the direction could declare and nothing evaluated

`shadow.blur.max`, `type.roles.max` and `motion.easing.linear` were in the vocabulary, named in the
style signature table, and evaluated by **nothing**: the census carried no shadow and no easing, and
nobody counted type roles. `shadow.blur.max: 0` beside a blurred shadow passed every gate, while the
style check read that same key to detect a contradiction and so implied an enforcement that did not
exist.

The census records shadow blur and timing functions now, a type role is counted as a distinct size and
weight pair, and **any assertion outside the eight is reported rather than skipped**. An assertion nobody
can evaluate is worse than an absent one: it reads as a constraint and constrains nothing.

### An empty glossary passed the entire analysis gate

`glossary-closure` only flags a word the glossary itself declares wrong. With an empty glossary there are
none, so an analysis with **no ubiquitous language at all** reported "0 findings, 4 items scanned", which
reads as clean. The glossary is what the other three checks stand on and its absence is the one thing
they could not see.

Next to it: `entity-terms` read `e.name`, every generator and every project writes `entity`, and no
command documented either. **The loop skipped every entry and reported zero on a data model that had
invented every word in it.** Both spellings accepted, the shape documented, and `attributes` accepted
alongside `fields`.

### Seven rules had no definition of done, including the two that govern everything

`reference-discipline.md` and `review-discipline.md` carry the discipline every other rule depends on,
and neither ended in a checklist, so what they require could be agreed to and never checked against.
`research.md` had none either, and its criteria — the intake packet, token provenance, `copyRules`,
`dataOwnership` — appeared in no other rule's. `figma-rebuild.md` replaces several of the port's gates
and had no checklist of its own.

All four now have one, written from what those files already say rather than from new criteria. The three
remaining without a DoD carry a line saying where theirs lives, or that they should not have one:
`figma-mcp.md` is operational and nothing in it is a criterion a package passes or fails.

133 definition-of-done items became **173**.

### The mutation tests were not repeatable, and that is not a test

Every check but one had been mutation-tested by hand, at a keyboard, once, with the commands thrown away.
A test that cannot be re-run does not catch a regression; it proves one thing at one moment.

`mutate-all.py` runs **19 deliberate defects past all ten project checks**, and demands the same two
things the sector suite already did: the defect is caught, and no other check fires. It found two the ad
hoc runs had not: the empty glossary, and a `parity` mutation of mine that was inert because it used a
container query on a frame that declares no container type, so it proved nothing while appearing to pass.

One case of two checks firing together is recorded as legitimate rather than suppressed: `domain-check`
and `industry-check` both require the same constraint category, independently, and both should say so.

### The shapes I documented incompletely while fixing the same defect elsewhere

Scanning for fields a script reads that no documented JSON writes found two, and both were mine, written
earlier in this same release while fixing exactly that class: `arch-check`'s `risks`, `nfr` and `adr`
entry shapes, and `contrast-check`'s `contrastExemptions`. A command that says `"risks": []` and nothing
about what goes in one is a command nobody can follow. Both documented, with the matching keys named.

### The measurement this harness never made

pica measures geometry to a tenth of a pixel. Until 0.8.0 it never measured **contrast**, which is the
one accessibility property that is objective, computable, and in one sector legally binding: the
knowledge base records WCAG 2.2 AA as a statutory floor for public-sector services, and four more sectors
call contrast functional rather than aesthetic — a handheld in sunlight, a plant screen behind
polycarbonate, a clinician's monitor under theatre lighting, a phone in a tractor cab.

`evaluation.md` has required "contrast computed from tokens" since 0.5.0 and **nothing computed it**. The
Figma audit had a contrast metric; the HTML side, which is where every project starts and where an
HTML-only project ends, had none. The capture recorded no colour pair, so nothing downstream could.

The capture now records the resolved foreground and the background it actually sits on, walking up until
a non-transparent one is found, because `background-color` on the element itself is transparent far more
often than not and a ratio against `rgba(0,0,0,0)` is a ratio against nothing. `contrast-check.mjs`
computes WCAG 2.x relative luminance, composites a translucent foreground over its background first
because that is what the eye sees, and applies AA or AAA from `state.contrastLevel`.

**Text over an image, a gradient or a translucent layer is reported as unresolved, never as clean.** A
confident wrong ratio is worse than an admitted gap, and this is exactly where a naive implementation
produces one.

### It found two real defects on the first project it ran against

The habit tracker's teal read **3.74:1** on white, below AA. That is the streak numbers and the primary
button, the two most-looked-at things on the screen, and it looks fine.

The second was worse: the error message sat at **2.15:1**, less than half the required ratio, on the one
line a person most needs to read on the worst screen in the product. Both invisible to review, both
obvious to measurement, which is the sentence this whole project is built on.

### The only package with a definition of done and nothing to run

`pica-architect` shipped twelve definition-of-done items and **no executable**, alone in the repository
in that position. Seven of the twelve are decidable from state, and leaving those to memory is this
project's own definition of a preference.

`arch-check.mjs` decides them: the feasibility verdict and its reason, whether a risky item names what it
affects so 5.1 has a figure to widen, whether every NFR carries a number and a condition and a
measurement method, whether every ADR carries all four parts, whether every technology in `stack` is
named by an ADR, and whether a native target records signing key custody and the rollback asymmetry.

**The rule it makes real is the one architecture.md states most plainly and nothing enforced:**
"retention and audit trail from `domainConstraints` become NFRs here, or they become nothing."

The other five stay with a human and the script says so on every run: whether a "not possible" reads
plainly to a non-technical reader, whether the C4 diagrams say anything, whether an ADR's consequences
are honest, whether a screen's named data source is real, and whether the decisions were right. A check
that pretended to judge those would be worse than no check.

**Two defects surfaced while building it, both familiar shapes.** The eight-character floor on a written
answer reported `"decision": "react"` as no decision at all — the same false positive fixed on `source`
earlier in this release, recurring because the helper was duplicated with its default. And the check read
`domainConstraints` without reading `industry.constraintsNotApplicable`, so a waiver a named human had
signed in one register was invisible to a check reading the other, and the project was told to write an
NFR for an obligation already recorded as inapplicable.

### A register the documentation made unusable, and a config block that did nothing

`figma-gates.md` says a deviation must be recorded in state "because a deviation recorded only in a
review document cannot be distinguished from a defect on the next run", and that **without the register
the definition of done is unfalsifiable**. Its worked example was
`{"node": "29:119", "prop": "y"}` — a Figma node id and a property name.

`geometry-diff` matches on **screen plus text run**, and it has to: it pairs runs by text content and
the dump carries no node ids, so a node id matches nothing whatever it names. **An entry written exactly
as documented could never suppress anything**, in the one register that file calls load-bearing. Both
spellings are accepted now so an existing register keeps working, and the example is the one that does
something. Verified by registering a real deviation: seven findings become six.

`figma-audit.js` declared a `DEVIATIONS` config block at the top and **never read it** — a control anyone
could fill in with no effect, which is worse than an absent one because it reads as working. Removed,
with a pointer to where the register actually lives.

### A direction could contradict the tradition it named

`design-vocabulary.md` has said since 0.7.0 that "a declared style adds checks to `direction.assert`:
declare neobrutalism and a blurred shadow becomes a violation." Nothing added them, and nothing compared
the two. `direction.style` was written by nobody and read by nobody, so `style: "neobrutalism"` beside
`shadow.blur.max: 12` was a direction contradicting its own name, and every screen passed it.

`verify-html` now reports a style whose assertions say the opposite of what the style means, and a style
naming no tradition at all. **The second earned itself in this repository's own history:** a direction
here was once named for a quality rather than a tradition, which meant nobody could look it up, compare
it, or measure a product against it.

It deliberately does **not** generate the assertions. The vocabulary table is explicit that it is for
recognising and naming, never for choosing, and a check that filled in the numbers would be choosing.

### The sector base could not be checked against itself

Twenty-eight sectors of prose, and the only way to find one contradicting itself was to read all
twenty-eight entries. That is the reading-is-not-measuring failure this project was built around, applied
to the project's own data.

`industry-check --audit` reads the base for contradictions: a sector whose own tradition is one it rules
out, a constraint category `domain-check` does not know, a colour to avoid with no reason, an exemplar
list that repeats itself or is too short to characterise anything, a name that means two sectors without
being recorded as ambiguous.

**The most-repeated piece of sector knowledge was the least checkable.** Seven sectors say some version of
"this hue already means something, do not spend it elsewhere" — red is overdrawn in finance, clinical
emergency in healthcare, the stop signal on a factory floor — and every one of them said it in a
different sentence. `colour.reserved` now records it as data: **22 hues across 14 sectors**, each with
what it already means. The other 14 carry a note saying no hue is load-bearing there, because silence and
"none" look identical.

Structuring it immediately found two entries the prose had left vague: insurance described "a strict
semantic triad for cover status" and pharmacy "a hard-reserved warning channel", **neither naming a
single colour.** A designer reading either would have had to guess the exact thing the entry existed to
pin down.

### A third of the repository had never been looked at

Enumerating every file rather than globbing the directories the audit already knew about found 47 files
in a working directory that is correctly gitignored and never shipped, and three things that were not
correct:

- **A 311-line design record was silently excluded from every clone.** It sat in
  `docs/superpowers/specs/`, which is where the brainstorming tool writes by default and which this
  repository's allowlist does not publish, while the two records of exactly its kind sit in `docs/specs/`
  and ship. Its status line still said "awaiting human review" three releases after the release it
  describes shipped. Screened for client content, moved to the repo's own convention, and its evidence
  base annotated so a reader knows the working material it cites is deliberately not redistributable
- **`SKILL.md` said implementation was "not built"** while `pica-impl` ships and is stable. README already
  had the accurate framing: pica ships the definition of done for implementation, not a coding agent
- **Two plan and spec records had stale or missing statuses**, so a reader could not tell what was
  outstanding

### The first sentence anyone reads before installing was two releases old

`.claude-plugin/plugin.json` advertised **"Sixty-five checks"**. That description is what the plugin
marketplace shows.

And the marketplace listing had drifted from the manifests it lists: **six packages were listed with no
description at all**, four more carried a stale one. Two files held a description for the same plugin and
nothing compared them.

`plugin.json` is the source, the marketplace mirrors it, and `validate-packages.mjs` now checks the
mirroring rather than trusting it: a missing description, a differing one, a version mismatch, a plugin
with no listing, or a listing with no plugin.

### The repository's own validator had gone unrun, and it was right about everything

`scripts/validate-packages.mjs` lives at the repo root, outside `packages/`, and every sweep this release
globbed `packages/*/scripts/*`. So the one check whose entire job is to verify the manifests was the one
check never run — through an audit that spent a full round fixing those manifests by hand.

It reported 61 findings, and every one was real:

- **The six manifests written earlier this release used shapes it does not accept.** `checks` must be
  `{run, passes}` objects, not script names, and `definitionOfDone` types are `check | human | gate |
  artifact`, not the `script` and `state` invented for them. Written against a guess when the schema was
  enforced two directories up
- **`pica-core` owned neither its hooks nor its skill.** Four hook files and the design-flow skill were
  shipped and unclaimed, which is the orphan condition the validator exists to report

### Thirty-eight links pointed at nothing in every layout, for three releases

The remaining findings were the flow map's rule links, and getting them right meant finding out the
validator's own model of the layout had gone stale.

It resolved the skill from `<repo>/skills/<name>`, which was the shipped location back when the whole
repository was **one plugin**. Since 0.6.0 each package is its own plugin, so `packages/core` **is** the
plugin root and the repo location and shipped location are the same path.

The stale model did worse than pick a wrong base: it made `../../packages/<pkg>/rules/x.md` look correct,
and that form resolves in **neither** layout. Not in the repo, where it lands on
`packages/core/packages/…`. Not installed, where a sibling package is a separate plugin directory named
`pica-<pkg>` and there is no `packages/` at all.

An earlier round of this same audit "fixed" those links by changing the prefix, which made them resolve
in the repo and left them broken installed, and a filesystem link check confirmed the fix because it only
ever checked the repo. Two checks, two layouts, and neither one alone could see it.

**Cross-package links are now rejected outright** rather than resolved: a rule in another package is
named as a repo path in a code span, which is true wherever the reader is, instead of as a link that
promises a click it cannot deliver. Seven such links in the rules were converted too.

### Following the documentation exactly made the sector gate unpassable

Building a state file from the two documented skeletons and nothing else, then running every check
against it, found three keys the checks need that no skeleton mentions:

- **`field`.** `/pica` said to write it **inside `direction`**, and `industry-check` reads
  `state.field` at the top level. A project built by the book had the field in the one place nothing
  reads, and the sector gate reported "state.field is empty" forever. The field is narrowed at 1.3, long
  before a direction exists at 3.1, so the top level is where it belongs and the copy inside `direction`
  is how the two drift
- **`measured`.** Nothing wrote it. The measurement table went to `docs/research/measured.json`, and
  `industry-check`'s evidence check and `picaflow`'s `schema-check` invocation both read
  `state.measured`. Both commands now say to write the same table to both places, and the file is what a
  human reads while the state key is what the scripts read
- **`branchProtection`**, added earlier this release and documented only in a code comment

`schema-check` is invoked by `/pica` against `docs/research/measured.json` and by `/picaflow` against
`.pica/state.json`. Both are legitimate and it accepts either, but the report never said which one it
read, so a surprising count sent the reader to the wrong file. It names the source now.

With those three fixed, a state file assembled strictly from the documentation resolves its sector and
the remaining failures are the genuine work of the step, which is what a skeleton should produce.

### Five manifests promised files nothing writes

`produces` had drifted the way `owns` had. `analyst` promised `docs/prd.md`, and `pica-analyse` assembles
the PRD into `docs/contract.md` — a path no command writes means every run puts it somewhere different.
`architect` promised `docs/architecture.md` and `docs/adr/`; it writes risks, NFRs and ADRs to state and
no file at all. `estimate` promised `docs/work-order.md`; 5.2 presents the work order and writes nothing.
Two state keys, `packages.figma.annotated` and `packages.research.tokensDerived`, were written by nobody
and read by nobody.

None of the five was required by another package, so nothing deadlocked. They were simply untrue, in the
file whose whole job is to say what a package does.

### Two rules about gates, both stated and neither checked

The flow says **"No package may grant a gate it benefits from"** and, implicitly, that a gate somebody
requires has to be granted by somebody. Writing six new manifests broke both at once, and nothing
noticed:

- **`clientApproved` was required by two packages and granted by none**, which leaves them permanently
  BLOCKED with no way to unblock them. That is the deadlock shape this repository has now found three
  times — `scopeFrozen`, then `exclusionsConfirmed`, now this. Both packages require the state their own
  scripts actually read instead
- **`html` granted `htmlApproved:<wp>`**, which the flow says core grants on human approval. The manifest
  and the architecture disagreed about who holds the gate that stops every Figma write

`pica-status` checks both now. Neither was expensive to check and neither was checked, which is the same
sentence this release has had to write about a dozen different things.

### The port never named the script that verifies the port

`/pica-port` described the geometry comparison in prose — "diff geometry against the captured reference,
match by text content, compare position only, tolerance roughly 3px" — and **named no script and showed
no command**, for three releases. `geometry-diff.mjs` ships, does exactly that, and every port
reconstructed the comparison by hand instead.

It now carries the command, the dump shape, and the three things the script refuses to start without,
each of which produced a clean report on an unverified file the one time it was skipped: a `frameMap`, a
per-frame font matching the capture, and a non-zero number of runs compared.

Every script in the repository is now invoked by name from a command, a rule or the skill. Two were not:
this one, and `pica-status`.

### Non-ASCII, spaces in paths, and 240 frames

Content in Vietnamese, Arabic, Chinese and emoji passes every gate with the text captured intact. So do
project paths containing spaces and containing Vietnamese diacritics. At 240 frames and 1,200 text runs
every check completes in under a tenth of a second; the capture takes 23 seconds, which is a browser
rendering 240 frames and is inherent.

Running each check three times on identical input returns byte-identical output. The capture differs in
exactly one field across runs, `meta.capturedAt`, out of 1,188 — which is provenance, and correct.

### The three in-Figma scripts had never been executed anywhere

`figma-audit.js` is 542 lines. `capture-baseline.js` and `source-parity.js` are another 250 between them.
All three are pasted as the `code` argument of a `use_figma` call, so **the only way to find out whether
one still worked was to paste it into a paid Figma session against a real file.** Nobody edits code they
cannot run, and this release had been calling them untestable.

They do not need Figma. They need the small part of its API they call, and everything that matters in
them — traversal, counting, pairing, comparison — is ordinary JavaScript once that surface exists.
`mock-figma.mjs` provides it, and `node packages/figma/scripts/mock-figma.mjs` asserts each still reports
the defect it exists for. It is not a Figma emulator and must never become one.

Running them for the first time: all three parse and run, `capture-baseline` catches a scrim whose alpha
was rounded to opaque, `figma-audit` reports an oval and correctly does **not** report a circle, and
`source-parity` sees a dropped string. Every claim they make about themselves held.

**The self-test needed the same treatment as everything else.** Its first version asserted only the paint
channel, so deleting `capture-baseline`'s node-opacity capture entirely still printed "all pass" — a test
that could not see the thing it was watching. Both channels are asserted now, and both were verified by
breaking the script and confirming the test fails.

### Six scripts answered a malformed state file with a stack trace

Given a state file with the right keys and the wrong types, six of nine check scripts exited on an
uncaught `TypeError`: `glossary.map is not a function`. They still failed closed, so no gate was let
through — but the person running one got a stack trace instead of a sentence naming the field, and a tool
that answers a bad input that way reads as a broken tool. The next thing that happens is that somebody
stops running it.

Every script now names the field and its expected shape, including arrays that are arrays and contain
`null`, which throws in exactly the same place as a string does. `geometry-diff` gained the same guard
and is the likeliest of all of them to be handed something hand-assembled, because it is pasted out of a
Figma session.

### Every rule link in the flow map was broken

`SKILL.md` is the map of the whole flow and its rule links were written `../../packages/<pkg>/rules/...`
from `packages/core/skills/design-flow/`, which resolves to `packages/core/packages/...`. **All
thirty-eight of them.** Nobody had followed one from that file, which is its own finding about a document
whose entire job is to point at the others.

### Smaller things, each found by looking at one specific thing rather than reading

- **`picaflow`'s measured block is now a self-guarding shell script.** The check-before-calling contract
  was stated once in prose at the top of the file and the block below it called nine scripts unguarded, so
  holding the contract meant remembering it mid-execution. `run` names the missing package and prints a
  line for every check that did not run
- **`/pica` called `schema-check` across a package boundary with no guard at all**, which on a core-only
  install fails with a path error rather than saying which package is missing
- **`verify-html`'s header listed its checks 1, 2, 3, 4, 7, 6, 5** after two were inserted, and called one
  of them "HORIZONTAL OVERFLOW" while the report printed `overflow`. The name in the header is now the
  name the report prints, so a finding greps straight back to the paragraph explaining it
- **`parity-check` printed the same benign sentence for one viewport and for none.** One is a project with
  nothing to compare; zero is a project with no viewport declaration, which `verify-html` refuses to run
  on at all

### The gate that fails open

`gate-figma-write` is the only thing in pica enforced by anything other than a person
remembering. It holds four rules: no Figma write before the human approves that package's HTML, none
while a review is running in report mode, none after delivery, and none without the skill loaded.

**Feed it a state file where `writeAuthorization` is a string instead of `{"granted": true}` and it
raises `AttributeError` and exits 1.** A PreToolUse hook blocks on exit code 2; every other non-zero exit
is reported as a hook error and **the tool call proceeds**. So a malformed field in a file anyone can
edit did not stop a Figma write, it permitted one, silently.

It now denies on any unexpected error and says what shape it expected. Tested across all seven paths:
one allow, six denies, including a state file that is not JSON at all.

### Nothing had ever run pica-status, and it knew four of ten packages

Six packages shipped in 0.8.0 with no `package.json`, so the tool that answers "what is ready and what is
blocked" could not see them. README says each package "declares what it requires, produces, checks and
considers done, in its own `package.json`", and for six of ten that was untrue.

All four manifests that did exist had an `owns` that disagreed with the directory beside it. `research`
declared no scripts while shipping `schema-check.mjs`, which the flow depends on.

Ten manifests now, written against the filesystem. And `pica-status` compares each manifest to its own
directory and reports the drift, because the comparison is free and nothing was doing it.

### Four scripts had never been run, and running them found five defects

`flow-check`, `build-diff`, `impl-check` and `code-tokens-check` were not in any test path. Building the
fixtures they need — interactive prototypes with routers, review shells, built variants, git repositories
with CI, and front-end source with a token file — surfaced:

- **`code-tokens-check` reported "border-radius 1px" from `border: 1px solid`.** Both the spacing and the
  radius checks gated on whether a LINE mentioned the property and then scanned every px on it.
  `border: 1px solid` appears in essentially every stylesheet ever written, so as shipped this check cried
  wolf on every real project. Scoped to the declaration value
- **`impl-check` reported "does not run type check" on a pipeline that runs `tsc` on every push.** The
  workflow says `npm run types`; what `types` does lives in package.json, which the check never read. It
  now follows `npm run X` into the scripts block
- **`impl-check`'s stack check searched only package.json**, so `"ci": "github-actions"` was always
  reported missing, along with every Python, Go, Ruby, JVM or Swift component in a polyglot build. The
  haystack is now every manifest that exists plus the tracked file list
- **`impl-check`'s branch protection had no escape.** Without `gh`, or on a repository not hosted on
  GitHub, it could never pass, and a check that cannot be passed is one people route around. Every other
  deliberate exception here has a signed register; this one now does too, and the report says the evidence
  is a person's word rather than an API read
- **`flow-check`'s `orphan-prototype` printed "ok" whenever there was no `review.html`**, and
  `flow-declared` only walked declared → file, so a project declaring no flows passed while shipping
  interactive prototypes. Both directions now, and the inert case says so

### A build against a stale capture read as a redesign

`build-diff` treated a frame with no `census` as a frame with an empty one: every radius and control
height read as "dropped by the build", and a build identical to the design reported ten divergences. That
happens whenever the approved capture and the build capture came from different versions of the harness,
which is the normal case for an approval in one month and a build in the next — and it happened in this
session, when the capture gained a field. Now reported as paired-but-not-measurable.

### Two rules with a register and no executable

- **`dataOwnership`** sat in a table in `research.md` under a column headed **"Enforced by"**, reading
  "no editable control inside the declared read-only regions". Nothing enforced it, and nothing could:
  the register named an entity in prose, and prose is not a region. It now carries `region`, and
  `verify-html` checks it. That required the capture to record tag names, and then to record controls at
  all — `boxes` holds only classed elements, and an `<input>` frequently has none, so the first working
  version of the check found nothing on a page that had one
- **`exclusionsConfirmed`** had a register, a command saying "refuse to pass GATE 1 while it is false",
  and a definition-of-done line. Nothing read it. `trace-check` does now: an empty `exclusions` means
  either nobody was asked or there is genuinely nothing, and in week three nobody can tell which

### The rule the harness cannot measure, unenforced since 0.4.0

`html-prototype.md` says "responsive is `@container`, never a width `@media`". Every frame is laid out in
one browser window, so a width media query fires for all frames or none. A prototype using one renders
correctly in a browser and is measured against the wrong layout by `verify-html`, `parity-check` and
`build-diff` alike, **all three reporting clean**.

`verify-html` now reports them. The first implementation read the CSSOM and found nothing on every real
project: Chrome throws `SecurityError` on `cssRules` for a linked stylesheet on a `file://` URL, which is
how every pica prototype is opened. It reads the stylesheets from disk instead.

### A copy rule that flagged the thing it was protecting

`research.md` gives "a mixed-case wordmark that must never be upper-cased" as its worked example of a
`copyRules` entry. Writing that rule reported **every correct occurrence of the wordmark as a violation**,
because `expect` defaults to 0 and a spelling rule has no expected count. Two different kinds of rule
shared one shape. An `exactCase` rule with no stated `expect` is now a spelling rule and its count is not
checked.

### The same void defeated four checks, and a length test was the wrong fix

`industry-check` was defeated end to end by writing `"n/a"` into every field it required: a healthcare
project with voided convention notes, voided preventions and ten unsigned stakeholder waivers passed all
seven checks with **zero findings**. Probing for the same shape found it in three more scripts:

- **`domain-check`** — a constraint whose `source` read `"n/a"` was traceable to nothing and passed
- **`trace-check`** — a business rule's source, the same way
- **`estimate-check`** — a **sixty per cent effort variance "explained" with `"n/a"`** passed the closeout
  gate, and the effort log is the one artefact that makes the next estimate better than a guess

**The first fix was wrong and had to be replaced.** A twenty-character floor rejected `"Dark by
default."` and `"Docs-forward, flat."`, which are real decisions written by someone who writes well, and
this project's own rule is that a false positive is worse than a miss because it teaches people to skip
the check. Length was the wrong instrument: what is being detected is a field that has been **emptied**,
not one that is short.

So a shared void list does the work and the floor only clears `"x"`. Two floors, because two kinds of
field: a source or a person is legitimately short (`PM`, `BA`, `client`, `brief`), while a reason has to
be a sentence. The helper is duplicated per script rather than imported, because these scripts run
standalone after a single-package install where no sibling package's path exists.

Waiving is still allowed and now needs a reason **and a name**, in `constraintsNotApplicable` and
`stakeholdersNotApplicable`. Writing "not applicable" into `domainConstraints` waives nothing: that field
answers whether the question was asked. Three real projects had voided a sector requirement there, one of
them with sound reasoning written in the place nothing reads it.

### The mutation suite only tested one direction

It checked that defects are caught and never that valid work passes, which is how the twenty-character
floor shipped at all. A second lane now runs six legitimate changes that must produce **zero** findings:
short but real notes, a departure with a real reason, signed waivers, an ambiguous field with the key
declared, and a recorded reason for measuring no precedent.

Current state: **20 of 20 defects caught, none missed, none firing the wrong check; 6 of 6 legitimate
changes passing clean.**

### Eight scripts had never run on the test corpus

The gate exercised seven checks across the projects. `schema-check`, `estimate-check`, `flow-check`,
`build-diff`, `impl-check`, `code-tokens-check`, `geometry-diff` and `pica-status` were not in it, so
"90 of 90 green" described less than it sounded like.

Running `schema-check` for the first time found that **the shape it demands existed only inside the
checker.** `nullReasons` appeared in no rule, no command and no example, so anyone writing
`measured.json` by hand produced something the gate rejected for a reason it could not explain. The shape
is now documented in `design-vocabulary.md` with a worked example, and the script header says to change
both in the same commit.

Writing that documentation reproduced the defect immediately: the first version described
`typography: {roles: [...], scale: [...]}`, which reads reasonably and which the check rejects, because
it reads the object's **keys**. Corrected from the code rather than from memory.

`schema-check` also accepted a bare `"none"` for a product's tradition, while `"none"` is a void
everywhere else in this repository. One word with two meanings across scripts is the kind of
contradiction that survives every careful re-reading, so a deliberate `"none"` now carries a
`traditionWhy`, like every other deliberate exception here.

`estimate-check`'s tier comparison printed **pass** whenever every package sat in one tier, which is the
exact state produced by relabelling the hard package as standard to make an estimate look tighter. It
cannot know which package is genuinely hard, so it now says the tier system compared nothing and leaves
the judgement to a human, instead of reporting a pass it did not earn.

### Domain knowledge stopped meaning the regulation

For most of this project's life, "domain knowledge" meant which standard governs the exchange, who the
regulator is, and how long the data has to be kept. That is the part that is easiest to look up and the
smallest part of what matters.

**An education product built like an admin dashboard passes every other check in this repository.** The
tokens reference correctly, the geometry measures clean, every use case has a screen. A teacher opens it
and knows in one second that nobody involved has watched a classroom.

`packages/analyst/data/industries.json` now carries **28 sectors**, and for each one: every stakeholder
with what they want, what they fear and what that means for the design; the sector's standards and
regulator; the constraint categories it requires; the colour convention **with the reason each reserved
hue is reserved**; the design tradition it settled on and the ones that misread in it, each with the
words that would appear in a direction that chose it; density per audience; typography; tone; what the
sector treats as a defect regardless of the brief; and shipped products worth measuring.

141 stakeholders, 98 sector defects, 49 colour avoidances and 39 ruled-out traditions.

`industry-check.mjs` enforces seven of these. Read the base with `--list` and `--show <sector>`.

**One product frequently has two or three densities**, and this is the finding that recurs across
sectors and is missed most often. Education is low for the learner, high for the teacher's gradebook,
medium and translated for the parent. Healthcare is high for the clinician, because pagination hides
facts, and low for the patient. Declare each separately or one of them will be wrong.

**Colour in most sectors is already spent.** Red in healthcare means clinical emergency; it meant that
in every hospital before it meant anything in your product. Red in finance means overdrawn. Green, amber
and red on a factory floor are inherited from plant signage, so using them decoratively is a safety
defect rather than a taste disagreement. Blue on a food menu reads as spoilage. Each is recorded with
its reason, because a convention without its reason gets overridden by the next person who finds it
inconvenient, and they cannot tell whether they are correcting an error or making one.

**Departing from a convention is allowed. Departing silently is not.** Each of five axes is followed
with a note or departed from with a reason. Silence on an axis is the failure, because an undecided axis
does not stay undecided: it gets filled with whatever the model produced by default, and afterwards
nobody can tell a decision was never made.

### An unknown sector fails, and that is the point

If the brief names a sector the base does not cover, `industry-check` **fails and refuses to run the six
checks below it**. Passing it would mean the least-supported projects get the quietest gate, which is
backwards, and it is the same failure this repository keeps finding in itself: a check returning zero on
the thing it exists to catch.

**It immediately caught a real hole.** This project's own north-star test, a portfolio for a fullstack
developer, resolved to no sector at all: the base had twenty-one industries and none of them was
professional practice. Seven were added as a result, including the developer-tools and security sectors,
whose dark-first conventions and severity scales nothing else in the repository knew about.

Four terms name two sectors each and the check refuses to guess at any of them: `training` could be
education or fitness, `delivery` hospitality or logistics, `games` gaming or media, `infrastructure`
construction or devtools. Their conventions are opposites, so a guess is worse than a question.

### The mutation suite, and three bugs it found that 84 green projects did not

84 projects were generated across the 28 sectors in three shapes each, and all 84 passed all seven
gates. That proves the gate runs. It does not prove it **bites**, because a project generated from the
knowledge base satisfies a check written against the same base by construction.

So each of the seven checks was then given a deliberate defect on eight real projects, 104 runs, with
the requirement that the check catch its own defect and **no other check fire**. Three bugs surfaced
that all 84 green runs had hidden:

- **An incidental match outvoted a declared ambiguity.** `"a training platform"` resolved cleanly to
  devtools, because `platform` matched, silently discarding a term that named two other sectors.
  Resolution now only accepts an ambiguous term when the sector it resolved to is one the term could
  have meant
- **`style-excluded` matched on the first word of a sentence.** `"illustration-led marketing pages..."`
  became the token `illustrationled` and matched nothing, so a direction naming a ruled-out tradition
  passed on three of eight sectors. Rewritten against a register: each ruled-out entry now carries the
  words that would actually appear in a direction that chose it. **A rule with no register is a
  preference,** and prose describing what is ruled out was a preference
- **The constraint mutation was harmless on the sector it was run against.** It removed `data
  protection` everywhere, and logistics does not require it, so a no-op looked like a miss. The test was
  weaker than it appeared, which is the same class of defect as the code it was testing

After the fixes: 13 of 13 mutations caught, none missed, none firing a check they should not have.

`coverage-check`'s header claimed four checks while shipping five; `target-buildable` arrived with build
targets and the header did not. Corrected, and counted rather than described.

### One flow, four numbering systems, and the rules used the one nobody read

The rules and scripts refer to work by decimal id: `2.1b`, `3.7`, `4.6`, `7.10`. The skill's flow table
matched them. The README's flow table did not: it carried **its own flat sequence from 0 to 14**, so the
work a rule called `7.10` appeared there as "step 12", and the dependency tables in both files carried a
**fourth** sequence left over from 0.2.0 — under which they promised that Figma was required for "steps 4,
6" while step 4 is now the client approval gate.

The README table is renumbered to the ids everything else uses, and both dependency tables now name the
work instead of numbering it. Numbers drift across a renumbering; names do not.

The 0.1.0 design record in `docs/specs/` keeps its original sequence, because renumbering a dated record
falsifies it. Its status note now says so explicitly.

### Fifteen checks became eighty-six

Every new criterion has been **seen to fail on the defect it was written for**, which is this project's
own rule and the only reason to trust a number that grew this fast.

The two worth naming separately were both found by running the flow on a real project rather than by
reading it:

**`coverage-check`** exists because the boundary between analysis and design was the only boundary
nothing verified. The Analyst produced use cases, the Designer produced screens, and every other
artefact here is checked against the one before it. On the test project `verify-html` returned
*"0 findings, HTML passes the measured gate"* on a capture where **one agreed requirement had no screen
at all and one screen served no requirement**. Every frame was tagged, in bounds, paired and covered.
The geometry was perfect and the product was both incomplete and over-scoped. Screens now declare what
they serve with `data-uc`, tagged rather than inferred, for the same reason `data-viewport` is.

**`build-diff`** is step 7.10, the check the industry reliably leaves undone: the designer assumes QA
covers it, QA assumes the designer does, and the code quietly reinterprets the design in between.
Everything needed already existed — the approved capture is the reference, and `--url` points the same
harness at a running build. Only the comparison was missing. Pairing is by `data-uc` plus viewport,
**never by caption**, because a build's captions come from its own markup.

### Domain knowledge, without shipping a table of laws

`domainConstraints` was added and then read by nothing, which this project has a rule against: a
register nothing reads is noise, exactly as a rule with no register is a preference.

`domain-check` reads it now. It requires **all eight categories answered, including "not applicable"**,
because an unasked question and a null answer look identical otherwise. Every entry carries a source
and a `verifiedBy` of `human` or `agent`, and **anything an agent inferred must also exist as a
low-confidence assumption**, so a retention period nobody confirmed arrives at the client as a question
rather than as a fact. Getting that wrong is not a design defect, it is a liability.

What ships is the method, not the regulations: look at the **sector's standards body first**, then the
regulator, then the client's compliance officer. Rules differ by country and change without notice, and
stating a legal requirement wrongly is worse than stating nothing.

Running it across ten domains found a false positive: `regulator` was being asked to name what it
affects, and four of the ten produced a made-up entry to satisfy it. Naming the supervisor is
**context**; its consequences arrive as the other seven categories. A false positive is worse than a
miss, because it teaches people to skip the check.

### One design, three viewports, and targets choose

The first attempt put a `surface` field on each viewport, which was the wrong axis. A responsive
website and a native app are not one product at more sizes, but they are **one design**: desktop,
tablet and mobile, produced once.

Implementation `targets` then declare which viewports they consume. A website takes all three; a native
app takes tablet and mobile and never desktop. `coverage-check` fails a target naming a viewport the
design never produced, so *"we cannot build iOS, nobody drew tablet"* is found in Phase 3 rather than in
Phase 7 by a developer with nothing to work from.

### The gaps an audit found that reading had not

Mechanical audits over the whole repository found seven defects that every review had missed:

- **`/pica-analyse` listed `accessibility mandate`; `domain-check` required `standard`.** Every project
  would have failed the gate on a category mismatch
- The same command told you to write `verifiedBy: "assumption"`, a value the check does not accept
- **`pica-impl` called a script in `pica-designqa` without declaring the dependency**, so a standalone
  install had a command pointing at a file that was not there
- **`estimate-check` refused to run without `scopeFrozen`, and nothing wrote it.** A deadlock: two
  correct artefacts with nothing joining them, which is the same shape as the analysis-to-design gap
- `schema-check` and `domain-knowledge.md` were written and never wired to a command
- `flow-check` threw an unhandled filesystem error instead of printing usage
- `SKILL.md` still described four packages and listed twenty-eight fewer state keys than the scripts read

`scopeFrozen` is now documented as **deliberately written by no command**: it is the moment an Account
records that a human client agreed, and refusing to price work without it is the point rather than an
obstacle.


### The design direction, and the reason there is no catalogue of fields

Every product has a house style its field already expects, and a brief almost never states it. Until now
pica had no step that proposed one: `research.md` could **derive** tokens from a client's sources and it
explicitly refused to invent, which is right, but it left greenfield work with nothing between the audit
and the UI kit. The palette got chosen anyway — silently, by whoever built the kit first.

Step **2c** now settles it. Intake gains a sixth input (the field named narrowly, the audience, and the
conditions of use), and step 2c proposes two or three named directions from **three to five real products
in that field that were measured** — radius, control height, hue count, tabular figures, spacing. Same
shape as `1d`: options that cannot be compared are not a choice. GATE 2 approves the direction alongside
the audit and the tokens, so no new gate and no renumbering.

**pica ships no table of what a field looks like.** No "banking means small radii". Such a table is
precisely what this flow already refuses — *"best practice suggests" is not research* — it cannot be
defended in a client review, and it is wrong the moment a field moves. What ships is the method, and the
method does not go out of date. A precedent with no measurement is not a precedent: "Stripe feels clean"
cites nothing.

Two modes, and the second is where the value is. **Propose** covers greenfield. **Audit** runs when a
brand already exists: the direction is then the client's own system, scored against what its field does,
and the gaps are presented as questions rather than corrections. The brand still wins; each accepted gap
lands in `deviations` with its reason, because an accepted gap and an unnoticed one look identical three
weeks later. Tokens with no client source take a third origin, `proposed`, naming the direction and the
measured precedent — `taken` and `derived` claim a client source, and the separate word is what stops a
greenfield palette from later reading as reuse.

### A direction is written as numbers or it is not written

The part that is actually hard is not choosing a direction, it is still having it at package eleven. A
direction agreed in conversation and recorded as prose lasts about as long as a copy rule does, which
this changelog's own history puts at about a day.

So `state.direction.assert` is machine-checkable, and **`verify-html` gains a fifth check**. The capture
artefact gains a per-frame `census`: corner radii with counts, control heights, non-neutral hues in 30°
buckets, and how many numeric runs render with tabular figures. Aggregated per frame, never per element —
a direction is a property of the kit, and recording it per node would multiply the file by the node count
to say the same thing.

Three decisions that make the check usable rather than merely present:

- **Hues are counted across the whole capture, not per frame.** A three-hue budget spent one hue per
  screen is still three; scoring frames alone calls that a pass and lets a palette sprawl one screen at a
  time.
- **One finding per violating value, not per frame.** A single wrong token appears on every screen that
  uses it, and forty identical lines bury the one value anybody has to change.
- **A percentage radius is a circle, not a corner style.** Scoring an avatar against a px maximum is a
  category error, so `%` is excluded outright.

The contract when the data is thin follows `geometry-diff` from 0.7.1 exactly. **No direction declared →
not applicable, and it says so** rather than reporting a silent green. **Declared but captured before
0.8.0 → FAIL**, because a check that cannot run is not a pass. And a direction with an empty `assert`
block is itself a finding: a direction nothing can breach passes every screen by default and is worse
than none.

### pica-core failed to load, at install and ever after

`packages/core/.claude-plugin/plugin.json` declared `"hooks": "./hooks/hooks.json"`. Claude Code loads
that path automatically, so the declaration made it a duplicate and the plugin refused to load:

```
pica-core  0.7.0  ✘ failed to load
Error: Hook load failed: Duplicate hooks file detected: ./hooks/hooks.json resolves to
already-loaded file …/hooks/hooks.json. The standard hooks/hooks.json is loaded
automatically, so manifest.hooks should only reference additional hook files.
```

`manifest.hooks` is for **additional** hook files only. One line deleted. Reproduced from a clean install
of the published marketplace, and verified fixed by a second clean install: all five plugins load, and
`pica-core` still registers both hooks — SessionStart and the PreToolUse Figma write gate — because the
conventional path was always the one doing the work.

`claude plugin validate` does not catch this. It passed `packages/core` before the fix and after it,
which is why the manifest survived three releases.

### The brief was demanded, never stored, and required again at the end

Intake input 1 asks for the brief raw and unedited. Step 1 then wrote five files — `contract`,
`exclusions`, `effort-log`, `rationale`, `annotations` — and **none of them was the brief**. `state.json`
carried 33 keys and none held it either.

Closeout opens with *"Re-read the original brief. Cold. The brief. Not `docs/contract.md`, not the plan,
not your memory of it"*, and that step has already earned its place once: it recovered a scored
deliverable that the plan had dropped entirely. But this flow also says **no session survives a
multi-day project**, and Phase B is measured in days. So on every project long enough to need closeout,
the brief existed only in a chat window that was gone by the time the step ran.

By this flow's own standard — *a rule with no register is a preference* — input 1 was not a rule. It
demanded something be written down, had a later step read it, and named no place for it to live.

Fixed at all three points: 1a writes `docs/brief.md` verbatim **the moment the brief arrives**, state
gains `briefPath`, and closeout reads that path and **fails loudly** if it is gone rather than silently
reading the contract instead — which is the exact substitution the step exists to prevent.

### An empty exclusions list meant two different things

`docs/exclusions.md` is *"the single highest-value artefact in the whole flow"*, and it is weakest
exactly where it is needed most. Its first half is quoted from the brief, so a one-line brief rules
nothing out and produces nothing — on the projects with the least defined scope, which are the ones
whose scope grows. The second half, *"then ask the human what else to add"*, was the entire defence and
had no register behind it.

So an empty `exclusions` could mean the human was asked and there is genuinely nothing, or that nobody
asked. Nothing could tell those apart, including the author three weeks later — in the one register
whose whole purpose is separating a decision from an oversight.

`exclusionsConfirmed` now records the ask, and **GATE 1 refuses to pass while it is false** or while
`docs/brief.md` is missing. One question and one file, both unrecoverable afterwards.

### GATE 7 did not exist

The gates run 1 to 9, one per step, and the sequence skipped 7. Step 7 is `/pica-review` — the one step
that can **write** to a delivered file, via `--fix` — and it was the only step with no gate at the end of
it. The write hook still held (report mode denies every mutation), so nothing was unsafe; what was
missing was the stop that hands the findings to a human and ends there.

It is deliberately not shaped like the others. Every gate before it asks for approval of finished work;
this one hands over a list and asks which of it is worth doing, because the right fix is frequently a
design decision rather than a repair — a contrast failure is solved by darkening the scrim or by changing
the text colour, and that is not the flow's to pick. Zero findings still passes through it, since a review
that found nothing and a review that never ran look identical in a transcript.

### The check count was two different wrong numbers

`plugin.json` claimed "Eight checks that fail closed" and the README claimed "the seven checks", and they
had disagreed for three releases. Neither was right, and the reason is that the number counted **scripts**
while calling them checks: 0.7.0 added `source-parity.js` and bumped 7 to 8 in one file and not the other.
Two of those eight are captures that check nothing.

Both were corrected to **fifteen** at the time, and the README gained the table that derives it — `verify-html` 5,
`parity-check` 2, `flow-check` 7, `geometry-diff` 1 — with the definition it is counted under: a named
criterion with a stated pass condition that returns non-zero and stops the step. An undefined number is
what let this drift; a number with its working shown next to it can be recounted by anyone who doubts it.

*(The count reached eighty-six later in the same release. The table is still the thing that makes that
claim checkable rather than a boast.)*

"Four gates enforced by hook" was checked at the same time and is correct: `gate-figma-write` denies on
the `figma-use` contract, a delivered file, an active report-mode review, and missing write authorization.

### Every command was shipping without a description

All seven command files had no frontmatter, so every `/pica…` command installed with no description and
`claude plugin validate` warned on all seven. Each now declares `description` and, where it takes them,
`argument-hint`. All four packages validate clean.

## 0.7.1

### geometry-diff compares the edge the alignment makes meaningful

The diff compared the HTML's glyph **ink** left edge against Figma's **layout box** left edge. Those
share an edge only for left-aligned text. For a right-aligned FILL label the box starts at the
container's left while the ink ends at its right, so `dx` was the container's width minus the string —
a number that is neither a defect nor a pass. Centred text had the same problem, scaling with the
string.

Until now the answer was to tolerate it: annotate centred findings, and write a `deviations` entry per
run. On the project that produced this change that meant **eleven hand-written exemptions**, and one of
them hid a real **258px** error for days, because the exemption dropped the very run that would have
caught it. A human found it by opening the frame.

`geometry-diff.mjs` now compares **left for left, right for right, centre for centred**. A right-aligned
label is checked against the margin it must sit on, which is what the design promises. Proven on the
case that motivated it: the same design that produced a phantom `-258.4` now passes with no exemption,
and a genuinely 56px-short right edge is caught as `dR=-56`.

**The dump contract gains two optional fields**: `texts: [[string, x, y, w, align], ...]`. A three-field
dump still runs and falls back to left-edge comparison, but **says so in the output** — because a gate
that silently cannot check right-aligned text is worse than one that admits it.

### Both sides must name their font

`capture-html-reference.mjs` now records the family the browser actually resolved in `meta.font`,
forced or not — `forcedFont` only ever said what was *asked for*, and was null on a native run.

The Figma dump gains a `font` field per frame, and `geometry-diff` refuses to run unless every frame
carries one and they all match the capture. Unknown is not a pass, and a partly labelled dump is
rejected: accepting one lets the unlabelled frames through in whatever family they were taken in, which
is the failure the guard exists to prevent.

This came from a team that designs in one font and hands over in another, flipping constantly. Position
depends on the family — the swap moved hug-width nodes 2 to 5 percent, several times the tolerance — so
without the guard every other run silently attributes typeface to layout.

### Rules the same project paid for

- **figma-gates** — an exemption is a claim, and claims age. A stale entry does not just go out of date,
  it blinds the check at the point it was aimed. Write it on the invariant, and give any measurable
  premise a lens that re-measures it. First ask whether it excuses a decision or a measurement bug.
- **figma-gates** — reachability is a walk, not a count. Breadth-first from the entry, once per lane,
  plus an assertion that no edge crosses viewport or theme.
- **review-discipline** — WCAG is the wrong instrument near black; use `ΔL*` for surface against
  surface. A change that took a sheet from invisible to clearly separated moved WCAG from 1.03 to 1.13.
- **review-discipline** — a surface role must stay distinguishable from its neighbours. Value parity and
  role separation are two different checks, and a palette can be reproduced perfectly while two roles
  collapse into one colour.
- **html-prototype** — the builder is the source of the file it builds. Editing generated output is a
  mine that goes off the next time anyone runs the script.

## 0.7.0

### Tablet is a first class viewport

`768 x 1024` joins desktop and mobile as a documented entry in the viewport catalogue, with an 8
column grid at 16 gutter and 24 margin. Nothing in the flow needed changing: `data-viewport` was
already a tag the scripts read rather than a device class they guessed at, so tablet worked all along.
What was missing was a canonical size, which meant every project invented one.

768 is chosen because it is the breakpoint minimum, so the tightest case is covered, and because the
8 column grid puts the column width within a pixel of the 4 column mobile grid at 375. A card that
spans two columns is then the same width at both sizes, so tablet fits more of them per row rather
than stretching each one. Components reflow instead of being redrawn, which is what makes a tablet
pass cheap. Reaching for 834 or 810 to match a particular iPad loses that relationship and buys
nothing.


**The first job that is not a port.** An existing Figma file rebuilt into a design-system-quality one at
92 components, 389 variables and 163 screens, with no brief, no HTML and nothing to approve, because the
design already exists. The flow had no name for that job, so half of this release is the job and half is
what it exposed about the checks.

Most of what it exposed is **not specific to rebuilding**, and the release says so. Six criteria
discovered in a Figma rebuild are medium-independent and now live in a new core rule,
`reference-discipline.md`, governing the port flow and the HTML side equally: the reference is read-only
and that is checkable, names are not identity so pick a channel you control, content parity is a
criterion of its own, a reference has three kinds of defect decided three ways, fix at the definition
rather than the occurrence, and promote slowly while binding always. `figma-rebuild.md`,
`figma-elements.md`, `html-prototype.md` and `html-gates.md` each carry the applied form and point at
core rather than restating it.

Ten findings.

- **F50 — pica had no flow for rebuilding an existing Figma file.** Every rule assumed Figma is
  downstream of approved HTML. New `figma-rebuild.md`, and a variant table in the skill: the arbiter is
  the client's untouched pages, there is no approval gate because the design is already approved by
  existing, and `geometry-diff.mjs` is replaced by a new `source-parity.js`.

- **F51 — structure at zero says nothing about content.** *(now core: content parity is a criterion of
  its own, and the HTML gates say a text-run count is not a content diff)* A file passed seventeen structural criteria at
  zero while showing six filter rows with the wrong labels, an entirely wrong product on one screen, a
  stepper reading the master's placeholder, four cards in the wrong language, and a keypad missing its
  delete key. Every node was present, bound, on-grid, inside its parent and sensibly named. **Content
  parity is a separate criterion and only the source can score it.**

- **F52 — the coordinate system is a tool.** *(now core: names are not identity — declare a channel per
  medium, `data-viewport` for HTML, the frame map for a port, canvas position for a rebuild)* Keeping rebuilt screens at the source's canvas coordinates
  makes pairing a dictionary lookup, which survives duplicate screen names and renames. It also lets any
  node be paired by position: a distance of 0 with different strings is *right place, wrong words*, which
  is what three of the five defects above turned out to be. Now a rule, and the basis of `source-parity.js`.

- **F53 — three lenses inferred a property instead of reading it.** A paint's binding lives on the paint,
  not on `node.boundVariables.fills`. Absence from `getLocalVariablesAsync()` is not evidence of
  foreignness — 129 false findings. A text's backdrop is the last node in paint order that contains it,
  not the nearest ancestor with a fill; correcting that surfaced an entire keypad rendering white on
  white. New section in `review-discipline.md`: *ask the object, not the index*.

- **F54 — a clip-aware overflow metric does not subsume the auto-layout one.** The audit has carried
  `Auto-layout overflow` since 0.3.0. Writing a second, clip-aware metric for nodes escaping their parent
  looks like a superset and is not: it excludes clipped subtrees, which is correct, and a fixed-width bar
  whose children need 380px more than it has is entirely inside a clipping parent. Eight screens clipped a
  tab through every round of *that* check at zero. Both metrics are needed, and the rule now says so
  rather than leaving the next person to discover it by writing the wrong one.

- **F55 — a number with no baseline is unreadable.** A new lens returned 356 on the rebuild and 268 on
  the untouched source, most of both being scroll regions. Run every lens against the reference and
  publish the pair; new `lensBaselines` register. A criterion targeting 0 where the source scores 247 is
  one nobody can close.

- **F56 — component granularity had no rule, and the two "make it reusable" instincts pull opposite
  ways.** Componentising is a bet and the default must be *no*: a library reached 147 components of
  which 36 were arrangements and 9 were duplicates, 30% wrong, every one created by reflex rather than
  decision. Tokenising has no default and no threshold — every colour, gap, radius, stroke and type
  value is bound on first appearance, and the only escape is a signed register entry. Part 3 now opens
  with that asymmetry, pointing at core, and `html-prototype.md` carries the CSS form of it: a shared
  class is a promotion, a custom property is not. A component is a thing, not an arrangement of things.
  Two conditions dissolve a wrapper (no own content, separators excluded; no variant axis), plus a
  single-use clause, which dissolved 36 components in one file. The heuristic then caught a component a
  human had already judged correct, so `granularityExemptions` joins the registers. Reconciled with "never detach":
  never detach so an instance can differ, do detach to delete a component that should not exist.

- **F57 — moving a component out of its set wipes every instance override.** Not just the swapped ones.
  Twenty-nine chips silently reverted to the master's string, nothing threw, and the audit stayed at
  zero. Caught only by comparing a tally to the source. New rules: capture-mutate-restore inside one
  script, write masters before instances, and `swapComponent` keeps overrides only where the layer path
  matches.

- **F58 — a guard that skips is worse than a guard that fails.** `if (count !== expected) skip` left
  eight cards holding placeholder content and reported a diff instead of an error. Fix the precondition
  or throw; never continue past it with the work undone.

- **F59 — 0.6.0 shipped every rule link in the skill broken.** Moving design-flow into `pica-core`
  changed its depth; the 26 links out of the map were left at `../../../packages/`, which resolves in
  neither the repo nor the installed layout. The package validator could not see it — every file was
  present and correctly owned. `validate-packages.mjs` now has a seventh assertion that resolves every
  relative markdown link in a rule or a skill, from the place that file is actually read from: a skill
  under `packages/core/skills/<s>` ships at `<root>/skills/<s>`, so its links resolve against the repo
  root, not against its position in the source tree. Verified by reintroducing the defect: 29 findings
  with the old paths, 0 with the new. Found while adding this release's own rule to the map.

Also: naming by role rather than measurement, including inside variant axes — 58 components, 95 variant
values and 13 effect styles renamed in one file, and the observation that when a size scale cannot
name an axis's members uniquely, it is not a size axis. Four new Plugin API traps in `figma-screens.md`
(`return` inside a traversal exits the script; property references cannot be set on an instance sublayer;
`figma.mixed` is not only `cornerRadius`; never filter a delete list by a key you transformed).

### Known limits

- `source-parity.js` compares text and position. It does not compare images, and an image swapped for
  another of the same dimensions passes. `capture-baseline.js` covers paint, not image hashes.
- The rebuild variant has one project behind it, and that project had a shared coordinate system by
  luck rather than by policy. The rule now says to keep it; nothing enforces it.
- The granularity rule is a heuristic with a register, not a measurement. It cannot distinguish a
  one-off container from a list's repeated unit without a human.


## 0.6.0

pica becomes four packages — `core`, `research`, `html`, `figma` — plus a bundle that
installs all of them, so an existing install keeps working unchanged.

Each package declares what it requires, what it produces, which checks it owns and what
done means for it. `requires` is what makes omitting a package safe: a package refuses to
start when its inputs are missing and names which. `definitionOfDone` items are typed,
and a `human` item cannot be satisfied by any script — the schema rejects one that names
a script, because ten green harnesses and four screenshot-obvious defects on the fourth
one place is what that type exists to prevent.

`review-gates.md` is retired. Its 685 lines are split three ways: 22 medium-independent
sections into core's `review-discipline.md`, five HTML gates into `html-gates.md`, nine
Figma gates into `figma-gates.md`, with `## Definition of done` split across both files. Sections moved verbatim; no rule changed meaning.

New: `scripts/validate-packages.mjs` asserts every declared file exists and every shipped
file is owned exactly once, and `packages/core/scripts/pica-status.mjs` reports what is
ready and what is blocked and why.

The path past Figma is declared in `packages/_planned/` as contracts with no content.
Those packages are planned, not built, and are shown as `PLANNED` everywhere they appear.

### Known limits

- No package has been exercised as a separate install on a real project yet. The split is
  verified structurally — the validator returns zero, every script still fails closed —
  not by having run a project through four separately installed plugins.
- `annotation-check.mjs`, required by the spec's D2, is not built. The Figma package
  declares no check for annotations, so a missing annotation is currently invisible.

## 0.5.0

**The first HTML-only release.** Exercised on a multi-application mobile design behind one launcher: 31
files, 4 interactive prototypes, 60 screens, no Figma anywhere in it. It ran to ten hand-written
harnesses, all green three runs in a row, and a human still found four defects in a screenshot the same
afternoon and a mis-routed link by clicking. Both facts
drove this release.

Seven findings.

- **F43 — a package could ship option boards and no usable flow.** Nothing in the flow said a work package
  produces an interactive prototype, so the deliverable drifted toward boards, which are the part every
  check can see. Meanwhile **every defect the human found by using the prototype was a navigation defect**
  with no geometric signature: a home row that opened another role's screen, an entry point that lit the
  tab it came from, a shared screen whose back control left the application, a deep link that went via the
  launcher. A package now ships **boards and the interactive main flow**, one prototype per application,
  linked to each other for real. It is rule 7 in the session dispatcher.
- **F44 — nothing checked the wiring.** New `flow-check.mjs`: dangling targets, dangling cross-application
  links, the router's own root and tab set, unreachable screens, dead ends, a prototype the review shell
  cannot open, and `flows` entries that do not resolve. All seven negative-tested by breaking the source
  project on purpose. It fails closed on zero screens or zero links, and `--allow-none` is the explicit
  escape hatch for a boards-only package.
- **F45 — ten green harnesses, four screenshot-obvious defects.** Duplicated sheet rows, a 16px spacer
  orphaned between two dividers, an open sheet leaving the sticky header undimmed, a collapsed header
  leaving a 20px white strip on every screen. The pattern has a shape worth naming: **a harness is good at
  properties of elements that exist and blind to space that should not be there.** The fixes are counting
  assertions rather than property assertions, and "render every screen and look at it" is now qualified as
  **after** the last change.
- **F46 — six checks returned zero because their sample excluded the case.** A type sweep that measured
  only the visible tab (122 headers unmeasured), a spacing check comparing direct siblings only, a font
  check that only looked at the declared family, an icon check that printed without counting, a
  floating-button sweep that forced an app bar onto the one screen that never has one, a contrast probe
  sampling where the gradient ramps into white. 0.4.0 said report what your filter excluded; 0.5.0 adds
  **report the state you measured in**, and: an advisory that prints without counting is not an assertion.
- **F47 — a check has to be seen to fail on the defect it was written for.** Two were not: a group-header
  check exempted the exact pair that was broken, and a mock-data check asserted roster *membership*, so it
  passed on an identifier belonging to a different person in the roster. Both were fixed only after the
  defect was put back and the check was watched failing. And grepping for your own failure string proves
  nothing: a suite that crashed before reaching a check prints the same nothing as a check that passed.
- **F48 — real-looking mock data is self-certifying.** A real name under someone else's title, one person's
  real identifier invented onto another person's row, a feed older than the screen's own today, a
  notification crediting the wrong author. New rule: mock data gets **provenance like tokens do**,
  cross-referenced against the source data, asserting **ownership by nearest name** rather than membership,
  with relationship fields stripped first. Identify a row by the name beside it, never by initials: 14
  initial forms were ambiguous in a roster of 32.
- **F49 — the client's own rules had nowhere to live.** A punctuation ban in product copy, a mixed-case
  wordmark, and a read-only rule on one entity all arrived as asides. Two new registers: **`copyRules`**
  with the check that enforces each, and **`dataOwnership`** per entity. The second one earned itself: a
  blanket reading of "the user's data cannot be changed on mobile" disabled the request and approval flows
  the product exists for, when what was meant was the person's own record. Per entity, the distinction is
  designable.

### Also

- **`flows` in state**, one entry per application, plus `flowExemptions` for a screen the router opens
  rather than any control. Declared at intake, because it is a fact about the product.
- **The interactive flow leads the review tab bar and is the default tab.** Tab order reads as priority
  order whatever you meant by it: tabs left in build order once made a human's report
  was that the review page still opened on the first application built rather than on the launcher.
- **Never assert a proxy.** `overflow: hidden` does not change `scrollWidth`; a z-index assertion run with
  the sheet closed produced 38 findings on a correct file; a scrim comparison must be a **ratio**, because
  the same overlay took a dark header from luminance 33 to 20 and a white page from 252 to 151.
- **Check the probe before believing it.** Two contrast probes were wrong in opposite directions, one
  sampling where the background ramps to white and one hiding the rows it measured with
  `visibility: hidden`, which hides their background too.
- **Colour interpolation is a design decision.** `color-mix(in oklch)` walks hue along an arc, so a dark
  navy toward a saturated red transits mauve and green. `in oklab` is Cartesian; plain sRGB stayed richest
  for that ramp. Also: two separately painted boxes cannot continue one diagonal gradient, and white type
  over a background with eight generated conditions is eight contrast questions, not one.
- **Editing safety, now part of verification.** Prove an anchor unique before an index-based edit: one
  restructure cut 8,047 characters out of a file, twice, on a substring that appeared twice. Never use
  `git checkout` to undo, which destroyed uncommitted work twice in one session. When you replace a
  component, assert the old one is gone.
- **A trap documented beside the code is not a rule.** `box-sizing` excludes margin, so `width: 100%` plus
  a horizontal margin overflows: written as a comment on one component and hit again twelve lines below the
  comment within the hour. Remove the chance to hit it with a kit utility, or make it an assertion.
- Emoji as **content** is a different question from emoji as icons: a reaction set has to be the real
  animated asset, decoded frame-exact into a sprite sheet, not a still standing in for motion.
- The audit-integrity section said "five rules" over six of them. Six.

### Known limits

- The Figma half is unchanged and untouched by this release, and is now the
  less exercised half by some distance.
- `flow-check` reads markup, so a link built in JavaScript is invisible to it, and it cannot judge whether
  a link goes somewhere *sensible*. Clicking remains a line in the definition of done.
- The ten project harnesses behind F45 and F46 are not shipped. They are too project-shaped to
  generalize honestly, so what ships is the rules they produced. A future release should extract the two
  that are general: stacked separators, and every layer above a scrim measurably darker once it opens.
- **No usability testing informed any of this.** Every finding here is from
  measurement, from looking, or from the client using the prototype.

## 0.4.0

**The checks 0.3.0 documented now exist, and they run before the human is asked to approve anything.**

0.3.0 described a viewport parity check and a geometry diff in full — two passes, subtree pruning,
tolerance calibration, pass criteria. Neither shipped. Both existed only inside the project the rules were
derived from, so anyone installing the plugin read a rule instructing them to run something that was not
there. The 0.3.0 coverage audit did not catch this because it graded whether concepts were *documented*.

Six findings, all of the same shape: **a rule that names a check, with nothing behind it.**

- **F37 — the parity check and geometry diff did not ship.** Now in `skills/design-flow/scripts/`,
  generalized rather than hardcoded. `geometry-diff.mjs` takes its Figma-to-HTML frame mapping from
  `frameMap` in state rather than a hardcoded table.
- **F38 — the HTML was never measured.** `/pica-wp` ran no check at all; measurement began at
  `/pica-port`. An HTML-only project (`figmaInScope: false`) therefore received *no* verification, while
  "HTML is the source of truth" remained the first rule in the skill. New `verify-html.mjs` runs inside
  `/pica-wp` before GATE 5, checking viewport tagging, horizontal overflow, the tall-screen pair and
  viewport coverage. It is the gate an HTML-only project ends on.
- **F39 — the capture script's frame selector defaulted to `.phone`.** A mobile-only holdover. Any
  project whose frames were not called `.phone` captured **zero frames**, logged it as ordinary output,
  wrote a well-formed empty artefact, and passed every downstream check. The default is now
  `[data-viewport]`, so one attribute both locates the frame and names its viewport, and the capture
  **refuses to write** an empty reference.
- **F40 — the geometry diff reported success for work it had not done.** An unmapped frame was a `SKIP`,
  not a finding, so a project with no frame map compared zero runs, printed "0 over tolerance" and exited
  0. Unmapped is now a finding, an empty `frameMap` refuses to start, and zero comparisons is a failure.
- **F41 — `viewport` was captured but inert.** The tag was implemented in 0.3.0 and never used: no HTML
  carried it, every consumer fell back to matching frame width, and nothing complained. A fallback that
  always fires makes the tag decorative. Untagged is now a finding.
- **F42 — a contradiction survived in a second file.** `pica-wp.md` still said a full-height frame
  carries "no home indicator", reversed by 0.2.0 and corrected in `html-prototype.md` for 0.3.0. Five
  files said present, one said absent. A concept-grep audit cannot find a contradiction, because both
  sides of it are on-topic.

### Every check now fails closed

A selector matching nothing, an empty frame map, a comparison of zero nodes — each exits non-zero rather
than printing a reassuring number. All three paths are negative-tested: broken on purpose, confirmed to
report. A check never seen to fail has not been tested.

### The flow says what it always meant

Restructured into three phases. **A — establish** (contract, tokens, HTML kit). **B — design and verify**
(build, measure, look, approve) — this phase is the deliverable and an HTML-only project ends here, fully
verified. **C — Figma, optional**, entirely downstream of an approved package. Foundations-into-Figma moved
from step 4 into Phase C: it sat ahead of every HTML approval gate, which made the optional phase read as
mandatory.

### Also

- `parity-check.mjs`: the "registered reflow" counter was never incremented and always printed 0 despite
  49 active notes; it now reports boxes pruned. Text parity is documented as **advisory by design** rather
  than pending implementation — owner attribution works, and what remains is copy that differs between
  viewports, which nothing measurable can adjudicate.
- `geometry-diff.mjs`: `text-align: start` and `end` are no longer flagged as needing tolerance review.
  They are the computed values of left and right in an LTR document and carry no extra error; flagging
  them made two thirds of a report look suspect. Only `center` and `justify` are annotated.
- **Audit for executability, not for mention.** New rule: if a rule names a check, the executable ships
  and the rule states its command line and pass criterion.

## 0.3.0

**The first release that is not mobile-only.** Exercised on a desktop-shaped web application designed in
HTML at two declared viewports and ported to Figma in full: 33 frames, 108 variables, 12 text styles,
37 component variants, two wired prototypes.

**35 findings.** Four contradicted the 0.3.0 design as originally reasoned. The most valuable ones were
found by a human looking at a rendered frame after every automated check had returned zero.

### Multi-viewport

`frameSize` becomes **`viewports`**, an ordered list. One entry means byte-identical behaviour to 0.2.0;
two or more activates sections per viewport, a prototype page per viewport, and the parity check.

Each viewport declares its **`idiom`** — native app, mobile web bare, or mobile web in a device frame —
and its own `chrome`, `pointer`, `breakpoints` and `grid`.

**Chrome is declared, never defaulted.** 0.2.0's list was not "the mobile contract", it was *the
native-iOS-app contract*. A width of 375 says nothing about whether a home indicator belongs. Entries
carry `required` and **two** pin axes, because a sidebar pins horizontally and stretches vertically.

The corollary that cost two rounds: **a rule saying "declare X" is violated just as much by an assistant
quietly declaring X as by nobody declaring it.** The register records who declared it.

### Responsive prototypes

`@container`, never a width `@media` — every viewport renders in one browser window, so a width media
query fires for all columns at once and the narrow column ports as the wide one. `container-type:
inline-size` contains the inline axis only, so the tall-screen hug pair still works.

`@container` carries **no specificity**: a component base class declared later wins. Hit three times in
one stylesheet. Prefer **CSS Grid with named areas** for anything that reflows — a flex row cannot promote
a nested child to full width, and grid keeps both viewports on identical markup.

### The tall-screen pair, enforced

Specified in two rule files since 0.1.0 and implemented in neither: **8 of 25 screens** overflowed their
viewport by 212–614px. Now a checklist item, thresholded at 24px, generated by cloning so the pair cannot
drift, and understood by the parity check as one screen rather than two.

### Verification: two passes, not one

**"Eyeballing finds the wrong things and misses the real ones" is true and incomplete.** This project
produced evidence for it *and its converse* in one afternoon.

- **A position diff cannot detect absence.** A clipped node still reports coordinates, so a 397-run
  geometry diff called a frame "over tolerance" while a third of its content was missing.
- Two cheap checks close the gap: per-frame **text-run counts** against the reference, and **content
  height vs container height** on every vertical auto-layout node. The count check flagged 8 frames and
  every flag was real — including an invisible stray text node on every instance of a component.
- **Calibrate the tolerance.** The HTML capture cannot see `<input>` values, and inline `<strong>` splits
  one line into three runs. Uncalibrated, the check fires forever on correct frames.
- **A green check is not evidence the check works.** A clone-integrity check compared counts across pages,
  where `findAll` under-reports — it could not fail meaningfully *or* pass meaningfully. Assert a check
  against a known bad case first.
- Definition of done now includes **every frame rendered and looked at, per viewport**, as a line separate
  from "audit returns zero".

### Plugin API traps that return success and a wrong result

`findAll` under-reports instance children on a non-current page **and on a node created in the same call**
— so clone in one call and wire in the next. Node identity is not stable across lookups, so `===` on nodes
silently matches nothing. `layoutGrow` is primary-axis relative, so re-parenting reinterprets it, and
removing it yields `FIXED` not `HUG`. `vectorPaths` takes no arcs and **scales geometry to the node box**,
so icons sized to their CSS box come out twice too heavy. `reactions` needs the plural `actions`.

### The capture script carries the data the checks need

`capture-html-reference.mjs` now records, per frame: `viewport` and `hug` **tagged, never parsed** from
the caption; `contentH` and `overflowX` so clipped content is measurable; each text run's **owning
element and text-align**; and each box's **depth and nearest classed parent**.

Those last two are not polish — without the owner, text inside a registered reflow reports as drift
forever; without the parent chain, excusing a component cannot excuse its descendants. With them the
parity check went from **305 raw deltas to 0 findings** in one implementation. It also skips the
storybook, which is a documentation board and yields no frames.

One subtlety worth the comment it carries: the parent must be the nearest **classed** ancestor.
Unclassed elements are not recorded, so an unclassed wrapper — a `<td>` around a score pill — silently
breaks the chain and defeats the pruning.

### Known limits

- The geometry diff's **x-axis** comparison is still uncalibrated for centred and FILL text. The
  capture now records `text-align` so it *can* be, but the diff does not yet use it.
- The Figma half remains less exercised than the HTML half, now across two design systems rather than
  one.


## 0.2.0

**Driven by an outside review of 0.1.0's output, and by the repair pass that followed it.** The review
raised two items. **0.1.0 would have caught neither**, and the repair pass introduced a worse defect than
the ones it fixed. Both facts drove this release.

### The two items raised, and why they were missed

**Incomplete variable bindings** — all four corner radii, horizontal and vertical padding, border width,
fills and strokes. 0.1.0 bound type thoroughly and geometry not at all: the 17-check audit had nothing for
radius, padding or stroke weight. Worse, the prescribed primitives were `Colors`, `Spacing`, `Radius`,
`Typography` with **no `Border` collection**, so there was nothing to bind a border width to. Pica's own
architecture produced the finding.

**Alignment and centring, particularly icons inside input fields.** 0.1.0 required button labels centred
horizontally and said nothing about vertical centring anywhere.

### Added

- **`Border` primitives** (`hairline` 1, `default` 1.5, `emphasis` 2, scoped `STROKE_FLOAT`).
- **Geometry binding rules and checks** for all four corner radii individually, all four padding sides,
  `strokeWeight`, and fills and strokes matched on **RGBA**. Two detector traps documented: binding
  `strokeWeight` leaves `boundVariables.strokeWeight` undefined and writes four per-side keys instead, and
  `COMPONENT_SET` geometry is variant-set chrome rather than design.
- **`rawValueExemptions`** in state, so "raw values only where no suitable token exists" is auditable
  instead of aspirational. Brand marks and SVG icon internals are always exempt.
- **Alpha belongs in the token.** `setBoundVariableForPaint` makes the variable's RGBA authoritative and
  **overwrites `paint.opacity`**: a paint at 0.30 bound to an opaque token returns 1.0. A colour matcher
  keyed on RGB cannot see this, so a bulk binding pass flattened six full-screen scrims to solid black and
  hid the content behind every bottom sheet — while every existence check returned zero. Prescribes
  `scrim`, `overlay/pill`, `overlay/control`, `overlay/track` as alpha-bearing tokens, because a manual
  opacity on a bound paint is an override that re-resolves away.
- **`scripts/capture-baseline.js`** and the rule behind it: capture resolved RGBA before any bulk
  mutation, diff after. The audit proves structure; only a baseline proves appearance. Figma version
  history is not readable from the Plugin API, so a missed baseline means the original values are gone.
- **`rules/figma-mcp.md`**, new module. Rate limits by seat and plan, `use_figma` **not** being exempt,
  `whoami` to size the budget at intake, per-minute versus daily diagnosis, and no parallel fan-out. One
  review session exhausted an Education daily allowance in about seventy calls.
- **`page.loadAsync()`** for whole-file reads: a ten-page audit in one call instead of ten. Works for
  writes too. `setCurrentPageAsync` is still required where deep instance traversal matters.
- **Vertical alignment rules.** Icons centre on the **control**, not the component, because an input is
  label plus field plus error and its centre is nowhere near the field's — with a field-height slot bound
  to `input/height`. A trailing icon belongs **inside** the component: the reported eye icon was positioned
  absolutely on the screen, so it sat 4px low on four screens and 16px high on the fifth where the error
  state pushes the field down 20px. Centring a text box is not centring its glyphs. Siblings that must
  match height use `FILL`, keeping content top-aligned so icons stay on a baseline.
- **Screen chrome pins to its edge.** `STRETCH/MAX` constraints, plus `ABSOLUTE` positioning inside
  auto-layout. All 68 home indicators in the source file sat at `MIN/MIN`, pinned to the top, and looked
  correct only because every frame happened to be 812 tall.
- **`/pica-feedback`**, new command. Triaging someone else's claims is a different job from auditing your
  own work: verify before accepting, classify each item as confirmed, false positive, true-with-a-different-cause
  or not reproducible, keep their scope separate from what you noticed, and look for the convention already
  in the file before inventing a value.
- **Audit integrity**, five rules from real false clean results: report what your filter excluded, never
  write an empty `catch`, never compare floats with `===`, assert the intended value rather than
  "different from broken", and stop after three failed detectors.
- **Registers, because a rule with no register is a preference.** Reviewing 0.1.0 against its own standard
  found six rules that said something "must be written down" with nowhere to write it, so nothing could
  check them. `state.json` now carries `exclusions`, `deviations`, `rawValueExemptions` and `bannedChars`
  alongside the keys the hooks read, and the audit reads them:
  - **`deviations`** closes the biggest hole. "Every deviation from the HTML is recorded as a decision with
    a reason" was in the definition of done and was unfalsifiable. The geometry diff now classifies each
    delta as a finding or a recorded decision, entries name a person rather than saying "intentional", and
    `by: "html-fix-pending"` is a promise that gets closed before handover.
  - **`exclusions`** gets a matchable form beside the prose in `docs/exclusions.md`, and closeout compares
    frame names against it. This is the check that would have caught the ruled-out screen that got designed
    anyway.
  - **`bannedChars`** moves from the audit script's config to intake, where the fact is actually
    established.
- **The published-number recount is now implemented.** 0.1.0 listed it as a check and shipped no code, so
  a cover claiming "45 designed screens" while counting five annotation boards would still pass. The audit
  parses claims out of the file's own text and recounts screens, components, variables and prototype links.
  Unrecognised nouns are ignored rather than guessed at, and phrases like "Step 4 of 7" are not claims.
- **12 new audit checks** and 3 new definition-of-done items.

### Changed

- **Home indicators are now required on every screen frame, hug frames included, and must be
  bottom-pinned.** 0.1.0 omitted them on hug frames on the grounds that a content board is not a viewport.
  In review that read as an oversight rather than a decision, and the `ABSOLUTE` positioning that makes it
  work on a hug frame removes the technical reason for the exception.
- The audit's screen population is now any frame whose width **or** height is the portrait dimension, so
  landscape and hug frames are included. A filter keyed on 375x812 silently excluded them and then reported
  full coverage.
- The claim that locally installed fonts are invisible to the runtime is split into two cases: installed
  **during** the session, which a Figma relaunch fixes, and genuinely unreachable, which it does not.
- Font guidance extended with package forensics. Static desktop OTFs from some foundries register **one
  family per weight** — `Chillax`, `Chillax Medium`, `Chillax Semibold` — so a single family variable
  reaches only 400 and 700 and the middle weights collapse with no error. The variable build is a third
  family name again. Includes a dependency-free `name`-table dumper, because the answer is in the font
  file, not in Figma.

### Known limits

- The alpha-token vocabulary (`overlay/pill`, `overlay/control`, `overlay/track`) comes from one project.
- `rawValueExemptions` adds an intake step. Without it the audit reports every off-scale value each run.
- The flattened-translucency check needs a corroborating signal (an overlay-ish name, or a child of the
  same colour) to stay precise, so a translucent surface over a flat background can still slip past.

## 0.1.0

First release. Extracted from one real client design pilot: a fixed-scope mobile app redesign delivered
against a 24 hour cap.

### The flow

Nine steps across six commands. `/pica` covers intake, research, the HTML UI kit and the Figma
foundations in one sitting. `/pica-wp`, `/pica-port`, `/pica-review`, `/pica-prototype` and `/pica-close`
each have their own entry point, because a multi-day project does not fit in one session.

Figma is declared in or out of scope at intake, and every work package still needs its own approval
before porting.

### Enforced by hook, not by instruction

- A `SessionStart` hook injects six non-negotiables into every session and re-injects them after a
  context compaction. Rules that live only in conversation decay inside a long session; on the source
  project one agreed on day one had to be demanded again on day two.
- A `PreToolUse` gate on `mcp__figma__use_figma` denies writes when the target work package has no HTML
  approval, while a review is running in report mode, after delivery, or without the `figma-use` skill
  loaded. Read-only scripts pass during a report-mode review.
- Approvals live in `.pica/state.json`, because a shell script cannot know that a human said yes out
  loud. With no state file, the gate stays out of the way entirely.

### Rules

Five modules, each readable on its own: `research.md`, `html-prototype.md`, `figma-elements.md`,
`figma-screens.md`, `review-gates.md`.

The Figma rules are the ones with the most hours behind them. They cover the two-layer variable
architecture, numeric font weights (a name-matched weight collapses to Regular on a family swap: 18
styles and 1753 of 1757 nodes, silently), the global and local component tiers, the constraint that you
cannot add a child to an instance, the circle-to-oval trap, and eleven Plugin API calls that return
success and produce a wrong result.

### Verification

`scripts/capture-html-reference.mjs` records true text-run rectangles via range geometry rather than
element boxes. `scripts/figma-audit.js` runs seventeen checks as one call, and everything must return
zero.

Position is compared; size is not. The HTML glyph ink box and the Figma line box measure different
things, and comparing them produced 120 phantom findings on a substantially correct file.

### Known limits

- The HTML half is better tested than the Figma half.
- Mobile-shaped. No desktop or web variant.
- No motion design, no code generation, no token export to a codebase.
- The write gate classifies scripts as reads or writes by pattern matching the Plugin API calls in them.
  It is deliberately cautious, so an unusual write formulation could slip past.
